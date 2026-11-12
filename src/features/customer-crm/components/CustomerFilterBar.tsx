import type { FC } from 'react';
import { Search, RotateCw, X } from 'lucide-react';
import type { DebtFilterStatus } from '../types/customer.types';

interface CustomerFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedTier: string;
  onTierChange: (val: string) => void;
  selectedDebtStatus: DebtFilterStatus;
  onDebtStatusChange: (val: DebtFilterStatus) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const CustomerFilterBar: FC<CustomerFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedTier,
  onTierChange,
  selectedDebtStatus,
  onDebtStatusChange,
  onRefresh,
  isRefreshing,
}) => {
  const pills: { id: DebtFilterStatus; label: string }[] = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'DEBT', label: 'Đang nợ' },
    { id: 'OVER_LIMIT', label: 'Vượt hạn mức' },
  ];

  return (
    <div className="customer-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#ffffff', padding: '14px 18px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
      {/* Search & Select filters */}
      <div className="customer-filter-left" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}>
        {/* Search Input */}
        <div className="customer-search-box" style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px', maxWidth: '420px' }}>
          <Search className="w-4 h-4 customer-search-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên, SĐT, mã KH, mã số thuế..."
            className="customer-search-input"
            style={{ width: '100%', padding: '9px 36px 9px 36px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="customer-clear-btn"
              title="Xóa tìm kiếm"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 3 Pill chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {pills.map((p) => {
            const isActive = selectedDebtStatus === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onDebtStatusChange(p.id)}
                className={`pill-btn ${isActive ? 'active' : ''}`}
                style={{
                  height: '34px',
                  padding: '0 14px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #0F766E' : '1px solid #E2E8F0',
                  background: isActive ? '#0F766E' : '#F8FAFC',
                  color: isActive ? '#ffffff' : '#475569',
                  boxShadow: isActive ? '0 2px 6px rgba(15, 118, 110, 0.22)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Membership Tier Filter */}
        <select
          value={selectedTier}
          onChange={(e) => onTierChange(e.target.value)}
          className="customer-select"
          style={{ height: '34px', padding: '0 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', color: '#334155', background: '#F8FAFC' }}
        >
          <option value="ALL">Tất cả nhóm khách</option>
          <option value="Standard">Thành viên</option>
          <option value="Silver">Thân thiết</option>
          <option value="Gold">Bán buôn / Khách sỉ</option>
          <option value="VIP">Đối tác VIP</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Tải lại danh sách"
          className="action-icon-btn"
          style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <RotateCw
            className="w-4 h-4"
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              color: isRefreshing ? '#0F766E' : '#64748B',
            }}
          />
        </button>
      </div>
    </div>
  );
};
