import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { Search, RotateCcw, Filter, Calendar } from 'lucide-react';
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

  const hasActiveFilters = Boolean(
    draftFilters.keyword.trim() ||
    (draftFilters.branchCode && draftFilters.branchCode !== 'all') ||
    (draftFilters.status && draftFilters.status !== 'all') ||
    draftFilters.dateFrom ||
    draftFilters.dateTo
  );

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
      {/* ── Dòng 1: Tìm kiếm + Mã CN + Trạng thái + Khoảng ngày ── */}
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
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 2. Branch Code dropdown */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Mã chi nhánh:
          </label>
          <select
            value={draftFilters.branchCode}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, branchCode: e.target.value }))}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: draftFilters.branchCode !== 'all' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: draftFilters.branchCode !== 'all' ? '#0f766e' : '#334155',
              backgroundColor: draftFilters.branchCode !== 'all' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 140,
              boxSizing: 'border-box',
            }}
          >
            <option value="all">-- Tất cả mã CN --</option>
            {branchCodeOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Status dropdown */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Filter size={12} color="#64748b" />
            <span>Trạng thái:</span>
          </label>
          <select
            value={draftFilters.status}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                status: e.target.value as 'all' | 'active' | 'inactive',
              }))
            }
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: draftFilters.status !== 'all' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: draftFilters.status !== 'all' ? '#0f766e' : '#334155',
              backgroundColor: draftFilters.status !== 'all' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 150,
              boxSizing: 'border-box',
            }}
          >
            <option value="all">-- Tất cả trạng thái --</option>
            <option value="active">🟢 Đang hoạt động</option>
            <option value="inactive">⚪ Ngừng hoạt động</option>
          </select>
        </div>

        {/* 4. Date Range Filters */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Calendar size={12} color="#64748b" />
            <span>Từ ngày:</span>
          </label>
          <input
            type="date"
            value={draftFilters.dateFrom}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            style={{
              height: 34,
              padding: '0 8px',
              borderRadius: 6,
              border: draftFilters.dateFrom ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              color: '#1e293b',
              backgroundColor: draftFilters.dateFrom ? '#f0fdfa' : '#ffffff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Đến ngày:
          </label>
          <input
            type="date"
            value={draftFilters.dateTo}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            style={{
              height: 34,
              padding: '0 8px',
              borderRadius: 6,
              border: draftFilters.dateTo ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              color: '#1e293b',
              backgroundColor: draftFilters.dateTo ? '#f0fdfa' : '#ffffff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ── Dòng 2: Phân cách nét đứt + Trạng thái filter + Nút Tìm kiếm & Đặt lại ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 8,
          borderTop: '1px dashed #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
          {hasActiveFilters && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                fontSize: 11.5,
                fontWeight: 600,
                border: '1px solid #ccfbf1',
              }}
            >
              Đang áp dụng bộ lọc
            </span>
          )}
        </div>

        {/* Nút Tìm kiếm & Đặt lại */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => handleSubmit()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            title="Áp dụng bộ lọc tìm kiếm"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0d9488')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--blue-primary, #0f766e)')}
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            onClick={handleResetClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            title="Đặt lại toàn bộ tiêu chí lọc"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#94a3b8';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
