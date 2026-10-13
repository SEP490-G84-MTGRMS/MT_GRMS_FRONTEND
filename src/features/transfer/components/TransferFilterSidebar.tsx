import React from 'react';
import type { Branch, TransferStatus } from '../types';

interface TransferFilterSidebarProps {
  branches: Branch[];
  fromBranchId: string;
  onChangeFromBranch: (id: string) => void;
  toBranchId: string;
  onChangeToBranch: (id: string) => void;
  selectedStatuses: TransferStatus[];
  onToggleStatus: (status: TransferStatus) => void;
  timeRange: 'all' | 'this_month' | 'custom';
  onChangeTimeRange: (range: 'all' | 'this_month' | 'custom') => void;
  customDate?: string;
  onChangeCustomDate: (date: string) => void;
  recvStatus: 'all' | 'match' | 'mismatch';
  onChangeRecvStatus: (status: 'all' | 'match' | 'mismatch') => void;
  onResetFilters: () => void;
}

export const TransferFilterSidebar: React.FC<TransferFilterSidebarProps> = ({
  branches,
  fromBranchId,
  onChangeFromBranch,
  toBranchId,
  onChangeToBranch,
  selectedStatuses,
  onToggleStatus,
  timeRange,
  onChangeTimeRange,
  customDate,
  onChangeCustomDate,
  recvStatus,
  onChangeRecvStatus,
  onResetFilters,
}) => {
  const ALL_STATUSES: { key: TransferStatus; label: string }[] = [
    { key: 'Draft', label: 'Phiếu tạm' },
    { key: 'In-Transit', label: 'Đang chuyển' },
    { key: 'Received', label: 'Đã nhận' },
    { key: 'Cancelled', label: 'Đã hủy' },
  ];

  return (
    <aside className="transfer-sidebar">
      {/* 1. Chi nhánh Chuyển đi */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
          Chuyển đi (Kho gửi)
        </div>
        <select
          className="filter-select"
          value={fromBranchId}
          onChange={(e) => onChangeFromBranch(e.target.value)}
        >
          <option value="">Tất cả chi nhánh gửi</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Chi nhánh Nhận về */}
      <div className="filter-group-card">
        <div className="filter-group-title">Nhận về (Kho nhận)</div>
        <select
          className="filter-select"
          value={toBranchId}
          onChange={(e) => onChangeToBranch(e.target.value)}
        >
          <option value="">Tất cả chi nhánh nhận</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Trạng thái phiếu */}
      <div className="filter-group-card">
        <div className="filter-group-title">Trạng thái</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ALL_STATUSES.map((st) => {
            const isChecked = selectedStatuses.includes(st.key);
            return (
              <label
                key={st.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 8,
                  backgroundColor: isChecked ? '#f0fdfa' : '#f8fafc',
                  border: isChecked ? '1px solid #0F766E' : '1px solid #e2e8f0',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleStatus(st.key)}
                  style={{ accentColor: '#0F766E' }}
                />
                <span style={{ fontWeight: isChecked ? 700 : 500, color: isChecked ? '#0F766E' : '#334155' }}>
                  {st.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 4. Thời gian */}
      <div className="filter-group-card">
        <div className="filter-group-title">Thời gian</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="transfer_time_radio"
              checked={timeRange === 'all'}
              onChange={() => onChangeTimeRange('all')}
            />
            Toàn thời gian
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="transfer_time_radio"
              checked={timeRange === 'this_month'}
              onChange={() => onChangeTimeRange('this_month')}
            />
            Tháng này
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="transfer_time_radio"
              checked={timeRange === 'custom'}
              onChange={() => onChangeTimeRange('custom')}
            />
            Tùy chỉnh ngày
          </label>
          {timeRange === 'custom' && (
            <input
              type="date"
              className="filter-input"
              value={customDate || ''}
              onChange={(e) => onChangeCustomDate(e.target.value)}
              style={{ marginTop: 4 }}
            />
          )}
        </div>
      </div>

      {/* 5. Tình trạng nhận hàng */}
      <div className="filter-group-card">
        <div className="filter-group-title">Tình trạng nhận hàng</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="recv_status_radio"
              checked={recvStatus === 'all'}
              onChange={() => onChangeRecvStatus('all')}
            />
            Tất cả
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="recv_status_radio"
              checked={recvStatus === 'match'}
              onChange={() => onChangeRecvStatus('match')}
            />
            Khớp số lượng
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="recv_status_radio"
              checked={recvStatus === 'mismatch'}
              onChange={() => onChangeRecvStatus('mismatch')}
            />
            Lệch / Thiếu hụt
          </label>
        </div>
      </div>

      {/* Nút đặt lại bộ lọc */}
      <div style={{ paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={onResetFilters}
          style={{
            width: '100%',
            padding: '8px',
            background: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: 14,
            fontSize: 12.5,
            fontWeight: 600,
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          Đặt lại bộ lọc
        </button>
      </div>
    </aside>
  );
};
