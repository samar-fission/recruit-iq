from typing import Any, Dict
import os
import json


def create_or_update_gateway_target(
    gateway_client: Any,
    gateway_id: str,
    lambda_arn: str,
    target_name: str = "jd-skills-lambda",
) -> Dict[str, Any]:
    """Create or update an AgentCore MCP Gateway target for the JD skills extractor.

    This registers a Lambda-backed MCP tool named 'jd_extract_jd_skills' that accepts
    a single argument 'jd_text' (string) and returns JSON (as produced by Lambda).
    """

    # --- Define the target configuration for a Lambda-backed MCP tool ---
    lambda_target_config = {
        "mcp": {
            "lambda": {
                "lambdaArn": lambda_arn,
                # Optional: override region if needed; usually derived from ARN
                # "region": "ap-south-1",
                "toolSchema": {
                    "inlinePayload": [
                        {
                            "name": "jd_extract_jd_skills",
                            "description": "Extracts structured skills from a Job Description (JD) text and returns JSON only.",
                            "inputSchema": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "jd": {
                                        "type": "string",
                                        "minLength": 5,
                                        "description": "Full JD text (plain text).",
                                    }
                                },
                                "required": ["jd"],
                            },
                        }
                        # Add more tools here if this same Lambda handles them
                    ]
                },
                # Optional request/response wrapping if Lambda expects nested bodies:
                # "requestWrapperKey": "body",
                # "responseWrapperKey": "body",
                "invocation": {
                    "timeoutMs": 20000,
                    "payloadFormat": "json",
                },
            }
        }
    }

    # --- How the Gateway should obtain credentials to invoke Lambda ---
    credential_config = [
        {
            "credentialProviderType": "GATEWAY_IAM_ROLE"
            # Ensure the Gateway's IAM role has lambda:InvokeFunction on the function/qualifier
        }
    ]

    try:
        response = gateway_client.create_gateway_target(
            gatewayIdentifier=gateway_id,
            name=target_name,
            description="JD Skills extractor MCP target (Lambda-backed)",
            targetConfiguration=lambda_target_config,
            credentialProviderConfigurations=credential_config,
        )
        return {"action": "created", "response": response}
    except Exception as exc:
        # If target exists, attempt update; callers can further refine exception handling
        if hasattr(gateway_client, "exceptions") and hasattr(gateway_client.exceptions, "ConflictException") and isinstance(exc, gateway_client.exceptions.ConflictException):
            response = gateway_client.update_gateway_target(
                gatewayIdentifier=gateway_id,
                name=target_name,
                description="JD Skills extractor MCP target (Lambda-backed) — updated",
                targetConfiguration=lambda_target_config,
                credentialProviderConfigurations=credential_config,
                isEnabled=True,
            )
            return {"action": "updated", "response": response}
        raise


if __name__ == "__main__":
    # Optional CLI for quick setup
    # You must provide a preconfigured 'gateway_client' from your runtime. This CLI
    # demonstrates the shape; in practice you'll import your client factory here.
    print(
        json.dumps(
            {
                "hint": "Import this module and call create_or_update_gateway_target(gateway_client, gateway_id, lambda_arn)",
                "env": {
                    "GATEWAY_ID": os.getenv("GATEWAY_ID", "<your-gateway-id>"),
                    "LAMBDA_ARN": os.getenv("LAMBDA_ARN", "arn:aws:lambda:region:acct:function:jd-skills-extractor:live"),
                    "TARGET_NAME": os.getenv("TARGET_NAME", "jd-skills-lambda"),
                },
            },
            indent=2,
        )
    )


