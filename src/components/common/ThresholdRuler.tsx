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
              ? 'Đã vượt ngưỡng 1 tỷ — kê khai thuế GTGT/TNCN & hóa đơn điện tử từ máy tính tiền'
              : `Còn ${formatMoney(rem)} trong ngưỡng miễn thuế 1 tỷ đồng/năm`}
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
            <span>500.000.000 đ (50% ngưỡng)</span>
            <span className="fw-700 text-red">1.000.000.000 đ (Ngưỡng miễn thuế NĐ 68/2026)</span>
          </div>
        </div>

        {/* Under 1B vs Over 1B Requirements Guidance Banner */}
        {isOver1B ? (
          <div className="tax-threshold-alert alert-danger">
            <AlertTriangle size={18} className="flex-shrink-0 text-red" style={{ marginTop: 2 }} />
            <div>
              <strong className="text-red" style={{ fontSize: '0.88rem', display: 'block', marginBottom: 2 }}>
                ⚠️ Đã vượt ngưỡng 1 tỷ đồng: Kê khai Mẫu 01/CNKD, lập sổ TT 152 & đăng ký HĐĐT máy tính tiền
              </strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#991B1B', lineHeight: 1.5 }}>
                Theo NĐ 68/2026/NĐ-CP và TT 152/2025/TT-BTC: Hộ nộp thuế theo <strong>tỷ lệ % doanh thu</strong> lập sổ <strong>S2a-HKD</strong>; hộ nộp theo <strong>thu nhập tính thuế (Kê khai)</strong> lập bộ 5 sổ <strong>S2b, S2c, S2d, S2e, S3a-HKD</strong>. Đồng thời bắt buộc đăng ký sử dụng <strong>hóa đơn điện tử khởi tạo từ máy tính tiền trong vòng 30 ngày</strong> kể từ ngày cuối kỳ vượt ngưỡng (NĐ 254/2026/NĐ-CP &amp; TT 91/2026/TT-BTC).
              </p>
            </div>
          </div>
        ) : (
          <div className="tax-threshold-alert alert-teal">
            <Info size={18} className="flex-shrink-0 text-teal" style={{ marginTop: 2 }} />
            <div>
              <strong className="text-teal" style={{ fontSize: '0.88rem', display: 'block', marginBottom: 2 }}>
                ✓ Doanh thu ≤ 1 tỷ đồng (Nhóm 1 — Miễn thuế): Mẫu 01/TKN-CNKD &amp; Sổ S1a-HKD
              </strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#0F766E', lineHeight: 1.5 }}>
                Hộ kinh doanh thuộc diện miễn thuế GTGT và TNCN theo NĐ 68/2026/NĐ-CP. Chỉ cần ghi chép doanh thu bán hàng tại <strong>Sổ S1a-HKD</strong> (Thông tư 152/2025/TT-BTC) và nộp <strong>Thông báo doanh thu thực tế năm (Mẫu 01/TKN-CNKD)</strong> chậm nhất ngày <strong>31/01 năm sau</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
