import type { FC } from 'react';
import { Search, RotateCcw, Calendar, Building2, Store } from 'lucide-react';
import type { GrnFilterState, UserRole } from '../types/grn.types';
import { MOCK_GRN_BRANCHES, MOCK_GRN_SUPPLIERS } from '../lib/mockGrnData';

interface GrnFilterBarProps {
  filterInputs: GrnFilterState;
  role: UserRole;
  employeeBranchId?: string;
  onFilterChange: <K extends keyof GrnFilterState>(key: K, value: GrnFilterState[K]) => void;
  onSearch: () => void;
  onReset: () => void;
}

export const GrnFilterBar: FC<GrnFilterBarProps> = ({
  filterInputs,
  role,
  employeeBranchId = 'BR-01',
  onFilterChange,
  onSearch,
  onReset,
}) => {
  const isEmployee = role === 'employee';

  return (
    <div className="po-unified-bar" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
      {/* 1. Keyword search input */}
      <div className="po-ctrl-search" style={{ width: 260, flex: '0 0 260px' }}>
        <Search size={14} className="po-ctrl-search-icon" />
        <input
          type="text"
          className="po-ctrl-search-input"
          placeholder="Tìm Mã GRN, Mã PO, Lô, NCC, Thủ kho..."
          value={filterInputs.keyword}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
          onChange={(e) => onFilterChange('keyword', e.target.value)}
        />
      </div>

      <div className="po-bar-divider" />

      {/* 2. Chi nhánh Dropdown */}
      <div className="po-bar-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Building2 size={13} style={{ color: 'var(--blue-primary, #0066cc)' }} />
          Chi nhánh:
        </label>
        {isEmployee ? (
          <div
            style={{
              height: 32,
              padding: '0 10px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              color: '#1e293b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Nhân viên chỉ có quyền xem dữ liệu tại chi nhánh được phân công"
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
            {MOCK_GRN_BRANCHES.find((b) => b.id === employeeBranchId)?.name || employeeBranchId}
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
            className="po-ctrl-select"
            style={{ minWidth: 160 }}
            value={filterInputs.branchId}
            onChange={(e) => onFilterChange('branchId', e.target.value)}
          >
            <option value="ALL">-- Tất cả chi nhánh --</option>
            {MOCK_GRN_BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="po-bar-divider" />

      {/* 3. Nhà cung cấp Dropdown */}
      <div className="po-bar-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Store size={13} style={{ color: '#475569' }} />
          NCC:
        </label>
        <select
          className="po-ctrl-select"
          style={{ minWidth: 150 }}
          value={filterInputs.supplierId}
          onChange={(e) => onFilterChange('supplierId', e.target.value)}
        >
          <option value="ALL">-- Tất cả NCC --</option>
          {MOCK_GRN_SUPPLIERS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="po-bar-divider" />

      {/* 4. Trạng thái Dropdown */}
      <div className="po-bar-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
          Trạng thái:
        </label>
        <select
          className="po-ctrl-select"
          style={{ minWidth: 155 }}
          value={filterInputs.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="ALL">-- Tất cả trạng thái --</option>
          <option value="TODAY">DỰ KIẾN NHẬN HÔM NAY</option>
          <option value="DRAFT">Nháp (Đang kiểm hàng)</option>
          <option value="CONFIRMED">Đã nhập kho (Confirmed)</option>
          <option value="MISMATCH">Lệch PO / Đã lập biên bản</option>
          <option value="CANCELED">Đã hủy</option>
        </select>
      </div>

      <div className="po-bar-divider" />

      {/* 5. Date Range */}
      <div className="po-bar-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calendar size={13} style={{ color: '#64748b' }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
          Từ:
        </label>
        <input
          type="date"
          className="po-ctrl-date"
          style={{ width: 130 }}
          value={filterInputs.dateFrom}
          onChange={(e) => onFilterChange('dateFrom', e.target.value)}
        />
        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
          Đến:
        </label>
        <input
          type="date"
          className="po-ctrl-date"
          style={{ width: 130 }}
          value={filterInputs.dateTo}
          onChange={(e) => onFilterChange('dateTo', e.target.value)}
        />
      </div>

      {/* 6. Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        <button
          type="button"
          onClick={onSearch}
          className="po-btn po-btn-primary"
          style={{ height: 32, padding: '0 14px', fontSize: 12 }}
          title="Thực hiện lọc dữ liệu"
        >
          <Search size={14} />
          <span>Tìm kiếm</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="po-btn po-btn-outline"
          style={{ height: 32, padding: '0 12px', fontSize: 12 }}
          title="Xóa bộ lọc về mặc định"
        >
          <RotateCcw size={14} />
          <span>Đặt lại</span>
        </button>
      </div>
    </div>
  );
};
