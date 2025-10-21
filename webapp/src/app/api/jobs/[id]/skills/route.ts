import { NextResponse } from "next/server";
import { getJob, updateJobSkills } from "@/lib/jobsRepo";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const { skills, add_skill, remove_path, remove_skill } = body as { skills?: any; add_skill?: string; remove_path?: any; remove_skill?: string };

  const job = await getJob(params.id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build the next skills object starting from provided skills or existing job.skills
  const nextSkills = typeof skills !== "undefined" ? JSON.parse(JSON.stringify(skills)) : JSON.parse(JSON.stringify(job.skills || {}));

  // Optionally append a manual plain-text skill into skills.skills_unclassified
  if (add_skill && add_skill.trim()) {
    nextSkills.skills_unclassified = Array.isArray(nextSkills.skills_unclassified)
      ? nextSkills.skills_unclassified
      : [];
    nextSkills.skills_unclassified.push({ skill: add_skill.trim(), required: false });
  }

  // Optionally remove a skill by path or by unclassified skill text
  if (remove_path && typeof remove_path === "object") {
    try {
      if (remove_path.type === "unclassified") {
        if (Array.isArray(nextSkills.skills_unclassified) && typeof remove_path.idx === "number") {
          nextSkills.skills_unclassified.splice(remove_path.idx, 1);
        }
      } else if (remove_path.type === "cat") {
        const cat = nextSkills.categories?.[remove_path.catIdx];
        if (cat && Array.isArray(cat.skills) && typeof remove_path.skillIdx === "number") {
          cat.skills.splice(remove_path.skillIdx, 1);
        }
      } else if (remove_path.type === "vertical") {
        const cat = nextSkills.categories?.[remove_path.catIdx];
        const vert = cat?.verticals?.[remove_path.vIdx];
        if (vert && Array.isArray(vert.skills) && typeof remove_path.skillIdx === "number") {
          vert.skills.splice(remove_path.skillIdx, 1);
        }
      }
    } catch {}
  } else if (remove_skill && typeof remove_skill === "string") {
    if (Array.isArray(nextSkills.skills_unclassified)) {
      const i = nextSkills.skills_unclassified.findIndex((s: any) => (s?.skill || "") === remove_skill);
      if (i >= 0) nextSkills.skills_unclassified.splice(i, 1);
    }
  }

  // If nothing to update, reject
  if (typeof skills === "undefined" && !add_skill && !remove_path && !remove_skill) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await updateJobSkills(params.id, nextSkills, new Date().toISOString());
  const updated = await getJob(params.id);
  return NextResponse.json(updated);
}


