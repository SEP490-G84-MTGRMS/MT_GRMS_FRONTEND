import React from 'react';
import type { BranchOption } from '../../reports-pnl/types/reportsPnl.types';
import type {
  FinanceOverviewFilter,
  FinancePeriodPreset,
} from '../types/financeOverview.types';
import { resolvePresetRange } from '../utils/periodRanges';

interface Props {
  value: FinanceOverviewFilter;
  branches: BranchOption[];
  onChange: (next: FinanceOverviewFilter) => void;
}

const PRESETS: Array<{ value: FinancePeriodPreset; label: string }> = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'LAST_7_DAYS', label: '7 ngày qua' },
  { value: 'THIS_MONTH', label: 'Tháng này' },
  { value: 'LAST_MONTH', label: 'Tháng trước' },
  { value: 'THIS_QUARTER', label: 'Quý này' },
  { value: 'THIS_YEAR', label: 'Năm nay' },
  { value: 'CUSTOM', label: 'Tùy chọn ngày' },
];

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
        {PRESETS.map((preset) => (
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
