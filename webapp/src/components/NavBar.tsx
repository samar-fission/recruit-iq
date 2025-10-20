"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NavBar() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const initials = name ? name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "U";

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      const j = await r.json().catch(() => ({}));
      setName(j?.user?.name || "");
    });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="w-full bg-white border-b border-purple-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-purple-700">
            <img src="/logo.svg" alt="RecruitIQ" className="h-7 w-7" />
            <span>RecruitIQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/" className="text-neutral-700 hover:text-purple-700">Home</Link>
            <Link href="/jobs" className="text-neutral-700 hover:text-purple-700">Jobs</Link>
          </nav>
        </div>
        <div className="relative">
          <details className="group">
            <summary className="list-none inline-flex items-center gap-2 px-2 py-1.5 rounded-full border border-purple-200 cursor-pointer select-none">
              <div className="h-8 w-8 rounded-full bg-purple-600 text-white grid place-items-center text-sm font-semibold">
                {initials}
              </div>
              <span className="hidden sm:block text-sm text-neutral-800 max-w-[120px] truncate">{name || "User"}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-neutral-500"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.193l3.71-3.964a.75.75 0 111.08 1.04l-4.24 4.53a.75.75 0 01-1.08 0l-4.24-4.53a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
            </summary>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-purple-100 rounded-lg shadow-md p-2 z-50">
              <Link href="/profile" className="block px-3 py-2 rounded-md hover:bg-purple-50 text-sm">Profile</Link>
              <button onClick={logout} className="block w-full text-left px-3 py-2 rounded-md hover:bg-red-50 text-sm text-red-600">Logout</button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}


