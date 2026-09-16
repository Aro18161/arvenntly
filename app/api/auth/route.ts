import { NextResponse } from "next/server";
import { endSession, startSession, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let password = "";
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (typeof password !== "string" || !(await verifyPassword(password))) {
    // Slow the response a little so the endpoint isn't a fast brute-force oracle.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await startSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
