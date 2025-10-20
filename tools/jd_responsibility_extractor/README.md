# JD Responsibility Extractor

Extracts normalized, action-oriented responsibilities from a job page. Mirrors `jd_skills_extractor` structure.

## Structure
- `constants.py`: prompt (`RESPONSIBILITY_PROMPT`)
- `tools.py`: `@tool jd_responsibility_extractor` (Bedrock-backed)
- `handler.py`: Lambda entry (expects `title`, `years_of_experience`, `seniority_level`, `job_page`, optional `must_have_skills`)
- `requirements.txt`, `constraints.txt`, `.python-version`
- `deploy.sh`: layer + function deploy script
- `template.yaml`: SAM (CodeUri: ., Handler: handler.handler)
- `logging_config.py`

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
  - `FUNCTION_NAME`: default `jd-responsibility-extractor`
  - `PY_VERSION`: default `python3.11`
  - `USE_RUNTIME_BOTO3`: default `true`
  - `LOG_LEVEL`: default `INFO`

## Local Test
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -c "from tools import responsibility_extractor_tool as t; print(t('Senior Backend Engineer – FinTech','8–10 years','Senior','<job page text>',['AWS','Docker']))"
```

## Deploy (script)
```bash
./deploy.sh
```

## Deploy with SAM
```bash
# Build
sam build -t template.yaml --use-container

# Guided deploy
sam deploy --guided \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-responsibility-extractor \
  --capabilities CAPABILITY_IAM

# Non-guided
sam deploy \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-responsibility-extractor \
  --parameter-overrides \
    BedrockRegion=us-east-1 \
    BedrockModelId=anthropic.claude-3-5-sonnet-20240620-v1:0 \
    FunctionName=jd-responsibility-extractor \
  --capabilities CAPABILITY_IAM \
  --resolve-s3

# Using built template
sam deploy -t .aws-sam/build/template.yaml --region us-east-1 \
  --stack-name jd-responsibility-extractor --capabilities CAPABILITY_IAM --resolve-s3
```

## Invoke after deploy
```bash
aws lambda invoke \
  --function-name jd-responsibility-extractor \
  --region ${AWS_REGION:-us-east-1} \
  --cli-binary-format raw-in-base64-out \
  --payload '{"title":"Senior Backend Engineer – FinTech","years_of_experience":"8–10 years","seniority_level":"Senior","job_page":"<paste job page text>","must_have_skills":["AWS","Docker"]}' \
  out.json && cat out.json && echo
```
