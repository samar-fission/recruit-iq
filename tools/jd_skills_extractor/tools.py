from typing import Any
import json
import os
import time
from logging_config import get_logger
from constants import JD_SYSTEM_PROMPT

import boto3

# Make @tool optional at runtime (Lambda doesn't need Strands installed)
from strands import tool  # type: ignore
_logger = get_logger(__name__)

@tool(name="jd_extract_jd_skills")
def extract_jd_skills_tool(jd_text: str) -> str:
    """Run the JD skills extractor prompt on Bedrock and return ONLY JSON.

    - Prompt is defined in constants and must be used verbatim.
    - Input is the JD text; the tool returns the model output as a raw JSON string.
    - Uses Anthropic Claude Messages on Bedrock.
    """
    region = os.getenv("BEDROCK_REGION", os.getenv("AWS_REGION", "us-east-1"))
    model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")

    client = boto3.client("bedrock-runtime", region_name=region)
    _logger.info("Invoking Bedrock model", extra={"region": region, "model_id": model_id, "jd_len": len(jd_text)})

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 40000,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"{JD_SYSTEM_PROMPT}\n\nJD:\n{jd_text}"
                    }
                ]
            }
        ]
    }

    response = client.invoke_model(
        modelId=model_id,
        accept="application/json",
        contentType="application/json",
        body=json.dumps(body),
    )

    raw = response["body"].read()
    payload = json.loads(raw)
    # Prefer Anthropic Messages format
    contents = []
    output_obj = payload.get("output")
    if isinstance(output_obj, dict):
        contents = output_obj.get("content", []) or []
    elif isinstance(payload.get("content"), list):
        # Some providers return top-level content
        contents = payload.get("content", [])

    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict) and c.get("type") == "text"]
    text = "".join(text_chunks).strip()

    # Log the final text (may be empty)
    return text


