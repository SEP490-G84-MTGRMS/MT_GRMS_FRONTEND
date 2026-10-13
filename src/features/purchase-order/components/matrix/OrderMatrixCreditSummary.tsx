import type { FC } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface OrderMatrixCreditSummaryProps {
  openAp: number;
  newOrderAmt: number;
  creditLimit: number;
  creditExceed: boolean;
}

export const OrderMatrixCreditSummary: FC<OrderMatrixCreditSummaryProps> = ({
  openAp,
  newOrderAmt,
  creditLimit,
  creditExceed,
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
  const totalAp = openAp + newOrderAmt;

  return (
    <div className="po-credit-bar">
      <div className="po-credit-text">
        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Hạn Mức Tín Dụng NCC:</span>
        <span>
          Dư nợ AP hiện tại: <b className="po-credit-formula">{fmt(openAp)}</b>
        </span>
        <span>+</span>
        <span>
          Đơn hàng mới: <b className="po-credit-formula" style={{ color: 'var(--blue-primary)' }}>{fmt(newOrderAmt)}</b>
        </span>
        <span>=</span>
        <span>
          Tổng nợ dự kiến: <b className="po-credit-formula" style={{ color: creditExceed ? 'var(--red-accent)' : 'var(--text-main)' }}>{fmt(totalAp)}</b> / <span className="po-credit-formula">{fmt(creditLimit)}</span>
        </span>
      </div>

      <div>
        {creditExceed ? (
          <span className="po-credit-badge po-credit-badge--danger">
            <AlertTriangle size={14} />
            <span>(⚠️ Vượt hạn mức nợ NCC — Bị chặn đặt đơn)</span>
          </span>
        ) : (
          <span className="po-credit-badge po-credit-badge--safe">
            <ShieldCheck size={14} />
            <span>(Safe — Hạn mức an toàn)</span>
          </span>
        )}
      </div>
    </div>
  );
};
