import { getEnv } from "./env";
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from "@aws-sdk/client-bedrock-agentcore";
import { nanoid } from "nanoid";

type JdProcessInput = {
  title: string;
  years_of_experience: number;
  seniority_level: string;
  jd_text: string;
};

type JdProcessOutput = {
  skills: any;
  education_desired_experience: any;
  responsibilities: Array<{ text: string; source_section?: string }>
};

type ResumeProcessInput = { resume_text: string; job_id: string };
type ResumeProcessOutput = {
  resume_summary: any;
  pi_details: any;
  skills_eval: any;
  desired_exp_eval: any;
  education_eval: any;
  sparse_resume?: boolean | string;
  status?: string;
};

async function callJdAgentCore(jobId: string): Promise<JdProcessOutput> {
  const env = getEnv();
  if (!env.JD_AGENT_RUNTIME_ARN) throw new Error("JD AgentCore runtime ARN not configured");
  const client = new BedrockAgentCoreClient({ region: env.AWS_REGION });
  const payload = new TextEncoder().encode(JSON.stringify({ jd_id: String(jobId) }));
  const cmd = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: env.JD_AGENT_RUNTIME_ARN,
    runtimeSessionId: nanoid(40),
    qualifier: "DEFAULT",
    payload,
  });
  const resp = await client.send(cmd);
  const text = await resp.response?.transformToString();
  return text ? (JSON.parse(text) as JdProcessOutput) : ({} as JdProcessOutput);
}

async function callResumeAgentCore(candidateId: string): Promise<ResumeProcessOutput> {
  const env = getEnv();
  if (!env.RESUME_AGENT_RUNTIME_ARN) throw new Error("Resume AgentCore runtime ARN not configured");
  const client = new BedrockAgentCoreClient({ region: env.AWS_REGION });
  const payload = new TextEncoder().encode(JSON.stringify({ id: String(candidateId) }));
  const cmd = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: env.RESUME_AGENT_RUNTIME_ARN,
    runtimeSessionId: nanoid(40),
    qualifier: "DEFAULT",
    payload,
  });
  const resp = await client.send(cmd);
  const text = await resp.response?.transformToString();
  return text ? (JSON.parse(text) as ResumeProcessOutput) : ({} as ResumeProcessOutput);
}

export async function callJdProcess(input: JdProcessInput & { id?: string }): Promise<JdProcessOutput> {
  const env = getEnv();
  if (env.JD_AGENT_RUNTIME_ARN && input.id) {
    return callJdAgentCore(input.id);
  }
  throw new Error("JD_AGENT_RUNTIME_ARN is required");
}

export async function callResumeProcess(input: ResumeProcessInput & { id?: string }): Promise<ResumeProcessOutput> {
  const env = getEnv();
  if (env.RESUME_AGENT_RUNTIME_ARN && input.id) {
    return callResumeAgentCore(input.id);
  }
  throw new Error("RESUME_AGENT_RUNTIME_ARN is required");
}


