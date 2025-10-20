from typing import Any, Dict, List, Optional
import json

from strands import Agent

from logging_config import get_logger
from tools import resume_summarizer


_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    jd_text = (event or {}).get("jd_text") or ""
    resume_text = (event or {}).get("resume_text") or ""
    skills = (event or {}).get("skills")
    desired_experience = (event or {}).get("desired_experience")
    education = (event or {}).get("education")
    if not isinstance(jd_text, str) or not isinstance(resume_text, str) or not jd_text or not resume_text:
        return {"error": "Missing or invalid 'jd_text'/'resume_text' (str)"}

    agent = Agent(tools=[resume_summarizer])
    result = agent.tool.resume_summarizer(
        jd_text=jd_text,
        resume_text=resume_text,
        skills=skills,
        desired_experience=desired_experience,
        education=education,
    )
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("ResumeSummarizer output text: %s", text)
    return json.loads(text)


