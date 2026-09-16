# arvenntly

`arvenne.com` 용 링크 단축기. Next.js(App Router) + Upstash Redis.

- 관리자 비밀번호로 잠긴 홈페이지에서 링크 생성 / 목록 / 클릭 수 / 삭제
- 커스텀 슬러그 (`arvenne.com/gh`)
- 랜덤 슬러그: **2글자부터 시작해 3,782개를 모두 소진하면 자동으로 3글자로 확장**

## 슬러그 생성 방식

랜덤 바이트가 아니라 Redis의 원자적 카운터 `INCR` 하나에서 슬러그를 유도합니다.
그래서 충돌이 구조적으로 발생하지 않고, 길이 확장도 저절로 일어납니다.

| 길이 | 시작 값 | 개수 |
|---|---|---|
| 2글자 | 62 | 3,782 |
| 3글자 | 3,844 | 234,484 |
| 4글자 | 238,328 | 14,538,008 |

62진수로 인코딩하면 각 구간의 값은 **항상 정확히 그 길이**가 됩니다.
구간 안에서는 인덱스를 모듈러 곱셈으로 한 번 섞습니다(전단사 사상이라 구간을 빠짐없이
채우는 성질은 그대로). 섞지 않으면 `/10`, `/11`, `/12` 를 훑어 도메인의 모든 링크를
열람할 수 있기 때문입니다. 순번 그대로 발급하려면 `SLUG_SCRAMBLE=off`.

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev
```

## Vercel 배포

1. **Upstash Redis 연결** — Vercel 프로젝트 → Storage → Upstash Redis 생성 후 프로젝트에 연결.
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` 이 자동 주입됩니다.
2. **환경변수 추가** — Settings → Environment Variables 에 `ADMIN_PASSWORD` 등록
   (선택: `NEXT_PUBLIC_SITE_HOST=arvenne.com`).
3. **도메인 연결** — Settings → Domains 에 `arvenne.com` 추가 후, 등록기관 DNS에
   Vercel이 안내하는 A / CNAME 레코드 등록.
4. 배포 후 `https://arvenne.com` 접속 → 비밀번호 입력 → 링크 생성.

> 서버리스 환경에서는 파일시스템이 휘발성이라 링크를 JSON 파일이나 로컬 SQLite에
> 저장하면 안 됩니다. 그래서 외부 저장소(Upstash)를 씁니다.

## 구조

```
app/
  page.tsx              홈 (인증 확인 → 로그인 폼 또는 대시보드)
  login-form.tsx        비밀번호 입력
  dashboard.tsx         링크 생성 폼 + 목록
  setup.tsx             환경변수 미설정 안내
  not-found.tsx         404
  [slug]/page.tsx       리다이렉트 (307, no-store)
  api/auth/route.ts     로그인 / 로그아웃
  api/links/route.ts    링크 생성 / 목록
  api/links/[slug]/     링크 삭제
lib/
  slug.ts               62진수 슬러그 할당 + 커스텀 슬러그 검증
  links.ts              Redis 읽기/쓰기, URL 정규화·검증
  auth.ts               HMAC 서명 세션 쿠키
  redis.ts              Upstash 클라이언트
```

## 알아둘 점

- 리다이렉트는 **307**(임시)입니다. 301로 하면 브라우저가 영구 캐시해서 목적지를
  바꾸거나 삭제해도 예전 주소로 계속 이동합니다.
- 슬러그는 **대소문자를 구분**합니다 (`/aB` ≠ `/ab`).
- Upstash는 반환값을 자동으로 JSON 역직렬화합니다. `"10"` 같은 숫자형 슬러그가
  숫자 `10`으로 바뀌므로 `lib/links.ts` 에서 문자열로 되돌립니다.
- `api`, `_next`, `favicon.ico` 등은 예약어라 슬러그로 쓸 수 없습니다 (`lib/slug.ts`).
