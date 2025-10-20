from typing import Any, Dict


def create_or_update_gateway_target(
    gateway_client: Any,
    gateway_id: str,
    lambda_arn: str,
    target_name: str = "resume-summarizer",
) -> Dict[str, Any]:
    """Register the resume_summarizer Lambda as an MCP tool."""
    lambda_target_config = {
        "mcp": {
            "lambda": {
                "lambdaArn": lambda_arn,
                "toolSchema": {
                    "inlinePayload": [
                        {
                            "name": "resume_summarizer",
                            "description": "Produces a deterministic JD–resume summary; JSON only.",
                            "inputSchema": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "jd_text": {"type": "string"},
                                    "resume_text": {"type": "string"},
                                    "skills": {"type": "array", "items": {"type": "string"}},
                                    "desired_experience": {"type": "array", "items": {"type": "string"}},
                                    "education": {"type": "array", "items": {"type": "string"}},
                                },
                                "required": ["jd_text", "resume_text"],
                            },
                        }
                    ]
                },
                "invocation": {"timeoutMs": 30000, "payloadFormat": "json"},
            }
        }
    }

    credential_config = [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]
    try:
        resp = gateway_client.create_gateway_target(
            gatewayIdentifier=gateway_id,
            name=target_name,
            description="Resume Summarizer MCP target (Lambda)",
            targetConfiguration=lambda_target_config,
            credentialProviderConfigurations=credential_config,
        )
        return {"action": "created", "response": resp}
    except Exception as exc:
        if hasattr(gateway_client, "exceptions") and hasattr(gateway_client.exceptions, "ConflictException") and isinstance(exc, gateway_client.exceptions.ConflictException):
            resp = gateway_client.update_gateway_target(
                gatewayIdentifier=gateway_id,
                name=target_name,
                description="Resume Summarizer MCP target (Lambda) — updated",
                targetConfiguration=lambda_target_config,
                credentialProviderConfigurations=credential_config,
                isEnabled=True,
            )
            return {"action": "updated", "response": resp}
        raise
