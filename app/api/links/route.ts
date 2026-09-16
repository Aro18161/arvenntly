import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createLink, listLinks } from "@/lib/links";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({ links: await listLinks() });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: { url?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (typeof body.url !== "string") {
    return NextResponse.json({ error: "이동할 주소를 입력해 주세요." }, { status: 400 });
  }

  const selfHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? undefined;

  const result = await createLink(
    body.url,
    typeof body.slug === "string" ? body.slug : undefined,
    selfHost,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.status });
  }
  return NextResponse.json({ link: result.link }, { status: 201 });
}
