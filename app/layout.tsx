import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

// The app is reachable on both the vercel.app subdomain and any custom domain,
// so the title is derived from the request rather than hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "링크 단축기";
  return {
    title: `${host} — 링크 단축기`,
    description: "짧은 주소를 만들고 관리합니다.",
    robots: { index: false, follow: false },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
