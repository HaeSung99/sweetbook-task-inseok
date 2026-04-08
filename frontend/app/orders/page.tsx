'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

type MyOrderItem = {
  id: string;
  bookTitle: string | null;
  quantity: number;
  status: string;
  sweetbookOrderUid: string | null;
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address1: string;
  address2: string | null;
  cancelReason: string | null;
  lastError: string | null;
  userChargeWon?: number | null;
  createdAt: string;
  updatedAt: string;
};

type MyOrdersListResponse = {
  success: boolean;
  items?: MyOrderItem[];
};

/** 내 주문(요청) 목록 */
async function fetchMyOrders() {
  const { data } = await api.get<MyOrdersListResponse>('/yearbook/orders');
  return data;
}

/** 주문 요청 취소(승인 대기는 즉시·환불, 주문 완료는 SweetBook 취소) */
async function cancelMyOrder(requestId: string, cancelReason: string) {
  const { data } = await api.post<{ success: boolean; message?: string; balanceWon?: number }>(
    `/yearbook/orders/${encodeURIComponent(requestId)}/cancel`,
    { cancelReason },
  );
  return data;
}

/** 한국 시간으로 표시 */
function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ko-KR');
}

/** 주문 상태 코드 → 한글 라벨 */
function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '승인 대기',
    approved: '승인됨',
    ordered: '주문 완료',
    failed: '주문 실패',
    rejected: '거절',
    cancelled: '주문 취소됨',
  };
  return map[status] ?? status;
}

/** 주문 상태 → 색상 박지 클래스 */
function orderStatusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: 'sb-orderStatus sb-orderStatus--pending',
    approved: 'sb-orderStatus sb-orderStatus--approved',
    ordered: 'sb-orderStatus sb-orderStatus--ordered',
    failed: 'sb-orderStatus sb-orderStatus--failed',
    rejected: 'sb-orderStatus sb-orderStatus--rejected',
    cancelled: 'sb-orderStatus sb-orderStatus--cancelled',
  };
  return map[status] ?? 'sb-orderStatus sb-orderStatus--default';
}

/** 로그인 사용자 본인 주문 목록·취소 */
export default function OrdersPage() {
  const { user, loading, refreshMe } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<MyOrderItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<{ id: string; mode: 'pending' | 'ordered' } | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('고객 변심');
  const [cancelBusy, setCancelBusy] = useState(false);

  async function loadList() {
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchMyOrders();
      if (data.success && Array.isArray(data.items)) setItems(data.items);
      else setListError('목록을 불러오지 못했습니다.');
    } catch {
      setListError('목록을 불러오지 못했습니다. 로그인 상태를 확인해 주세요.');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=%2Forders');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void loadList();
  }, [user]);

  async function onCancelConfirm() {
    if (!cancelModal) return;
    setCancelBusy(true);
    setActionMsg(null);
    try {
      const reason = cancelReasonInput.trim() || '고객 변심';
      const res = await cancelMyOrder(cancelModal.id, reason);
      setActionMsg(
        res.success
          ? cancelModal.mode === 'pending'
            ? '주문 요청을 취소했고 잔액이 환불되었습니다.'
            : '주문 취소 요청을 보냈습니다.'
          : res.message ?? '주문 취소에 실패했습니다.',
      );
      if (res.success) {
        setCancelModal(null);
        void refreshMe();
      }
      await loadList();
    } catch {
      setActionMsg('주문 취소 요청 중 오류가 났습니다.');
    } finally {
      setCancelBusy(false);
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
        <p className="sb-muted" style={{ margin: '0 0 6px' }}>
          <Link href="/">← 홈</Link>
        </p>
        <h1 className="sb-pageTitle">주문내역</h1>
      </div>

      <section className="sb-panel">
        {actionMsg ? <p className="sb-formMsg">{actionMsg}</p> : null}
        {listLoading ? <p className="sb-muted">불러오는 중…</p> : null}
        {listError ? <p className="sb-error">{listError}</p> : null}
        {!listLoading && !listError && items.length === 0 ? <p className="sb-panelNote">아직 주문 내역이 없습니다.</p> : null}
        {!listLoading && items.length > 0 ? (
          <ul className="sb-bookList">
            {items.map((row) => (
              <li key={row.id} className="sb-bookCard" style={{ alignItems: 'stretch' }}>
                <div className="sb-bookCardMain" style={{ gap: 6 }}>
                  <span className="sb-bookTitle">
                    {row.bookTitle?.trim() ? `「${row.bookTitle.trim()}」` : '「제목 없음」'} · 수량 {row.quantity ?? 1}권
                  </span>
                  <span className="sb-orderStatusRow">
                    <span className="sb-orderStatusLabel">상태</span>
                    <span className={orderStatusBadgeClass(row.status)}>{statusLabel(row.status)}</span>
                  </span>
                  {row.sweetbookOrderUid ? (
                    <span className="sb-fieldHint">
                      주문 UID <code>{row.sweetbookOrderUid}</code>
                    </span>
                  ) : null}
                  {row.status === 'cancelled' ? (
                    <span className="sb-fieldHint" style={{ color: 'var(--sb-muted)' }}>
                      이 주문은 취소되었습니다.
                      {row.cancelReason ? ` (사유: ${row.cancelReason})` : ''}
                    </span>
                  ) : null}
                  {row.lastError ? <span className="sb-error">{row.lastError}</span> : null}
                  {typeof row.userChargeWon === 'number' ? (
                    <span className="sb-fieldHint">결제 금액 {row.userChargeWon.toLocaleString('ko-KR')}원</span>
                  ) : null}
                  <span className="sb-fieldHint">신청 {formatDate(row.createdAt)}</span>
                </div>
                {row.status === 'pending' ? (
                  <div className="sb-bookCardActions">
                    <button
                      type="button"
                      className="sb-btn sb-btnSecondary"
                      onClick={() => {
                        setCancelReasonInput('고객 변심');
                        setCancelModal({ id: row.id, mode: 'pending' });
                      }}
                    >
                      요청 취소
                    </button>
                  </div>
                ) : null}
                {row.status === 'ordered' && row.sweetbookOrderUid ? (
                  <div className="sb-bookCardActions">
                    <button
                      type="button"
                      className="sb-btn sb-btnSecondary"
                      onClick={() => {
                        setCancelReasonInput('고객 변심');
                        setCancelModal({ id: row.id, mode: 'ordered' });
                      }}
                    >
                      주문 취소
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {cancelModal ? (
        <div className="sb-modalBackdrop" role="presentation">
          <div className="sb-modal" role="dialog" aria-modal="true" aria-labelledby="orders-cancel-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="orders-cancel-title" className="sb-panelTitle">
              주문 취소
            </h2>
            <p className="sb-panelNote">주문 취소를 요청합니다. 제작이 시작된 뒤에는 거절될 수 있습니다.</p>
            <label className="sb-label">
              취소 사유
              <textarea className="sb-input" style={{ minHeight: 88, resize: 'vertical' }} value={cancelReasonInput} onChange={(e) => setCancelReasonInput(e.target.value)} rows={3} />
            </label>
            <div className="sb-modalActions">
              <button type="button" className="sb-btn sb-btnSecondary" disabled={cancelBusy} onClick={() => setCancelModal(null)}>
                닫기
              </button>
              <button type="button" className="sb-btn sb-btnPrimary" disabled={cancelBusy} onClick={() => void onCancelConfirm()}>
                {cancelBusy ? '처리 중…' : cancelModal.mode === 'pending' ? '요청 취소하기' : '주문 취소 요청'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
