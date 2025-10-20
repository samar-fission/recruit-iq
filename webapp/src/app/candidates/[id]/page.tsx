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
  const [tab, setTab] = useState<"summary" | "pi" | "skills" | "desired" | "education" | "resume">("summary");

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
    if (typeof val !== "number") return undefined;
    return val <= 1 ? val * 10 : val;
  };

  // Full summary: no stripping
  const summaryText = (() => {
    const rs: any = data?.resume_summary;
    let raw = "";
    if (typeof rs === "string") raw = rs;
    else if (typeof rs?.summary === "string") raw = rs.summary;
    else if (typeof rs?.summary?.text === "string") raw = rs.summary.text;
    const trimmed = (raw || "").trim();
    return trimmed.length ? trimmed : "—";
  })();

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
          {/* Header card - single line */}
          <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">{data.pi_details?.name || "Unnamed"}</div>
                <div className="text-sm text-neutral-600 truncate">{data.pi_details?.email || "No email"}</div>
              </div>
              <div className="px-3 py-1.5 rounded-md border border-purple-200 text-purple-700 bg-purple-50 whitespace-nowrap">Match Score: {typeof matchScore === "number" ? `${matchScore.toFixed(1)} / 10` : "—"}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-full inline-flex border border-neutral-200 p-1">
            {(["summary","pi","skills","desired","education","resume"] as const).map((t) => (
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
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(data.resume_summary?.strengths || []).map((s: any, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded border border-green-300 bg-green-50">{display(s)}</span>
                ))}
                {(data.resume_summary?.gaps || []).map((g: any, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded border border-amber-300 bg-amber-50">{display(g)}</span>
                ))}
              </div>
            </section>
          )}

          {tab === "pi" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-2">PI Details</h2>
              <div className="text-sm space-y-1 text-neutral-800">
                <div><span className="font-medium">Name:</span> {display(data.pi_details?.name)}</div>
                <div><span className="font-medium">Email:</span> {display(data.pi_details?.email)}</div>
              </div>
            </section>
          )}

          {tab === "skills" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-3">Skills Evaluation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(data.skills_eval?.skills || []).map((s: any, i: number) => {
                  const score10 = to10(s.score);
                  const pct = typeof score10 === "number" ? Math.max(0, Math.min(100, (score10 / 10) * 100)) : 0;
                  const good = pct > 50; // 5/10 should be red
                  return (
                    <div key={i} className="p-3 rounded-lg border border-neutral-200 bg-white">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-neutral-800">{display(s.skill)}</span>
                        <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${good ? "bg-green-50 border-green-300 text-green-700" : "bg-rose-50 border-rose-300 text-rose-700"}`}>
                          {typeof score10 === "number" ? `${score10.toFixed(1)} / 10` : "—"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded bg-neutral-100 overflow-hidden">
                        <div className={`h-full ${good ? "bg-green-300" : "bg-rose-300"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!data.skills_eval?.skills?.length && <div className="text-sm text-neutral-600">—</div>}
              </div>
            </section>
          )}

          {tab === "desired" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-3">Desired Experience</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(data.desired_exp_eval?.experiences || []).map((e: any, i: number) => {
                  const score10 = to10(e.score);
                  const pct = typeof score10 === "number" ? Math.max(0, Math.min(100, (score10 / 10) * 100)) : 0;
                  const good = pct > 50; // 5/10 should be red
                  return (
                    <div key={i} className="p-3 rounded-lg border border-neutral-200 bg-white">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-neutral-800 pr-2 truncate">{display(e.requirement ?? e)}</span>
                        <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${good ? "bg-green-50 border-green-300 text-green-700" : "bg-rose-50 border-rose-300 text-rose-700"}`}>
                          {typeof score10 === "number" ? `${score10.toFixed(1)} / 10` : "—"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded bg-neutral-100 overflow-hidden">
                        <div className={`h-full ${good ? "bg-green-300" : "bg-rose-300"}`} style={{ width: `${pct}%` }} />
                      </div>
                      {e.justification && (
                        <div className="mt-2 text-xs text-neutral-600 whitespace-pre-wrap">{display(e.justification)}</div>
                      )}
                    </div>
                  );
                })}
                {!data.desired_exp_eval?.experiences?.length && <div className="text-sm text-neutral-600">—</div>}
              </div>
            </section>
          )}

          {tab === "education" && (
            <section className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <h2 className="font-semibold mb-2">Education Evaluation</h2>
              <div className="text-sm space-y-2">
                <div>
                  <div className="font-medium">Matching</div>
                  <ul className="list-disc ml-5">
                    {(data.education_eval?.education_certification_matching || []).map((m: any, i: number) => (
                      <li key={i}>{display(m)}</li>
                    ))}
                    {!data.education_eval?.education_certification_matching?.length && <li className="text-neutral-600">—</li>}
                  </ul>
                </div>
                <div>
                  <div className="font-medium">Missing Requirements</div>
                  <ul className="list-disc ml-5">
                    {(data.education_eval?.gaps?.missing_requirements || []).map((g: any, i: number) => (
                      <li key={i}>{display(g)}</li>
                    ))}
                    {!data.education_eval?.gaps?.missing_requirements?.length && <li className="text-neutral-600">—</li>}
                  </ul>
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


