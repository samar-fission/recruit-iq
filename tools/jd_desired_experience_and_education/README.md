# JD Desired Experience & Education Extractor

Parallel to `jd_skills_extractor`, this tool extracts desired experience and education preferences.

## Structure
- `constants.py`: exact prompt (`DESIRED_EXP_EDU_PROMPT`)
- `tools.py`: `@tool desired_experience_and_education` using Bedrock
- `handler.py`: Lambda entry (title, jd?, must_have_skills?)
- `requirements.txt`: Python deps
- `deploy.sh`: layer + function deploy script
- `template.yaml`: SAM template (CodeUri: ., Handler: handler.handler)
- `logging_config.py`: shared logger
- `constraints.txt`, `.python-version`

## Prerequisites
- Python 3.10+ and `zip`
- AWS CLI configured (Lambda, IAM, Bedrock permissions)
- Bedrock model access (`BEDROCK_MODEL_ID`)

## Environment Variables
- Local/runtime (tool):
  - `BEDROCK_REGION`: e.g., `us-east-1` (defaults to `AWS_REGION` or `us-east-1`)
  - `BEDROCK_MODEL_ID`: e.g., `anthropic.claude-3-5-sonnet-20240620-v1:0`
- Deploy (script uses these if provided):
  - `AWS_REGION`: default `us-east-1`
  - `FUNCTION_NAME`: default `jd-desired-experience-education`
  - `PY_VERSION`: default `python3.11`
  - `USE_RUNTIME_BOTO3`: default `true`
  - `LOG_LEVEL`: default `INFO`

## Local test
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -c 'from tools import desired_experience_and_education_tool as t; print(t("Technical Lead – Java", "", ["Java"]))'
```

## Deploy (script)
```bash
./deploy.sh
```

## Deploy with SAM
```bash
# Build
sam build -t template.yaml --use-container

# Guided deploy (saves S3 bucket in samconfig.toml)
sam deploy --guided \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-desired-experience-education \
  --capabilities CAPABILITY_IAM

# Non-guided (auto-manage artifacts bucket)
sam deploy \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-desired-experience-education \
  --parameter-overrides \
    BedrockRegion=us-east-1 \
    BedrockModelId=anthropic.claude-3-5-sonnet-20240620-v1:0 \
    FunctionName=jd-desired-experience-education \
  --capabilities CAPABILITY_IAM \
  --resolve-s3

# Using built template
sam deploy -t .aws-sam/build/template.yaml --region us-east-1 \
  --stack-name jd-desired-experience-education --capabilities CAPABILITY_IAM --resolve-s3
```

## Invoke after deploy
```bash
aws lambda invoke \
  --function-name jd-desired-experience-education \
  --region ${AWS_REGION:-us-east-1} \
  --cli-binary-format raw-in-base64-out \
  --payload '{"title":"Technical Lead – Java","jd":"","must_have_skills":["Java"]}' \
  out.json && cat out.json && echo
```

## AgentCore (MCP) Registration
Use `agentcore_gateway_setup.py` to create/update a Lambda-backed MCP tool target.
