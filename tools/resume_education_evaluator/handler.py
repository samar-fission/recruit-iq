from typing import Any, Dict, List
import json

from strands import Agent

from logging_config import get_logger
from tools import resume_education_evaluator


_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    jd_list = (event or {}).get("jd_education_and_certifications") or []
    resume_text = (event or {}).get("resume_text") or ""
    if not isinstance(jd_list, list) or not isinstance(resume_text, str) or not resume_text:
        return {"error": "Missing or invalid 'jd_education_and_certifications' (list) or 'resume_text' (str)"}

    agent = Agent(tools=[resume_education_evaluator])
    result = agent.tool.resume_education_evaluator(jd_education_and_certifications=jd_list, resume_text=resume_text)
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("ResumeEducationEval output text: %s", text)
    return json.loads(text)


