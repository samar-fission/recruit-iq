import os
from typing import Dict, Optional
from strands.tools.mcp.mcp_client import MCPClient
from mcp.client.streamable_http import streamablehttp_client
import httpx


GATEWAY_URL = os.environ.get("AGENTCORE_GATEWAY_URL", "https://jd-tools-new-3hn4pbu09r.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp")
GATEWAY_TOKEN = os.environ.get("AGENTCORE_GATEWAY_TOKEN")
EXTRA_HEADERS: Dict[str, str] = {}

# OAuth2 client credentials (Cognito)
OAUTH_TOKEN_URL = os.environ.get("AGENTCORE_OAUTH_TOKEN_URL", "https://us-east-1et3saxrv8.auth.us-east-1.amazoncognito.com/oauth2/token")
OAUTH_CLIENT_ID = os.environ.get("AGENTCORE_OAUTH_CLIENT_ID")
OAUTH_CLIENT_SECRET = os.environ.get("AGENTCORE_OAUTH_CLIENT_SECRET", "")
OAUTH_SCOPE = os.getenv("AGENTCORE_OAUTH_SCOPE", "default-m2m-resource-server-kpomdi/read")



def _fetch_oauth_token() -> Optional[str]:
    if not (OAUTH_TOKEN_URL and OAUTH_CLIENT_ID is not None):
        return None
    data = {
        "grant_type": "client_credentials",
        "client_id": OAUTH_CLIENT_ID,
        "client_secret": OAUTH_CLIENT_SECRET or "",
        "scope": OAUTH_SCOPE,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    with httpx.Client(timeout=10) as client:
        resp = client.post(OAUTH_TOKEN_URL, data=data, headers=headers)
        resp.raise_for_status()
        body = resp.json()
        return body.get("access_token")


def _bearer_token() -> str:
    if GATEWAY_TOKEN:
        return GATEWAY_TOKEN
    token = _fetch_oauth_token()
    if not token:
        raise RuntimeError("No AGENTCORE_GATEWAY_TOKEN or OAuth client creds available")
    return token


def _make_mcp_client() -> MCPClient:
    if not GATEWAY_URL:
        raise RuntimeError("AGENTCORE_GATEWAY_URL is not set")
    token = _bearer_token()
    headers = {"Authorization": f"Bearer {token}", **EXTRA_HEADERS}
    return MCPClient(lambda: streamablehttp_client(GATEWAY_URL, headers=headers))


def list_mcp_tools() -> list:
    with _make_mcp_client() as client:
        return client.list_tools_sync()


def list_mcp_tool_names() -> list:
    tools = list_mcp_tools()
    names = []
    for t in tools:
        name = getattr(t, "name", None) or (t.get("name") if isinstance(t, dict) else None)
        print(name)
        if name:
            names.append(name)
    return sorted(names)


def resolve_mcp_tool_by_name(tool_name: str):
    for t in list_mcp_tools():
        tool_obj = getattr(t, "mcp_tool", t)
        name = getattr(tool_obj, "name", None) or (tool_obj.get("name") if isinstance(tool_obj, dict) else None)
        if name == tool_name:
            return t
    raise RuntimeError(f"MCP tool '{tool_name}' not found. Available: {list_mcp_tool_names()}")


def get_jd_tools(use_local_tool: bool, jd_tool_name: str = "jd_extract_jd_skills") -> list:
    if use_local_tool:
        try:
            from tools.jd_skills_extractor.tools import extract_jd_skills_tool as jd_tool  # type: ignore
        except Exception as e:
            raise RuntimeError(
                "USE_LOCAL_TOOL=true but failed to import tools.jd_skills_extractor.tools.extract_jd_skills_tool"
            ) from e
    else:
        jd_tool = resolve_mcp_tool_by_name(jd_tool_name)

    return [jd_tool]

