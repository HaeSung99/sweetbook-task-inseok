'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { RechargeModal } from '@/components/recharge-modal';
import { useAuth } from '@/contexts/auth-context';

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, logout, refreshMe } = useAuth();
  const [rechargeOpen, setRechargeOpen] = useState(false);

  return (
    <>
      <header className="sb-header">
        <div className="sb-headerInner">
          <Link href="/" className="sb-brand">
            <span className="sb-brandMark" aria-hidden />
            <span className="sb-brandText">
              <strong>학년 앨범</strong>
              <span>학급 추억을 한 권으로</span>
            </span>
          </Link>
          <nav className="sb-nav" aria-label="주요 메뉴">
            {loading ? (
              <span className="sb-muted">…</span>
            ) : user ? (
              <>
                {user.role === 'admin' ? (
                  <Link className="sb-navLink" href="/admin">
                    관리자
                  </Link>
                ) : null}
                <Link
                  className={`sb-navLink${pathname === '/orders' ? ' sb-navLinkActive' : ''}`}
                  href="/orders"
                >
                  주문내역
                </Link>
                <Link className="sb-btn sb-btnPrimary" href="/yearbook">
                  내 학급 포토북
                </Link>
                {user.role !== 'admin' ? (
                  <>
                    <span className="sb-headerBalance" title="서비스 충전 잔액">
                      잔액 {user.balanceWon.toLocaleString('ko-KR')}원
                    </span>
                    <button type="button" className="sb-btn sb-btnSoft" onClick={() => setRechargeOpen(true)}>
                      충전
                    </button>
                  </>
                ) : null}
                <span className="sb-userName">{user.displayName} 님</span>
                <button type="button" className="sb-btn sb-btnGhost" onClick={() => logout()}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link className="sb-btn sb-btnPrimary" href="/login?redirect=%2Fyearbook">
                  시작하기
                </Link>
                <Link className="sb-btn sb-btnGhost" href="/login">
                  로그인
                </Link>
                <Link className="sb-btn sb-btnSoft" href="/register">
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {user && user.role !== 'admin' ? (
        <RechargeModal
          open={rechargeOpen}
          onClose={() => setRechargeOpen(false)}
          onSuccess={() => void refreshMe()}
        />
      ) : null}
    </>
  );
}
