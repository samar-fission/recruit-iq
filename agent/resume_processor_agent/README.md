# Resume Processor Agent

Processes a candidate resume by id:
- Loads candidate from `CANDIDATE_TABLE_NAME` (default `candidates`)
- Optionally loads job from `JD_TABLE_NAME` (default `jobs`) using candidate.job_id
- Opens a single MCP session and calls tools:
  - `skillscorer___resume_skills_scorer`
  - `sparsecheck___resume_sparse_checker`
  - `pi___resume_pi_extractor`
  - `desirediexpeval___resume_desired_experience_scorer`
  - `educationeval___resume_education_evaluator`
  - `summarizer___resume_summarizer`
- Persists results on candidate item: `pi_details, sparse_resume, resume_summary, skills_eval, desired_exp_eval, education_eval`

## Env
- `AWS_REGION` (default `us-east-1`)
- `JD_TABLE_NAME` (default `jobs`)
- `CANDIDATE_TABLE_NAME` (default `candidates`)
- MCP gateway (Cognito OAuth2 client-credentials; token is fetched automatically):
  - `AGENTCORE_GATEWAY_URL` (MCP endpoint)
  - `AGENTCORE_OAUTH_TOKEN_URL` (e.g., your_cognito_domain/oauth2/token)
  - `AGENTCORE_OAUTH_CLIENT_ID` (Cognito app client ID)
  - `AGENTCORE_OAUTH_CLIENT_SECRET` (Cognito app client secret)
  - `AGENTCORE_OAUTH_SCOPE` (default provided in code; override if needed)

## Run
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export AWS_REGION=us-east-1 JD_TABLE_NAME=jobs CANDIDATE_TABLE_NAME=candidates
export AGENTCORE_GATEWAY_URL=https://<gw>.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp
export AGENTCORE_OAUTH_TOKEN_URL=https://<your-cognito-domain>/oauth2/token
export AGENTCORE_OAUTH_CLIENT_ID=<client-id>
export AGENTCORE_OAUTH_CLIENT_SECRET=<client-secret>
# optional: export AGENTCORE_OAUTH_SCOPE="default-m2m-resource-server-kpomdi/read"
python -m agent.resume_processor_agent.main <<<'{"id":"<candidate-id>"}'
```

### Run (direct script)
```bash
cd /home/fl_lpt-464/Documents/agent/agent/resume_processor_agent
export AWS_REGION=us-east-1 JD_TABLE_NAME=jobs CANDIDATE_TABLE_NAME=candidates
export AGENTCORE_GATEWAY_URL=https://<gw>.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp
export AGENTCORE_OAUTH_TOKEN_URL=https://<your-cognito-domain>/oauth2/token
export AGENTCORE_OAUTH_CLIENT_ID=<client-id>
export AGENTCORE_OAUTH_CLIENT_SECRET=<client-secret>
python main.py <<<'{"id":"<candidate-id>"}'
```

## Deploy with AgentCore StarterKit
```bash
agentcore configure -e main.py -r us-east-1 --disable-memory
agentcore launch
```
