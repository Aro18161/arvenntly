import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="notfound">
        <h1>404</h1>
        <p>존재하지 않거나 삭제된 링크입니다.</p>
        <Link href="/">홈으로</Link>
      </div>
    </main>
  );
}
