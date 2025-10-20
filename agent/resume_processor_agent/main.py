from typing import Any, Dict, List
import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from strands import Agent
from bedrock_agentcore import BedrockAgentCoreApp

from logging_config import get_logger
from tools import _make_mcp_client
from utils import (
    safe_json_loads,
    extract_tool_text,
    denormalize_dynamodb_item,
    to_dynamodb_compatible,
)


app = BedrockAgentCoreApp()
_logger = get_logger(__name__)

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
JOBS_TABLE = os.getenv("JD_TABLE_NAME", "jobs")
CAND_TABLE = os.getenv("CANDIDATE_TABLE_NAME", "candidates")

_dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
_jobs = _dynamodb.Table(JOBS_TABLE)
_cands = _dynamodb.Table(CAND_TABLE)


def _json_from_call(callable_fn, kwargs: Dict[str, Any]) -> Any:
    r = callable_fn(**kwargs)
    text = extract_tool_text(r)
    return safe_json_loads(text) if text else {}


def _build_skills_with_context(job: Dict[str, Any]) -> List[Dict[str, str]]:
    # Expect skills object like in JD agent; fallback to empty
    skills = job.get("skills") or {}
    items: List[Dict[str, str]] = []
    # categories
    for cat in (skills.get("categories") or []):
        for vert in (cat.get("verticals") or []):
            for s in (vert.get("skills") or []):
                if s.get("required") is not True:
                    continue
                name = s.get("skill")
                ctx = s.get("context") or ""
                if isinstance(name, str) and name:
                    items.append({"skill": name, "jd_context": ctx})
    # skills_unclassified
    for s in (skills.get("skills_unclassified") or []):
        if s.get("required") is not True:
            continue
        name = s.get("skill")
        ctx = s.get("context") or ""
        if isinstance(name, str) and name:
            items.append({"skill": name, "jd_context": ctx})
    return items


@app.entrypoint
def handler(payload: Dict[str, Any]) -> Dict[str, Any]:
    cand_id = (payload or {}).get("id")
    if not cand_id:
        return {"error": "Missing 'id' in payload"}
    _logger.info(f"Resume processor start id={cand_id}")

    # Load candidate
    _logger.info(f"Fetching candidate table={CAND_TABLE} id={cand_id}")
    c = _cands.get_item(Key={"id": str(cand_id)}).get("Item")
    if not c:
        _logger.error(f"Candidate not found id={cand_id}")
        return {"error": f"Candidate '{cand_id}' not found"}
    c = denormalize_dynamodb_item(c)
    resume_text = c.get("resume_text") or ""
    if not resume_text:
        _logger.error(f"Candidate has no resume_text id={cand_id}")
        return {"error": f"Candidate '{cand_id}' has no resume_text"}
    _logger.info(f"Loaded resume text id={cand_id} len={len(resume_text)}")

    # Load job (optional)
    job_id = c.get("job_id")
    job = {}
    if job_id:
        _logger.info(f"Fetching job table={JOBS_TABLE} id={job_id}")
        j = _jobs.get_item(Key={"id": str(job_id)}).get("Item")
        job = denormalize_dynamodb_item(j or {})

    # Build inputs from job
    skills_with_context = _build_skills_with_context(job)
    _logger.info(f"Built skills_with_context count={len(skills_with_context)}")

    # Resolve MCP tools and run within active session
    _logger.info("Resolving MCP tools")
    with _make_mcp_client() as mcp:
        tools = mcp.list_tools_sync()
        def by_name(name: str):
            for t in tools:
                tool_obj = getattr(t, "mcp_tool", t)
                tname = getattr(tool_obj, "name", None) or (tool_obj.get("name") if isinstance(tool_obj, dict) else None)
                if tname == name:
                    return t
            raise RuntimeError(f"MCP tool '{name}' not found")

        t_skills = by_name("skillscorer___resume_skills_scorer")
        t_sparse = by_name("sparsecheck___resume_sparse_checker")
        t_pi = by_name("pi___resume_pi_extractor")
        t_exp = by_name("desirediexpeval___resume_desired_experience_scorer")
        t_edu = by_name("educationeval___resume_education_evaluator")
        t_sum = by_name("summarizer___resume_summarizer")
        _logger.info("Resolved MCP tools for resume processing")

        agent = Agent(tools=[t_skills, t_sparse, t_pi, t_exp, t_edu, t_sum])

        results: Dict[str, Any] = {}
        errors: Dict[str, str] = {}

        # Prepare job-derived inputs
        ede = job.get("education_desired_experience") or {}
        desired_experience = [d.get("experience") for d in (ede.get("desired_experience") or []) if isinstance(d, dict) and d.get("experience")] if isinstance(ede, dict) else []
        jd_edu_list = []
        edu = ede.get("education_preference") if isinstance(ede, dict) else []
        for x in (edu or []):
            if isinstance(x, dict) and x.get("education"):
                jd_edu_list.append(x.get("education"))
        jd_text = job.get("jd_text") or job.get("text") or ""

        # Run ALL tools in parallel
        _logger.info("Invoking tools in parallel (6)")
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_map = {
                executor.submit(_json_from_call, agent.tool.sparsecheck___resume_sparse_checker, {"resume_text": resume_text}): "sparse",
                executor.submit(_json_from_call, agent.tool.pi___resume_pi_extractor, {"resume_text": resume_text}): "pi",
                executor.submit(_json_from_call, agent.tool.skillscorer___resume_skills_scorer, {"resume_text": resume_text, "skills_with_context": skills_with_context}): "skills",
                executor.submit(_json_from_call, agent.tool.desirediexpeval___resume_desired_experience_scorer, {"resume_text": resume_text, "desired_experience": desired_experience}): "desired_exp_eval",
                executor.submit(_json_from_call, agent.tool.educationeval___resume_education_evaluator, {"jd_education_and_certifications": jd_edu_list, "resume_text": resume_text}): "education_eval",
                executor.submit(_json_from_call, agent.tool.summarizer___resume_summarizer, {"jd_text": jd_text, "resume_text": resume_text}): "resume_summary",
            }
            for fut in as_completed(list(future_map.keys())):
                k = future_map[fut]
                try:
                    results[k] = fut.result()
                    _logger.info(f"Tool completed tool={k} id={cand_id}")
                except Exception as e:
                    errors[k] = str(e)
                    _logger.error(f"Tool failed tool={k} id={cand_id} error={str(e)}")

    # Persist back to candidates
    update: Dict[str, Any] = {}
    if "pi" in results:
        update["pi_details"] = results["pi"]
    if "sparse" in results:
        update["sparse_resume"] = results["sparse"].get("sparse_resume") if isinstance(results["sparse"], dict) else results["sparse"]
    if "resume_summary" in results:
        update["resume_summary"] = results["resume_summary"]
    if "skills" in results:
        update["skills_eval"] = results["skills"]
    if "desired_exp_eval" in results:
        update["desired_exp_eval"] = results["desired_exp_eval"]
    if "education_eval" in results:
        update["education_eval"] = results["education_eval"]

    if update:
        _logger.info(f"Persisting candidate updates id={cand_id} fields={list(update.keys())}")
        safe_item = to_dynamodb_compatible({**c, **update})
        _cands.put_item(Item=safe_item)

    return {"id": cand_id, "updated": bool(update), "results": results, "errors": errors}

if __name__ == "__main__":
    app.run()
