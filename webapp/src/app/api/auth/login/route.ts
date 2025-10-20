import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { getUserByEmail } from "@/lib/usersRepo";
import { signJwt, setAuthCookie, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signJwt({ id: user.id, email: user.email, name: user.name });
  setAuthCookie(token);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}


