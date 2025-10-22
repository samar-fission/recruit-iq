import { NextResponse } from "next/server";
import { jobEditableSchema } from "@/lib/jobSchemas";
import { callJdProcess } from "@/lib/agentcore";
import { getJob, overwriteJobEditable } from "@/lib/jobsRepo";

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await getJob(params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = jobEditableSchema.safeParse({
    ...body,
    years_of_experience: Number(body?.years_of_experience),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  await overwriteJobEditable(params.id, {
    ...data,
    updated_at: new Date().toISOString(),
  } as any);

  await callJdProcess({
    id: params.id,
    title: data.title,
    years_of_experience: data.years_of_experience,
    seniority_level: data.seniority_level,
    jd_text: data.jd_text,
  });

  const updated = await getJob(params.id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  // Deletion handled elsewhere; keeping route consistent
  return NextResponse.json({ ok: true });
}


