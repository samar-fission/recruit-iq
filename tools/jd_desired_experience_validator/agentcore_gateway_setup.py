from typing import Any, Dict


def create_or_update_gateway_target(
    gateway_client: Any,
    gateway_id: str,
    lambda_arn: str,
    target_name: str = "jd-desired-experience-validator",
) -> Dict[str, Any]:
    """Register the jd_desired_experience_validator Lambda as an MCP tool.

    Tool name: jd_desired_experience_validator
    Input schema: { desired_experience: [{ experience: str, source_section: enum }] }
    """
    lambda_target_config = {
        "mcp": {
            "lambda": {
                "lambdaArn": lambda_arn,
                "toolSchema": {
                    "inlinePayload": [
                        {
                            "name": "jd_desired_experience_validator",
                            "description": "Validates/rephrases desired experience statements; returns ONLY JSON.",
                            "inputSchema": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "desired_experience": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "additionalProperties": False,
                                            "properties": {
                                                "experience": {"type": "string"},
                                                "source_section": {
                                                    "type": "string",
                                                    "enum": [
                                                        "Requirements",
                                                        "Qualifications",
                                                        "Responsibilities",
                                                        "Must Have",
                                                        "About You",
                                                        "Job Summary",
                                                        "Inferred from Title",
                                                        "Inferred from Skills",
                                                    ],
                                                },
                                            },
                                            "required": ["experience", "source_section"],
                                        },
                                    }
                                },
                                "required": ["desired_experience"],
                            },
                        }
                    ]
                },
                "invocation": {"timeoutMs": 20000, "payloadFormat": "json"},
            }
        }
    }

    credential_config = [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]

    try:
        resp = gateway_client.create_gateway_target(
            gatewayIdentifier=gateway_id,
            name=target_name,
            description="JD Desired Experience Validator MCP target (Lambda)",
            targetConfiguration=lambda_target_config,
            credentialProviderConfigurations=credential_config,
        )
        return {"action": "created", "response": resp}
    except Exception as exc:
        if hasattr(gateway_client, "exceptions") and hasattr(gateway_client.exceptions, "ConflictException") and isinstance(exc, gateway_client.exceptions.ConflictException):
            resp = gateway_client.update_gateway_target(
                gatewayIdentifier=gateway_id,
                name=target_name,
                description="JD Desired Experience Validator MCP target (Lambda) — updated",
                targetConfiguration=lambda_target_config,
                credentialProviderConfigurations=credential_config,
                isEnabled=True,
            )
            return {"action": "updated", "response": resp}
        raise


