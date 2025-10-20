from typing import Any, Dict


def create_or_update_gateway_target(
    gateway_client: Any,
    gateway_id: str,
    lambda_arn: str,
    target_name: str = "resume-sparse-checker",
) -> Dict[str, Any]:
    """Register the jd_resume_sparse_checker Lambda as an MCP tool."""
    lambda_target_config = {
        "mcp": {
            "lambda": {
                "lambdaArn": lambda_arn,
                "toolSchema": {
                    "inlinePayload": [
                        {
                            "name": "resume_sparse_checker",
                            "description": "Checks if a resume is sparse (JSON only).",
                            "inputSchema": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "resume_text": {"type": "string"},
                                },
                                "required": ["resume_text"],
                            },
                        }
                    ]
                },
                "invocation": {"timeoutMs": 15000, "payloadFormat": "json"},
            }
        }
    }

    credential_config = [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]
    try:
        resp = gateway_client.create_gateway_target(
            gatewayIdentifier=gateway_id,
            name=target_name,
            description="Resume Sparse Checker MCP target (Lambda)",
            targetConfiguration=lambda_target_config,
            credentialProviderConfigurations=credential_config,
        )
        return {"action": "created", "response": resp}
    except Exception as exc:
        if hasattr(gateway_client, "exceptions") and hasattr(gateway_client.exceptions, "ConflictException") and isinstance(exc, gateway_client.exceptions.ConflictException):
            resp = gateway_client.update_gateway_target(
                gatewayIdentifier=gateway_id,
                name=target_name,
                description="Resume Sparse Checker MCP target (Lambda) — updated",
                targetConfiguration=lambda_target_config,
                credentialProviderConfigurations=credential_config,
                isEnabled=True,
            )
            return {"action": "updated", "response": resp}
        raise


