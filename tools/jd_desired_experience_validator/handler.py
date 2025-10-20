from typing import Any, Dict
import json
import os

from strands import Agent

from logging_config import get_logger
from tools import desired_experience_validator_tool

_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    desired_experience = (event or {}).get("desired_experience")
    if not isinstance(desired_experience, list):
        return {"error": "Missing or invalid 'desired_experience' (must be a list)"}

    agent = Agent(
        tools=[desired_experience_validator_tool]
    )
    payload = json.dumps({"desired_experience": desired_experience})
    result = agent.tool.jd_desired_experience_validator(desired_experience_json=payload)
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("DesiredExpValidator output text: %s", text)
    return json.loads(text)


