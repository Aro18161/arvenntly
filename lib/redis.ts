import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/**
 * Upstash's REST client — plain HTTPS, so it works from serverless functions
 * without connection pooling headaches.
 */
export function redis(): Redis {
  if (client) return client;

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash 환경변수가 없습니다. KV_REST_API_URL / KV_REST_API_TOKEN 을 .env.local 에 설정하세요.",
    );
  }

  client = new Redis({ url, token });
  return client;
}
