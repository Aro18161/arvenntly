/**
 * Slug allocation.
 *
 * Random slugs are derived from a single atomic Redis counter, not from random
 * bytes. That gives us the exact behaviour asked for — start at 2 characters,
 * use up the whole 2-character space, then grow to 3 — for free, with zero
 * collisions by construction.
 *
 * The counter value n (1-based) maps onto "blocks", one per slug length:
 *
 *   length L   first value   count of values
 *   2          62            3,782          (62^2 - 62^1)
 *   3          3,844         234,484        (62^3 - 62^2)
 *   4          238,328       14,538,008     ...
 *
 * Base62-encoding any value inside block L always yields exactly L characters,
 * so the length grows on its own once a block is exhausted.
 *
 * Within a block the index is passed through a modular-multiplicative scramble
 * (multiply by a unit modulo the block size). That is a bijection, so the block
 * still fills completely before the next one opens, but issued slugs are not
 * consecutive — otherwise anyone could walk /10, /11, /12 and enumerate every
 * link on the domain. Set SLUG_SCRAMBLE=off for plain sequential order.
 */

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length; // 62

/** Shortest random slug, in characters. */
export const MIN_SLUG_LENGTH = 2;

/** Paths that belong to the app itself and can never be handed out as slugs. */
export const RESERVED_SLUGS = new Set([
  "api", "_next", "admin", "login", "logout", "new", "dashboard", "static",
  "assets", "public", "vercel", "index", "favicon.ico", "robots.txt",
  "sitemap.xml", "manifest.json", "well-known",
]);

function base62(value: number): string {
  let out = "";
  let v = value;
  do {
    out = ALPHABET[v % BASE] + out;
    v = Math.floor(v / BASE);
  } while (v > 0);
  return out;
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * A multiplier coprime to `size`, so that `i => (i * k) % size` permutes the
 * whole block. Derived from the size itself, so it is stable across deploys:
 * the same counter value always produces the same slug.
 */
function multiplierFor(size: number): number {
  let k = Math.max(2, Math.floor(size * 0.6180339887498949));
  while (gcd(k, size) !== 1) k++;
  return k;
}

function scramble(index: number, size: number): number {
  if (process.env.SLUG_SCRAMBLE === "off") return index;
  const k = multiplierFor(size);
  // BigInt because index * k overflows Number.MAX_SAFE_INTEGER once slugs
  // reach 5 characters.
  return Number((BigInt(index) * BigInt(k)) % BigInt(size));
}

/**
 * Turn the nth allocation (n >= 1, straight from Redis INCR) into a slug.
 */
export function slugForSequence(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`sequence must be a positive integer, got ${n}`);
  }

  let index = n - 1;
  let length = MIN_SLUG_LENGTH;
  let start = BASE ** (length - 1);
  let size = start * (BASE - 1);

  while (index >= size) {
    index -= size;
    length += 1;
    start = BASE ** (length - 1);
    size = start * (BASE - 1);
    if (!Number.isSafeInteger(start + size)) {
      throw new Error("slug space exhausted beyond safe integer range");
    }
  }

  return base62(start + scramble(index, size));
}

export type SlugCheck = { ok: true } | { ok: false; reason: string };

/** Validate a user-supplied custom slug. */
export function validateCustomSlug(slug: string): SlugCheck {
  if (!slug) return { ok: false, reason: "슬러그를 입력해 주세요." };
  if (slug.length > 64) return { ok: false, reason: "슬러그는 64자 이하여야 합니다." };
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
    return { ok: false, reason: "영문, 숫자, 하이픈(-), 밑줄(_)만 사용할 수 있습니다." };
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return { ok: false, reason: `"${slug}"은(는) 예약된 주소입니다.` };
  }
  return { ok: true };
}
