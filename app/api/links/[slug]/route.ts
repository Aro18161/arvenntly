import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteLink } from "@/lib/links";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { slug } = await params;
  const removed = await deleteLink(slug);
  if (!removed) {
    return NextResponse.json({ error: "존재하지 않는 링크입니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
