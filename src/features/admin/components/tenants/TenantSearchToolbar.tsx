import type { FC } from 'react';
import type { PlanType } from '../../types/admin.types';

interface TenantSearchToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPlan: 'all' | PlanType;
  onPlanChange: (plan: 'all' | PlanType) => void;
  visibleCount: number;
  totalCount: number;
}

export const TenantSearchToolbar: FC<TenantSearchToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPlan,
  onPlanChange,
  visibleCount,
  totalCount,
}) => {
  return (
    <div className="admin-search-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 600 }}>
        <input
          type="text"
          className="admin-search-input"
          style={{ paddingLeft: 16, flex: 1 }}
          placeholder="Tìm theo tên chuỗi, subdomain, email, MST..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select
          value={selectedPlan}
          onChange={(e) => onPlanChange(e.target.value as 'all' | PlanType)}
          style={{
            height: 40,
            padding: '0 32px 0 14px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border-light)',
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

      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Hiển thị <b style={{ color: 'var(--blue-primary)' }}>{visibleCount}</b> / {totalCount} khách hàng
      </div>
    </div>
  );
};
