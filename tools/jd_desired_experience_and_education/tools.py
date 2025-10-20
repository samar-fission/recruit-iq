from typing import Any, Optional, List
import json
import os

import boto3
from strands import tool

from constants import DESIRED_EXP_EDU_PROMPT
from logging_config import get_logger

_logger = get_logger(__name__)


@tool(name="jd_desired_experience_education")
def desired_experience_education_tool(title: str, jd: Optional[str] = None, must_have_skills: Optional[List[str]] = None) -> str:
    region = os.getenv("BEDROCK_REGION", os.getenv("AWS_REGION", "us-east-1"))
    model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")
    client = boto3.client("bedrock-runtime", region_name=region)
    user_payload = {
        "title": title,
        "jd": jd or "",
        "must_have_skills": must_have_skills or [],
    }
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 40000,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": DESIRED_EXP_EDU_PROMPT.strip()},
                    {"type": "text", "text": f"Inputs as JSON:\n{json.dumps(user_payload)}"},
                ],
            }
        ],
    }
    response = client.invoke_model(
        modelId=model_id,
        accept="application/json",
        contentType="application/json",
        body=json.dumps(body),
    )
    payload = json.loads(response["body"].read())
    contents = []
    output_obj = payload.get("output")
    if isinstance(output_obj, dict):
        contents = output_obj.get("content", []) or []
    elif isinstance(payload.get("content"), list):
        contents = payload.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict) and c.get("type") == "text"]
    text = "".join(text_chunks).strip()
    _logger.info("DesiredExpEdu output", extra={"len": len(text)})
    return text


