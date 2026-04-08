'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [redirect, setRedirect] = useState('/yearbook');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setRedirect(p.get('redirect') || '/yearbook');
  }, []);

  useEffect(() => {
    if (!loading && user) router.replace(redirect);
  }, [loading, user, router, redirect]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace(redirect);
    } catch {
      setError('로그인에 실패했습니다. 이메일/비밀번호를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sb-page sb-page--auth">
      <div className="sb-pageHead">
        <h1 className="sb-pageTitle">로그인</h1>
        <p className="sb-pageLead">학급 포토북 서비스를 사용하려면 로그인해 주세요.</p>
      </div>

      <section className="sb-panel">
        <form className="sb-formWide" onSubmit={onSubmit}>
          <label className="sb-label">
            이메일
            <input
              className="sb-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="sb-label">
            비밀번호
            <input
              className="sb-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? <p className="sb-error">{error}</p> : null}
          <div className="sb-modalActions">
            <button type="submit" className="sb-btn sb-btnPrimary" disabled={busy}>
              {busy ? '로그인 중…' : '로그인'}
            </button>
            <Link className="sb-btn sb-btnGhost" href={`/register?redirect=${encodeURIComponent(redirect)}`}>
              회원가입
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
