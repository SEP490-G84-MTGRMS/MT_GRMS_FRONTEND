import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { BranchFilterState } from '../../types/po.types';

interface Props {
  filters: BranchFilterState;
  branchCodeOptions: string[];
  onSearch: (appliedFilters: BranchFilterState) => void;
  onReset: () => void;
}

export const BranchFilterBar: FC<Props> = ({
  filters,
  branchCodeOptions,
  onSearch,
  onReset,
}) => {
  // Draft filter state: only applied when clicking "Tìm kiếm" or pressing Enter
  const [draftFilters, setDraftFilters] = useState<BranchFilterState>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    onSearch({ ...draftFilters, pageIndex: 1 });
  };

  const handleResetClick = () => {
    const emptyFilters: BranchFilterState = {
      keyword: '',
      branchCode: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      pageIndex: 1,
      pageSize: filters.pageSize || 10,
    };
    setDraftFilters(emptyFilters);
    onReset();
  };

  const selectStyle: React.CSSProperties = {
    height: 34,
    padding: '0 10px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: 12.5,
    color: '#1e293b',
    outline: 'none',
    cursor: 'pointer',
    minWidth: 140,
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 0,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* 1. Keyword search */}
        <div style={{ position: 'relative', width: 280, minWidth: 220, flex: '1 1 240px' }}>
          <Search
            size={14}
            color="#94a3b8"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={draftFilters.keyword}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Tìm theo Mã CN, tên chi nhánh, địa chỉ, người quản lý, SĐT..."
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 32,
              paddingRight: 10,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#1e293b',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 2. Branch Code dropdown */}
        <select
          value={draftFilters.branchCode}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, branchCode: e.target.value }))}
          style={selectStyle}
        >
          <option value="all">Mã CN: Tất cả</option>
          {branchCodeOptions.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>

        {/* 3. Status dropdown */}
        <select
          value={draftFilters.status}
          onChange={(e) =>
            setDraftFilters((prev) => ({
              ...prev,
              status: e.target.value as 'all' | 'active' | 'inactive',
            }))
          }
          style={selectStyle}
        >
          <option value="all">Trạng thái: Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>

        {/* 4. Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => handleSubmit()}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'opacity 0.15s ease',
            }}
          >
            <Search size={13} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            onClick={handleResetClick}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
