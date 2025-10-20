from typing import Any, Dict, List, Optional
import json
import os

import boto3
from strands import tool

from constants import RESUME_SUMMARIZER_PROMPT
from logging_config import get_logger


_logger = get_logger(__name__)


@tool(name="resume_summarizer")
def resume_summarizer(
    jd_text: str,
    resume_text: str,
    skills: Optional[List[str]] = None,
    desired_experience: Optional[List[str]] = None,
    education: Optional[List[str]] = None,
) -> str:
    """Summarizes JD–resume alignment; returns ONLY JSON with summary, match_score, strengths, gaps."""
    region = os.getenv("BEDROCK_REGION", os.getenv("AWS_REGION", "us-east-1"))
    model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")
    client = boto3.client("bedrock-runtime", region_name=region)

    payload_in: Dict[str, Any] = {
        "jd_text": jd_text,
        "resume_text": resume_text,
    }
    if skills is not None:
        payload_in["skills"] = skills
    if desired_experience is not None:
        payload_in["desired_experience"] = desired_experience
    if education is not None:
        payload_in["education"] = education

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 40000,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": RESUME_SUMMARIZER_PROMPT.strip()},
                    {"type": "text", "text": f"Input JSON:\n{json.dumps(payload_in)}"},
                ],
            }
        ],
    }

    resp = client.invoke_model(
        modelId=model_id,
        accept="application/json",
        contentType="application/json",
        body=json.dumps(body),
    )
    payload_out = json.loads(resp["body"].read())
    contents = []
    output_obj = payload_out.get("output")
    if isinstance(output_obj, dict):
        contents = output_obj.get("content", []) or []
    elif isinstance(payload_out.get("content"), list):
        contents = payload_out.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict) and c.get("type") == "text"]
    text = "".join(text_chunks).strip()
    _logger.info("ResumeSummarizer output", extra={"len": len(text)})
    return text


