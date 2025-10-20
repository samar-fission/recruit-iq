from typing import Any, Dict
import json
import os

from strands import Agent

from logging_config import get_logger
from tools import education_validator_tool

_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    education_preference = (event or {}).get("education_preference")
    if not isinstance(education_preference, list):
        return {"error": "Missing or invalid 'education_preference' (must be a list)"}

    agent = Agent(
        tools=[education_validator_tool]
    )
    payload = json.dumps({"education_preference": education_preference})
    result = agent.tool.jd_education_validator(education_preference_json=payload)
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("EducationValidator output text: %s", text)
    return json.loads(text)


