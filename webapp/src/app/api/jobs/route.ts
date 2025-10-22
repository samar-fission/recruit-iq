import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { jobEditableSchema } from "@/lib/jobSchemas";
import { createJob, listJobs, updateJobDerived } from "@/lib/jobsRepo";
import { callJdProcess } from "@/lib/agentcore";

export const maxDuration = 60;

export async function GET() {
  const items = await listJobs();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = jobEditableSchema.safeParse({
    ...body,
    years_of_experience: Number(body?.years_of_experience),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const id = nanoid();
  const now = new Date().toISOString();

  await createJob({
    id,
    title: data.title,
    years_of_experience: data.years_of_experience,
    seniority_level: data.seniority_level,
    jd_text: data.jd_text,
    created_at: now,
    updated_at: now,
  });

  // synchronous AgentCore call
  const agent = await callJdProcess({
    id,
    title: data.title,
    years_of_experience: data.years_of_experience,
    seniority_level: data.seniority_level,
    jd_text: data.jd_text,
  });

  await updateJobDerived(id, {
    skills: agent.skills,
    education_desired_experience: agent.education_desired_experience,
    responsibilities: agent.responsibilities,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ id }, { status: 201 });
}


