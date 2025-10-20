# JD Skills Extractor

Minimal tool and Lambda handler that takes a Job Description (JD) and returns ONLY JSON per the frozen taxonomy prompt (kept verbatim in `constants.py`).

## Structure
- `constants.py`: The exact JD taxonomy prompt (unchanged)
- `tools.py`: `@tool extract_jd_skills` that calls Amazon Bedrock and returns JSON
- `handler.py`: AWS Lambda entrypoint calling the tool with the `jd` input
- `requirements.txt`: Python dependencies
- `deploy.sh`: Builds a Lambda layer, zips code, and deploys/updates the function
- `agentcore_gateway_setup.py`: Helper to register this Lambda as an MCP tool in AgentCore

## Prerequisites
- Python 3.10+ and `zip`
- AWS CLI configured with permissions for Lambda, IAM, and Bedrock
- Bedrock model access (set `BEDROCK_MODEL_ID`)

## Environment Variables
- Local/runtime (tool):
  - `BEDROCK_REGION`: e.g., `us-east-1` (defaults to `AWS_REGION` or `us-east-1`)
  - `BEDROCK_MODEL_ID`: e.g., `anthropic.claude-3-5-sonnet-20240620-v1:0`
- Deploy (script uses these if provided):
  - `AWS_REGION`: AWS region to deploy (default: `us-east-1`)
  - `FUNCTION_NAME`: Lambda name (default: `jd-skills-extractor`)
  - `PY_VERSION`: Python runtime (default: `python3.11`)
  - `ARCH`: Architecture (default: `arm64`)
  - `USE_RUNTIME_BOTO3`: default `true`. When `true`, boto3 is excluded from the layer to reduce size (Lambda runtime provides boto3). Set `false` to bundle boto3.
- AWS credentials for deploy: via `AWS_PROFILE` or env (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `AWS_SESSION_TOKEN`)

## Local Test
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
BEDROCK_REGION=us-east-1 BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0 \
python handler.py << 'EOF'
<Paste a full JD here>
EOF
```

## Deploy to AWS Lambda
```bash
./deploy.sh
```
Defaults:
- Function name: `jd-skills-extractor`
- Handler: `jd_skills_extractor.handler.handler`
- Region: `${AWS_REGION:-us-east-1}`
- Runtime: `python3.11`
- Arch: `arm64`

The script publishes a dependencies layer and attaches minimal IAM including Bedrock invoke actions.

## Deploy with AWS SAM (CloudFormation)
- Build
```bash
sam build -t template.yaml
```

- Deploy (guided; sets/retains S3 bucket in samconfig.toml)
```bash
sam deploy --guided \
  -t jd_skills_extractor/template.yaml \
  --region us-east-1 \
  --stack-name jd-skills-extractor \
  --capabilities CAPABILITY_IAM
```

- Deploy (non-guided; auto-manage artifacts bucket)
```bash
sam deploy \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-skills-extractor \
  --parameter-overrides \
    BedrockRegion=us-east-1 \
    BedrockModelId=anthropic.claude-3-5-sonnet-20240620-v1:0 \
    FunctionName=jd-skills-extractor \
  --capabilities CAPABILITY_IAM \
  --resolve-s3
```

- Deploy (non-guided; explicit artifacts bucket/prefix)
```bash
sam deploy \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-skills-extractor \
  --s3-bucket <your-artifacts-bucket> \
  --s3-prefix jd-skills-extractor \
  --parameter-overrides \
    BedrockRegion=us-east-1 \
    BedrockModelId=anthropic.claude-3-5-sonnet-20240620-v1:0 \
    FunctionName=jd-skills-extractor \
  --capabilities CAPABILITY_IAM
```

- Deploy using BUILT template (recommended after `sam build`)
```bash
sam deploy -t .aws-sam/build/template.yaml --region us-east-1 \
  --stack-name jd-skills-extractor --capabilities CAPABILITY_IAM --resolve-s3
```

Note: In template.yaml, the handler is `handler.handler` because the template resides in the `jd_skills_extractor/` folder and `CodeUri: .` points to that folder.

### Layer Size Tips
- Keep `USE_RUNTIME_BOTO3=true` (default) so boto3 is not bundled.
- The script prunes `__pycache__`, `*.pyc`, tests to reduce zip size (but keeps `*.dist-info`).
- If still over 70 MB compressed, review dependencies and pin lighter versions.

## Invoke after deploy
```bash
aws lambda invoke \
  --function-name jd-skills-extractor \
  --region ${AWS_REGION:-us-east-1} \
  --cli-binary-format raw-in-base64-out \
  --payload '{"jd":"<Paste full JD text here>"}' out.json && cat out.json && echo
```

## AgentCore (MCP) Registration
Use `agentcore_gateway_setup.py` to create/update a Lambda-backed MCP tool target:
- Inputs needed: `gateway_id`, deployed `lambda_arn`
- The tool is registered as `extract_jd_skills` with input `{ jd_text: string }`
