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
    <div
      className="admin-search-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="admin-search-input"
            style={{
              paddingLeft: 16,
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
            }}
            placeholder="Tìm theo tên chuỗi, subdomain, email, MST..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Dropdown Trạng thái */}
        {onStatusChange && (
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as FilterStatusType)}
            style={{
              height: 40,
              padding: '0 28px 0 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: 'var(--bg-soft-blue)',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--text-main)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">
              Tất cả trạng thái {statusCounts?.all !== undefined ? `(${statusCounts.all})` : ''}
            </option>
            <option value="active">
              Đang hoạt động {statusCounts?.active !== undefined ? `(${statusCounts.active})` : ''}
            </option>
            <option value="expiring">
              Sắp hết hạn ≤30d {statusCounts?.expiring !== undefined ? `(${statusCounts.expiring})` : ''}
            </option>
            <option value="grace">
              Đang ân hạn {statusCounts?.grace !== undefined ? `(${statusCounts.grace})` : ''}
            </option>
            <option value="pending">
              Chờ kích hoạt {statusCounts?.pending !== undefined ? `(${statusCounts.pending})` : ''}
            </option>
            <option value="locked">
              Bị khóa {statusCounts?.locked !== undefined ? `(${statusCounts.locked})` : ''}
            </option>
          </select>
        )}

        {/* Dropdown Gói cước */}
        <select
          value={selectedPlan}
          onChange={(e) => onPlanChange(e.target.value as 'all' | PlanType)}
          style={{
            height: 40,
            padding: '0 28px 0 12px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            backgroundColor: 'var(--bg-soft-blue)',
            fontFamily: 'inherit',
            fontSize: 13,
            color: 'var(--text-main)',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">Tất cả gói cước</option>
          <option value="basic">Gói Cơ Bản (Basic)</option>
          <option value="advanced">Gói Nâng Cao (Advanced)</option>
          <option value="enterprise">Gói Doanh Nghiệp (Enterprise)</option>
        </select>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        Hiển thị <b style={{ color: 'var(--blue-primary)' }}>{visibleCount}</b> / {totalCount} khách hàng
      </div>
    </div>
  );
};
