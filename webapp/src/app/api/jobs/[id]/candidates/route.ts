import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { candidateCreateSchema } from "@/lib/candidateSchemas";
import { createCandidate, listCandidatesByJob, updateCandidateEvaluations } from "@/lib/candidatesRepo";
import { callResumeProcess } from "@/lib/agentcore";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const items = await listCandidatesByJob(params.id);
  return NextResponse.json({ items });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = candidateCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = nanoid();
  const now = new Date().toISOString();
  await createCandidate({
    id,
    job_id: params.id,
    status: "processing",
    resume_text: parsed.data.resume_text,
    created_at: now,
    updated_at: now,
  });

  const agent = await callResumeProcess({ resume_text: parsed.data.resume_text, job_id: params.id, id });
  await updateCandidateEvaluations(id, {
    resume_summary: agent.resume_summary,
    pi_details: agent.pi_details,
    skills_eval: agent.skills_eval,
    desired_exp_eval: agent.desired_exp_eval,
    education_eval: agent.education_eval,
    sparse_resume: agent.sparse_resume,
    status: agent.status || "completed",
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ id }, { status: 201 });
}


