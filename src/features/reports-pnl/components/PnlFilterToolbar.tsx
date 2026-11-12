import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Building2,
  RotateCw,
  Printer,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  BranchOption,
  PnlFilterParams,
  PresetPeriod,
} from '../types/reportsPnl.types';
import { TaxRateConfigModal } from '../../tax-snapshot/components/TaxRateConfigModal';
import {
  loadStoredTaxRates,
  saveStoredTaxRates,
  clearStoredTaxRates,
  type StoredTaxRates,
} from '../services/reportsPnlService';
import '../../tax-snapshot/tax-snapshot.css';

export interface PnlFilterToolbarProps {
  branches: BranchOption[];
  filter: PnlFilterParams;
  isLoading: boolean;
  onFilterChange: (newFilter: PnlFilterParams) => void;
  onOpenExportModal: () => void;
  onRefresh: () => void;
  hideRefresh?: boolean;
  onTaxConfigChange?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
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
 * Formats a local Date instance as YYYY-MM-DD without UTC day-shift bugs.
 */
export function formatLocalYmd(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function createCurrentLocalDate(): Date {
  return new Date();
}

function computePresetDateRange(
  preset: PresetPeriod,
  today: Date
): { startDate: string; endDate: string } {
  const endDate = formatLocalYmd(today);

  if (preset === 'LAST_7_DAYS') {
    const past = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    return { startDate: formatLocalYmd(past), endDate };
  }
  if (preset === 'THIS_MONTH') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: formatLocalYmd(firstDay), endDate };
  }
  if (preset === 'LAST_MONTH') {
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: formatLocalYmd(firstDay), endDate: formatLocalYmd(lastDay) };
  }
  if (preset === 'THIS_QUARTER') {
    const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
    const firstDay = new Date(today.getFullYear(), quarterMonth, 1);
    return { startDate: formatLocalYmd(firstDay), endDate };
  }

  return { startDate: endDate, endDate };
}

const BranchSelectField: React.FC<{
  branches: BranchOption[];
  value: string;
  isLoading: boolean;
  onChange: (branchId: string) => void;
}> = ({ branches, value, isLoading, onChange }) => (
  <div className="pnl-branch-select-wrapper">
    <div className="pnl-branch-icon-left">
      <Building2 size={18} />
    </div>
    <select
      aria-label="Chọn chi nhánh"
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
);

const PresetPeriodGroup: React.FC<{
  activePreset: PresetPeriod;
  isLoading: boolean;
  onSelect: (preset: PresetPeriod) => void;
}> = ({ activePreset, isLoading, onSelect }) => (
  <div className="pnl-preset-group">
    {PRESET_OPTIONS.map((item) => {
      const active = activePreset === item.id;
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          disabled={isLoading}
          className={`pnl-preset-btn ${active ? 'active' : ''}`}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

const CustomDateRangeFields: React.FC<{
  startDate: string;
  endDate: string;
  isLoading: boolean;
  onChange: (field: 'startDate' | 'endDate', value: string) => void;
}> = ({ startDate, endDate, isLoading, onChange }) => (
  <div className="pnl-custom-date-box">
    <Calendar size={14} style={{ color: 'var(--blue-primary, #0F766E)', flexShrink: 0 }} />
    <span>Từ:</span>
    <input
      type="date"
      aria-label="Từ ngày"
      value={startDate}
      max={endDate}
      disabled={isLoading}
      onChange={(e) => onChange('startDate', e.target.value)}
      className="pnl-custom-date-input"
    />
    <span>Đến:</span>
    <input
      type="date"
      aria-label="Đến ngày"
      value={endDate}
      min={startDate}
      disabled={isLoading}
      onChange={(e) => onChange('endDate', e.target.value)}
      className="pnl-custom-date-input"
    />
  </div>
);

const FilterToolbarActions: React.FC<{
  isLoading: boolean;
  hideRefresh: boolean;
  hasCustomTax: boolean;
  onOpenTaxModal: () => void;
  onRefresh: () => void;
  onOpenExportModal: () => void;
}> = ({
  isLoading,
  hideRefresh,
  hasCustomTax,
  onOpenTaxModal,
  onRefresh,
  onOpenExportModal,
}) => (
  <div className="pnl-filter-right">
    <button
      type="button"
      onClick={onOpenTaxModal}
      disabled={isLoading}
      className="btn-secondary-pill"
      title={
        hasCustomTax
          ? 'Cấu hình thuế (Đang áp dụng thuế suất tùy chỉnh / chính sách giảm thuế)'
          : 'Cấu hình mức thuế suất GTGT, TNCN và chính sách giảm thuế'
      }
      style={{
        position: 'relative',
        ...(hasCustomTax
          ? {
              borderColor: '#0F766E',
              color: '#0F766E',
              background: '#F0FDFA',
              fontWeight: 700,
            }
          : {}),
      }}
    >
      <SlidersHorizontal size={15} />
      <span>Cấu hình thuế</span>
      {hasCustomTax && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#0F766E',
            position: 'absolute',
            top: 6,
            right: 6,
          }}
        />
      )}
    </button>

    {!hideRefresh && (
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
    )}

    <button
      type="button"
      onClick={onOpenExportModal}
      className="btn-primary-pill"
    >
      <Printer size={16} />
      <span>In &amp; Xuất Báo Cáo</span>
    </button>
  </div>
);

/**
 * Filter toolbar component for branch selection, tax rate configuration, and period switching.
 */
export const PnlFilterToolbar: React.FC<PnlFilterToolbarProps> = ({
  branches,
  filter,
  isLoading,
  onFilterChange,
  onOpenExportModal,
  onRefresh,
  hideRefresh = false,
  onTaxConfigChange,
  onShowToast,
}) => {
  const [isTaxModalOpen, setIsTaxModalOpen] = useState<boolean>(false);
  const [taxRates, setTaxRates] = useState<StoredTaxRates>(loadStoredTaxRates);

  useEffect(() => {
    setTaxRates(loadStoredTaxRates());
  }, [isTaxModalOpen]);

  const hasCustomTax =
    taxRates.customVatRate != null ||
    taxRates.customPitRate != null ||
    taxRates.vatReductionPercentage != null ||
    Boolean(taxRates.applyVatReduction2026);

  const handleOpenTaxModal = useCallback(() => {
    setTaxRates(loadStoredTaxRates());
    setIsTaxModalOpen(true);
  }, []);

  const handleSaveTaxRates = useCallback(
    (rates: StoredTaxRates) => {
      saveStoredTaxRates(rates);
      setTaxRates(rates);
      setIsTaxModalOpen(false);
      if (onTaxConfigChange) {
        onTaxConfigChange();
      } else {
        onRefresh();
      }
      onShowToast?.('Đã lưu cấu hình tham số thuế suất và áp dụng cho báo cáo P&L.', 'success');
    },
    [onTaxConfigChange, onRefresh, onShowToast]
  );

  const handleResetTaxRates = useCallback(() => {
    clearStoredTaxRates();
    setTaxRates({});
    setIsTaxModalOpen(false);
    if (onTaxConfigChange) {
      onTaxConfigChange();
    } else {
      onRefresh();
    }
    onShowToast?.('Đã đặt lại cấu hình thuế suất về mặc định (1.5%).', 'success');
  }, [onTaxConfigChange, onRefresh, onShowToast]);

  const handleBranchChange = (branchId: string) => {
    onFilterChange({ ...filter, branchId });
  };

  const handlePresetChange = (preset: PresetPeriod) => {
    const today = createCurrentLocalDate();
    if (preset === 'CUSTOM') {
      const fallback = formatLocalYmd(today);
      onFilterChange({
        ...filter,
        presetPeriod: 'CUSTOM',
        startDate: filter.startDate || fallback,
        endDate: filter.endDate || fallback,
      });
      return;
    }

    const { startDate, endDate } = computePresetDateRange(preset, today);
    onFilterChange({ ...filter, presetPeriod: preset, startDate, endDate });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    if (!value) {
      return;
    }

    const nextStart = field === 'startDate' ? value : filter.startDate;
    const nextEnd = field === 'endDate' ? value : filter.endDate;
    const clampedStart = field === 'endDate' && nextEnd < nextStart ? nextEnd : nextStart;
    const clampedEnd = field === 'startDate' && nextStart > nextEnd ? nextStart : nextEnd;

    onFilterChange({
      ...filter,
      presetPeriod: 'CUSTOM',
      startDate: clampedStart,
      endDate: clampedEnd,
    });
  };

  return (
    <>
      <div className="pnl-filter-bar">
        <div className="pnl-filter-left">
          <BranchSelectField
            branches={branches}
            value={filter.branchId || 'ALL'}
            isLoading={isLoading}
            onChange={handleBranchChange}
          />
          <PresetPeriodGroup
            activePreset={filter.presetPeriod}
            isLoading={isLoading}
            onSelect={handlePresetChange}
          />
          {filter.presetPeriod === 'CUSTOM' && (
            <CustomDateRangeFields
              startDate={filter.startDate}
              endDate={filter.endDate}
              isLoading={isLoading}
              onChange={handleCustomDateChange}
            />
          )}
        </div>

        <FilterToolbarActions
          isLoading={isLoading}
          hideRefresh={hideRefresh}
          hasCustomTax={hasCustomTax}
          onOpenTaxModal={handleOpenTaxModal}
          onRefresh={onRefresh}
          onOpenExportModal={onOpenExportModal}
        />
      </div>

      {isTaxModalOpen && (
        <TaxRateConfigModal
          isOpen={isTaxModalOpen}
          onClose={() => setIsTaxModalOpen(false)}
          currentRates={taxRates}
          onSave={handleSaveTaxRates}
          onResetToDefault={handleResetTaxRates}
        />
      )}
    </>
  );
};
