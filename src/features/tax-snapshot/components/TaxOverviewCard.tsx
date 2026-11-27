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

  if (isLoading) {
    return <section className="tax-overview-card tax-overview-loading" aria-busy="true">Đang tổng hợp doanh thu năm…</section>;
  }
  if (!summary) {
    return <section className="tax-overview-card tax-overview-loading">Chưa tải được dữ liệu tổng hợp thuế.</section>;
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
          <div>
            {summary.thresholdExceededNote || summary.netVsGrossThresholdWarning ||
              'Ngưỡng miễn thuế 1 tỷ đồng/năm (NĐ 68/2026 & NĐ 141/2026/NĐ-CP) theo doanh thu lũy kế năm. Số liệu hệ thống chỉ mang tính chất tính toán tham khảo; chủ hộ cần tự đối soát chứng từ và chịu trách nhiệm pháp lý khi kê khai với cơ quan thuế.'}
          </div>
          {summary.eInvoiceRegistrationDeadlineLocal && (
            <div style={{ marginTop: 6, color: '#991B1B', fontWeight: 700 }}>
              ⚠️ Hạn đăng ký HĐĐT từ máy tính tiền (30 ngày theo NĐ 254/2026 &amp; TT 91/2026): {formatDate(summary.eInvoiceRegistrationDeadlineLocal)}
            </div>
          )}
        </div>
      )}

      <div className="tax-overview-footer">
        <div><span>Thuế dự kiến kỳ này</span><strong>{formatMoney(summary.totalTaxAmount)}</strong><small>Ước tính · tham khảo</small></div>
        <div><span>Hạn nộp kỳ này</span><strong>{formatDate(summary.filingDeadlineLocal)}</strong><small>{summary.filingDeadlineNote || 'Theo dữ liệu máy chủ'}</small></div>
      </div>
    </section>
  );
};
