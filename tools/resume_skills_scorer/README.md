# Resume Skills Scorer

Scores required skills against a resume text deterministically; returns ONLY JSON.

## Structure
- `constants.py`: prompt (`RESUME_SKILLS_SCORER_PROMPT`)
- `tools.py`: `@tool resume_skills_scorer`
- `handler.py`: Lambda entry (expects `resume_text`, `skills_with_context`)
- `requirements.txt`, `constraints.txt`, `.python-version`
- `deploy.sh`, `template.yaml`
- `logging_config.py`, `agentcore_gateway_setup.py`

## Prerequisites
- Python 3.10+ and `zip`
- AWS CLI configured (Lambda, IAM, Bedrock permissions)
- Bedrock model access (`BEDROCK_MODEL_ID`)

## Environment Variables
- Local/runtime (tool):
  - `BEDROCK_REGION`: e.g., `us-east-1` (defaults to `AWS_REGION` or `us-east-1`)
  - `BEDROCK_MODEL_ID`: default model if per-tool override not set
  - `RESUME_SKILLS_SCORER_MODEL_ID`: optional per-tool override. Example Sonnet 4 MedL: `anthropic.claude-3-7-sonnet-20250219-v1:0`
- Deploy (script uses these if provided):
  - `AWS_REGION`: default `us-east-1`
  - `FUNCTION_NAME`: default `jd-resume-skills-scorer`
  - `PY_VERSION`: default `python3.11`
  - `USE_RUNTIME_BOTO3`: default `true`
  - `LOG_LEVEL`: default `INFO`

## Local Test
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -c 'from tools import resume_skills_scorer as t; print(t("I built Spring Boot services on AWS...", [{"skill":"Java","jd_context":"Backend services"}]))'
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
  --stack-name jd-resume-skills-scorer \
  --capabilities CAPABILITY_IAM

# Non-guided
sam deploy \
  -t template.yaml \
  --region us-east-1 \
  --stack-name jd-resume-skills-scorer \
  --parameter-overrides \
    BedrockRegion=us-east-1 \
    BedrockModelId=anthropic.claude-3-5-sonnet-20240620-v1:0 \
    FunctionName=jd-resume-skills-scorer \
  --capabilities CAPABILITY_IAM \
  --resolve-s3

# Using built template
sam deploy -t .aws-sam/build/template.yaml --region us-east-1 \
  --stack-name jd-resume-skills-scorer --capabilities CAPABILITY_IAM --resolve-s3
```
## Per-tool model override example
To run this tool on Sonnet 4 MedL without changing others:
```bash
export RESUME_SKILLS_SCORER_MODEL_ID=anthropic.claude-3-7-sonnet-20250219-v1:0
```
