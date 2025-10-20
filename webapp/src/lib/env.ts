// Environment configuration and validation using zod
import { z } from "zod";

const EnvSchema = z.object({
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  DYNAMO_TABLE_USERS: z.string().default("users"),
  DYNAMO_TABLE_JOBS: z.string().default("jobs"),
  DYNAMO_TABLE_CANDIDATES: z.string().default("candidates"),

  JWT_SECRET: z.string().min(5, "JWT_SECRET should be reasonably long"),

  // Bedrock AgentCore runtime ARNs (defaults provided)
  JD_AGENT_RUNTIME_ARN: z
    .string()
    .default(
      "arn:aws:bedrock-agentcore:us-east-1:834406757853:runtime/jd_process-9x8vIt8rC6",
    ),
  RESUME_AGENT_RUNTIME_ARN: z
    .string()
    .default(
      "arn:aws:bedrock-agentcore:us-east-1:834406757853:runtime/resume_process-BLU2i17X0m",
    ),
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = EnvSchema.safeParse({
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,

    DYNAMO_TABLE_USERS: process.env.DYNAMO_TABLE_USERS,
    DYNAMO_TABLE_JOBS: process.env.DYNAMO_TABLE_JOBS,
    DYNAMO_TABLE_CANDIDATES: process.env.DYNAMO_TABLE_CANDIDATES,

    JWT_SECRET: process.env.JWT_SECRET,

    AGENTCORE_BASE_URL: process.env.AGENTCORE_BASE_URL,
    AGENTCORE_JD_PROCESS: process.env.AGENTCORE_JD_PROCESS,
    AGENTCORE_RESUME_PROCESS: process.env.AGENTCORE_RESUME_PROCESS,
    AGENTCORE_API_KEY: process.env.AGENTCORE_API_KEY,

    AGENTCORE_JD_LAMBDA_ARN: process.env.AGENTCORE_JD_LAMBDA_ARN,
    AGENTCORE_RESUME_LAMBDA_ARN: process.env.AGENTCORE_RESUME_LAMBDA_ARN,
  });

  if (!parsed.success) {
    const formatted = parsed.error.format();
    throw new Error(
      `Invalid environment configuration. Please set required variables. Details: ${JSON.stringify(
        formatted,
      )}`,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isAgentCoreConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.JD_AGENT_RUNTIME_ARN && env.RESUME_AGENT_RUNTIME_ARN);
}

export const tables = {
  users: () => getEnv().DYNAMO_TABLE_USERS,
  jobs: () => getEnv().DYNAMO_TABLE_JOBS,
  candidates: () => getEnv().DYNAMO_TABLE_CANDIDATES,
};


