import { NextResponse } from "next/server";
import { getJob, updateJobSkills } from "@/lib/jobsRepo";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const { skills } = body as { skills?: any };
  if (typeof skills === "undefined") return NextResponse.json({ error: "Missing skills" }, { status: 400 });
  const job = await getJob(params.id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await updateJobSkills(params.id, skills, new Date().toISOString());
  const updated = await getJob(params.id);
  return NextResponse.json(updated);
}


