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
    <div className="pnl-filter-container mb-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        {/* Left Side: Branch Selector & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Dropdown */}
          <div className="relative min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-700">
              <Building2 size={18} />
            </div>
            <select
              value={filter.branchId || 'ALL'}
              onChange={handleBranchChange}
              disabled={isLoading}
              className="w-full pl-10 pr-9 py-2 bg-gray-50 hover:bg-gray-100 border border-teal-200 rounded-full text-xs font-semibold text-gray-800 transition-colors focus:ring-2 focus:ring-teal-600 focus:outline-none appearance-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <ChevronDown size={15} />
            </div>
          </div>

          <div className="h-6 w-px bg-teal-200 hidden sm:block" />

          {/* Quick Presets */}
          <div className="inline-flex flex-wrap p-1 bg-gray-100 rounded-full gap-1 border border-gray-200">
            {PRESET_OPTIONS.map((item) => {
              const active = filter.presetPeriod === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePresetChange(item.id)}
                  disabled={isLoading}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    active
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers (visible if CUSTOM or explicit) */}
          {filter.presetPeriod === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-3 py-1 text-xs text-gray-700">
              <Calendar size={14} className="text-teal-700" />
              <span>Từ:</span>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) =>
                  handleCustomDateChange('startDate', e.target.value)
                }
                className="bg-white border border-gray-300 rounded-md px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-teal-600"
              />
              <span>Đến:</span>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) =>
                  handleCustomDateChange('endDate', e.target.value)
                }
                className="bg-white border border-gray-300 rounded-md px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-teal-600"
              />
            </div>
          )}
        </div>

        {/* Right Side: Refresh & Export Action Buttons */}
        <div className="flex items-center gap-2.5 self-end xl:self-auto">
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
            <Printer size={15} />
            <span>In & Xuất Báo Cáo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
