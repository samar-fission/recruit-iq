from typing import Any, Dict, List
import json

from strands import Agent

from logging_config import get_logger
from tools import resume_desired_experience_scorer


_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    resume_text = (event or {}).get("resume_text") or ""
    desired_experience = (event or {}).get("desired_experience") or []
    if not isinstance(resume_text, str) or not isinstance(desired_experience, list):
        return {"error": "Missing or invalid 'resume_text' (str) or 'desired_experience' (list)"}

    agent = Agent(tools=[resume_desired_experience_scorer])
    result = agent.tool.resume_desired_experience_scorer(
        resume_text=resume_text, desired_experience=desired_experience
    )
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("ResumeDesiredExpScorer output text: %s", text)
    return json.loads(text)


