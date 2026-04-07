'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { YearbookPurchaseModal } from '@/app/yearbook/yearbook-purchase-modal';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

type ListItem = {
  photobookUid: string;
  linkedAt?: string;
  sweetbook: unknown;
  sweetbookError?: string;
};

/** 편집 링크 — 표지 적용한 책은 내지 단계로 바로 열기(`?tab=inner`) */
function storageCoverKey(bookUid: string) {
  return `yearbook:${bookUid}:coverApplied`;
}

/** 목록에 표시할 시간 */
function formatLinkedAt(iso: string | undefined): string {
  if (!iso?.trim()) return '날짜 정보 없음';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '날짜 정보 없음' : d.toLocaleString('ko-KR');
}

type BooksListResponse = {
  success: boolean;
  items?: ListItem[];
};

/** Nest `POST /yearbook/books` — 최상위 `bookUid` + `sweetbook.response.data.bookUid` 동일 값 */
type CreateBookResponse = {
  success: boolean;
  bookUid?: string;
  message?: string;
  sweetbook?: { response?: { data?: { bookUid?: string } } };
  sweetbookStatus?: number;
};

export default function YearbookListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('2026 ○○학교 ○학년 ○반의 추억');
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createOk, setCreateOk] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<{ uid: string; title: string } | null>(null);

  /** GET 목록으로 상태 갱신 */
  async function refreshList() {
    setListLoading(true);
    setListError(null);
    try {
      const { data } = await api.get<BooksListResponse>('/yearbook/books');
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setListError('목록 형식이 올바르지 않습니다.');
      }
    } catch {
      setListError('책 목록을 불러오지 못했습니다. 로그인 상태를 확인해 주세요.');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=%2Fyearbook');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 목록은 로그인 사용자 변경 시에만 갱신
  }, [user]);

  /** 새 책 POST 후 목록 갱신 */
  async function onCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    const t = newTitle.trim();
    if (!t) {
      setCreateMsg('제목을 입력해 주세요.');
      return;
    }
    setCreateBusy(true);
    try {
      const { data } = await api.post<CreateBookResponse>('/yearbook/books', {
        title: t,
      });
      const bookUid =
        data.bookUid?.trim() || data.sweetbook?.response?.data?.bookUid?.trim();
      if (!data.success || !bookUid) {
        setCreateMsg(data.message ?? '책 생성에 실패했습니다. (bookUid 없음)');
        return;
      }
      setCreateOpen(false);
      setCreateMsg(null);
      setCreateOk(true);
      await refreshList();
    } catch {
      setCreateMsg('요청 중 오류가 났습니다.');
    } finally {
      setCreateBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="sb-page">
        <p className="sb-muted">확인 중…</p>
      </main>
    );
  }

  return (
    <main className="sb-page">
      <div className="sb-pageHead">
        <h1 className="sb-pageTitle">학급 포토북</h1>
        <p className="sb-pageLead">
          내가 만든 학급 포토북 목록입니다. 「새 책 추가」로 제목을 정해 한 권을 만들 수 있습니다. 각 책의 「편집」에서 표지와 내지를 이어서
          작업합니다.
        </p>
        <div className="sb-pageHeadActions">
          <button
            type="button"
            className="sb-btn sb-btnPrimary"
            onClick={() => {
              setCreateMsg(null);
              setCreateOk(false);
              setCreateOpen(true);
            }}
          >
            새 책 추가
          </button>
        </div>
      </div>

      {createOk ? (
        <p className="sb-formMsg" style={{ marginBottom: 16 }}>
          학급 포토북이 생성되었습니다. 아래 목록에서 해당 책의 「편집」으로 이어서 작업을 시작할 수 있습니다.
        </p>
      ) : null}

      {createOpen ? (
        <div className="sb-modalBackdrop" role="presentation">
          <div
            className="sb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="yearbook-create-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="yearbook-create-title" className="sb-panelTitle">
              새 학급 포토북
            </h2>
            <p className="sb-panelNote">제목을 정한 뒤 생성하면 목록에 나타납니다. 표지·내지는 목록에서 해당 책의 「표지·내지 편집」을 눌러 진행합니다.</p>
            <form className="sb-formWide" onSubmit={onCreateSubmit}>
              <label className="sb-label">
                책 제목
                <input
                  className="sb-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              {createMsg ? <p className="sb-error">{createMsg}</p> : null}
              <div className="sb-modalActions">
                <button
                  type="button"
                  className="sb-btn sb-btnSecondary"
                  disabled={createBusy}
                  onClick={() => setCreateOpen(false)}
                >
                  취소
                </button>
                <button type="submit" className="sb-btn sb-btnPrimary" disabled={createBusy}>
                  {createBusy ? '생성 중…' : '생성하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="sb-panel">
        <h2 className="sb-panelTitle">내 학급 포토북</h2>
        {listLoading ? <p className="sb-muted">불러오는 중…</p> : null}
        {listError ? <p className="sb-error">{listError}</p> : null}
        {!listLoading && !listError && items.length === 0 ? (
          <p className="sb-panelNote">아직 만든 책이 없습니다. 위에서 「새 책 추가」를 눌러 주세요.</p>
        ) : null}
        {!listLoading && items.length > 0 ? (
          <ul className="sb-bookList">
            {items.map((row) => {
              const d = row.sweetbook
                ? (row.sweetbook as { data?: { title?: string; status?: string } }).data
                : undefined;
              const title = d?.title?.trim() || row.photobookUid;
              const st = d?.status?.toLowerCase();
              const statusLabel =
                st === 'finalized' ? '완성' : st === 'deleted' ? '삭제됨' : st === 'draft' ? '진행중' : '정보 없음';
              const purchased = st === 'finalized';
              const finalized = st === 'finalized';
              const coverApplied =
                typeof window !== 'undefined' && window.localStorage.getItem(storageCoverKey(row.photobookUid)) === '1';
              return (
                <li key={row.photobookUid} className="sb-bookCard">
                  <div className="sb-bookCardMain">
                    <span className="sb-bookTitle">{title}</span>
                    <span className={`sb-bookStatus ${purchased ? 'isDone' : 'isEdit'}`}>
                      {statusLabel}
                    </span>
                    {row.sweetbookError ? (
                      <span className="sb-fieldHint">SweetBook: {row.sweetbookError}</span>
                    ) : null}
                    <span className="sb-fieldHint">{formatLinkedAt(row.linkedAt)}</span>
                  </div>
                  <div className="sb-bookCardActions">
                    {finalized ? (
                      <button type="button" className="sb-btn sb-btnPrimary" disabled title="최종화된 책은 편집할 수 없습니다.">
                        편집
                      </button>
                    ) : (
                      <Link
                        className="sb-btn sb-btnPrimary"
                        href={`/yearbook/${encodeURIComponent(row.photobookUid)}/edit${coverApplied ? '?tab=inner' : ''}`}
                      >
                        편집
                      </Link>
                    )}
                    <button
                      type="button"
                      className="sb-btn sb-btnSecondary"
                      disabled={!finalized}
                      title={finalized ? undefined : '최종화(완성)된 책만 구매할 수 있습니다.'}
                      onClick={() => {
                        if (!finalized) return;
                        setPurchaseTarget({ uid: row.photobookUid, title });
                      }}
                    >
                      구매하기
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {purchaseTarget ? (
        <YearbookPurchaseModal
          open
          bookUid={purchaseTarget.uid}
          bookTitle={purchaseTarget.title}
          onClose={() => setPurchaseTarget(null)}
        />
      ) : null}
    </main>
  );
}
