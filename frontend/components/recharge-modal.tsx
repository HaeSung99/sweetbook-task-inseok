'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

/** 데모용 잔액 충전 — 실제 결제 없이 금액만 가산 */
export function RechargeModal({ open, onClose, onSuccess }: Props) {
  const [amountInput, setAmountInput] = useState('10000');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(amountInput.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < 1) {
      setErr('1원 이상 숫자로 입력해 주세요.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { data } = await api.post<{ success: boolean; balanceWon?: number; message?: string }>('/auth/recharge', {
        amount: n,
      });
      if (data.success && typeof data.balanceWon === 'number') {
        onSuccess();
        onClose();
        setAmountInput('10000');
      } else {
        setErr(data.message ?? '충전에 실패했습니다.');
      }
    } catch {
      setErr('요청 중 오류가 났습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sb-modalBackdrop" role="presentation">
      <form className="sb-modal" role="dialog" aria-modal="true" aria-labelledby="recharge-title" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2 id="recharge-title" className="sb-panelTitle">
          잔액 충전
        </h2>
        <p className="sb-panelNote">충전할 금액(원)을 입력하세요. (데모: 실제 결제는 없고 잔액만 늘어납니다.)</p>
        {err ? <p className="sb-error">{err}</p> : null}
        <label className="sb-label">
          충전 금액 (원)
          <input
            className="sb-input"
            type="text"
            inputMode="numeric"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="sb-modalActions">
          <button type="button" className="sb-btn sb-btnSecondary" disabled={busy} onClick={() => onClose()}>
            닫기
          </button>
          <button type="submit" className="sb-btn sb-btnPrimary" disabled={busy}>
            {busy ? '처리 중…' : '충전하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
