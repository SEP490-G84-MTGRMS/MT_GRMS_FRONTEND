import { useState, type FC } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { HouseholdTaxSummaryDto } from '../types/taxSnapshot';
import { formatMoney } from '../../finance/utils/formatters';

interface Props {
  summary?: HouseholdTaxSummaryDto;
  isLoading?: boolean;
}

const formatDate = (value?: string) => {
  if (!value) return 'Chưa xác định';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa xác định' : date.toLocaleDateString('vi-VN');
};

export const TaxOverviewCard: FC<Props> = ({ summary, isLoading }) => {
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !summary) {
    return <section className="tax-overview-card tax-overview-loading" aria-busy="true">Đang tổng hợp doanh thu năm…</section>;
  }

  const threshold = summary.taxExemptionThreshold || 1_000_000_000;
  const revenue = summary.annualAccumulatedRevenue || 0;
  const rawPercent = threshold > 0 ? (revenue / threshold) * 100 : 0;
  const percent = Math.max(0, Math.min(100, rawPercent));
  const remaining = Math.max(0, threshold - revenue);
  const status = summary.isTaxExempt
    ? 'Chưa đến ngưỡng chịu thuế'
    : rawPercent >= 100 ? 'Đã vượt ngưỡng chịu thuế' : 'Đang phát sinh nghĩa vụ thuế';

  return (
    <section className="tax-overview-card" aria-labelledby="tax-overview-title">
      <div className="tax-overview-heading">
        <div>
          <div id="tax-overview-title" className="tax-overview-label">Doanh thu năm {summary.year}</div>
          <div className="tax-overview-revenue">
            {formatMoney(revenue)} <small>/ {formatMoney(threshold)}</small>
          </div>
        </div>
        <span className={`tax-overview-status ${summary.isTaxExempt ? 'safe' : 'warning'}`}>
          <span aria-hidden="true" />{status}
        </span>
      </div>

      <div className="tax-overview-progress-meta">
        <span>Đã đạt <strong>{rawPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</strong> ngưỡng</span>
        <span>{remaining > 0 ? <>Còn <strong>{formatMoney(remaining)}</strong></> : <>Vượt <strong>{formatMoney(revenue - threshold)}</strong></>}</span>
      </div>
      <div
        className="tax-overview-progress"
        role="progressbar"
        aria-label={`Tiến độ doanh thu đến ngưỡng ${formatMoney(threshold)}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      <button
        type="button"
        className="tax-overview-detail-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Thu gọn' : 'Xem chi tiết ngưỡng'}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div className="tax-overview-explanation">
          {summary.thresholdExceededNote || summary.netVsGrossThresholdWarning ||
            'Ngưỡng được theo dõi theo doanh thu lũy kế trong năm. Số liệu thuế là ước tính và cần được đối chiếu trước khi lập hồ sơ.'}
        </div>
      )}

      <div className="tax-overview-footer">
        <div><span>Thuế dự kiến kỳ này</span><strong>{formatMoney(summary.totalTaxAmount)}</strong><small>Ước tính · tham khảo</small></div>
        <div><span>Hạn nộp kỳ này</span><strong>{formatDate(summary.filingDeadlineLocal)}</strong><small>{summary.filingDeadlineNote || 'Theo dữ liệu máy chủ'}</small></div>
      </div>
    </section>
  );
};
