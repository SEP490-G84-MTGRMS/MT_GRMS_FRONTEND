import React from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import type {
  BranchOption,
  PnlFilterParams,
  PnlReportResponse,
  PresetPeriod,
} from '../../reports-pnl/types/reportsPnl.types';
import { PnlWaterfallSvg } from './PnlWaterfallSvg';
import { resolvePresetRange } from '../utils/periodRanges';
import type { FinancePeriodPreset } from '../types/financeOverview.types';
import { formatMoney } from '../utils/formatters';

interface Props {
  filter: PnlFilterParams;
  onFilterChange: (next: PnlFilterParams) => void;
  branches: BranchOption[];
  reportData?: PnlReportResponse;
  isLoading: boolean;
  isFetching: boolean;
  errorMessage?: string | null;
  accountingMode: boolean;
  onToggleAccountingMode: () => void;
}

const PERIODS: Array<{ value: PresetPeriod; label: string }> = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'LAST_7_DAYS', label: '7 ngày qua' },
  { value: 'THIS_MONTH', label: 'Tháng này' },
  { value: 'LAST_MONTH', label: 'Tháng trước' },
  { value: 'THIS_QUARTER', label: 'Quý này' },
  { value: 'THIS_YEAR', label: 'Năm nay' },
  { value: 'CUSTOM', label: 'Tùy chọn ngày' },
];

const PERIOD_LABELS = Object.fromEntries(PERIODS.map((item) => [item.value, item.label]));

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function TrendMiniChart({ data }: { data: PnlReportResponse['trendData'] }) {
  if (data.length === 0) return <div className="finance-pnl-mini-empty">Không có dữ liệu xu hướng trong kỳ.</div>;
  const visible = data.length > 12 ? data.filter((_, index) => index % Math.ceil(data.length / 12) === 0) : data;
  const maximum = Math.max(...visible.flatMap((point) => [point.netRevenue, Math.max(0, point.netProfit)]), 1);
  return (
    <div className="finance-pnl-trend" role="img" aria-label="Xu hướng doanh thu và lợi nhuận trong kỳ">
      {visible.map((point) => (
        <div className="finance-pnl-trend-column" key={point.dateLabel}>
          <div className="finance-pnl-trend-bars">
            <i style={{ height: `${Math.max(3, (point.netRevenue / maximum) * 100)}%` }} />
            <i style={{ height: `${Math.max(3, (Math.max(0, point.netProfit) / maximum) * 100)}%` }} />
          </div>
          <span>{point.dateLabel}</span>
        </div>
      ))}
    </div>
  );
}

function ExpenseMiniChart({ data }: { data: PnlReportResponse['expenseBreakdown'] }) {
  if (data.length === 0) return <div className="finance-pnl-mini-empty">Không có chi phí vận hành trong kỳ.</div>;
  const slices = data.reduce<{ cursor: number; values: string[] }>((result, item, index) => {
    const end = result.cursor + item.percentage;
    return {
      cursor: end,
      values: [
        ...result.values,
        `${item.color || ['#0F766E', '#14B8A6', '#3B82F6', '#F59E0B'][index % 4]} ${result.cursor}% ${end}%`,
      ],
    };
  }, { cursor: 0, values: [] });
  return (
    <div className="finance-pnl-expense-row">
      <div className="finance-pnl-donut" style={{ background: `conic-gradient(${slices.values.join(', ')})` }} role="img" aria-label="Cơ cấu chi phí vận hành" />
      <div className="finance-pnl-expense-legend">
        {data.slice(0, 6).map((item, index) => (
          <span key={item.categoryCode}>
            <i style={{ background: item.color || ['#0F766E', '#14B8A6', '#3B82F6', '#F59E0B'][index % 4] }} />
            {item.categoryName} · {formatMoney(item.amount)}
          </span>
        ))}
      </div>
    </div>
  );
}

export const FinancePnlOverviewPanel: React.FC<Props> = ({
  filter,
  onFilterChange,
  branches,
  reportData,
  isLoading,
  isFetching,
  errorMessage,
  accountingMode,
  onToggleAccountingMode,
}) => {
  const selectPeriod = (preset: PresetPeriod) => {
    if (preset === 'CUSTOM') {
      onFilterChange({ ...filter, presetPeriod: preset });
      return;
    }
    const range = resolvePresetRange(preset as FinancePeriodPreset);
    onFilterChange({ ...filter, presetPeriod: preset, ...range });
  };

  const updateDate = (field: 'startDate' | 'endDate', value: string) => {
    const next = { ...filter, presetPeriod: 'CUSTOM' as const, [field]: value };
    if (next.startDate <= next.endDate) onFilterChange(next);
  };

  const selectedBranch = branches.find((branch) => branch.id === filter.branchId);
  const scopeLabel = filter.branchId === 'ALL' || !filter.branchId
    ? `toàn chuỗi (${Math.max(0, branches.filter((branch) => branch.id !== 'ALL').length)} chi nhánh)`
    : selectedBranch?.name || 'chi nhánh đã chọn';
  const kpi = reportData?.kpiSummary;
  const periodLabel = PERIOD_LABELS[filter.presetPeriod] || 'Kỳ đã chọn';

  return (
    <section className="finance-pnl-redesign" id="pnl-section" aria-busy={isFetching}>
      <div className="finance-pnl-toolbar">
        <div className="finance-pnl-periods" role="group" aria-label="Khoảng thời gian báo cáo lãi lỗ">
          {PERIODS.map((item) => (
            <button key={item.value} type="button" className={filter.presetPeriod === item.value ? 'active' : ''} onClick={() => selectPeriod(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
        <label className="finance-pnl-branch-filter">
          <span>Phạm vi chi nhánh</span>
          <select value={filter.branchId || 'ALL'} onChange={(event) => onFilterChange({ ...filter, branchId: event.target.value })}>
            {branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        {filter.presetPeriod === 'CUSTOM' && (
          <div className="finance-pnl-custom-dates">
            <label><span>Từ ngày</span><input type="date" value={filter.startDate} max={filter.endDate} onChange={(event) => updateDate('startDate', event.target.value)} /></label>
            <label><span>Đến ngày</span><input type="date" value={filter.endDate} min={filter.startDate} onChange={(event) => updateDate('endDate', event.target.value)} /></label>
          </div>
        )}
      </div>

      <p className="finance-pnl-scope-note">Đang xem kết quả gộp của {scopeLabel}.</p>

      {errorMessage && <div className="finance-pnl-error" role="alert"><AlertCircle size={17} />{errorMessage}</div>}

      <div className="finance-pnl-story-banner">
        <div>
          <strong>Hiệu quả kinh doanh · {formatDisplayDate(filter.startDate)} – {formatDisplayDate(filter.endDate)}</strong>
          <span>Cơ sở: Theo dữ liệu bán hàng và chi phí phát sinh · các giá trị chi tiết thể hiện trực tiếp trong biểu đồ</span>
        </div>
        <button type="button" onClick={onToggleAccountingMode} aria-pressed={accountingMode}>
          {accountingMode ? 'Đang xem chi tiết kế toán' : 'Dành cho kế toán'} <ChevronDown size={14} />
        </button>
      </div>

      <div className={`finance-pnl-waterfall-card ${isLoading ? 'loading' : ''}`}>
        {isLoading || !kpi ? (
          <div className="finance-pnl-loading">Đang tải báo cáo lãi lỗ…</div>
        ) : (
          <PnlWaterfallSvg
            netRevenue={kpi.netRevenue}
            cogs={kpi.cogs}
            grossProfit={kpi.grossProfit}
            opExpenses={kpi.operatingExpenses + kpi.shrinkageLoss}
            estTax={kpi.estimatedTaxAmount}
            netProfit={kpi.netProfitAfterTax}
            periodLabel={periodLabel}
            accountingBasis="ACCRUAL"
          />
        )}
      </div>

      <div className="finance-pnl-mini-grid">
        <article className="finance-pnl-mini-card">
          <h3>Xu hướng Doanh thu &amp; Lợi nhuận</h3>
          <TrendMiniChart data={reportData?.trendData || []} />
        </article>
        <article className="finance-pnl-mini-card">
          <h3>Cơ cấu chi phí vận hành</h3>
          <ExpenseMiniChart data={reportData?.expenseBreakdown || []} />
        </article>
      </div>
    </section>
  );
};
