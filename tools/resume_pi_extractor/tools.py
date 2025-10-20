from typing import Any
import json
import os

import boto3
from strands import tool

from constants import RESUME_PI_PROMPT
from logging_config import get_logger


_logger = get_logger(__name__)


@tool(name="resume_pi_extractor")
def resume_pi_extractor(resume_text: str) -> str:
    """Extracts name, email, phone, and years_of_experience; returns ONLY JSON string."""
    region = os.getenv("BEDROCK_REGION", os.getenv("AWS_REGION", "us-east-1"))
    model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")
    client = boto3.client("bedrock-runtime", region_name=region)

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4000,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": RESUME_PI_PROMPT.strip()},
                    {"type": "text", "text": f"resume_text:\n{resume_text}"},
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
    raw = resp["body"].read()
    if not raw:
        raise RuntimeError("Empty response body from Bedrock")
    try:
        payload_out = json.loads(raw)
    except json.JSONDecodeError as e:
        _logger.error("Failed to parse Bedrock response: %s", raw)
        raise
    contents = []
    output_obj = payload_out.get("output")
    if isinstance(output_obj, dict):
        contents = output_obj.get("content", []) or []
    elif isinstance(payload_out.get("content"), list):
        contents = payload_out.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict) and c.get("type") == "text"]
    text = "".join(text_chunks).strip()
    _logger.info("ResumePI output", extra={"len": len(text)})
    return text


