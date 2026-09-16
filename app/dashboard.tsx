"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkView } from "@/lib/links";

type Props = { origin: string; initialLinks: LinkView[]; loadError: string | null };

export default function Dashboard({ origin, initialLinks, loadError }: Props) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [created, setCreated] = useState<LinkView | null>(null);
  const [error, setError] = useState<string | null>(loadError);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const displayHost = origin.replace(/^https?:\/\//, "");

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      setError("클립보드 복사에 실패했습니다. 직접 선택해 복사해 주세요.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);

    const response = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, slug: slug.trim() || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(data.error ?? "링크 생성에 실패했습니다.");
      return;
    }

    setCreated(data.link);
    setLinks((prev) => [data.link, ...prev]);
    setUrl("");
    setSlug("");
  }

  async function remove(target: string) {
    if (!confirm(`/${target} 링크를 삭제할까요? 되돌릴 수 없습니다.`)) return;

    const response = await fetch(`/api/links/${encodeURIComponent(target)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    setLinks((prev) => prev.filter((l) => l.slug !== target));
    setCreated((c) => (c?.slug === target ? null : c));
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <main className="page">
      <header className="brand">
        <div>
          <h1>{displayHost}</h1>
          <p>짧은 주소를 만들고 관리합니다.</p>
        </div>
        <button className="ghost" onClick={logout}>로그아웃</button>
      </header>

      <div className="card">
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="url">이동할 주소</label>
            <input
              id="url"
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/아주/긴/주소"
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label htmlFor="slug">
              짧은 주소
              <span className="hint">비워두면 자동 생성 (2글자부터, 다 차면 자동으로 길어짐)</span>
            </label>
            <div className="slug-input">
              <span className="prefix">{displayHost}/</span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="자동"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <button type="submit" disabled={busy || !url.trim()}>
            {busy ? "만드는 중…" : "짧은 주소 만들기"}
          </button>
        </form>

        {error && <div className="msg error">{error}</div>}

        {created && (
          <div className="result">
            <code>{`${displayHost}/${created.slug}`}</code>
            <button className="ghost" onClick={() => copy(`${origin}/${created.slug}`, "new")}>
              {copied === "new" ? "복사됨" : "복사"}
            </button>
          </div>
        )}
      </div>

      <section className="list">
        <h2>내 링크 {links.length > 0 && `(${links.length})`}</h2>

        {links.length === 0 ? (
          <div className="empty">아직 만든 링크가 없습니다.</div>
        ) : (
          links.map((link) => (
            <div className="row" key={link.slug}>
              <div className="info">
                <a className="slug" href={`/${link.slug}`} target="_blank" rel="noreferrer">
                  /{link.slug}
                </a>
                {link.custom && <span className="badge">custom</span>}
                <span className="dest" title={link.url}>{link.url}</span>
              </div>
              <span className="clicks">{link.clicks.toLocaleString()}회</span>
              <button className="link" onClick={() => copy(`${origin}/${link.slug}`, link.slug)}>
                {copied === link.slug ? "복사됨" : "복사"}
              </button>
              <button className="link danger" onClick={() => remove(link.slug)}>삭제</button>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
