import type { FC } from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import type { BranchOption } from '../../types/po.types';

export type DispatchTabType = 'all' | 'critical' | 'today' | 'later' | 'completed';

interface DispatchFilterBarProps {
  activeTab: DispatchTabType;
  onTabChange: (tab: DispatchTabType) => void;
  counts: Record<DispatchTabType, number>;
  keyword: string;
  onKeywordChange: (kw: string) => void;
  branches: BranchOption[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  onResetFilters: () => void;
}

export const DispatchFilterBar: FC<DispatchFilterBarProps> = ({
  activeTab,
  onTabChange,
  counts,
  keyword,
  onKeywordChange,
  branches,
  selectedBranchId,
  onSelectBranch,
  onResetFilters,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 16px',
        marginBottom: 14,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* ── Left filters: Search, Status Dropdown, Branch Dropdown ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', flex: 1 }}>
        {/* 1. Search input */}
        <div style={{ position: 'relative', width: 280, minWidth: 220 }}>
          <Search
            size={14}
            color="#94a3b8"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Tìm theo tên NCC, nhóm hàng..."
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

        {/* 2. Status Dropdown Select Box */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Filter size={13} color="#64748b" />
            <span>Trạng thái:</span>
          </label>
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as DispatchTabType)}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 6,
              border: activeTab !== 'all' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 600,
              color: activeTab !== 'all' ? '#0f766e' : '#334155',
              background: activeTab !== 'all' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Lọc theo mức độ ưu tiên hoặc trạng thái PO"
          >
            <option value="all">Tất cả ({counts.all})</option>
            <option value="critical">🔴 Cần chốt gấp ({counts.critical})</option>
            <option value="today">🟡 Hôm nay ({counts.today})</option>
            <option value="later">⚪ Đợt tới ({counts.later})</option>
            <option value="completed">🟢 Đã gửi PO ({counts.completed})</option>
          </select>
        </div>

        {/* 3. Branch Dropdown Select Box */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Chi nhánh:
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => onSelectBranch(e.target.value)}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155',
              background: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            title="Lọc theo Chi nhánh"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} - {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Right: Reset button if filtered ── */}
      <div>
        {(keyword || activeTab !== 'all') && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 34,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        )}
      </div>
    </div>
  );
};
