from typing import Any, Dict
import json

from strands import Agent

from logging_config import get_logger
from tools import resume_sparse_checker


_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    resume_text = (event or {}).get("resume_text") or ""
    if not isinstance(resume_text, str) or not resume_text:
        return {"error": "Missing or invalid 'resume_text' (str)"}

    agent = Agent(tools=[resume_sparse_checker])
    result = agent.tool.resume_sparse_checker(resume_text=resume_text)
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("ResumeSparseChecker output text: %s", text)
    return json.loads(text)


