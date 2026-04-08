'use client';

import { useLayoutEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

type Phase = 'qty' | 'done' | 'error';

type PurchaseEstimateResult = {
  success: boolean;
  finalize?: { success: boolean; message?: string; response?: unknown };
  estimate?: { success: boolean; message?: string; response?: unknown };
  message?: string;
  /** SweetBook 견적 합계(원) */
  apiTotalWon?: number | null;
  /** 이용자에게 보이는·차감할 금액(원) = apiTotalWon × 2 */
  displayTotalWon?: number | null;
};

type PurchaseShippingBody = {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address1: string;
  address2?: string;
  quantity?: number;
};

/** 주문 견적: 수량 기준 금액·크레딧 조회 */
async function postPurchaseEstimate(bookUid: string, quantity?: number) {
  const body = { quantity: quantity ?? 1 };
  const { data } = await api.post<PurchaseEstimateResult>(
    `/yearbook/books/${encodeURIComponent(bookUid)}/purchase/estimate`,
    body,
  );
  return data;
}

/** 주문 요청 제출: 배송지·수량 */
async function postPurchaseSubmit(bookUid: string, body: PurchaseShippingBody) {
  const { data } = await api.post<{ success: boolean; requestId?: string; message?: string }>(
    `/yearbook/books/${encodeURIComponent(bookUid)}/purchase/submit`,
    body,
  );
  return data;
}
/** 공백 제거 후 1~99 정수만 허용 (앞뒤 0 등 숫자만 있는 문자열) */
function parseOrderQuantity(s: string): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  if (n < 1 || n > 99) return null;
  return n;
}

/** 견적 API 중첩 응답에서 금액·크레딧 필드만 골라 평탄화 */
function readEstimateData(estimateResult: PurchaseEstimateResult | null) {
  const raw = estimateResult?.estimate?.response as { data?: Record<string, unknown> } | undefined;
  const data = raw?.data;
  if (!data || typeof data !== 'object') return null;
  return {
    totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : undefined,
    paidCreditAmount: typeof data.paidCreditAmount === 'number' ? data.paidCreditAmount : undefined,
    creditSufficient: typeof data.creditSufficient === 'boolean' ? data.creditSufficient : undefined,
    currency: typeof data.currency === 'string' ? data.currency : 'KRW',
    creditBalance: typeof data.creditBalance === 'number' ? data.creditBalance : undefined,
  };
}

type Props = {
  open: boolean;
  bookUid: string;
  bookTitle: string;
  onClose: () => void;
};

/** 최종화된 학급 포토북 주문 요청 — 수량·견적·배송지 입력 모달 */
export function YearbookPurchaseModal({ open, bookUid, bookTitle, onClose }: Props) {
  const { user, refreshMe } = useAuth();
  const [phase, setPhase] = useState<Phase>('qty');
  const [priceOverlay, setPriceOverlay] = useState(false);
  const [estimateBusy, setEstimateBusy] = useState(false);
  const [estimateResult, setEstimateResult] = useState<PurchaseEstimateResult | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [shipping, setShipping] = useState({
    recipientName: '',
    recipientPhone: '',
    postalCode: '',
    address1: '',
    address2: '',
  });
  const [quantityInput, setQuantityInput] = useState('1');
  const [submitBusy, setSubmitBusy] = useState(false);

  useLayoutEffect(() => {
    if (!open || !bookUid) return;
    setPhase('qty');
    setPriceOverlay(false);
    setQuantityInput('1');
    setEstimateResult(null);
    setErrMsg(null);
    setEstimateBusy(false);
    setShipping({
      recipientName: '',
      recipientPhone: '',
      postalCode: '',
      address1: '',
      address2: '',
    });
  }, [open, bookUid]);

  function closeAll() {
    if (submitBusy) return;
    onClose();
  }

  /** 가격 확인: 견적 API 호출 후 성공 시 견적 오버레이 표시 */
  async function onCheckPrice() {
    const q = parseOrderQuantity(quantityInput);
    if (q === null) return;
    setErrMsg(null);
    setEstimateBusy(true);
    try {
      const data = await postPurchaseEstimate(bookUid, q);
      setEstimateResult(data);
      if (data.success) {
        setPriceOverlay(true);
      } else {
        const msg =
          data.message ??
          (!data.finalize?.success ? data.finalize?.message : undefined) ??
          (!data.estimate?.success ? data.estimate?.message : undefined) ??
          '견적을 불러오지 못했습니다.';
        setErrMsg(msg);
        setPhase('error');
      }
    } catch {
      setErrMsg('요청 중 오류가 났습니다.');
      setPhase('error');
    } finally {
      setEstimateBusy(false);
    }
  }

  /** 주문 요청: 배송지 포함 제출 */
  async function onConfirmPurchase(e: React.FormEvent) {
    e.preventDefault();
    const q = parseOrderQuantity(quantityInput);
    if (q === null || !shippingReady) return;
    setSubmitBusy(true);
    setErrMsg(null);
    try {
      const data = await postPurchaseSubmit(bookUid, {
        recipientName: shipping.recipientName.trim(),
        recipientPhone: shipping.recipientPhone.trim(),
        postalCode: shipping.postalCode.trim(),
        address1: shipping.address1.trim(),
        address2: shipping.address2.trim() || undefined,
        quantity: q,
      });
      if (data.success) {
        setPriceOverlay(false);
        setPhase('done');
      } else {
        setErrMsg(data.message ?? '제출에 실패했습니다.');
      }
    } catch {
      setErrMsg('제출 중 오류가 났습니다.');
    } finally {
      setSubmitBusy(false);
    }
  }

  if (!open) return null;

  const shippingReady =
    shipping.recipientName.trim().length > 0 &&
    shipping.recipientPhone.trim().length > 0 &&
    shipping.postalCode.trim().length > 0 &&
    shipping.address1.trim().length > 0;

  const qtyValid = parseOrderQuantity(quantityInput);
  const money = readEstimateData(estimateResult);
  const apiWon =
    estimateResult?.apiTotalWon ??
    (typeof money?.totalAmount === 'number' ? money.totalAmount : null);
  const displayWon =
    estimateResult?.displayTotalWon ?? (apiWon !== null ? apiWon * 2 : null);

  return (
    <div className="sb-modalBackdrop" role="presentation">
      <div
        className="sb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="yearbook-purchase-title"
        onClick={(ev) => ev.stopPropagation()}
        style={
          priceOverlay
            ? { opacity: 0.45, pointerEvents: 'none' as const, transition: 'opacity 0.15s ease' }
            : undefined
        }
      >
        <h2 id="yearbook-purchase-title" className="sb-panelTitle">
          주문 — {bookTitle}
        </h2>

        {phase === 'qty' ? (
          <>
            <label className="sb-label" style={{ marginTop: 8 }}>
              주문 수량
              <input
                className="sb-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="예: 1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
              />
            </label>
            <p className="sb-fieldHint" style={{ marginTop: 6 }}>
              주문 가능 수량: <strong>1~99</strong>권 (숫자만 입력)
            </p>
            <div className="sb-modalActions" style={{ marginTop: 16 }}>
              <button type="button" className="sb-btn sb-btnSecondary" disabled={estimateBusy} onClick={closeAll}>
                취소
              </button>
              {qtyValid !== null ? (
                <button
                  type="button"
                  className="sb-btn sb-btnPrimary"
                  disabled={estimateBusy}
                  onClick={() => void onCheckPrice()}
                >
                  {estimateBusy ? '확인 중…' : '가격 확인하기'}
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        {phase === 'done' ? (
          <>
            <p className="sb-formMsg" style={{ marginTop: 12 }}>
              주문 요청이 접수되었습니다. 관리자 승인 후 인쇄 주문이 진행됩니다.
            </p>
            <p className="sb-panelTitle" style={{ fontSize: '1.25rem', marginTop: 8 }}>
              주문 요청 완료됨
            </p>
            <div className="sb-modalActions" style={{ marginTop: 16 }}>
              <button type="button" className="sb-btn sb-btnPrimary" onClick={closeAll}>
                확인
              </button>
            </div>
          </>
        ) : null}

        {phase === 'error' ? (
          <>
            <p className="sb-error">{errMsg}</p>
            <div className="sb-modalActions">
              <button
                type="button"
                className="sb-btn sb-btnSecondary"
                onClick={() => {
                  setPhase('qty');
                  setErrMsg(null);
                }}
              >
                이전
              </button>
              <button type="button" className="sb-btn sb-btnPrimary" onClick={closeAll}>
                닫기
              </button>
            </div>
          </>
        ) : null}
      </div>

      {priceOverlay && estimateResult?.success ? (
        <div className="sb-modalBackdropNested" role="presentation">
          <form
            className="sb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="yearbook-purchase-price-title"
            onClick={(ev) => ev.stopPropagation()}
            onSubmit={onConfirmPurchase}
          >
            <h2 id="yearbook-purchase-price-title" className="sb-panelTitle">
              주문 금액
            </h2>
            <p className="sb-panelNote">주문 요청 시 아래 금액이 서비스 잔액에서 차감됩니다.</p>
            {displayWon !== null ? (
              <div className="sb-priceSummary">
                <div className="sb-priceSummaryRow">
                  <span className="sb-priceSummaryLabel">주문 금액</span>
                  <span className="sb-priceSummaryValue sb-priceSummaryValue--lg">
                    {displayWon.toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="sb-priceSummaryRow">
                  <span className="sb-priceSummaryLabel">내 서비스 잔액</span>
                  <span className="sb-priceSummaryValue">
                    {user ? `${user.balanceWon.toLocaleString('ko-KR')}원` : '—'}
                  </span>
                </div>
                {user && displayWon > user.balanceWon ? (
                  <p className="sb-error sb-priceSummaryFoot" style={{ margin: 0 }}>
                    잔액이 부족합니다. 홈 또는 상단 메뉴에서 잔액을 충전해 주세요.
                  </p>
                ) : null}
              </div>
            ) : money && typeof money.totalAmount === 'number' ? (
              <div className="sb-priceSummary">
                <div className="sb-priceSummaryRow">
                  <span className="sb-priceSummaryLabel">주문 금액</span>
                  <span className="sb-priceSummaryValue sb-priceSummaryValue--lg">
                    {(money.totalAmount * 2).toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="sb-priceSummaryRow">
                  <span className="sb-priceSummaryLabel">내 서비스 잔액</span>
                  <span className="sb-priceSummaryValue">
                    {user ? `${user.balanceWon.toLocaleString('ko-KR')}원` : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="sb-muted">견적이 조회되었습니다.</p>
            )}

            <p className="sb-panelNote" style={{ marginTop: 14 }}>
              배송지 입력 (필수)
            </p>
            {errMsg ? <p className="sb-error">{errMsg}</p> : null}
            <label className="sb-label">
              받는 분 이름
              <input
                className="sb-input"
                value={shipping.recipientName}
                onChange={(e) => setShipping((s) => ({ ...s, recipientName: e.target.value }))}
                required
                autoComplete="name"
              />
            </label>
            <label className="sb-label">
              전화번호
              <input
                className="sb-input"
                value={shipping.recipientPhone}
                onChange={(e) => setShipping((s) => ({ ...s, recipientPhone: e.target.value }))}
                required
                autoComplete="tel"
              />
            </label>
            <label className="sb-label">
              우편번호
              <input
                className="sb-input"
                value={shipping.postalCode}
                onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))}
                required
                autoComplete="postal-code"
              />
            </label>
            <label className="sb-label">
              주소
              <input
                className="sb-input"
                value={shipping.address1}
                onChange={(e) => setShipping((s) => ({ ...s, address1: e.target.value }))}
                required
                autoComplete="address-line1"
              />
            </label>
            <label className="sb-label">
              상세 주소 (선택)
              <input
                className="sb-input"
                value={shipping.address2}
                onChange={(e) => setShipping((s) => ({ ...s, address2: e.target.value }))}
                autoComplete="address-line2"
              />
            </label>

            <div className="sb-modalActions" style={{ marginTop: 16 }}>
              <button type="button" className="sb-btn sb-btnSecondary" disabled={submitBusy} onClick={() => setPriceOverlay(false)}>
                이전
              </button>
              <button
                type="submit"
                className="sb-btn sb-btnPrimary"
                disabled={
                  submitBusy ||
                  !shippingReady ||
                  !user ||
                  (displayWon !== null && displayWon > user.balanceWon)
                }
                title={
                  !shippingReady
                    ? '받는 분·연락처·우편번호·주소를 입력해 주세요.'
                    : !user
                      ? '로그인이 필요합니다.'
                      : displayWon !== null && displayWon > user.balanceWon
                        ? '잔액이 부족합니다.'
                        : undefined
                }
              >
                {submitBusy ? '처리 중…' : '주문 요청하기'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
