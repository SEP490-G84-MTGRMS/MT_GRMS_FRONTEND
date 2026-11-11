import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { formatMoney } from '../../features/finance/utils/formatters';
import { HouseholdTaxGroup } from '../../features/tax-snapshot/types/taxSnapshot';

interface ThresholdRulerProps {
  currentYtdRevenue: number;
  threshold?: number;
  warningThreshold?: number;
  year?: number;
  quarter?: number;
  periodType?: number;
  periodNumber?: number;
  periodLabel?: string;
  householdGroup?: HouseholdTaxGroup;
  onHelpClick?: () => void;
}

export const ThresholdRuler: React.FC<ThresholdRulerProps> = ({
  currentYtdRevenue,
  threshold = 1000000000,
  year = 2026,
}) => {
  const isOver1B = currentYtdRevenue > threshold;
  const rem = Math.max(0, threshold - currentYtdRevenue);
  const excess = Math.max(0, currentYtdRevenue - threshold);
  const pct = (currentYtdRevenue / threshold) * 100;
  const pctStr = pct.toFixed(2).replace('.', ',');
  const clampedPct = Math.min(100, Math.max(0, pct));

  const fillClass = isOver1B ? 'danger' : pct >= 85 ? 'warn' : '';

  return (
    <div className="tax-threshold-card" style={{ marginBottom: 18 }}>
      <div className="tax-threshold-header">
        <div className="tax-threshold-title">
          📏 Ngưỡng doanh thu 1 tỷ đồng/năm (Thông tư 152) — Năm {year}
        </div>
        <span
          className={`tax-threshold-badge ${isOver1B ? 'badge-red' : pct >= 85 ? 'badge-orange' : 'badge-teal'}`}
        >
          {isOver1B
            ? `Đạt ${pctStr}% — Đã vượt ${formatMoney(excess)}`
            : `Đạt ${pctStr}% — Còn ${formatMoney(rem)}`}
        </span>
      </div>

      <div className="tax-threshold-body">
        <div className="tax-threshold-metrics">
          <span>
            Lũy kế hiện tại:{' '}
            <strong className="num text-teal">{formatMoney(currentYtdRevenue)}</strong> /{' '}
            <strong className="num">{formatMoney(threshold)}</strong>
          </span>
          <span className={isOver1B ? 'text-red fw-600' : 'text-orange fw-600'}>
            {isOver1B
              ? `Đã vượt ngưỡng 1 tỷ — bắt buộc trọn bộ 7 sổ kế toán TT152`
              : `Còn ${formatMoney(rem)} trước ngưỡng chuyển đổi thuế/sổ nâng cao`}
          </span>
        </div>

        {/* Prototype Threshold Ruler Track */}
        <div className="threshold-ruler">
          <div className="threshold-track">
            <div
              className={`threshold-fill ${fillClass}`}
              style={{ width: `${clampedPct}%` }}
            />
            <div
              className="threshold-marker"
              style={{ left: `${clampedPct}%` }}
            >
              <div className="threshold-marker-label">{pctStr}%</div>
            </div>
          </div>
          <div className="threshold-labels">
            <span>0 đ</span>
            <span>500.000.000 đ (Ngưỡng sổ cơ bản)</span>
            <span className="fw-700 text-red">1.000.000.000 đ (Ngưỡng nâng cao)</span>
          </div>
        </div>

        {/* Under 1B vs Over 1B Requirements Guidance Banner */}
        {isOver1B ? (
          <div className="tax-threshold-alert alert-danger">
            <AlertTriangle size={18} className="flex-shrink-0 text-red" style={{ marginTop: 2 }} />
            <div>
              <strong className="text-red" style={{ fontSize: '0.88rem', display: 'block', marginBottom: 2 }}>
                ⚠️ Cảnh báo trên 1 tỷ đồng: Cần hoàn tất trọn bộ 7 sổ kế toán mẫu TT152
              </strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#991B1B', lineHeight: 1.5 }}>
                Doanh thu lũy kế năm đã vượt mốc 1.000.000.000 đ theo quy định mới nhất của Bộ Tài Chính. Hộ kinh doanh bắt buộc lập và hoàn tất trọn bộ 7 sổ kế toán mẫu Thông tư 152/2025/TT-BTC (gồm S1a/S2a, S2b, S2c, S2d, S2e, S3a) và kê khai thuế đầy đủ.
              </p>
            </div>
          </div>
        ) : (
          <div className="tax-threshold-alert alert-teal">
            <Info size={18} className="flex-shrink-0 text-teal" style={{ marginTop: 2 }} />
            <div>
              <strong className="text-teal" style={{ fontSize: '0.88rem', display: 'block', marginBottom: 2 }}>
                ✓ Doanh thu dưới 1 tỷ đồng: Tờ khai 01/CNKD & Sổ S2c-HKD
              </strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#0F766E', lineHeight: 1.5 }}>
                Doanh thu lũy kế hiện tại nằm dưới ngưỡng 1.000.000.000 đ. Hộ kinh doanh được áp dụng chế độ quản lý thuế và kế toán đơn giản: Nộp <strong>Tờ khai 01/CNKD</strong> và theo dõi chi phí tại <strong>Sổ S2c-HKD</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
