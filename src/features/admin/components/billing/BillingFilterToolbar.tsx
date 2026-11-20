import { Search, RotateCw } from 'lucide-react';
import type { BillingFilterParams, BillingType, BillingStatus } from '../../types/billing.types';

interface BillingFilterToolbarProps {
  filters: BillingFilterParams;
  onFilterChange: (filters: Partial<BillingFilterParams>) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const BillingFilterToolbar = ({
  filters, onFilterChange, onRefresh, isRefreshing = false,
}: BillingFilterToolbarProps) => (
  <div className="plans-toolbar billing-toolbar">
    <label className="plans-search">
      <Search size={17} />
      <input aria-label="Tìm giao dịch" placeholder="Tìm theo mã GD, mã hóa đơn, tên chuỗi, subdomain..."
        value={filters.keyword || ''} onChange={event => onFilterChange({ keyword: event.target.value })} />
    </label>
    <select aria-label="Loại nghiệp vụ" value={filters.type || 'ALL'}
      onChange={event => onFilterChange({ type: event.target.value as 'ALL' | BillingType })}>
      <option value="ALL">Tất cả nghiệp vụ</option>
      <option value="PURCHASE_PLAN">Mua / Gia hạn gói</option>
      <option value="TOPUP">Nạp ví gian hàng</option>
      <option value="PURCHASE_ADDON">Mua tiện ích mở rộng</option>
      <option value="REFUND">Hoàn tiền</option>
    </select>
    <select aria-label="Trạng thái giao dịch" value={filters.status || 'ALL'}
      onChange={event => onFilterChange({ status: event.target.value as 'ALL' | BillingStatus })}>
      <option value="ALL">Tất cả trạng thái</option>
      <option value="SUCCESS">Thành công</option>
      <option value="PENDING">Chờ đối soát</option>
      <option value="FAILED">Thất bại</option>
      <option value="CANCELLED">Đã hủy</option>
    </select>
    <select aria-label="Thời gian giao dịch" value={filters.dateRange || 'all'}
      onChange={event => onFilterChange({ dateRange: event.target.value as BillingFilterParams['dateRange'] })}>
      <option value="all">Toàn bộ thời gian</option>
      <option value="today">Hôm nay</option>
      <option value="7days">7 ngày gần nhất</option>
      <option value="month">Tháng này</option>
    </select>
    <button type="button" className="admin-btn admin-btn-secondary" onClick={onRefresh} disabled={isRefreshing}>
      <RotateCw size={15} /> Làm mới
    </button>
  </div>
);
