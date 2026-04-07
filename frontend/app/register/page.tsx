'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [redirect, setRedirect] = useState('/yearbook');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
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
    setError(null);
    if (password !== password2) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
      router.replace(redirect);
    } catch {
      setError('회원가입에 실패했습니다. 입력값을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sb-page">
      <div className="sb-pageHead">
        <h1 className="sb-pageTitle">회원가입</h1>
        <p className="sb-pageLead">계정을 만들고 학급 포토북 서비스를 시작하세요.</p>
      </div>

      <section className="sb-panel" style={{ maxWidth: 520 }}>
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
            이름(선택)
            <input
              className="sb-input"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="sb-label">
            비밀번호
            <input
              className="sb-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label className="sb-label">
            비밀번호 확인
            <input
              className="sb-input"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error ? <p className="sb-error">{error}</p> : null}
          <div className="sb-modalActions">
            <button type="submit" className="sb-btn sb-btnPrimary" disabled={busy}>
              {busy ? '가입 중…' : '회원가입'}
            </button>
            <Link className="sb-btn sb-btnGhost" href={`/login?redirect=${encodeURIComponent(redirect)}`}>
              로그인
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
