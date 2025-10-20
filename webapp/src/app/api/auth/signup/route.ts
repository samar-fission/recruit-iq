import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { signupSchema } from "@/lib/schemas";
import { createUser, getUserByEmail } from "@/lib/usersRepo";
import { hashPassword, signJwt, setAuthCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const id = nanoid();
  const now = new Date().toISOString();
  const password_hash = await hashPassword(password);

  await createUser({ id, name, email, password_hash, created_at: now });

  const token = signJwt({ id, email, name });
  setAuthCookie(token);
  return NextResponse.json({ id, name, email }, { status: 201 });
}


