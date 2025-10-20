# JD Skill Processor Agent (MCP Orchestrator)

Processes a JD by id: fetches JD from DynamoDB, calls three MCP tools in parallel, and saves results back to the JD record.

## What it does
- Input: `{ "jd_id": "<uuid>" }`
- Loads JD from `JD_TABLE_NAME` (keys: `id`, `jd_text`/`text`, optional `title`, `years_of_experience`, `seniority_level`, `skills`).
- Calls MCP tools in parallel with minimal payloads per each tool’s inlinePayload:
  - `jd_extract_jd_skills`: `{ jd: jd_text }`
  - `jd_responsibility_extractor`: `{ title, years_of_experience, seniority_level, job_page: jd_text, must_have_skills }`
  - `jd_desired_experience_and_education`: `{ title, jd: jd_text, must_have_skills }`
- Writes back to JD item:
  - `skills`
  - `education_desired_experience` (object)
  - `responsibilities`

## Structure
- `main.py`: Entrypoint that orchestrates fetch → parallel tools → persist
- `tools.py`: MCP client utilities (`resolve_mcp_tool_by_name`)
- `utils.py`: JSON parsing helpers
- `logging_config.py`: shared logging
- `requirements.txt`, `Dockerfile`, `README.md`

## Environment Variables
- `AWS_REGION` (default `us-east-1`)
- `JD_TABLE_NAME` (DynamoDB table for JDs)
- MCP gateway (Cognito OAuth2 client-credentials; token is fetched automatically):
  - `AGENTCORE_GATEWAY_URL` (MCP endpoint)
  - `AGENTCORE_OAUTH_TOKEN_URL` (e.g., your_cognito_domain/oauth2/token)
  - `AGENTCORE_OAUTH_CLIENT_ID` (Cognito app client ID)
  - `AGENTCORE_OAUTH_CLIENT_SECRET` (Cognito app client secret)
  - `AGENTCORE_OAUTH_SCOPE` (default provided in code; override if needed)

## Run (local)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export AWS_REGION=us-east-1 JD_TABLE_NAME=jd-records
export AGENTCORE_GATEWAY_URL=https://<gateway>/v1
export AGENTCORE_OAUTH_TOKEN_URL=https://<your-cognito-domain>/oauth2/token
export AGENTCORE_OAUTH_CLIENT_ID=<client-id>
export AGENTCORE_OAUTH_CLIENT_SECRET=<client-secret>
# optional: export AGENTCORE_OAUTH_SCOPE="default-m2m-resource-server-kpomdi/read"
python -m jd_skill_processor_agent.main <<<'{"jd_id":"<uuid>"}'
```

## Deploy with AgentCore StarterKit
```bash
agentcore configure -e main.py -r us-east-1 --disable-memory
agentcore launch
```

