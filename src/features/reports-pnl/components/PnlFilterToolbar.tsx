import React from 'react';
import {
  Calendar,
  Building2,
  RotateCw,
  Printer,
  ChevronDown,
} from 'lucide-react';
import type {
  BranchOption,
  PnlFilterParams,
  PresetPeriod,
} from '../types/reportsPnl.types';

interface PnlFilterToolbarProps {
  branches: BranchOption[];
  filter: PnlFilterParams;
  isLoading: boolean;
  onFilterChange: (newFilter: PnlFilterParams) => void;
  onOpenExportModal: () => void;
  onRefresh: () => void;
}

const PRESET_OPTIONS: { id: PresetPeriod; label: string }[] = [
  { id: 'TODAY', label: 'Hôm nay' },
  { id: 'LAST_7_DAYS', label: '7 ngày qua' },
  { id: 'THIS_MONTH', label: 'Tháng này' },
  { id: 'LAST_MONTH', label: 'Tháng trước' },
  { id: 'THIS_QUARTER', label: 'Quý này' },
  { id: 'CUSTOM', label: 'Tùy chọn ngày' },
];

/**
 * Filter toolbar component for branch selection and period switching.
 */
export const PnlFilterToolbar: React.FC<PnlFilterToolbarProps> = ({
  branches,
  filter,
  isLoading,
  onFilterChange,
  onOpenExportModal,
  onRefresh,
}) => {
  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filter,
      branchId: e.target.value,
    });
  };

  const handlePresetChange = (preset: PresetPeriod) => {
    const today = new Date();
    let startDate = today.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    if (preset === 'LAST_7_DAYS') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      startDate = past.toISOString().split('T')[0];
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = firstDay.toISOString().split('T')[0];
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      startDate = firstDay.toISOString().split('T')[0];
      return onFilterChange({
        ...filter,
        presetPeriod: preset,
        startDate,
        endDate: lastDay.toISOString().split('T')[0],
      });
    } else if (preset === 'THIS_QUARTER') {
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
      const firstDay = new Date(today.getFullYear(), quarterMonth, 1);
      startDate = firstDay.toISOString().split('T')[0];
    }

    onFilterChange({
      ...filter,
      presetPeriod: preset,
      startDate,
      endDate,
    });
  };

  const handleCustomDateChange = (
    field: 'startDate' | 'endDate',
    value: string
  ) => {
    onFilterChange({
      ...filter,
      presetPeriod: 'CUSTOM',
      [field]: value,
    });
  };

  return (
    <div className="pnl-filter-bar">
      {/* Left Controls: Branch Selector & Preset Period Tabs */}
      <div className="pnl-filter-left">
        {/* Branch Selector Dropdown */}
        <div className="pnl-branch-select-wrapper">
          <div className="pnl-branch-icon-left">
            <Building2 size={18} />
          </div>
          <select
            value={filter.branchId || 'ALL'}
            onChange={handleBranchChange}
            disabled={isLoading}
            className="pnl-branch-select"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <div className="pnl-branch-icon-right">
            <ChevronDown size={15} />
          </div>
        </div>

        {/* Quick Period Presets */}
        <div className="pnl-preset-group">
          {PRESET_OPTIONS.map((item) => {
            const active = filter.presetPeriod === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePresetChange(item.id)}
                disabled={isLoading}
                className={`pnl-preset-btn ${active ? 'active' : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Pickers */}
        {filter.presetPeriod === 'CUSTOM' && (
          <div className="pnl-custom-date-box">
            <Calendar size={14} style={{ color: 'var(--blue-primary, #0F766E)' }} />
            <span>Từ:</span>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="pnl-custom-date-input"
            />
            <span>Đến:</span>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="pnl-custom-date-input"
            />
          </div>
        )}
      </div>

      {/* Right Controls: Refresh & Print Buttons */}
      <div className="pnl-filter-right">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="btn-secondary-pill"
          title="Làm mới số liệu"
        >
          <RotateCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>

        <button
          type="button"
          onClick={onOpenExportModal}
          className="btn-primary-pill"
        >
          <Printer size={16} />
          <span>In & Xuất Báo Cáo</span>
        </button>
      </div>
    </div>
  );
};
