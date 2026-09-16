import { headers } from "next/headers";
import { isAuthenticated } from "@/lib/auth";
import { listLinks, type LinkView } from "@/lib/links";
import LoginForm from "./login-form";
import Dashboard from "./dashboard";
import Setup from "./setup";

export const dynamic = "force-dynamic";

async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "arvenne.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function Home() {
  const hasPassword = Boolean(process.env.ADMIN_PASSWORD);
  const hasRedis = Boolean(
    (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL) &&
      (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN),
  );

  if (!hasPassword || !hasRedis) {
    return <Setup hasPassword={hasPassword} hasRedis={hasRedis} />;
  }

  const origin = await currentOrigin();
  const host = origin.replace(/^https?:\/\//, "");

  if (!(await isAuthenticated())) {
    return <LoginForm host={host} />;
  }

  let links: LinkView[] = [];
  let loadError: string | null = null;
  try {
    links = await listLinks();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "링크 목록을 불러오지 못했습니다.";
  }

  return <Dashboard origin={origin} initialLinks={links} loadError={loadError} />;
}
