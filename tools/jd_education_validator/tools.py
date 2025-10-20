from typing import Any
import json
import os

import boto3
from strands import tool

from constants import EDUCATION_VALIDATOR_PROMPT
from logging_config import get_logger

_logger = get_logger(__name__)


@tool(name="jd_education_validator")
def education_validator_tool(education_preference_json: str) -> str:
    region = os.getenv("BEDROCK_REGION", os.getenv("AWS_REGION", "us-east-1"))
    model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")
    client = boto3.client("bedrock-runtime", region_name=region)

    try:
        payload_in = json.loads(education_preference_json)
    except Exception:
        payload_in = {"education_preference": []}

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 40000,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": EDUCATION_VALIDATOR_PROMPT.strip()},
                    {"type": "text", "text": f"Input JSON:\n{json.dumps(payload_in)}"},
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
    payload_out = json.loads(response["body"].read())
    contents = []
    output_obj = payload_out.get("output")
    if isinstance(output_obj, dict):
        contents = output_obj.get("content", []) or []
    elif isinstance(payload_out.get("content"), list):
        contents = payload_out.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict) and c.get("type") == "text"]
    text = "".join(text_chunks).strip()
    _logger.info("EducationValidator output", extra={"len": len(text)})
    return text


