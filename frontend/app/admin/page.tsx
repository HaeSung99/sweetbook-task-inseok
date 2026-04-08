'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

type AdminLayoutTemplateRow = {
  id: string;
  kind: 'cover' | 'content';
  templateUid: string;
  createdAt: string;
};

type AdminPurchaseItem = {
  id: string;
  userId: string;
  requesterEmail: string | null;
  requesterName: string | null;
  bookUid: string;
  bookTitle: string | null;
  quantity: number;
  status: string;
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address1: string;
  address2: string | null;
  estimateSnapshot?: unknown;
  finalizeSnapshot?: unknown;
  apiAmountWon?: number | null;
  userChargeWon?: number | null;
  idempotencyKey: string | null;
  sweetbookOrderUid: string | null;
  lastError: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 관리자: 허용 레이아웃 템플릿 목록 */
async function getAdminLayoutTemplates() {
  const { data } = await api.get<{ success: boolean; items?: AdminLayoutTemplateRow[] }>('/admin/layout-templates');
  return data;
}

/** 관리자: 주문 요청 전체 목록 */
async function getAdminPurchaseRequests() {
  const { data } = await api.get<{ success: boolean; items?: AdminPurchaseItem[] }>('/admin/purchase-requests');
  return data;
}

/** 관리자: 회사 잔액(원) — 백엔드가 SweetBook 응답에서 balance만 내려줌 */
async function getAdminCompanyCredits() {
  const { data } = await api.get<{ success: boolean; balance?: number; message?: string }>('/admin/company-credits');
  return data;
}

/** 관리자: 표지/내지 허용 템플릿 한 건 등록 */
async function postAdminLayoutTemplate(body: { kind: 'cover' | 'content'; templateUid: string }) {
  const { data } = await api.post<{ success: boolean; id?: string; message?: string }>('/admin/layout-templates', body);
  return data;
}

/** 관리자: 허용 템플릿 삭제 */
async function deleteAdminLayoutTemplate(id: string) {
  const { data } = await api.delete<{ success: boolean; message?: string }>(
    `/admin/layout-templates/${encodeURIComponent(id)}`,
  );
  return data;
}

/** 관리자: 주문 요청 승인(SweetBook 주문 진행) */
async function postApprovePurchaseRequest(id: string) {
  const { data } = await api.post<{ success: boolean; message?: string }>(
    `/admin/purchase-requests/${encodeURIComponent(id)}/approve`,
  );
  return data;
}

/** 관리자: 주문 요청 거절/취소 */
async function postCancelPurchaseRequest(id: string, cancelReason: string) {
  const { data } = await api.post<{ success: boolean; message?: string }>(
    `/admin/purchase-requests/${encodeURIComponent(id)}/cancel`,
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
    ordered: '주문 완료',
    failed: '주문 실패',
    rejected: '거절',
    cancelled: '주문 취소됨',
  };
  return map[status] ?? status;
}

/** 관리자 전용 — 레이아웃 템플릿·주문 요청 승인/취소 */
export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<AdminPurchaseItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<{ id: string } | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('고객 변심');
  const [cancelBusy, setCancelBusy] = useState(false);

  const [companyBalanceWon, setCompanyBalanceWon] = useState<number | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const [tplItems, setTplItems] = useState<AdminLayoutTemplateRow[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);
  const [tplMsg, setTplMsg] = useState<string | null>(null);
  const [addTplOpen, setAddTplOpen] = useState(false);
  const [newTplKind, setNewTplKind] = useState<'cover' | 'content'>('cover');
  const [newTplUid, setNewTplUid] = useState('');
  const [addTplBusy, setAddTplBusy] = useState(false);

  async function loadTemplates() {
    setTplLoading(true);
    setTplError(null);
    try {
      const data = await getAdminLayoutTemplates();
      if (data.success && Array.isArray(data.items)) setTplItems(data.items);
      else setTplError('레이아웃 템플릿 목록을 불러오지 못했습니다.');
    } catch {
      setTplError('레이아웃 템플릿 목록을 불러오지 못했습니다.');
    } finally {
      setTplLoading(false);
    }
  }

  async function loadList() {
    setListLoading(true);
    setListError(null);
    try {
      const data = await getAdminPurchaseRequests();
      if (data.success && Array.isArray(data.items)) setItems(data.items);
      else setListError('목록을 불러오지 못했습니다.');
    } catch {
      setListError('목록을 불러오지 못했습니다. 관리자 권한·로그인을 확인해 주세요.');
    } finally {
      setListLoading(false);
    }
  }

  async function loadCompanyCredits() {
    setCreditsLoading(true);
    setCreditsError(null);
    setCompanyBalanceWon(null);
    try {
      const data = await getAdminCompanyCredits();
      if (data.success && typeof data.balance === 'number') {
        setCompanyBalanceWon(data.balance);
      } else {
        setCreditsError(data.message ?? '회사 잔액을 불러오지 못했습니다.');
      }
    } catch {
      setCreditsError('불러오지 못했습니다. SWEETBOOK_API_KEY·네트워크를 확인해 주세요.');
    } finally {
      setCreditsLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=%2Fadmin');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void loadList();
    void loadTemplates();
    void loadCompanyCredits();
  }, [user]);

  async function onAddTemplate() {
    const uid = newTplUid.trim();
    if (!uid) {
      setTplMsg('템플릿 UID를 입력해 주세요.');
      return;
    }
    setAddTplBusy(true);
    setTplMsg(null);
    try {
      const res = await postAdminLayoutTemplate({ kind: newTplKind, templateUid: uid });
      if (res.success) {
        setTplMsg('등록했습니다.');
        setNewTplUid('');
        setAddTplOpen(false);
        await loadTemplates();
      } else {
        setTplMsg(res.message ?? '등록에 실패했습니다.');
      }
    } catch {
      setTplMsg('등록 중 오류가 났습니다.');
    } finally {
      setAddTplBusy(false);
    }
  }

  async function onDeleteTemplate(id: string) {
    if (!window.confirm('이 템플릿 등록을 삭제할까요?')) return;
    setTplMsg(null);
    try {
      const res = await deleteAdminLayoutTemplate(id);
      if (res.success) {
        setTplMsg('삭제했습니다.');
        await loadTemplates();
      } else {
        setTplMsg('삭제에 실패했습니다.');
      }
    } catch {
      setTplMsg('삭제 중 오류가 났습니다.');
    }
  }

  async function onApprove(id: string) {
    setActionId(id);
    setActionMsg(null);
    try {
      const res = await postApprovePurchaseRequest(id);
      setActionMsg(res.success ? '주문 생성 요청을 보냈습니다.' : res.message ?? '승인 처리에 실패했습니다.');
      await loadList();
    } catch {
      setActionMsg('요청 중 오류가 났습니다.');
    } finally {
      setActionId(null);
    }
  }

  async function onCancelConfirm() {
    if (!cancelModal) return;
    setCancelBusy(true);
    setActionMsg(null);
    try {
      const reason = cancelReasonInput.trim() || '고객 변심';
      const res = await postCancelPurchaseRequest(cancelModal.id, reason);
      setActionMsg(res.success ? '주문 취소 요청을 보냈습니다.' : res.message ?? '주문 취소에 실패했습니다.');
      if (res.success) setCancelModal(null);
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

  if (user.role !== 'admin') {
    return (
      <main className="sb-page">
        <h1 className="sb-pageTitle">접근할 수 없습니다</h1>
        <p className="sb-panelNote">관리자 권한이 필요합니다.</p>
        <p className="sb-panelNote">
          <Link href="/">홈으로</Link>
        </p>
      </main>
    );
  }

  const pending = items.filter((i) => i.status === 'pending');

  return (
    <main className="sb-page">
      <div className="sb-pageHead">
        <p className="sb-muted" style={{ margin: '0 0 6px' }}>
          <Link href="/">← 홈</Link>
        </p>
        <h1 className="sb-pageTitle">관리자</h1>
        <p className="sb-pageLead">주문 요청을 승인하거나 취소하고, 표지·내지 레이아웃에 쓸 SweetBook 템플릿 UID를 등록할 수 있습니다.</p>
      </div>

      <section className="sb-panel">
        <h2 className="sb-panelTitle">회사(SweetBook) 잔액</h2>
        <p className="sb-panelNote">SweetBook <code>GET /v1/credits</code> 기준 잔액(원)입니다.</p>
        {creditsLoading ? <p className="sb-muted">불러오는 중…</p> : null}
        {!creditsLoading && creditsError ? <p className="sb-error">{creditsError}</p> : null}
        {!creditsLoading && companyBalanceWon !== null ? (
          <p style={{ margin: '12px 0 0', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {companyBalanceWon.toLocaleString('ko-KR')}원
          </p>
        ) : null}
      </section>

      <section className="sb-panel">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 className="sb-panelTitle" style={{ margin: 0 }}>
            레이아웃 템플릿 (SweetBook UID)
          </h2>
          <button
            type="button"
            className="sb-btn sb-btnPrimary"
            onClick={() => {
              setTplMsg(null);
              setAddTplOpen(true);
            }}
          >
            템플릿 추가하기
          </button>
        </div>
        <p className="sb-panelNote">학급 포토북 편집 화면의 표지·내지 목록은 여기에 등록한 UID로 SweetBook API를 호출해 만듭니다.</p>
        {tplMsg ? <p className="sb-formMsg">{tplMsg}</p> : null}
        {tplLoading ? <p className="sb-muted">불러오는 중…</p> : null}
        {tplError ? <p className="sb-error">{tplError}</p> : null}
        {!tplLoading && !tplError && tplItems.length === 0 ? (
          <p className="sb-panelNote">등록된 템플릿이 없습니다. 「템플릿 추가하기」로 표지 또는 내지 UID를 넣어 주세요.</p>
        ) : null}
        {!tplLoading && tplItems.length > 0 ? (
          <ul className="sb-bookList">
            {tplItems.map((row) => (
              <li key={row.id} className="sb-bookCard">
                <div className="sb-bookCardMain">
                  <span className="sb-bookTitle">
                    {row.kind === 'cover' ? '표지' : '내지'} · <code>{row.templateUid}</code>
                  </span>
                  <span className="sb-fieldHint">{formatDate(row.createdAt)}</span>
                </div>
                <div className="sb-bookCardActions">
                  <button type="button" className="sb-btn sb-btnSecondary" onClick={() => void onDeleteTemplate(row.id)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {addTplOpen ? (
        <div className="sb-modalBackdrop" role="presentation">
          <div
            className="sb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-add-template-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="admin-add-template-title" className="sb-panelTitle">
              템플릿 추가
            </h2>
            <label className="sb-label">
              종류
              <select className="sb-input" value={newTplKind} onChange={(e) => setNewTplKind(e.target.value as 'cover' | 'content')}>
                <option value="cover">표지 (cover)</option>
                <option value="content">내지 (content)</option>
              </select>
            </label>
            <label className="sb-label">
              템플릿 UID
              <input
                className="sb-input"
                value={newTplUid}
                onChange={(e) => setNewTplUid(e.target.value)}
                placeholder="SweetBook 템플릿 UID"
                autoComplete="off"
              />
            </label>
            <div className="sb-modalActions">
              <button type="button" className="sb-btn sb-btnSecondary" disabled={addTplBusy} onClick={() => setAddTplOpen(false)}>
                취소
              </button>
              <button type="button" className="sb-btn sb-btnPrimary" disabled={addTplBusy} onClick={() => void onAddTemplate()}>
                {addTplBusy ? '저장 중…' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="sb-panel">
        <h2 className="sb-panelTitle">주문 승인 대기</h2>
        {actionMsg ? <p className="sb-formMsg">{actionMsg}</p> : null}
        {listLoading ? <p className="sb-muted">불러오는 중…</p> : null}
        {listError ? <p className="sb-error">{listError}</p> : null}
        {!listLoading && !listError && pending.length === 0 ? <p className="sb-panelNote">대기 중인 요청이 없습니다.</p> : null}
        {!listLoading && pending.length > 0 ? (
          <ul className="sb-bookList">
            {pending.map((row) => (
              <li key={row.id} className="sb-bookCard">
                <div className="sb-bookCardMain">
                  <span className="sb-bookTitle">
                    {row.bookTitle?.trim() ? `「${row.bookTitle.trim()}」` : '「제목 없음」'} · 수량 {row.quantity ?? 1}권
                  </span>
                  <span className="sb-fieldHint">
                    책 UID <code>{row.bookUid}</code>
                  </span>
                  <span className="sb-fieldHint">
                    신청자 {row.requesterEmail ?? row.userId} · {row.recipientName} · {row.recipientPhone}
                  </span>
                  <span className="sb-fieldHint">
                    이용자 부담(2배){' '}
                    {row.userChargeWon != null ? `${row.userChargeWon.toLocaleString('ko-KR')}원` : '—'} · API 견적 원가{' '}
                    {row.apiAmountWon != null ? `${row.apiAmountWon.toLocaleString('ko-KR')}원` : '—'}
                  </span>
                </div>
                <div className="sb-bookCardActions" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" className="sb-btn sb-btnPrimary" disabled={actionId === row.id} onClick={() => void onApprove(row.id)}>
                    {actionId === row.id ? '처리 중…' : '승인하고 주문 생성'}
                  </button>
                  <button
                    type="button"
                    className="sb-btn sb-btnSecondary"
                    disabled={actionId === row.id}
                    onClick={() => {
                      setCancelReasonInput('관리자 취소');
                      setCancelModal({ id: row.id });
                    }}
                  >
                    요청 취소
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="sb-panel">
        <h2 className="sb-panelTitle">전체 이력</h2>
        {!listLoading && items.length > 0 ? (
          <ul className="sb-bookList">
            {items.map((row) => (
              <li key={row.id} className="sb-bookCard" style={{ alignItems: 'stretch' }}>
                <div className="sb-bookCardMain" style={{ gap: 6 }}>
                  <span className="sb-bookTitle">
                    {row.bookTitle?.trim() ? `「${row.bookTitle.trim()}」` : '「제목 없음」'} · 수량 {row.quantity ?? 1}권
                  </span>
                  <span className="sb-fieldHint">
                    책 UID <code>{row.bookUid}</code>
                  </span>
                  <span className="sb-fieldHint">상태 {statusLabel(row.status)}</span>
                  <span className="sb-fieldHint">
                    이용자 부담(2배){' '}
                    {row.userChargeWon != null ? `${row.userChargeWon.toLocaleString('ko-KR')}원` : '—'} · API 견적 원가{' '}
                    {row.apiAmountWon != null ? `${row.apiAmountWon.toLocaleString('ko-KR')}원` : '—'}
                  </span>
                  {row.sweetbookOrderUid ? (
                    <span className="sb-fieldHint">
                      주문 UID <code>{row.sweetbookOrderUid}</code>
                    </span>
                  ) : null}
                  {row.cancelReason ? <span className="sb-fieldHint">취소 사유 {row.cancelReason}</span> : null}
                  {row.lastError ? <span className="sb-error">{row.lastError}</span> : null}
                  <span className="sb-fieldHint">생성 {formatDate(row.createdAt)}</span>
                </div>
                {row.status === 'pending' ? (
                  <div className="sb-bookCardActions">
                    <button
                      type="button"
                      className="sb-btn sb-btnSecondary"
                      onClick={() => {
                        setCancelReasonInput('관리자 취소');
                        setCancelModal({ id: row.id });
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
                        setCancelModal({ id: row.id });
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
          <div className="sb-modal" role="dialog" aria-modal="true" aria-labelledby="admin-cancel-order-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="admin-cancel-order-title" className="sb-panelTitle">
              주문 취소
            </h2>
            <label className="sb-label">
              취소 사유
              <textarea className="sb-input" style={{ minHeight: 88, resize: 'vertical' }} value={cancelReasonInput} onChange={(e) => setCancelReasonInput(e.target.value)} rows={3} />
            </label>
            <div className="sb-modalActions">
              <button type="button" className="sb-btn sb-btnSecondary" disabled={cancelBusy} onClick={() => setCancelModal(null)}>
                닫기
              </button>
              <button type="button" className="sb-btn sb-btnPrimary" disabled={cancelBusy} onClick={() => void onCancelConfirm()}>
                {cancelBusy ? '처리 중…' : '취소 요청'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
