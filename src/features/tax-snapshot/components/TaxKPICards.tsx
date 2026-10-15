import type { FC } from 'react';
import { TrendingUp, Receipt, ShieldCheck, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { TaxSnapshotKPIs } from '../types/taxSnapshot';

interface Props {
  kpis?: TaxSnapshotKPIs;
  isLoading: boolean;
  year: number;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const TaxKPICards: FC<Props> = ({ kpis, isLoading, year }) => {
  if (isLoading || !kpis) {
    return (
      <div className="tax-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="tax-kpi-card" style={{ opacity: 0.6 }}>
            <div style={{ height: 16, background: '#E2E8F0', borderRadius: 4, width: '60%' }} />
            <div style={{ height: 28, background: '#CBD5E1', borderRadius: 6, width: '80%', margin: '14px 0' }} />
            <div style={{ height: 12, background: '#E2E8F0', borderRadius: 4, width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="tax-kpi-grid">
      {/* 1. Doanh thu chịu thuế lũy kế */}
      <div className="tax-kpi-card">
        <div className="tax-kpi-header">
          <span className="tax-kpi-title">Doanh thu chịu thuế ({year})</span>
          <div className="tax-kpi-icon tax-icon-teal">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="tax-kpi-value">{formatVND(kpis.totalTaxableRevenueYear)}</div>
        <div className="tax-kpi-subtext">Tổng doanh thu bán lẻ thực thu</div>
        <div className="tax-kpi-footer">
          <span style={{ color: '#0F766E', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
            <ArrowUpRight size={14} style={{ marginRight: 2 }} /> +14.2%
          </span>
          <span style={{ color: '#94A3B8' }}>so với cùng kỳ</span>
        </div>
      </div>

      {/* 2. Thuế GTGT (1%) */}
      <div className="tax-kpi-card">
        <div className="tax-kpi-header">
          <span className="tax-kpi-title">Thuế GTGT (VAT 1%)</span>
          <div className="tax-kpi-icon tax-icon-cyan">
            <Receipt size={20} />
          </div>
        </div>
        <div className="tax-kpi-value" style={{ color: '#0369A1' }}>{formatVND(kpis.totalVatAmountYear)}</div>
        <div className="tax-kpi-subtext">Biểu 1% phân phối, bán buôn bán lẻ</div>
        <div className="tax-kpi-footer">
          <span style={{ color: '#0284C7', fontWeight: 600 }}>Theo Thông tư 40</span>
          <span style={{ color: '#94A3B8' }}>Phụ lục I</span>
        </div>
      </div>

      {/* 3. Thuế TNCN (0.5%) */}
      <div className="tax-kpi-card">
        <div className="tax-kpi-header">
          <span className="tax-kpi-title">Thuế TNCN (PIT 0.5%)</span>
          <div className="tax-kpi-icon tax-icon-purple">
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="tax-kpi-value" style={{ color: '#6D28D9' }}>{formatVND(kpis.totalPitAmountYear)}</div>
        <div className="tax-kpi-subtext">Thuế thu nhập cá nhân hộ kinh doanh</div>
        <div className="tax-kpi-footer">
          <span style={{ color: '#7C3AED', fontWeight: 600 }}>Tỷ lệ cố định 0.5%</span>
          <span style={{ color: '#94A3B8' }}>Không trừ chi phí</span>
        </div>
      </div>

      {/* 4. Tổng thuế & Tình trạng nộp */}
      <div className="tax-kpi-card">
        <div className="tax-kpi-header">
          <span className="tax-kpi-title">Tổng nghĩa vụ thuế (1.5%)</span>
          <div className="tax-kpi-icon tax-icon-amber">
            <AlertCircle size={20} />
          </div>
        </div>
        <div className="tax-kpi-value" style={{ color: '#B45309' }}>{formatVND(kpis.totalTaxLiabilityYear)}</div>
        <div className="tax-kpi-subtext">Tổng thuế GTGT + TNCN phải nộp</div>
        <div className="tax-kpi-footer">
          <span style={{ color: '#475569' }}>Đã nộp: <strong style={{ color: '#0F766E' }}>{formatVND(kpis.totalTaxPaidYear)}</strong></span>
          {kpis.remainingTaxPayable > 0 ? (
            <span style={{ color: '#DC2626', fontWeight: 700 }}>Nợ: {formatVND(kpis.remainingTaxPayable)}</span>
          ) : (
            <span style={{ color: '#059669', fontWeight: 700 }}>Đã tất toán</span>
          )}
        </div>
      </div>
    </div>
  );
};
