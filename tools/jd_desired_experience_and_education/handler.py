from typing import Any, Dict
import json
import os

from strands import Agent
from logging_config import get_logger
from tools import desired_experience_education_tool

_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    title = (event or {}).get("title")
    if not title:
        return {"error": "Missing 'title' in event"}
    jd = (event or {}).get("jd") or ""
    must_have_skills = (event or {}).get("must_have_skills") or []
    if not isinstance(must_have_skills, list):
        return {"error": "'must_have_skills' must be a list if provided"}

    # Mirror jd_skills_extractor logic: call the tool via Agent and parse its text output
    agent = Agent(
        tools=[desired_experience_education_tool]
    )
    result = agent.tool.jd_desired_experience_education(
        title=title,
        jd=jd,
        must_have_skills=must_have_skills,
    )
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("DesiredExpEdu output text: %s", text)
    return json.loads(text)


