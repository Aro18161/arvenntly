export default function Setup({ hasPassword, hasRedis }: { hasPassword: boolean; hasRedis: boolean }) {
  return (
    <main className="page">
      <div className="center" style={{ maxWidth: 520 }}>
        <div className="card">
          <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>설정이 필요합니다</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            아래 환경변수를 <code>.env.local</code> (로컬) 또는 Vercel 프로젝트 설정에 추가하세요.
          </p>
          <div className="setup">
            <p style={{ margin: "16px 0 4px" }}>
              {hasRedis ? "✅" : "❌"} <code>KV_REST_API_URL</code> / <code>KV_REST_API_TOKEN</code>
              <br />
              <span style={{ marginLeft: 20 }}>
                Vercel 대시보드 → Storage → Upstash Redis 연결 시 자동 주입됩니다.
              </span>
            </p>
            <p style={{ margin: "12px 0 4px" }}>
              {hasPassword ? "✅" : "❌"} <code>ADMIN_PASSWORD</code>
              <br />
              <span style={{ marginLeft: 20 }}>링크를 만들 때 입력할 관리자 비밀번호입니다.</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
