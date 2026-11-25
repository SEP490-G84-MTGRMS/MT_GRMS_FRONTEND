import React from 'react';
import type { BranchOption } from '../../reports-pnl/types/reportsPnl.types';
import type {
  FinanceOverviewFilter,
  FinancePeriodPreset,
} from '../types/financeOverview.types';
import { FINANCE_PERIOD_PRESETS, resolvePresetRange } from '../utils/periodRanges';

interface Props {
  value: FinanceOverviewFilter;
  branches: BranchOption[];
  onChange: (next: FinanceOverviewFilter) => void;
}

export const FinanceOverviewFilterBar: React.FC<Props> = ({ value, branches, onChange }) => {
  const [rangeError, setRangeError] = React.useState<string | null>(null);

  const selectPreset = (preset: FinancePeriodPreset) => {
    setRangeError(null);
    if (preset === 'CUSTOM') {
      onChange({ ...value, preset });
      return;
    }
    onChange({ ...value, preset, ...resolvePresetRange(preset) });
  };

  const updateCustomDate = (field: 'startDate' | 'endDate', date: string) => {
    const next = { ...value, preset: 'CUSTOM' as const, [field]: date };
    if (next.startDate > next.endDate) {
      setRangeError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    const diffDays = (new Date(`${next.endDate}T00:00:00Z`).getTime() - new Date(`${next.startDate}T00:00:00Z`).getTime()) / 86400000;
    if (diffDays > 366) {
      setRangeError('Khoảng thời gian tổng quan không được vượt quá 366 ngày.');
      return;
    }
    setRangeError(null);
    onChange(next);
  };

  return (
    <section className="finance-global-filter" aria-label="Bộ lọc tổng quan tài chính">
      <label>
        <span>Phạm vi chi nhánh</span>
        <select
          value={value.branchId}
          onChange={(event) => onChange({ ...value, branchId: event.target.value })}
        >
          <option value="ALL">Toàn bộ chi nhánh</option>
          {branches.filter((branch) => branch.id !== 'ALL').map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </label>
      <div className="finance-period-options" role="group" aria-label="Khoảng thời gian">
        {FINANCE_PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={value.preset === preset.value ? 'active' : ''}
            onClick={() => selectPreset(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {value.preset === 'CUSTOM' && (
        <div className="finance-custom-range">
          <label><span>Từ ngày</span><input type="date" value={value.startDate} max={value.endDate} onChange={(event) => updateCustomDate('startDate', event.target.value)} /></label>
          <label><span>Đến ngày</span><input type="date" value={value.endDate} min={value.startDate} onChange={(event) => updateCustomDate('endDate', event.target.value)} /></label>
          {rangeError && <span role="alert" style={{ color: '#DC2626', fontSize: '0.78rem', fontWeight: 600 }}>{rangeError}</span>}
        </div>
      )}
    </section>
  );
};
