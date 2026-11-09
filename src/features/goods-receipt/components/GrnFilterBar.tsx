import type { FC } from 'react';
import { Search, RotateCcw, Filter, Calendar, Layers } from 'lucide-react';
import type { GrnFilterState, GrnFilterTab, UserRole } from '../types/grn.types';

export interface GrnFilterOption {
  id: string;
  label: string;
}

interface GrnFilterBarProps {
  filterInputs: GrnFilterState;
  role: UserRole;
  employeeBranchLabel?: string;
  branches: GrnFilterOption[];
  suppliers: GrnFilterOption[];
  activeTab: GrnFilterTab;
  tabCounts: {
    all: number;
    today: number;
    draft: number;
    mismatch: number;
  };
  onTabChange: (tab: GrnFilterTab) => void;
  onFilterChange: <K extends keyof GrnFilterState>(key: K, value: GrnFilterState[K]) => void;
  onSearch: () => void;
  onReset: () => void;
}

export const GrnFilterBar: FC<GrnFilterBarProps> = ({
  filterInputs,
  role,
  employeeBranchLabel = 'Chi nhánh được gán',
  branches,
  suppliers,
  activeTab,
  tabCounts,
  onTabChange,
  onFilterChange,
  onSearch,
  onReset,
}) => {
  const isEmployee = role === 'employee';

  return (
    <div className="so-list-filter">
      <div className="so-list-filter-row">
        <div style={{ position: 'relative', width: 280, minWidth: 220, flex: '1 1 260px' }}>
          <Search
            size={14}
            color="#94a3b8"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="so-list-filter-input"
            value={filterInputs.keyword}
            onChange={(e) => onFilterChange('keyword', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch();
            }}
            placeholder="Tìm theo Mã GRN, Mã PO, NCC, Lô, Thủ kho..."
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>

        <div className="so-list-filter-field">
          <label className="so-list-filter-label">Chi nhánh nhận:</label>
          {isEmployee ? (
            <div
              className="so-list-filter-input"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#f1f5f9',
                minWidth: 160,
              }}
              title="Nhân viên chỉ xem dữ liệu chi nhánh được phân công"
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                }}
              />
              {employeeBranchLabel}
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 4,
                  backgroundColor: '#e2e8f0',
                  color: '#64748b',
                  fontWeight: 600,
                }}
              >
                Cố định
              </span>
            </div>
          ) : (
            <select
              className="so-list-filter-select"
              value={filterInputs.branchId}
              onChange={(e) => onFilterChange('branchId', e.target.value)}
              style={{
                borderColor: filterInputs.branchId !== 'ALL' ? '#0d9488' : undefined,
                color: filterInputs.branchId !== 'ALL' ? '#0f766e' : undefined,
                backgroundColor: filterInputs.branchId !== 'ALL' ? '#f0fdfa' : undefined,
              }}
            >
              <option value="ALL">-- Tất cả chi nhánh --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="so-list-filter-field">
          <label className="so-list-filter-label">Nhà cung cấp:</label>
          <select
            className="so-list-filter-select"
            value={filterInputs.supplierId}
            onChange={(e) => onFilterChange('supplierId', e.target.value)}
            style={{
              borderColor: filterInputs.supplierId !== 'ALL' ? '#0d9488' : undefined,
              color: filterInputs.supplierId !== 'ALL' ? '#0f766e' : undefined,
              backgroundColor: filterInputs.supplierId !== 'ALL' ? '#f0fdfa' : undefined,
              minWidth: 180,
            }}
          >
            <option value="ALL">-- Tất cả nhà cung cấp --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="so-list-filter-field">
          <label className="so-list-filter-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Filter size={12} color="#64748b" />
            <span>Trạng thái:</span>
          </label>
          <select
            className="so-list-filter-select"
            value={filterInputs.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            style={{
              borderColor: filterInputs.status !== 'ALL' ? '#0d9488' : undefined,
              color: filterInputs.status !== 'ALL' ? '#0f766e' : undefined,
              backgroundColor: filterInputs.status !== 'ALL' ? '#f0fdfa' : undefined,
            }}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="DRAFT">Draft (Đang kiểm hàng)</option>
            <option value="CONFIRMED">Confirmed (Đã nhập kho)</option>
            <option value="MISMATCH">Mismatch (Lệch PO)</option>
            <option value="CANCELED">Cancelled (Đã hủy)</option>
          </select>
        </div>
      </div>

      <div className="so-list-filter-row so-list-filter-row--footer">
        <div className="so-list-filter-field">
          <label className="so-list-filter-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Layers size={13} color="#64748b" />
            <span>Xem nhanh:</span>
          </label>
          <select
            className="so-list-filter-select"
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as GrnFilterTab)}
            style={{
              borderColor: activeTab !== 'ALL' ? '#0d9488' : undefined,
              color: activeTab !== 'ALL' ? '#0f766e' : undefined,
              backgroundColor: activeTab !== 'ALL' ? '#f0fdfa' : undefined,
              minWidth: 175,
            }}
          >
            <option value="ALL">Tất cả ({tabCounts.all})</option>
            <option value="TODAY">Nhận hôm nay ({tabCounts.today})</option>
            <option value="DRAFT">Chờ duyệt ({tabCounts.draft})</option>
            <option value="MISMATCH">Lệch hàng ({tabCounts.mismatch})</option>
          </select>
        </div>

        <div className="so-list-filter-actions" style={{ marginLeft: 'auto' }}>
          <div className="so-list-filter-field">
            <Calendar size={13} color="#64748b" />
            <span className="so-list-filter-label">Từ ngày:</span>
            <input
              type="date"
              className="so-list-filter-input"
              value={filterInputs.dateFrom}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="so-list-filter-field">
            <span className="so-list-filter-label">Đến ngày:</span>
            <input
              type="date"
              className="so-list-filter-input"
              value={filterInputs.dateTo}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
            />
          </div>

          <button type="button" className="so-list-filter-search" onClick={onSearch}>
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button type="button" className="so-list-filter-reset" onClick={onReset}>
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
