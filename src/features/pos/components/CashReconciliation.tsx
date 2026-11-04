import type { FC } from 'react';
import { CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  theoreticalCash: number;
  actualCash: number;
}

export const CashReconciliation: FC<Props> = ({ theoreticalCash, actualCash }) => {
  const diff = actualCash - theoreticalCash;

  const renderStatus = () => {
    if (diff === 0) {
      return (
        <span className="diff-badge match font-mono">
          <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
          <span>Khớp 100% (0 đ)</span>
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="diff-badge surplus font-mono tabular-nums">
          <TrendingUp size={13} style={{ flexShrink: 0 }} />
          <span>Thừa +{diff.toLocaleString('vi-VN')} đ</span>
        </span>
      );
    }
    return (
      <span className="diff-badge deficit font-mono tabular-nums">
        <TrendingDown size={13} style={{ flexShrink: 0 }} />
        <span>Thiếu {diff.toLocaleString('vi-VN')} đ</span>
      </span>
    );
  };

  return (
    <div className="pos-reconciliation-card">
      <div className="reconciliation-grid-3">
        <div className="reconciliation-block">
          <span className="reconciliation-block-label">Tiền lý thuyết (Hệ thống)</span>
          <span className="reconciliation-block-val font-mono tabular-nums">
            {theoreticalCash.toLocaleString('vi-VN')} đ
          </span>
        </div>
        <div className="reconciliation-block">
          <span className="reconciliation-block-label">Tiền thực đếm (Két quầy)</span>
          <span className="reconciliation-block-val font-mono tabular-nums text-teal-800">
            {actualCash.toLocaleString('vi-VN')} đ
          </span>
        </div>
        <div className="reconciliation-block highlight">
          <span className="reconciliation-block-label">Chênh lệch két</span>
          <div className="reconciliation-status-container">{renderStatus()}</div>
        </div>
      </div>
    </div>
  );
};
