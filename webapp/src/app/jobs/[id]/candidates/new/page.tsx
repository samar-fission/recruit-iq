"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { candidateCreateSchema } from "@/lib/candidateSchemas";

export default function NewCandidatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    const values = { resume_text: String(formData.get("resume_text") || "") };
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
      toast.success("Candidate added");
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
      <form action={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Resume Text</label>
          <textarea name="resume_text" rows={16} className="mt-1 w-full border rounded px-3 py-2" disabled={submitting} />
        </div>
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-black text-white">
          {submitting ? "Processing..." : "Add Candidate"}
        </button>
      </form>
    </div>
  );
}


