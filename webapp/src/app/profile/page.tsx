"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      const j = await r.json();
      setUser(j.user);
    });
  }, []);

  async function onChangePassword(formData: FormData) {
    const current_password = String(formData.get("current_password") || "");
    const new_password = String(formData.get("new_password") || "");
    if (new_password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password, new_password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Change password failed");
      }
      toast.success("Password updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto bg-gradient-to-br from-purple-50 to-white min-h-screen">
      <h1 className="text-3xl font-semibold text-purple-700 mb-6">Profile</h1>
      {user && (
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4 mb-6">
          <div className="text-sm"><span className="font-medium">Name:</span> {user.name}</div>
          <div className="text-sm"><span className="font-medium">Email:</span> {user.email}</div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3">Change Password</h2>
        <form action={onChangePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Current Password</label>
            <input name="current_password" type="password" className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
          </div>
          <div>
            <label className="block text-sm font-medium">New Password</label>
            <input name="new_password" type="password" className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" disabled={submitting} />
          </div>
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors">
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}


