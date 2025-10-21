"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { candidateCreateSchema } from "@/lib/candidateSchemas";

export default function NewCandidatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [jobSkillCount, setJobSkillCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${params.id}`, { cache: "no-store" });
        const job = await res.json();
        const count = (() => {
          const s = job?.skills || {};
          let c = 0;
          (s.categories || []).forEach((cat: any) => {
            if (Array.isArray(cat.verticals)) cat.verticals.forEach((v: any) => { c += (v.skills || []).length; });
            else c += (cat.skills || []).length;
          });
          c += (s.skills_unclassified || []).length;
          return c;
        })();
        setJobSkillCount(count);
      } catch {
        setJobSkillCount(null);
      }
    })();
  }, [params.id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (typeof jobSkillCount === "number" && jobSkillCount < 4) {
      toast.error("Please add at least 4 skills to the job before adding a candidate.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const values = { resume_text: String(fd.get("resume_text") || "") };
    const parsed = candidateCreateSchema.safeParse(values);
    if (!parsed.success) {
      toast.error("Resume text too short");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/jobs/${params.id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Create candidate failed");
      }
      const { id } = await res.json();
      toast.success("Candidate added and analyzed");
      router.push(`/candidates/${id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Add Candidate</h1>
      {typeof jobSkillCount === "number" && jobSkillCount < 4 && (
        <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">This job has only {jobSkillCount} skill(s). Add at least 4 skills before adding candidates.</div>
      )}
      <form onSubmit={onSubmit} className="space-y-4 relative">
        <div>
          <label className="block text-sm font-medium">Resume Text</label>
          <textarea name="resume_text" rows={16} className="mt-1 w-full border rounded px-3 py-2" disabled={submitting} />
        </div>
        <button type="submit" disabled={submitting || (typeof jobSkillCount === "number" && jobSkillCount < 4)} className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50">
          {submitting ? "Processing resume and running analysis…" : "Add Candidate"}
        </button>
        {submitting && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center gap-2">
            <span className="h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-neutral-700 text-center px-6">Analyzing resume against job skills and requirements. This may take up to 30 seconds.</div>
          </div>
        )}
      </form>
    </div>
  );
}


