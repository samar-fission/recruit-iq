"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState(true);
  const initials = (name || email)
    ? (name || email).split(" ")[0].slice(0, 2).toUpperCase()
    : "U";
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  async function fetchUser() {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      setName(j?.user?.name || "");
      setEmail(j?.user?.email || "");
    } catch {
      // ignore
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    setLoadingUser(true);
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      const el = detailsRef.current;
      if (el?.open && el && !el.contains(e.target as Node)) {
        el.open = false;
      }
    }
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    if (detailsRef.current?.open) detailsRef.current.open = false;
  }, [pathname]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.replace("/login");
    router.refresh();
  }

  const isPublic = pathname?.startsWith("/login") || pathname?.startsWith("/signup");
  if (isPublic) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-purple-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-purple-700">
            <img src="/logo.svg" alt="RecruitIQ" className="h-7 w-7" />
            <span>RecruitIQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <Link href="/jobs" className="px-2 py-1 rounded-md text-neutral-700 hover:text-purple-700 hover:bg-purple-50 aria-[current=page]:bg-purple-100 aria-[current=page]:text-purple-700" aria-current={pathname?.startsWith("/jobs") ? "page" : undefined}>Jobs</Link>
          </nav>
        </div>
        <div className="relative">
          <details className="group" ref={detailsRef}>
            <summary className="list-none inline-flex items-center gap-2 px-2 py-1.5 rounded-full border border-purple-200 cursor-pointer select-none hover:bg-purple-50">
              <div className="h-8 w-8 rounded-full bg-purple-600 text-white grid place-items-center text-sm font-semibold">
                {initials}
              </div>
              <span className="hidden sm:block text-sm text-neutral-800 max-w-[160px] truncate">{loadingUser ? "" : (name || email || "User")}</span>
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


