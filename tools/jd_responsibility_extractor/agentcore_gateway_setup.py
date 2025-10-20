from typing import Any, Dict


def create_or_update_gateway_target(
    gateway_client: Any,
    gateway_id: str,
    lambda_arn: str,
    target_name: str = "responsibilities",
) -> Dict[str, Any]:
    """Register the jd_responsibility_extractor Lambda as an MCP tool.

    Tool name: jd_responsibility_extractor
    Input schema: { title: str, years_of_experience: str, seniority_level: str, job_page: str, must_have_skills?: [str] }
    """
    lambda_target_config = {
        "mcp": {
            "lambda": {
                "lambdaArn": lambda_arn,
                "toolSchema": {
                    "inlinePayload": [
                        {
                            "name": "jd_responsibility_extractor",
                            "description": "Extracts normalized responsibilities from a job page; returns ONLY JSON.",
                            "inputSchema": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "title": {"type": "string"},
                                    "years_of_experience": {"type": "string"},
                                    "seniority_level": {"type": "string"},
                                    "jd": {"type": "string"},
                                    "must_have_skills": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                },
                                "required": [
                                    "title",
                                    "years_of_experience",
                                    "seniority_level",
                                    "jd",
                                ],
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
            description="JD Responsibility Extractor MCP target (Lambda)",
            targetConfiguration=lambda_target_config,
            credentialProviderConfigurations=credential_config,
        )
        return {"action": "created", "response": resp}
    except Exception as exc:
        if hasattr(gateway_client, "exceptions") and hasattr(gateway_client.exceptions, "ConflictException") and isinstance(exc, gateway_client.exceptions.ConflictException):
            resp = gateway_client.update_gateway_target(
                gatewayIdentifier=gateway_id,
                name=target_name,
                description="JD Responsibility Extractor MCP target (Lambda) — updated",
                targetConfiguration=lambda_target_config,
                credentialProviderConfigurations=credential_config,
                isEnabled=True,
            )
            return {"action": "updated", "response": resp}
        raise


