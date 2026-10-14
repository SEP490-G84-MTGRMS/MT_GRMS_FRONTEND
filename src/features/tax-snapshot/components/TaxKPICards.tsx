import type { FC } from 'react';
import { TrendingUp, Receipt, ShieldCheck, AlertCircle } from 'lucide-react';
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 p-5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Doanh thu chịu thuế lũy kế */}
      <div className="tax-kpi-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Doanh thu chịu thuế ({year})</span>
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 text-xl font-bold text-gray-900">{formatVND(kpis.totalTaxableRevenueYear)}</div>
        <div className="mt-1 text-xs text-gray-500">Tổng doanh thu bán lẻ thực thu</div>
      </div>

      {/* 2. Thuế GTGT (1%) */}
      <div className="tax-kpi-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Thuế GTGT (VAT 1%)</span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-700">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 text-xl font-bold text-teal-700">{formatVND(kpis.totalVatAmountYear)}</div>
        <div className="mt-1 text-xs text-gray-500">Phân phối bán lẻ theo TT 40</div>
      </div>

      {/* 3. Thuế TNCN (0.5%) */}
      <div className="tax-kpi-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Thuế TNCN (PIT 0.5%)</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 text-xl font-bold text-emerald-700">{formatVND(kpis.totalPitAmountYear)}</div>
        <div className="mt-1 text-xs text-gray-500">Hộ kinh doanh cá thể</div>
      </div>

      {/* 4. Tổng thuế & Tình trạng nộp */}
      <div className="tax-kpi-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng thuế phải nộp (1.5%)</span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 text-xl font-bold text-gray-900">{formatVND(kpis.totalTaxLiabilityYear)}</div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-gray-500">Đã nộp: <strong className="text-teal-700">{formatVND(kpis.totalTaxPaidYear)}</strong></span>
          {kpis.remainingTaxPayable > 0 ? (
            <span className="text-rose-600 font-semibold">Còn nợ: {formatVND(kpis.remainingTaxPayable)}</span>
          ) : (
            <span className="text-teal-600 font-medium">Đã tất toán</span>
          )}
        </div>
      </div>
    </div>
  );
};
