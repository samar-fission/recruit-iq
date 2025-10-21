"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

async function fetchCandidate(id: string) {
  const res = await fetch(`/api/candidates/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load candidate");
  return await res.json();
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({ queryKey: ["candidate", params.id], queryFn: () => fetchCandidate(params.id) });
  const [tab, setTab] = useState<"summary" | "skills" | "desired" | "education" | "resume">("summary");

  const matchScoreRaw = typeof data?.resume_summary?.match_score === "number" ? data.resume_summary.match_score : undefined;
  const matchScore = typeof matchScoreRaw === "number" ? (matchScoreRaw <= 1 ? matchScoreRaw * 10 : matchScoreRaw) : undefined;

  const display = (v: any): string => {
    if (v === null || typeof v === "undefined") return "—";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
      if (typeof (v as any).text === "string") return (v as any).text;
      if (typeof (v as any).name === "string") return (v as any).name;
      if (typeof (v as any).skill === "string") return (v as any).skill;
      if (typeof (v as any).requirement === "string") return (v as any).requirement;
      if (typeof (v as any).education === "string") return (v as any).education;
      try { return JSON.stringify(v); } catch { return String(v); }
    }
    return String(v);
  };

  const to10 = (val: any): number | undefined => {
    if (typeof val !== "number") {
      const n = Number(val);
      if (!Number.isNaN(n)) val = n; else return undefined;
    }
    return val <= 1 ? val * 10 : val;
  };

  // Full summary
  const summaryText = (() => {
    const rs: any = data?.resume_summary;
    let raw = "";
    if (typeof rs === "string") raw = rs;
    else if (typeof rs?.summary === "string") raw = rs.summary;
    else if (typeof rs?.summary?.text === "string") raw = rs.summary.text;
    const trimmed = (raw || "").trim();
    return trimmed.length ? trimmed : "—";
  })();

  // Header display fields (no normalization)
  const pi = data?.pi_details || {};
  const rawPhone = pi.phone || pi.phone_number || pi.mobile || pi.contact;
  const rawYoe = pi.years_of_experience || pi.experience_years || pi.yoe;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-purple-700">Candidate</h1>
        {data?.job_id && (
          <Link href={`/jobs/${data.job_id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            <span>Back to Job</span>
          </Link>
        )}
      </div>
      {isLoading && <div className="flex items-center gap-2 text-sm text-neutral-600"><span className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> Loading...</div>}
      {error && <div className="text-red-600">{String((error as Error).message)}</div>}
      {data && (
        <div className="space-y-4">
          {/* Header card with core PI info */}
          <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">{display(pi.name) || "Unnamed"}</div>
                <div className="text-sm text-neutral-600 truncate">{display(pi.email) || "No email"}</div>
                {rawPhone && <div className="text-sm text-neutral-600 truncate">{String(rawPhone)}</div>}
                {typeof rawYoe !== "undefined" && <div className="text-sm text-neutral-600 truncate">{String(rawYoe)} yrs</div>}
              </div>
              <div className="px-3 py-1.5 rounded-md border border-purple-200 text-purple-700 bg-purple-50 whitespace-nowrap">Match Score: {typeof matchScore === "number" ? `${matchScore.toFixed(1)} / 10` : "—"}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-full inline-flex border border-neutral-200 p-1">
            {(["summary","skills","desired","education","resume"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded-full ${tab===t?"bg-purple-600 text-white":"text-neutral-700 hover:bg-neutral-50"}`}>{t === "desired" ? "Desired Experience" : t[0].toUpperCase()+t.slice(1)}</button>
            ))}
          </div>

          {tab === "summary" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Resume Summary</h2>
                <div className="px-3 py-1.5 rounded-md border border-purple-200 text-purple-700 bg-purple-50 whitespace-nowrap">{typeof matchScore === "number" ? `${matchScore.toFixed(1)} / 10` : "—"}</div>
              </div>
              <div className="text-sm text-neutral-800 whitespace-pre-wrap">{summaryText}</div>
            </section>
          )}

          {tab === "skills" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-2">Skills Evaluation</h2>
              <div className="space-y-2">
                {(data.skills_eval?.skills || []).map((s: any, i: number) => {
                  const score10 = to10(s.score);
                  const pct = typeof score10 === "number" ? Math.max(0, Math.min(100, (score10 / 10) * 100)) : 0;
                  const good = pct > 50; // 5/10 should be red
                  return (
                    <div key={i} className="p-3 rounded-md border border-neutral-200 bg-white hover:bg-purple-50/30 transition-colors">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0 text-neutral-800">
                          <span className={`inline-block h-2 w-2 rounded-full ${good ? "bg-green-500" : "bg-rose-500"}`} />
                          <span className="font-medium truncate">{display(s.skill)}</span>
                        </div>
                        <span className={`min-w-[78px] text-center px-2 py-0.5 rounded border tabular-nums ${good ? "bg-green-50 border-green-300 text-green-700" : "bg-rose-50 border-rose-300 text-rose-700"}`}>
                          {typeof score10 === "number" ? `${score10.toFixed(1)} / 10` : "—"}
                        </span>
                      </div>
                      {s.justification && (
                        <div className="mt-1 text-xs text-neutral-600 whitespace-pre-wrap">{display(s.justification)}</div>
                      )}
                      <div className="mt-2 h-2 w-full rounded bg-neutral-100 overflow-hidden">
                        <div className={`h-full ${good ? "bg-green-300" : "bg-rose-300"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!data.skills_eval?.skills?.length && <div className="text-sm text-neutral-600 py-2">—</div>}
              </div>
            </section>
          )}

          {tab === "desired" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-2">Desired Experience</h2>
              <div className="space-y-2">
                {(data.desired_exp_eval?.experiences || []).map((e: any, i: number) => {
                  const score10 = to10(e.score);
                  const pct = typeof score10 === "number" ? Math.max(0, Math.min(100, (score10 / 10) * 100)) : 0;
                  const good = pct > 50; // 5/10 should be red
                  return (
                    <div key={i} className="p-3 rounded-md border border-neutral-200 bg-white hover:bg-purple-50/30 transition-colors">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0 text-neutral-800">
                          <span className={`inline-block h-2 w-2 rounded-full ${good ? "bg-green-500" : "bg-rose-500"}`} />
                          <span className="truncate">{display(e.requirement ?? e)}</span>
                        </div>
                        <span className={`min-w-[78px] text-center px-2 py-0.5 rounded border tabular-nums ${good ? "bg-green-50 border-green-300 text-green-700" : "bg-rose-50 border-rose-300 text-rose-700"}`}>
                          {typeof score10 === "number" ? `${score10.toFixed(1)} / 10` : "—"}
                        </span>
                      </div>
                      {e.justification && (
                        <div className="mt-1 text-xs text-neutral-600 whitespace-pre-wrap">{display(e.justification)}</div>
                      )}
                    </div>
                  );
                })}
                {!data.desired_exp_eval?.experiences?.length && <div className="text-sm text-neutral-600 py-2">—</div>}
              </div>
            </section>
          )}

          {tab === "education" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-2">Education Evaluation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-neutral-700 mb-2">Matching</div>
                  <div className="space-y-2">
                    {(data.education_eval?.education_certification_matching || []).map((m: any, i: number) => (
                      <div key={i} className="p-3 rounded-md border border-neutral-200 bg-white hover:bg-purple-50/30 transition-colors">
                        <div className="flex items-center gap-2 text-sm text-neutral-800 min-w-0">
                          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                          <span className="truncate">{display(m)}</span>
                        </div>
                      </div>
                    ))}
                    {!data.education_eval?.education_certification_matching?.length && (
                      <div className="text-sm text-neutral-600 py-2">—</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-700 mb-2">Missing Requirements</div>
                  <div className="space-y-2">
                    {(data.education_eval?.gaps?.missing_requirements || []).map((g: any, i: number) => (
                      <div key={i} className="p-3 rounded-md border border-neutral-200 bg-white hover:bg-purple-50/30 transition-colors">
                        <div className="flex items-center gap-2 text-sm text-neutral-800 min-w-0">
                          <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                          <span className="truncate">{display(g)}</span>
                        </div>
                      </div>
                    ))}
                    {!data.education_eval?.gaps?.missing_requirements?.length && (
                      <div className="text-sm text-neutral-600 py-2">—</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === "resume" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-2">Resume Text</h2>
              <div className="border rounded p-3 text-sm whitespace-pre-wrap bg-neutral-50">{display(data.resume_text)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}


