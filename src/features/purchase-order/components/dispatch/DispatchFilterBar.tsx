import type { FC } from 'react';
import { Search, RotateCcw } from 'lucide-react';
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
  const tabs: { key: DispatchTabType; label: string; icon?: string; badgeColor?: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'critical', label: 'Cần chốt gấp', icon: '🔴', badgeColor: '#ef4444' },
    { key: 'today', label: 'Hôm nay', icon: '🟡', badgeColor: '#f59e0b' },
    { key: 'later', label: 'Đợt tới', icon: '⚪', badgeColor: '#64748b' },
    { key: 'completed', label: 'Đã gửi PO', icon: '🟢', badgeColor: '#10b981' },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 16px',
        marginBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      {/* ── Left: Tabs / Pills ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key] || 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                border: isActive ? '1px solid #0d9488' : '1px solid #e2e8f0',
                background: isActive ? '#f0fdfa' : '#ffffff',
                color: isActive ? '#0f766e' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: isActive ? '#0d9488' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#64748b',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Right: Search + Branch Selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Branch selector */}
        <select
          value={selectedBranchId}
          onChange={(e) => onSelectBranch(e.target.value)}
          style={{
            height: 32,
            padding: '0 10px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: 12,
            fontWeight: 600,
            color: '#334155',
            background: '#ffffff',
            cursor: 'pointer',
          }}
          title="Lọc theo Chi nhánh"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              CN: {b.code} - {b.name}
            </option>
          ))}
        </select>

        {/* Search input */}
        <div style={{ position: 'relative', width: 240 }}>
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
              height: 32,
              paddingLeft: 30,
              paddingRight: 10,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              color: '#1e293b',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Reset button */}
        {(keyword || activeTab !== 'all') && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 32,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              fontSize: 12,
              color: '#64748b',
              cursor: 'pointer',
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
