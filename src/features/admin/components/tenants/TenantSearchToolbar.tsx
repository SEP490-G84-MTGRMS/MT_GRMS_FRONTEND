import { Search } from "lucide-react";
import type { FC } from 'react';
import type { PlanType, TenantStatus } from '../../types/admin.types';

export type FilterStatusType = 'all' | TenantStatus;

interface TenantSearchToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus?: FilterStatusType;
  onStatusChange?: (status: FilterStatusType) => void;
  statusCounts?: Partial<Record<FilterStatusType, number>>;
  selectedPlan: 'all' | PlanType;
  onPlanChange: (plan: 'all' | PlanType) => void;
  visibleCount: number;
  totalCount: number;
}

export const TenantSearchToolbar: FC<TenantSearchToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedStatus = 'all',
  onStatusChange,
  statusCounts,
  selectedPlan,
  onPlanChange,
  visibleCount,
  totalCount,
}) => {
  return (
    <div className="plans-toolbar tenant-list-toolbar" aria-label={`Bộ lọc khách hàng, ${visibleCount} trên ${totalCount} cửa hàng`}>
      <div className="plans-search"><Search size={16} /><input aria-label="Tìm khách hàng thuê" placeholder="Tìm tên cửa hàng, subdomain, email, mã số thuế..." value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} /></div>
      {onStatusChange && <select aria-label="Trạng thái khách hàng" value={selectedStatus} onChange={(event) => onStatusChange(event.target.value as FilterStatusType)}>
        <option value="all">Tất cả trạng thái ({statusCounts?.all ?? totalCount})</option>
        <option value="active">Hoạt động</option><option value="expiring">Sắp hết hạn</option><option value="grace">Ân hạn</option><option value="pending">Chờ kích hoạt</option><option value="locked">Bị khóa</option>
      </select>}
      <select aria-label="Gói dịch vụ" value={selectedPlan} onChange={(event) => onPlanChange(event.target.value as 'all' | PlanType)}>
        <option value="all">Tất cả gói dịch vụ</option><option value="basic">Gói Cơ Bản</option><option value="advanced">Gói Nâng Cao</option><option value="enterprise">Gói Doanh Nghiệp</option>
      </select>
    </div>
  );
};
