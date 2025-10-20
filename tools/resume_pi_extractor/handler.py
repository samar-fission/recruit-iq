from typing import Any, Dict
import json

from strands import Agent

from logging_config import get_logger
from tools import resume_pi_extractor


_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    resume_text = (event or {}).get("resume_text") or ""
    if not isinstance(resume_text, str) or not resume_text:
        return {"error": "Missing or invalid 'resume_text' (str)"}

    agent = Agent(tools=[resume_pi_extractor])
    result = agent.tool.resume_pi_extractor(resume_text=resume_text)
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("ResumePI output text: %s", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        _logger.error("Tool text not JSON: %s", text[:500])
        return {"error": "Tool returned non-JSON output"}


