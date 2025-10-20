import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET() {
  const auth = getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user: auth });
}


