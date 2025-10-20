from typing import Any, Dict, List, Optional
import json
import os

from strands import Agent

from logging_config import get_logger
from tools import responsibility_extractor_tool

_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    title = (event or {}).get("title")
    years = (event or {}).get("years_of_experience")
    seniority = (event or {}).get("seniority_level")
    job_page = (event or {}).get("jd")
    must_have_skills = (event or {}).get("must_have_skills") or []
    if not (title and years and seniority and job_page):
        return {"error": "Missing one of required fields: title, years_of_experience, seniority_level, job_page"}
    if not isinstance(must_have_skills, list):
        return {"error": "'must_have_skills' must be a list if provided"}

    agent = Agent(tools=[responsibility_extractor_tool])
    result = agent.tool.jd_responsibility_extractor(
        title=title,
        years_of_experience=years,
        seniority_level=seniority,
        job_page=job_page,
        must_have_skills=must_have_skills,
    )
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("Responsibilities output text: %s", text)
    return json.loads(text)


