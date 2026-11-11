import type { FC } from 'react';
import type { CustomerDto, CustomerKpiSummary } from '../types/customer.types';
import { formatMoney } from '../../finance/utils/formatters';

interface CustomerKpiCardsProps {
  summary?: CustomerKpiSummary;
  customers?: CustomerDto[];
  isLoading?: boolean;
  onFilterOverLimit?: () => void;
  onFilterDebt?: () => void;
}

export const CustomerKpiCards: FC<CustomerKpiCardsProps> = ({
  summary,
  customers = [],
  isLoading,
  onFilterOverLimit,
  onFilterDebt,
}) => {
  if (isLoading) {
    return (
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="kpi-card" style={{ height: '96px', opacity: 0.6 }} />
        <div className="kpi-card" style={{ height: '96px', opacity: 0.6 }} />
        <div className="kpi-card" style={{ height: '96px', opacity: 0.6 }} />
      </div>
    );
  }

  const debtorsCount = customers.filter((c) => (c.currentDebtAR || 0) > 0).length;
  const overLimitCustomers = customers.filter(
    (c) => (c.debtLimit || 0) > 0 && (c.currentDebtAR || 0) > (c.debtLimit || 0)
  );
  const overLimitCount = summary?.overLimitCount ?? overLimitCustomers.length;
  const totalDebt =
    summary?.totalDebtAR ??
    customers.reduce((sum, c) => sum + (c.currentDebtAR || 0), 0);

  const overLimitSubtitle =
    overLimitCustomers.length > 0
      ? overLimitCustomers[0].fullName
      : 'Tất cả trong hạn mức';

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
      {/* Thẻ 1: Khách nợ mình (Tổng công nợ) */}
      <div className="kpi-card">
        <div className="kpi-label">
          <span>Khách nợ mình (Tổng công nợ)</span>
          <span className="kpi-icon">💳</span>
        </div>
        <div className="kpi-value">{formatMoney(totalDebt)}</div>
        <div className="kpi-sub">Số liệu thật đồng bộ Hóa đơn &amp; Sổ quỹ</div>
      </div>

      {/* Thẻ 2: Số khách đang nợ */}
      <div
        className="kpi-card"
        onClick={onFilterDebt}
        style={{ cursor: onFilterDebt ? "pointer" : "default" }}
        title={onFilterDebt ? "Bấm để lọc danh sách khách đang nợ" : undefined}
      >
        <div className="kpi-label">
          <span>Số khách đang nợ</span>
          <span className="kpi-icon">👥</span>
        </div>
        <div className="kpi-value">{debtorsCount} khách</div>
        <div className="kpi-sub">Tổng số khách hàng ghi nợ</div>
      </div>

      {/* Thẻ 3: Khách vượt hạn mức */}
      <div
        className="kpi-card"
        onClick={onFilterOverLimit}
        style={{ cursor: onFilterOverLimit ? 'pointer' : 'default' }}
        title={onFilterOverLimit ? 'Bấm để lọc danh sách khách vượt hạn mức' : undefined}
      >
        <div className="kpi-label">
          <span>Khách vượt hạn mức</span>
          <span className="kpi-icon">🚨</span>
        </div>
        <div className={`kpi-value ${overLimitCount > 0 ? 'text-red' : ''}`}>
          {overLimitCount} khách
        </div>
        <div className="kpi-sub">{overLimitSubtitle}</div>
      </div>
    </div>
  );
};
