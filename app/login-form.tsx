"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ host }: { host: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error ?? "로그인에 실패했습니다.");
    setPassword("");
    setBusy(false);
  }

  return (
    <main className="page">
      <div className="center">
        <div className="card">
          <h1 style={{ fontSize: 20, margin: "0 0 18px" }}>{host}</h1>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="password">관리자 비밀번호</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" disabled={busy || !password} style={{ width: "100%" }}>
              {busy ? "확인 중…" : "로그인"}
            </button>
          </form>
          {error && <div className="msg error">{error}</div>}
        </div>
      </div>
    </main>
  );
}
