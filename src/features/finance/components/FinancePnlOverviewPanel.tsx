import React from 'react';
import { AlertCircle } from 'lucide-react';
import type {
  BranchOption,
  PnlFilterParams,
  PnlReportResponse,
} from '../../reports-pnl/types/reportsPnl.types';
import { PnlWaterfallSvg } from './PnlWaterfallSvg';
import { FINANCE_PERIOD_PRESETS } from '../utils/periodRanges';
import { FinanceOverviewFilterBar } from './FinanceOverviewFilterBar';
import { formatMoney } from '../utils/formatters';

interface Props {
  filter: PnlFilterParams;
  onFilterChange: (next: PnlFilterParams) => void;
  branches: BranchOption[];
  reportData?: PnlReportResponse;
  isLoading: boolean;
  isFetching: boolean;
  errorMessage?: string | null;
}

const PERIOD_LABELS = Object.fromEntries(FINANCE_PERIOD_PRESETS.map((item) => [item.value, item.label]));

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function TrendMiniChart({ data }: { data: PnlReportResponse['trendData'] }) {
  if (data.length === 0) return <div className="finance-pnl-mini-empty">Không có dữ liệu xu hướng trong kỳ.</div>;

  // Aggregate consecutive points into buckets when > 12 days so peak revenue/loss days are never dropped
  const buckets = (() => {
    if (data.length <= 12) {
      return data.map((point) => ({
        label: point.dateLabel,
        netRevenue: point.netRevenue,
        netProfit: point.netProfit,
      }));
    }
    const bucketSize = Math.ceil(data.length / 10);
    const grouped: Array<{ label: string; netRevenue: number; netProfit: number }> = [];
    for (let i = 0; i < data.length; i += bucketSize) {
      const slice = data.slice(i, i + bucketSize);
      const first = slice[0].dateLabel;
      const last = slice[slice.length - 1].dateLabel;
      const label = first === last ? first : `${first.split('/')[0]}–${last}`;
      grouped.push({
        label,
        netRevenue: slice.reduce((sum, p) => sum + p.netRevenue, 0),
        netProfit: slice.reduce((sum, p) => sum + p.netProfit, 0),
      });
    }
    return grouped;
  })();

  const maximum = Math.max(...buckets.flatMap((point) => [Math.abs(point.netRevenue), Math.abs(point.netProfit)]), 1);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8, fontSize: 11, color: '#64748B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: '#0F766E', display: 'inline-block' }} /> Doanh thu
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: '#14B8A6', display: 'inline-block' }} /> Lãi ròng
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: '#DC2626', display: 'inline-block' }} /> Lỗ ròng
          </span>
        </div>
        <span>Đỉnh: {formatMoney(maximum)}</span>
      </div>
      <div className="finance-pnl-trend" role="img" aria-label="Xu hướng doanh thu và lợi nhuận trong kỳ">
        {buckets.map((point) => (
          <div className="finance-pnl-trend-column" key={point.label} title={`${point.label} · DT: ${formatMoney(point.netRevenue)} · LN: ${formatMoney(point.netProfit)}`}>
            <div className="finance-pnl-trend-bars">
              <i style={{ height: `${Math.max(3, (Math.abs(point.netRevenue) / maximum) * 100)}%` }} />
              <i
                style={{
                  height: `${Math.max(3, (Math.abs(point.netProfit) / maximum) * 100)}%`,
                  backgroundColor: point.netProfit < 0 ? '#DC2626' : undefined,
                }}
              />
            </div>
            <span>{point.label}</span>
          </div>
        ))}
      </div>
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
        {data.map((item, index) => (
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
}) => {
  const selectedBranch = branches.find((branch) => branch.id === filter.branchId);
  const scopeLabel = filter.branchId === 'ALL' || !filter.branchId
    ? `toàn chuỗi (${Math.max(0, branches.filter((branch) => branch.id !== 'ALL').length)} chi nhánh)`
    : selectedBranch?.name || 'chi nhánh đã chọn';
  const kpi = reportData?.kpiSummary;
  const periodLabel = PERIOD_LABELS[filter.presetPeriod] || 'Kỳ đã chọn';

  return (
    <section className="finance-pnl-redesign" id="pnl-section" aria-busy={isFetching}>
      <FinanceOverviewFilterBar
        value={{ branchId: filter.branchId || 'ALL', preset: filter.presetPeriod, startDate: filter.startDate, endDate: filter.endDate }}
        branches={branches}
        onChange={({ preset, ...next }) => onFilterChange({ ...filter, ...next, presetPeriod: preset })}
      />

      <p className="finance-pnl-scope-note">Đang xem kết quả gộp của {scopeLabel}.</p>

      {errorMessage && <div className="finance-pnl-error" role="alert"><AlertCircle size={17} />{errorMessage}</div>}

      <div className="finance-pnl-story-banner">
        <div>
          <strong>Hiệu quả kinh doanh · {formatDisplayDate(filter.startDate)} – {formatDisplayDate(filter.endDate)}</strong>
          <span>Cơ sở: Theo dữ liệu bán hàng và chi phí phát sinh · các giá trị chi tiết thể hiện trực tiếp trong biểu đồ</span>
        </div>
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
