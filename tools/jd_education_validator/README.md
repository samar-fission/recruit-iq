# JD Education Validator

Validates and (if needed) rephrases education requirements from a JD. Mirrors `jd_skills_extractor` structure.

## Structure
- `constants.py`: prompt (`EDUCATION_VALIDATOR_PROMPT`)
- `tools.py`: `@tool education_validator` (Bedrock-backed)
- `handler.py`: Lambda entry (expects `education_preference: list`)
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
  - `FUNCTION_NAME`: default `jd-education-validator`
  - `PY_VERSION`: default `python3.11`
  - `USE_RUNTIME_BOTO3`: default `true`
  - `LOG_LEVEL`: default `INFO`

## Local Test
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -c "from tools import education_validator_tool as t; print(t('{\"education_preference\":[{\"education\":\"Bachelor\'s degree in CS or related field\",\"source_section\":\"Qualifications\"}]}'))"
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
  --stack-name jd-education-validator \
  --capabilities CAPABILITY_IAM

# Non-guided
sam deploy \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-education-validator \
  --parameter-overrides \
    BedrockRegion=us-east-1 \
    BedrockModelId=anthropic.claude-3-5-sonnet-20240620-v1:0 \
    FunctionName=jd-education-validator \
  --capabilities CAPABILITY_IAM \
  --resolve-s3

# Using built template
sam deploy -t .aws-sam/build/template.yaml --region us-east-1 \
  --stack-name jd-education-validator --capabilities CAPABILITY_IAM --resolve-s3
```

## Invoke after deploy
```bash
aws lambda invoke \
  --function-name jd-education-validator \
  --region ${AWS_REGION:-us-east-1} \
  --cli-binary-format raw-in-base64-out \
  --payload '{"education_preference":[{"education":"Bachelor\'s degree in CS or related field","source_section":"Qualifications"}]}' \
  out.json && cat out.json && echo
```
