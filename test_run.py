#!/usr/bin/env python3
import os
import json
import argparse
from typing import Any, Dict
from decimal import Decimal

import boto3
import uuid


def to_json_safe(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: to_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_json_safe(v) for v in obj]
    if isinstance(obj, Decimal):
        # Prefer int when possible
        try:
            if obj == int(obj):
                return int(obj)
        except Exception:
            pass
        return float(obj)
    return obj


def fetch_item(table, key: Dict[str, Any]) -> Dict[str, Any]:
    resp = table.get_item(Key=key)
    return resp.get("Item") or {}


def parse_ac_response(resp: Dict[str, Any]) -> str:
    # Preferred: aggregated chunk list in 'response'
    chunks = resp.get("response")
    if isinstance(chunks, list):
        parts = []
        for ch in chunks:
            if isinstance(ch, (bytes, bytearray)):
                parts.append(ch.decode("utf-8", errors="replace"))
            else:
                parts.append(str(ch))
        return "".join(parts)
    # Fallback: payload stream/body
    body = resp.get("payload")
    if hasattr(body, "read"):
        return body.read().decode("utf-8", errors="replace")
    if isinstance(body, (bytes, bytearray)):
        return body.decode("utf-8", errors="replace")
    return json.dumps(body) if body is not None else ""


def main() -> None:
    parser = argparse.ArgumentParser(description="Test runner for JD & Resume agents")
    parser.add_argument("--job-id", dest="job_id", help="Job id in jobs table")
    parser.add_argument("--candidate-id", dest="candidate_id", help="Candidate id in candidates table")
    parser.add_argument("--region", dest="region", default=os.getenv("AWS_REGION", "us-east-1"))
    parser.add_argument("--jobs-table", dest="jobs_table", default=os.getenv("JD_TABLE_NAME", "jobs"))
    parser.add_argument("--candidates-table", dest="candidates_table", default=os.getenv("CANDIDATE_TABLE_NAME", "candidates"))
    parser.add_argument("--jd-agent-arn", dest="jd_agent_arn", default=os.getenv("JD_AGENT_RUNTIME_ARN"), help="AgentCore runtime ARN for JD agent")
    parser.add_argument("--resume-agent-arn", dest="resume_agent_arn", default=os.getenv("RESUME_AGENT_RUNTIME_ARN"), help="AgentCore runtime ARN for Resume agent")
    args = parser.parse_args()

    boto3.setup_default_session(region_name=args.region)
    ddb = boto3.resource("dynamodb", region_name=args.region)
    jobs = ddb.Table(args.jobs_table)
    cands = ddb.Table(args.candidates_table)

    # Load candidate; backfill job id when not provided
    candidate = {}
    if args.candidate_id:
        candidate = fetch_item(cands, {"id": str(args.candidate_id)})
        print("Candidate:")
        print(json.dumps(to_json_safe(candidate), indent=2))

    job_id = args.job_id or (candidate.get("job_id") if candidate else None)
    job = {}
    if job_id:
        job = fetch_item(jobs, {"id": str(job_id)})
        print("\nJob:")
        print(json.dumps(to_json_safe(job), indent=2))

    # Invoke JD agent via AgentCore runtime
    ac_client = boto3.client("bedrock-agentcore", region_name=args.region)
    if job_id and args.jd_agent_arn:
        print("\nInvoking JD agent via AgentCore runtime...")
        jd_payload = json.dumps({"jd_id": str(job_id)}).encode()
        jd_resp = ac_client.invoke_agent_runtime(
            agentRuntimeArn="arn:aws:bedrock-agentcore:us-east-1:834406757853:runtime/jd_process-9x8vIt8rC6",
            runtimeSessionId=str(uuid.uuid4()),
            payload=jd_payload,
            qualifier="DEFAULT",
        )
        print(jd_resp)
        jd_text = parse_ac_response(jd_resp)
        try:
            print(json.dumps(json.loads(jd_text), indent=2))
        except Exception:
            print(jd_text)
    else:
        print("\nSkipping JD agent (missing job id or JD_AGENT_RUNTIME_ARN).")

    # Invoke Resume agent via AgentCore runtime
    if args.candidate_id and args.resume_agent_arn:
        print("\nInvoking Resume agent via AgentCore runtime...")
        resume_payload = json.dumps({"id": str(args.candidate_id)}).encode()
        resume_resp = ac_client.invoke_agent_runtime(
            agentRuntimeArn=args.resume_agent_arn,
            runtimeSessionId=str(uuid.uuid4()),
            payload=resume_payload,
            qualifier="DEFAULT",
        )
        print(resume_resp)
        r_text = parse_ac_response(resume_resp)
        try:
            print(json.dumps(json.loads(r_text), indent=2))
        except Exception:
            print(r_text)
    else:
        print("\nSkipping Resume agent (missing candidate id or RESUME_AGENT_RUNTIME_ARN).")


if __name__ == "__main__":
    main()


