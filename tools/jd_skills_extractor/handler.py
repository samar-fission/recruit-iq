import json
from typing import Any, Dict
import sys, os

from strands import Agent
from tools import extract_jd_skills_tool
from logging_config import get_logger


_logger = get_logger(__name__)


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    """AWS Lambda handler.

    Expects event with key 'jd' containing the Job Description text. Returns JSON string.
    """
    jd = (event or {}).get("jd")
    if not jd:
        return {"error": "Missing 'jd' in event"}

    _logger.info("Processing JD request via Strands Agent (no LLM)", extra={"jd_len": len(jd)})

    agent = Agent(
        tools=[extract_jd_skills_tool]
    )

    result = agent.tool.jd_extract_jd_skills(jd_text=jd)
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    text = "".join(text_chunks).strip()
    _logger.info("Model output text: %s", text)
    return json.loads(text)

if __name__ == "__main__":
    # Simple local test: read JD from STDIN or environment SAMPLE_JD

    test_jd = os.getenv("SAMPLE_JD") or sys.stdin.read()
    if not test_jd:
        print("Provide JD via STDIN or SAMPLE_JD env var", file=sys.stderr)
        sys.exit(1)
    print(handler({"jd": test_jd}, None))


