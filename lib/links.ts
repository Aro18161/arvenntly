import { redis } from "./redis";
import { slugForSequence, validateCustomSlug } from "./slug";

const SEQ_KEY = "arv:seq";
const INDEX_KEY = "arv:index";
const linkKey = (slug: string) => `arv:link:${slug}`;
const clickKey = (slug: string) => `arv:clicks:${slug}`;

export type LinkRecord = {
  url: string;
  createdAt: number;
  custom: boolean;
};

export type LinkView = LinkRecord & { slug: string; clicks: number };

export type CreateResult =
  | { ok: true; link: LinkView }
  | { ok: false; reason: string; status: number };

/**
 * Accept only real http(s) destinations. Rejects javascript:/data: payloads,
 * which would otherwise turn every short link into a stored-XSS vector.
 */
export function normalizeUrl(
  input: string,
  selfHost?: string,
): { ok: true; url: string } | { ok: false; reason: string } {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "이동할 주소를 입력해 주세요." };

  // Bare "example.com" is a reasonable thing to paste.
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "올바른 URL이 아닙니다." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "http 또는 https 주소만 사용할 수 있습니다." };
  }
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
    return { ok: false, reason: "올바른 도메인이 아닙니다." };
  }

  const self = selfHost ?? process.env.NEXT_PUBLIC_SITE_HOST;
  if (self && parsed.hostname.toLowerCase() === self.toLowerCase()) {
    return { ok: false, reason: "같은 도메인으로는 단축할 수 없습니다 (무한 리다이렉트)." };
  }

  return { ok: true, url: parsed.toString() };
}

export async function createLink(
  rawUrl: string,
  rawSlug?: string,
  selfHost?: string,
): Promise<CreateResult> {
  const r = redis();

  const urlCheck = normalizeUrl(rawUrl, selfHost);
  if (!urlCheck.ok) return { ok: false, reason: urlCheck.reason, status: 400 };

  const record: LinkRecord = { url: urlCheck.url, createdAt: Date.now(), custom: false };

  // --- custom slug: one atomic claim, no retry ---
  const wanted = rawSlug?.trim();
  if (wanted) {
    const slugCheck = validateCustomSlug(wanted);
    if (!slugCheck.ok) return { ok: false, reason: slugCheck.reason, status: 400 };

    record.custom = true;
    const claimed = await r.set(linkKey(wanted), record, { nx: true });
    if (claimed === null) {
      return { ok: false, reason: `"${wanted}"은(는) 이미 사용 중입니다.`, status: 409 };
    }
    await r.zadd(INDEX_KEY, { score: record.createdAt, member: wanted });
    return { ok: true, link: { ...record, slug: wanted, clicks: 0 } };
  }

  // --- random slug: INCR is atomic, so two concurrent requests never collide
  //     with each other. The retry only covers the case where the counter
  //     lands on a slug someone already took as a custom one. ---
  for (let attempt = 0; attempt < 12; attempt++) {
    const n = await r.incr(SEQ_KEY);
    const slug = slugForSequence(n);

    const claimed = await r.set(linkKey(slug), record, { nx: true });
    if (claimed === null) continue; // taken by a custom slug — burn it, take the next

    await r.zadd(INDEX_KEY, { score: record.createdAt, member: slug });
    return { ok: true, link: { ...record, slug, clicks: 0 } };
  }

  return { ok: false, reason: "슬러그 생성에 실패했습니다. 다시 시도해 주세요.", status: 500 };
}

/** Look up a destination and count the visit. Used by the redirect route. */
export async function resolveLink(slug: string): Promise<string | null> {
  const r = redis();
  const record = await r.get<LinkRecord>(linkKey(slug));
  if (!record) return null;

  // Don't make the visitor wait on the counter write.
  void r.incr(clickKey(slug)).catch(() => {});

  return record.url;
}

export async function listLinks(limit = 200): Promise<LinkView[]> {
  const r = redis();

  // Upstash deserializes every value it returns, so an all-digit slug like
  // "10" — which is the very first one we hand out — comes back as the number
  // 10. Coerce back to strings before anything treats these as slugs.
  const members = await r.zrange<(string | number)[]>(INDEX_KEY, 0, limit - 1, { rev: true });
  const slugs = members.map(String);
  if (slugs.length === 0) return [];

  const [records, clicks] = await Promise.all([
    r.mget<(LinkRecord | null)[]>(...slugs.map(linkKey)),
    r.mget<(number | null)[]>(...slugs.map(clickKey)),
  ]);

  return slugs
    .map((slug, i) => {
      const record = records[i];
      if (!record) return null;
      return { ...record, slug, clicks: clicks[i] ?? 0 };
    })
    .filter((v): v is LinkView => v !== null);
}

export async function deleteLink(slug: string): Promise<boolean> {
  const r = redis();
  const removed = await r.del(linkKey(slug));
  await Promise.all([r.del(clickKey(slug)), r.zrem(INDEX_KEY, slug)]);
  return removed > 0;
}
