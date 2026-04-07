'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { YearbookCoverPanel } from '@/app/yearbook/[bookUid]/yearbook-cover-panel';
import { YearbookInnerPanel } from '@/app/yearbook/[bookUid]/yearbook-inner-panel';
import { api } from '@/lib/api';

/** 내부 전환용만 사용. 클릭 가능한 탭 UI는 두지 않음 — URL·localStorage·표지 적용 시 자동 */
type EditStep = 'cover' | 'inner';

export default function YearbookEditPage() {
  const router = useRouter();
  const params = useParams<{ bookUid: string }>();

  const bookUid = (params?.bookUid ?? '').toString();
  const [step, setStep] = useState<EditStep>('cover');
  const [bookLoading, setBookLoading] = useState(true);
  const [finalized, setFinalized] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const loginRedirectPath = `/yearbook/${encodeURIComponent(bookUid)}/edit`;

  /** 진입 시: `?tab=inner` 또는 이미 표지 적용됨 → 내지 단계 */
  useEffect(() => {
    if (!bookUid) return;
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('tab') === 'inner') {
      setStep('inner');
      return;
    }
    const coverApplied = window.localStorage.getItem(`yearbook:${bookUid}:coverApplied`) === '1';
    setStep(coverApplied ? 'inner' : 'cover');
  }, [bookUid]);

  useEffect(() => {
    if (!bookUid) return;
    let cancelled = false;
    (async () => {
      setBookLoading(true);
      setBookError(null);
      try {
        const { data: listData } = await api.get<{
          success: boolean;
          items?: { photobookUid: string; sweetbook: unknown }[];
          message?: string;
        }>('/yearbook/books');
        if (cancelled) return;
        if (!listData.success || !Array.isArray(listData.items)) {
          setBookError(listData.message ?? '목록을 불러오지 못했습니다.');
          return;
        }
        const row = listData.items.find((i) => i.photobookUid === bookUid);
        if (!row) {
          setBookError('해당 책을 찾을 수 없습니다.');
          return;
        }
        const st = (row.sweetbook as { data?: { status?: string } })?.data?.status?.toLowerCase();
        setFinalized(st === 'finalized');
      } catch {
        if (!cancelled) setBookError('책 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setBookLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookUid]);

  /** 표지 적용 완료 등 — 단계만 바꾸고 URL에 `tab=inner` 반영(새로고침·공유 시 동일 단계) */
  function goToInner() {
    setStep('inner');
    router.replace(`/yearbook/${encodeURIComponent(bookUid)}/edit?tab=inner`);
  }

  if (!bookUid) {
    return (
      <main className="sb-page">
        <p className="sb-error">책 UID가 올바르지 않습니다.</p>
      </main>
    );
  }

  if (bookLoading) {
    return (
      <main className="sb-page">
        <p className="sb-muted">확인 중…</p>
      </main>
    );
  }

  if (bookError) {
    return (
      <main className="sb-page">
        <p className="sb-error">{bookError}</p>
        <p className="sb-panelNote">
          <Link href="/yearbook">학급 포토북 목록으로</Link>
        </p>
      </main>
    );
  }

  if (finalized) {
    return (
      <main className="sb-page">
        <div className="sb-pageHead">
          <p className="sb-muted" style={{ margin: '0 0 6px' }}>
            <Link href="/yearbook">← 학급 포토북 목록</Link>
          </p>
          <h1 className="sb-pageTitle">표지·내지 편집</h1>
        </div>
        <section className="sb-panel">
          <p className="sb-panelNote">이 책은 최종화(완성) 상태라 편집할 수 없습니다.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="sb-page">
      <div className="sb-pageHead">
        <p className="sb-muted" style={{ margin: '0 0 6px' }}>
          <Link href="/yearbook">← 학급 포토북 목록</Link>
        </p>
        <h1 className="sb-pageTitle">표지·내지 편집</h1>
      </div>

      {step === 'cover' ? (
        <YearbookCoverPanel bookUid={bookUid} loginRedirectPath={loginRedirectPath} onCoverApplied={goToInner} />
      ) : (
        <YearbookInnerPanel bookUid={bookUid} loginRedirectPath={loginRedirectPath} />
      )}
    </main>
  );
}
