import React, { useState } from 'react';
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

  const [filterTransferDate, setFilterTransferDate] = useState(true);
  const [filterReceiveDate, setFilterReceiveDate] = useState(false);

  return (
    <aside className="transfer-sidebar">
      {/* Sidebar Header */}
      <div className="transfer-sidebar-header">
        <h3>Bộ lọc chuyển hàng</h3>
        <button
          type="button"
          className="transfer-action-link"
          onClick={onResetFilters}
          title="Đặt lại toàn bộ tiêu chí lọc"
        >
          Đặt lại
        </button>
      </div>

      {/* Chuyển đi */}
      <div className="filter-group-card" style={{ borderTop: 'none', paddingTop: 0 }}>
        <div className="filter-group-title">Chuyển đi (Kho gửi)</div>
        <select
          className="filter-select"
          value={fromBranchId}
          onChange={(e) => onChangeFromBranch(e.target.value)}
        >
          <option value="">Chi nhánh trung tâm</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Nhận về */}
      <div className="filter-group-card">
        <div className="filter-group-title">Nhận về (Kho nhận)</div>
        <select
          className="filter-select"
          value={toBranchId}
          onChange={(e) => onChangeToBranch(e.target.value)}
        >
          <option value="">Chọn chi nhánh</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Trạng thái */}
      <div className="filter-group-card">
        <div className="filter-group-title">Trạng thái</div>
        <div className="transfer-tags-container">
          {ALL_STATUSES.map((st) => {
            const isSelected = selectedStatuses.includes(st.key);
            if (!isSelected) return null;
            return (
              <span key={st.key} className="transfer-tag-pill">
                <span>{st.label}</span>
                <button
                  type="button"
                  className="transfer-tag-del"
                  onClick={() => onToggleStatus(st.key)}
                  title={`Bỏ lọc ${st.label}`}
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>

        {/* Nút thêm lại trạng thái đã xóa */}
        {selectedStatuses.length < ALL_STATUSES.length && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {ALL_STATUSES.filter((st) => !selectedStatuses.includes(st.key)).map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => onToggleStatus(st.key)}
                style={{
                  fontSize: 11.5,
                  padding: '3px 8px',
                  background: '#f8fafc',
                  border: '1px dashed #0F766E',
                  borderRadius: 9999,
                  cursor: 'pointer',
                  color: '#0F766E',
                  fontWeight: 600,
                }}
              >
                + {st.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thời gian */}
      <div className="filter-group-card">
        <div className="filter-group-title">Thời gian</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterTransferDate}
              onChange={(e) => setFilterTransferDate(e.target.checked)}
              style={{ accentColor: '#0F766E', cursor: 'pointer' }}
            />
            <span>Ngày chuyển</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterReceiveDate}
              onChange={(e) => setFilterReceiveDate(e.target.checked)}
              style={{ accentColor: '#0F766E', cursor: 'pointer' }}
            />
            <span>Ngày nhận</span>
          </label>
        </div>

        {/* Ngăn cách giữa checkbox và radio */}
        <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="wf_time_radio"
              checked={timeRange === 'this_month' || timeRange === 'all'}
              onChange={() => onChangeTimeRange('this_month')}
              style={{ accentColor: '#0F766E', cursor: 'pointer' }}
            />
            <span>Tháng này</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="wf_time_radio"
              checked={timeRange === 'custom'}
              onChange={() => onChangeTimeRange('custom')}
              style={{ accentColor: '#0F766E', cursor: 'pointer' }}
            />
            <span>Tùy chỉnh</span>
          </label>
          {timeRange === 'custom' && (
            <input
              type="date"
              className="filter-input"
              value={customDate || ''}
              onChange={(e) => onChangeCustomDate(e.target.value)}
              style={{ marginTop: 6 }}
            />
          )}
        </div>
      </div>

      {/* Tình trạng nhận hàng */}
      <div className="filter-group-card">
        <div className="filter-group-title">Tình trạng nhận hàng</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: 14,
            rowGap: 8,
            fontSize: 13,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="wf_recv_radio"
              checked={recvStatus === 'all'}
              onChange={() => onChangeRecvStatus('all')}
              style={{ accentColor: '#0F766E', cursor: 'pointer' }}
            />
            <span>Tất cả</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="wf_recv_radio"
              checked={recvStatus === 'mismatch'}
              onChange={() => onChangeRecvStatus('mismatch')}
              style={{ accentColor: '#0F766E', cursor: 'pointer' }}
            />
            <span>Không khớp</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', gridColumn: 'span 2' }}>
            <input
              type="radio"
              name="wf_recv_radio"
              checked={recvStatus === 'match'}
              onChange={() => onChangeRecvStatus('match')}
              style={{ accentColor: '#0F766E', cursor: 'pointer' }}
            />
            <span>Khớp</span>
          </label>
        </div>
      </div>
    </aside>
  );
};
