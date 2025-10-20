# JD Desired Experience Validator

Validates and (if needed) rephrases desired experience statements from a JD. Mirrors the structure and usage of `jd_skills_extractor`.

## Structure
- `constants.py`: Validator prompt (`DESIRED_EXP_VALIDATOR_PROMPT`)
- `tools.py`: `@tool desired_experience_validator` (Bedrock-backed)
- `handler.py`: Lambda entry (expects `desired_experience: list`)
- `requirements.txt`: Python dependencies
- `constraints.txt`: Frozen no-op constraints (kept for parity)
- `.python-version`: Python 3.11.xx
- `deploy.sh`: Layer + Function deploy script
- `template.yaml`: SAM template (CodeUri: ., Handler: handler.handler)
- `logging_config.py`: Shared logging setup

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
  - `FUNCTION_NAME`: default `jd-desired-experience-validator`
  - `PY_VERSION`: default `python3.11`
  - `USE_RUNTIME_BOTO3`: default `true`
  - `LOG_LEVEL`: default `INFO`

## Local Test
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -c "from tools import desired_experience_validator_tool as t; print(t('{\"desired_experience\":[{\"experience\":\"Proven experience...\",\"source_section\":\"Requirements\"}]}'))"
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
  --stack-name jd-desired-experience-validator \
  --capabilities CAPABILITY_IAM

# Non-guided
sam deploy \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-desired-experience-validator \
  --parameter-overrides \
    BedrockRegion=us-east-1 \
    BedrockModelId=anthropic.claude-3-5-sonnet-20240620-v1:0 \
    FunctionName=jd-desired-experience-validator \
  --capabilities CAPABILITY_IAM \
  --resolve-s3

# Using built template
sam deploy -t .aws-sam/build/template.yaml --region us-east-1 \
  --stack-name jd-desired-experience-validator --capabilities CAPABILITY_IAM --resolve-s3
```

## Invoke after deploy
```bash
aws lambda invoke \
  --function-name jd-desired-experience-validator \
  --region ${AWS_REGION:-us-east-1} \
  --cli-binary-format raw-in-base64-out \
  --payload '{"desired_experience":[{"experience":"Proven experience...","source_section":"Requirements"}]}' \
  out.json && cat out.json && echo
```
