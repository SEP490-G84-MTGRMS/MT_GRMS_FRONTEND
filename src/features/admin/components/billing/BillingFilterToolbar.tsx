import type { FC } from 'react';
import type { BillingFilterParams, BillingType } from '../../types/billing.types';
import { Search, RotateCw, FileSpreadsheet } from 'lucide-react';

interface BillingFilterToolbarProps {
  filters: BillingFilterParams;
  onFilterChange: (newFilters: Partial<BillingFilterParams>) => void;
  onRefresh: () => void;
  onExportExcel: () => void;
  isRefreshing?: boolean;
  statusCounts: {
    all: number;
    success: number;
    pending: number;
    failed: number;
  };
}

export const BillingFilterToolbar: FC<BillingFilterToolbarProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  onExportExcel,
  isRefreshing = false,
  statusCounts,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
      {/* Status Segmented Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          background: '#fff',
          padding: '6px 8px',
          borderRadius: '9999px',
          border: '1px solid #E2EAF0',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => onFilterChange({ status: 'ALL' })}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: filters.status === 'ALL' || !filters.status ? '#0F766E' : 'transparent',
            color: filters.status === 'ALL' || !filters.status ? '#fff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Tất cả</span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: '9999px',
              background: filters.status === 'ALL' || !filters.status ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
              color: filters.status === 'ALL' || !filters.status ? '#fff' : '#64748B',
            }}
          >
            {statusCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange({ status: 'SUCCESS' })}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: filters.status === 'SUCCESS' ? '#0F766E' : 'transparent',
            color: filters.status === 'SUCCESS' ? '#fff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Thành công</span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: '9999px',
              background: filters.status === 'SUCCESS' ? 'rgba(255,255,255,0.25)' : '#EAF6F4',
              color: filters.status === 'SUCCESS' ? '#fff' : '#0F766E',
            }}
          >
            {statusCounts.success}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange({ status: 'PENDING' })}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: filters.status === 'PENDING' ? '#D97706' : 'transparent',
            color: filters.status === 'PENDING' ? '#fff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Chờ đối soát</span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: '9999px',
              background: filters.status === 'PENDING' ? 'rgba(255,255,255,0.25)' : '#FEF3C7',
              color: filters.status === 'PENDING' ? '#fff' : '#D97706',
              fontWeight: 700,
            }}
          >
            {statusCounts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange({ status: 'FAILED' })}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: filters.status === 'FAILED' ? '#DC2626' : 'transparent',
            color: filters.status === 'FAILED' ? '#fff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Thất bại / Hủy</span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: '9999px',
              background: filters.status === 'FAILED' ? 'rgba(255,255,255,0.25)' : '#FEE2E2',
              color: filters.status === 'FAILED' ? '#fff' : '#DC2626',
            }}
          >
            {statusCounts.failed}
          </span>
        </button>
      </div>

      {/* Main Filter Toolbar */}
      <div className="plans-toolbar" style={{ margin: 0 }}>
        {/* Search Input */}
        <div className="plans-search" style={{ minWidth: 260 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm theo mã GD, mã hóa đơn, tên chuỗi, subdomain, mã ref..."
            value={filters.keyword || ''}
            onChange={(e) => onFilterChange({ keyword: e.target.value })}
          />
        </div>

        {/* Type Filter */}
        <select
          value={filters.type || 'ALL'}
          onChange={(e) => onFilterChange({ type: e.target.value as 'ALL' | BillingType })}
          style={{ cursor: 'pointer' }}
          title="Lọc theo loại nghiệp vụ"
        >
          <option value="ALL">Tất cả nghiệp vụ</option>
          <option value="PURCHASE_PLAN">Mua / Gia hạn Gói SaaS</option>
          <option value="TOPUP">Nạp ví gian hàng (VietQR)</option>
          <option value="PURCHASE_ADDON">Mua Add-on (Chi nhánh / Dung lượng)</option>
          <option value="REFUND">Hoàn tiền (Refund)</option>
        </select>

        {/* Date Filter */}
        <select
          value={filters.dateRange || 'all'}
          onChange={(e) =>
            onFilterChange({
              dateRange: e.target.value as 'all' | 'today' | '7days' | 'month' | 'quarter',
            })
          }
          style={{ cursor: 'pointer' }}
          title="Lọc theo khoảng thời gian"
        >
          <option value="all">Toàn bộ thời gian</option>
          <option value="today">Hôm nay</option>
          <option value="7days">7 ngày gần nhất</option>
          <option value="month">Tháng 11/2026</option>
        </select>

        {/* Actions */}
        <div className="plans-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onExportExcel}
            title="Xuất bảng kê giao dịch ra Excel (.xlsx)"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FileSpreadsheet size={15} style={{ color: '#16A34A' }} />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Tải lại danh sách giao dịch"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
