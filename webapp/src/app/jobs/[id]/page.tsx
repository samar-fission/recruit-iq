"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useMemo, useState } from "react";

async function fetchJob(id: string) {
  const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load job");
  return await res.json();
}

async function fetchCandidates(jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}/candidates`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load candidates");
  return (await res.json()).items as any[];
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["job", params.id], queryFn: () => fetchJob(params.id) });
  const candidatesQuery = useQuery({ queryKey: ["candidates", params.id], queryFn: () => fetchCandidates(params.id), enabled: Boolean(data) });
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"skills" | "education" | "responsibilities" | "candidates" | "details">("skills");
  const [updating, setUpdating] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    const res = await fetch(`/api/jobs/${params.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Job deleted");
    router.push("/jobs");
  }

  // Flatten skills into a simple list with paths for toggling
  const flatSkills = useMemo(() => {
    const out: Array<{ label: string; required: boolean; context?: string; path: any } > = [];
    const s = (data as any)?.skills;
    if (!s) return out;
    (s.categories || []).forEach((cat: any, catIdx: number) => {
      if (Array.isArray(cat.verticals)) {
        cat.verticals.forEach((v: any, vIdx: number) => {
          (v.skills || []).forEach((sk: any, skillIdx: number) => {
            out.push({ label: sk.skill, required: !!sk.required, context: sk.context, path: { type: "vertical", catIdx, vIdx, skillIdx } });
          });
        });
      } else {
        (cat.skills || []).forEach((sk: any, skillIdx: number) => {
          out.push({ label: sk.skill, required: !!sk.required, context: sk.context, path: { type: "cat", catIdx, skillIdx } });
        });
      }
    });
    (s.skills_unclassified || []).forEach((sk: any, idx: number) => {
      out.push({ label: sk.skill, required: !!sk.required, context: sk.context, path: { type: "unclassified", idx } });
    });
    // required first, then alpha
    out.sort((a, b) => (a.required === b.required ? a.label.localeCompare(b.label) : a.required ? -1 : 1));
    return out;
  }, [data]);

  async function toggleSkillRequired(path: any) {
    if (!data) return;
    setUpdating(true);
    const next = JSON.parse(JSON.stringify(data));
    if (path.type === "vertical") {
      const cur = next.skills.categories[path.catIdx].verticals[path.vIdx].skills[path.skillIdx];
      cur.required = !cur.required;
    } else if (path.type === "cat") {
      const cur = next.skills.categories[path.catIdx].skills[path.skillIdx];
      cur.required = !cur.required;
    } else {
      next.skills.skills_unclassified[path.idx].required = !next.skills.skills_unclassified[path.idx].required;
    }
    qc.setQueryData(["job", params.id], next);
    const res = await fetch(`/api/jobs/${params.id}/skills`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills: next.skills }) });
    if (!res.ok) { toast.error("Update failed"); qc.invalidateQueries({ queryKey: ["job", params.id] }); }
    setUpdating(false);
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-purple-700">{data?.title || "Job"}</h1>
        <div className="flex gap-2">
          <Link href={`/jobs/${params.id}/edit`} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors">Edit</Link>
          <button onClick={onDelete} className="px-3 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50">Delete</button>
          <Link href="/jobs" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            <span>Back</span>
          </Link>
        </div>
      </div>
      {isLoading && <div className="flex items-center gap-2 text-sm text-neutral-600"><span className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> Loading...</div>}
      {error && <div className="text-red-600">{String((error as Error).message)}</div>}
      {data && (
        <div className="space-y-4">
          <div className="bg-white rounded-full inline-flex border border-neutral-200 p-1">
            {(["skills","education","responsibilities","candidates","details"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-sm rounded-full ${activeTab===t?"bg-purple-600 text-white":"text-neutral-700 hover:bg-neutral-50"}`}>{t[0].toUpperCase()+t.slice(1)}</button>
            ))}
          </div>

          {activeTab === "skills" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-3">
              <h2 className="font-semibold mb-2">Skills</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                {flatSkills.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleSkillRequired(s.path)}
                    className={`px-2 py-1 rounded border ${s.required ? "bg-purple-600 text-white border-purple-600" : "border-neutral-200"}`}
                    title={(s.required?"Required • ":"") + (s.context || "")}
                    disabled={updating}
                  >
                    {s.label}
                    {updating && <span className="ml-2 inline-block h-3 w-3 border-2 border-white/70 border-t-transparent rounded-full align-middle animate-spin" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeTab === "education" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-3">Education / Desired Experience</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-neutral-700">Desired Experience</div>
                  <div className="space-y-2">
                    {data.education_desired_experience?.desired_experience?.map((e: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-purple-100 bg-purple-50/40 text-sm">{e.requirement || e.experience}</div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-neutral-700">Education Preference</div>
                  <div className="space-y-2">
                    {data.education_desired_experience?.education_preference?.map((e: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-purple-100 bg-purple-50/40 text-sm">{e.requirement || e.education}</div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "responsibilities" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-3">Responsibilities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.responsibilities?.map((r: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border border-purple-100 bg-white shadow-sm text-sm">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-purple-500" />
                      <span>{r.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "candidates" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Candidates</h2>
                <Link href={`/jobs/${params.id}/candidates/new`} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors">Add Candidate</Link>
              </div>
              {candidatesQuery.isLoading && <div className="flex items-center gap-2 text-sm text-neutral-600"><span className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> Loading candidates...</div>}
              {candidatesQuery.error && (
                <div className="text-red-600">{String((candidatesQuery.error as Error).message)}</div>
              )}
              <div className="overflow-x-auto bg-white rounded-xl border border-purple-100 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-purple-100/50">
                      <th className="p-3">#</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Match Score</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatesQuery.data?.map((c: any, idx: number) => (
                      <tr key={c.id} className="border-t">
                        <td className="p-3">{idx + 1}</td>
                        <td className="p-3">{c.pi_details?.name || "—"}</td>
                        <td className="p-3">{c.pi_details?.email || "—"}</td>
                        <td className="p-3">{typeof c.resume_summary?.match_score === "number" ? ((c.resume_summary.match_score <= 1 ? c.resume_summary.match_score * 10 : c.resume_summary.match_score).toFixed(1) + " / 10") : "—"}</td>
                        <td className="p-3 space-x-3">
                          <Link href={`/candidates/${c.id}`} className="text-purple-700 hover:underline">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!candidatesQuery.data?.length && !candidatesQuery.isLoading && (
                <div className="text-sm text-neutral-600">No candidates yet.</div>
              )}
            </section>
          )}

          {activeTab === "details" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-3">Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg border border-purple-100 bg-white shadow-sm"><span className="font-medium">Years of Experience:</span> {data.years_of_experience}</div>
                <div className="p-3 rounded-lg border border-purple-100 bg-white shadow-sm"><span className="font-medium">Seniority:</span> <span className="capitalize">{data.seniority_level}</span></div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-medium mb-1">JD Text</div>
                <div className="whitespace-pre-wrap p-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm">{data.jd_text}</div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}


