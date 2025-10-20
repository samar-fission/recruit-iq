import { NextResponse } from "next/server";
import { getAuthFromCookie, hashPassword, verifyPassword } from "@/lib/auth";
import { getUserById, updateUserPassword } from "@/lib/usersRepo";

export async function POST(req: Request) {
  const auth = getAuthFromCookie();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { current_password, new_password } = body as { current_password?: string; new_password?: string };
  if (!current_password || !new_password || new_password.length < 8) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const user = await getUserById(auth.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const ok = await verifyPassword(current_password, user.password_hash);
  if (!ok) return NextResponse.json({ error: "Invalid current password" }, { status: 400 });
  const newHash = await hashPassword(new_password);
  await updateUserPassword(user.id, newHash);
  return NextResponse.json({ ok: true });
}


