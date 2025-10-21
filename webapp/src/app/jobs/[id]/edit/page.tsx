"use client";
import { useQuery } from "@tanstack/react-query";
import { jobEditableSchema, seniorityEnum } from "@/lib/jobSchemas";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

async function fetchJob(id: string) {
  const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load job");
  return await res.json();
}

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useQuery({ queryKey: ["job", params.id], queryFn: () => fetchJob(params.id) });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values = {
      title: String(fd.get("title") || ""),
      years_of_experience: Number(fd.get("years_of_experience") || 0),
      seniority_level: String(fd.get("seniority_level") || ""),
      jd_text: String(fd.get("jd_text") || ""),
    };
    const parsed = jobEditableSchema.safeParse(values);
    if (!parsed.success) {
      toast.error("Invalid form");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/jobs/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Update failed");
      }
      toast.success("Job updated and re-analyzed");
      router.push(`/jobs/${params.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto bg-gradient-to-br from-purple-50 to-white min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-semibold text-purple-700">Edit Job</h1>
        <Link href={`/jobs/${params.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          <span>Back to job</span>
        </Link>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 relative">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input name="title" defaultValue={data?.title} className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Years of Experience</label>
            <input name="years_of_experience" type="number" defaultValue={data?.years_of_experience} className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
          </div>
          <div>
            <label className="block text-sm font-medium">Seniority</label>
            <select name="seniority_level" defaultValue={data?.seniority_level} className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting}>
              {seniorityEnum.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">JD Text</label>
          <textarea name="jd_text" rows={10} defaultValue={data?.jd_text} className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
        </div>
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors">
          {submitting ? "Updating job and re-running JD analysis…" : "Save Changes"}
        </button>
        {submitting && (
          <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center gap-2">
            <span className="h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-neutral-700">Analyzing updated JD to refresh skills and responsibilities…</div>
          </div>
        )}
      </form>
    </div>
  );
}


