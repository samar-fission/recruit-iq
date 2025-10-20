from typing import Any, Dict
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
    extract_required_skill_names,
    denormalize_dynamodb_item,
)

app = BedrockAgentCoreApp()
_logger = get_logger(__name__)

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
JD_TABLE_NAME = os.getenv("JD_TABLE_NAME", "jobs")
_dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
_jd_table = _dynamodb.Table(JD_TABLE_NAME)


def _json_from_call(callable_fn, kwargs: Dict[str, Any]) -> Any:
    r = callable_fn(**kwargs)
    text = extract_tool_text(r)
    return safe_json_loads(text) if text else {}


@app.entrypoint
def handler(payload: Dict[str, Any]) -> Dict[str, Any]:
    jd_id = (payload or {}).get("jd_id")
    if not jd_id:
        return {"error": "Missing 'jd_id' in payload"}
    _logger.info(f"Received JD processing request jd_id={jd_id}")

    # Fetch JD record
    _logger.info(f"Fetching JD from DynamoDB table={JD_TABLE_NAME}")
    resp = _jd_table.get_item(Key={"id": str(jd_id)})
    item = resp.get("Item")
    if not item:
        _logger.error(f"JD not found jd_id={jd_id}")
        return {"error": f"JD '{jd_id}' not found"}

    # Convert AV-shaped items to plain Python types if needed
    item = denormalize_dynamodb_item(item)

    jd_text = item.get("jd_text") or item.get("text") or ""
    if not jd_text:
        _logger.error(f"JD has no text jd_id={jd_id}")
        return {"error": f"JD '{jd_id}' has no text"}
    _logger.info(f"Loaded JD text jd_id={jd_id} jd_len={len(jd_text)}")

    # Resolve MCP tools and keep session open for all operations
    _logger.info("Resolving MCP tools")
    with _make_mcp_client() as mcp_client:
        all_tools = mcp_client.list_tools_sync()
        def by_name(name: str):
            for t in all_tools:
                tool_obj = getattr(t, "mcp_tool", t)
                tname = getattr(tool_obj, "name", None) or (tool_obj.get("name") if isinstance(tool_obj, dict) else None)
                if tname == name:
                    return t
            raise RuntimeError(f"MCP tool '{name}' not found")

        skills_tool = by_name("extractskills___jd_extract_jd_skills")
        resp_tool = by_name("responsibilities___jd_responsibility_extractor")
        expedu_tool = by_name("desiredexperienceeducation___jd_desired_experience_education")
        _logger.info("Resolved MCP tools")

        agent = Agent(tools=[skills_tool, resp_tool, expedu_tool])

        # 1) Call skills tool first and persist
        results: Dict[str, Any] = {}
        errors: Dict[str, str] = {}
        try:
            _logger.info("Invoking skills tool")
            skills_json = _json_from_call(agent.tool.extractskills___jd_extract_jd_skills, {"jd": jd_text})
            results["skills"] = skills_json
            # Persist raw skills (or nested under 'skills' key)
            _jd_table.put_item(Item={**item, "skills": skills_json})
            item = {**item, "skills": skills_json}
            _logger.info(f"Persisted skills jd_id={jd_id} has_skills_key={isinstance(skills_json, dict) and ('skills' in skills_json)}")
        except Exception as e:
            _logger.error(f"jd_extract_jd_skills failed jd_id={jd_id} error={str(e)}")
            errors["skills"] = str(e)

        # Derive required skill names for downstream tools
        required_skill_names = extract_required_skill_names(results.get("skills")) if "skills" in results else []

        # 2) Call remaining tools in parallel
        _logger.info(f"Invoking remaining tools in parallel required_skills_count={len(required_skill_names)}")
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {
                "responsibilities": executor.submit(
                    _json_from_call,
                    agent.tool.responsibilities___jd_responsibility_extractor,
                    {
                        "title": item.get("title") or "Unknown",
                        "years_of_experience": str(item.get("years_of_experience") or "unknown"),
                        "seniority_level": item.get("seniority_level") or "unknown",
                        "jd": jd_text,
                        "must_have_skills": required_skill_names  or [],
                    },
                ),
                "education_desired_experience": executor.submit(
                    _json_from_call,
                    agent.tool.desiredexperienceeducation___jd_desired_experience_education,
                    {
                        "title": item.get("title") or "Unknown",
                        "jd": jd_text,
                        "must_have_skills": required_skill_names  or [],
                    },
                ),
            }
            for key, fut in futures.items():
                try:
                    results[key] = fut.result()
                    _logger.info(f"Tool completed tool={key} jd_id={jd_id}")
                except Exception as e:
                    _logger.error(f"Tool call failed tool={key} jd_id={jd_id} error={str(e)}")
                    errors[key] = str(e)

        update_fields: Dict[str, Any] = {}
        if "education_desired_experience" in results:
            update_fields["education_desired_experience"] = results["education_desired_experience"]
        if "responsibilities" in results:
            resp_val = results["responsibilities"]
            update_fields["responsibilities"] = resp_val["responsibilities"]

        if update_fields:
            _logger.info(f"Persisting updates jd_id={jd_id} fields={list(update_fields.keys())}")
            _jd_table.put_item(Item={**item, **update_fields})

    return {"id": jd_id, "updated": bool(update_fields) or ("skills" in results), "results": results, "errors": errors}

if __name__ == "__main__":
    app.run()


