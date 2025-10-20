#!/usr/bin/env bash
set -euo pipefail

# This script is expected to live inside jd_desired_experience_validator/

# Config
REGION=${AWS_REGION:-us-east-1}
FUNCTION_NAME=${FUNCTION_NAME:-jd-desired-experience-validator}
PY_VERSION=${PY_VERSION:-python3.11}
USE_RUNTIME_BOTO3=${USE_RUNTIME_BOTO3:-true}
BEDROCK_REGION=${BEDROCK_REGION:-$REGION}
BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID:-anthropic.claude-3-5-sonnet-20240620-v1:0}
LOG_LEVEL=${LOG_LEVEL:-INFO}

WORKDIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$WORKDIR/.." && pwd)"
BUILD_DIR="$WORKDIR/.build"
DEPS_DIR="$BUILD_DIR/dependencies"

echo "[1/6] Cleaning build directory: $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$DEPS_DIR"

echo "[2/6] Creating venv for deterministic layer build"
python3 -m venv "$BUILD_DIR/venv"
source "$BUILD_DIR/venv/bin/activate"
pip install --upgrade pip

echo "[3/6] Installing dependencies into layer directory"
REQS_FILE="$BUILD_DIR/requirements.effective.txt"
if [ "$USE_RUNTIME_BOTO3" = "true" ]; then
  grep -vE '^boto3(==|>=|$)' "$WORKDIR/requirements.txt" > "$REQS_FILE" || true
else
  cp "$WORKDIR/requirements.txt" "$REQS_FILE"
fi
pip install \
  -r "$REQS_FILE" \
  --only-binary=:all: \
  --no-cache-dir \
  --disable-pip-version-check \
  -t "$DEPS_DIR/python"

find "$DEPS_DIR/python" -type d -name "__pycache__" -prune -exec rm -rf {} +
find "$DEPS_DIR/python" -type f -name "*.pyc" -delete
find "$DEPS_DIR/python" -type d -name "tests" -prune -exec rm -rf {} +

echo "[4/6] Zipping layer and function"
cd "$DEPS_DIR" && zip -9 -qr "$BUILD_DIR/dependencies.zip" . && cd "$PROJECT_ROOT"

APP_SRC="$BUILD_DIR/app_src"
APP_PKG_DIR="$APP_SRC/jd_desired_experience_validator"
mkdir -p "$APP_PKG_DIR"
cp "$WORKDIR/__init__.py" "$APP_PKG_DIR/"
cp "$WORKDIR/"*.py "$APP_PKG_DIR/"

cd "$APP_SRC" && zip -qr "$BUILD_DIR/app.zip" jd_desired_experience_validator && cd "$PROJECT_ROOT"

echo "[5/6] Creating/Updating Lambda layer"
LAYER_NAME="${FUNCTION_NAME}-layer"
LAYER_ARN=$(aws lambda publish-layer-version \
  --layer-name "$LAYER_NAME" \
  --region "$REGION" \
  --description "Dependencies for $FUNCTION_NAME" \
  --compatible-runtimes python3.10 python3.11 \
  --zip-file "fileb://$BUILD_DIR/dependencies.zip" \
  --query 'LayerVersionArn' --output text)

echo "Published layer: $LAYER_ARN"

ROLE_NAME="${FUNCTION_NAME}-execution-role"
ASSUME_ROLE_DOC='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}'

if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "[5a] Creating IAM role $ROLE_NAME"
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$ASSUME_ROLE_DOC" >/dev/null
  aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole >/dev/null
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name BedrockInvoke \
    --policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        "Resource": "*"
      }]
    }' >/dev/null
  echo "Waiting for role to be usable..."
  sleep 10
fi

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

echo "[6/6] Creating or updating Lambda function $FUNCTION_NAME"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$BUILD_DIR/app.zip" \
    --region "$REGION" >/dev/null
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --runtime "$PY_VERSION" \
    --handler jd_desired_experience_validator.handler.handler \
    --layers "$LAYER_ARN" \
    --environment "Variables={BEDROCK_REGION=$BEDROCK_REGION,BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID,LOG_LEVEL=$LOG_LEVEL}" \
    --region "$REGION" >/dev/null
else
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$PY_VERSION" \
    --handler jd_desired_experience_validator.handler.handler \
    --zip-file "fileb://$BUILD_DIR/app.zip" \
    --role "$ROLE_ARN" \
    --layers "$LAYER_ARN" \
    --environment "Variables={BEDROCK_REGION=$BEDROCK_REGION,BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID,LOG_LEVEL=$LOG_LEVEL}" \
    --timeout 30 \
    --memory-size 512 \
    --region "$REGION" >/dev/null
fi

echo "Done. Test with:\naws lambda invoke --function-name $FUNCTION_NAME --region $REGION --cli-binary-format raw-in-base64-out --payload '{\"desired_experience\":[{\"experience\":\"Proven experience ...\",\"source_section\":\"Requirements\"}]}' out.json && cat out.json && echo"


