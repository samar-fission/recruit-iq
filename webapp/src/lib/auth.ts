import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getEnv } from "./env";

export type JwtPayload = { id: string; email: string; name: string };

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signJwt(payload: JwtPayload): string {
  const { JWT_SECRET } = getEnv();
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const { JWT_SECRET } = getEnv();
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  const store = cookies();
  store.set("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookie() {
  const store = cookies();
  store.set("auth", "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function getAuthFromCookie(): JwtPayload | null {
  const store = cookies();
  const token = store.get("auth")?.value;
  if (!token) return null;
  return verifyJwt(token);
}


