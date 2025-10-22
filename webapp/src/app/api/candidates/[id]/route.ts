import { NextResponse } from "next/server";
import { candidateUpdateSchema } from "@/lib/candidateSchemas";
import { callResumeProcess } from "@/lib/agentcore";
import { getCandidate, updateCandidateEvaluations } from "@/lib/candidatesRepo";

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await getCandidate(params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = candidateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const now = new Date().toISOString();
  // First set status to processing
  await updateCandidateEvaluations(params.id, { status: "processing", updated_at: now, resume_text: parsed.data.resume_text });

  const existing = await getCandidate(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const agent = await callResumeProcess({ resume_text: parsed.data.resume_text, job_id: existing.job_id, id: params.id });
  await updateCandidateEvaluations(params.id, {
    resume_summary: agent.resume_summary,
    pi_details: agent.pi_details,
    skills_eval: agent.skills_eval,
    desired_exp_eval: agent.desired_exp_eval,
    education_eval: agent.education_eval,
    sparse_resume: agent.sparse_resume,
    status: agent.status || "completed",
    updated_at: new Date().toISOString(),
  });

  const updated = await getCandidate(params.id);
  return NextResponse.json(updated);
}


