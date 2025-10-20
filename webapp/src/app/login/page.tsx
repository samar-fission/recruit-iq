"use client";
import { useState } from "react";
import { loginSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    const values = {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    };
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      toast.error("Invalid form data");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Login failed");
      }
      toast.success("Logged in");
      const next = params.get("next") || "/jobs";
      router.push(next);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-white">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow p-6 border border-purple-100">
        <h1 className="text-2xl font-semibold mb-4 text-purple-700">Log in</h1>
        <form action={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input name="email" type="email" className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input name="password" type="password" className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md disabled:opacity-50 transition-colors">
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="text-sm mt-4 text-center">
          <span className="text-neutral-600">Don&apos;t have an account?</span>{' '}
          <a href="/signup" className="text-purple-700 hover:underline">Sign up</a>
        </div>
      </div>
    </div>
  );
}


