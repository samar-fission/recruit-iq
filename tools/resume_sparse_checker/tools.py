from typing import Any
import json
import os

import boto3
from strands import tool

from constants import RESUME_SPARSE_CHECK_PROMPT
from logging_config import get_logger


_logger = get_logger(__name__)


@tool(name="resume_sparse_checker")
def resume_sparse_checker(resume_text: str) -> str:
    """Checks if a resume is sparse; returns ONLY JSON string with fields sparse_resume and reason."""
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
                    {"type": "text", "text": RESUME_SPARSE_CHECK_PROMPT.strip()},
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
    payload_out = json.loads(resp["body"].read())
    contents = []
    output_obj = payload_out.get("output")
    if isinstance(output_obj, dict):
        contents = output_obj.get("content", []) or []
    elif isinstance(payload_out.get("content"), list):
        contents = payload_out.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict) and c.get("type") == "text"]
    text = "".join(text_chunks).strip()
    _logger.info("ResumeSparseChecker output", extra={"len": len(text)})
    return text


