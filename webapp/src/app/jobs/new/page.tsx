"use client";
import { z } from "zod";
import { jobEditableSchema, seniorityEnum } from "@/lib/jobSchemas";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
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
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Create failed");
      }
      const { id } = await res.json();
      toast.success("Job created and analyzed");
      router.push(`/jobs/${id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto bg-gradient-to-br from-purple-50 to-white min-h-screen">
      <h1 className="text-3xl font-semibold mb-4 text-purple-700">Create Job</h1>
      <form onSubmit={onSubmit} className="space-y-4 relative">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input name="title" className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Years of Experience</label>
            <input name="years_of_experience" type="number" min={0} max={50} className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
          </div>
          <div>
            <label className="block text-sm font-medium">Seniority</label>
            <select name="seniority_level" className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting}>
              {seniorityEnum.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">JD Text</label>
          <textarea name="jd_text" rows={10} className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
        </div>
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors">
          {submitting ? "Creating job and running JD analysis…" : "Create Job"}
        </button>
        {submitting && (
          <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center gap-2">
            <span className="h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-neutral-700 text-center px-6">Analyzing JD to extract skills, desired experience, education and responsibilities. This may take up to 30 seconds.</div>
          </div>
        )}
      </form>
    </div>
  );
}


