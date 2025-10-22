"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { List, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";

async function fetchJobs() {
  const res = await fetch("/api/jobs", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load jobs");
  return (await res.json()).items as any[];
}

export default function JobsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data, isLoading, error } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const [view, setView] = useState<"list" | "card">("card");
  async function onDelete(id: string) {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Job deleted");
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="sr-only">Jobs</h1>
        <div className="flex items-center gap-3 sm:ml-auto">
          <div className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-1">
            <button
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`inline-flex items-center px-3 py-1.5 rounded-full transition-colors ${view === "list" ? "bg-purple-600 text-white" : "text-neutral-700 hover:bg-white"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("card")}
              aria-pressed={view === "card"}
              className={`inline-flex items-center px-3 py-1.5 rounded-full transition-colors ${view === "card" ? "bg-purple-600 text-white" : "text-neutral-700 hover:bg-white"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Link href="/jobs/new" className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors">Create Job</Link>
        </div>
      </div>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-600">{String((error as Error).message)}</div>}
      {view === "list" ? (
      <div className="overflow-x-auto bg-white rounded-xl border border-purple-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left bg-purple-100/50">
              <th className="p-3">Title</th>
              <th className="p-3">Years of Experience</th>
              <th className="p-3">Seniority</th>
              <th className="p-3">Created At</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((j) => (
              <tr key={j.id} className="border-t hover:bg-purple-50/50 cursor-pointer" onClick={() => router.push(`/jobs/${j.id}`)}>
                <td className="p-3 font-medium">{j.title}</td>
                <td className="p-3">{j.years_of_experience}</td>
                <td className="p-3 capitalize">{j.seniority_level}</td>
                <td className="p-3">{new Date(j.created_at).toLocaleString()}</td>
                <td className="p-3 space-x-3" onClick={(e)=>e.stopPropagation()}>
                  <Link href={`/jobs/${j.id}`} className="text-purple-700 hover:underline">View</Link>
                  <Link href={`/jobs/${j.id}/edit`} className="text-purple-700 hover:underline">Edit</Link>
                  <button onClick={() => onDelete(j.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((j) => (
            <div key={j.id} className="bg-white rounded-xl border border-purple-100 shadow-sm p-4 cursor-pointer" onClick={() => router.push(`/jobs/${j.id}`)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">{j.title}</div>
                  <div className="text-xs text-neutral-600 capitalize">{j.seniority_level} • {j.years_of_experience} yrs</div>
                </div>
                <div className="text-xs text-neutral-500">{new Date(j.created_at).toLocaleString()}</div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm" onClick={(e)=>e.stopPropagation()}>
                <Link href={`/jobs/${j.id}`} className="text-purple-700 hover:underline">View</Link>
                <Link href={`/jobs/${j.id}/edit`} className="text-purple-700 hover:underline">Edit</Link>
                <button onClick={() => onDelete(j.id)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


