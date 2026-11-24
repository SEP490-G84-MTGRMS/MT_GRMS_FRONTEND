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
  const selectPreset = (preset: FinancePeriodPreset) => {
    if (preset === 'CUSTOM') {
      onChange({ ...value, preset });
      return;
    }
    onChange({ ...value, preset, ...resolvePresetRange(preset) });
  };

  const updateCustomDate = (field: 'startDate' | 'endDate', date: string) => {
    const next = { ...value, preset: 'CUSTOM' as const, [field]: date };
    if (next.startDate <= next.endDate) onChange(next);
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
        </div>
      )}
    </section>
  );
};
