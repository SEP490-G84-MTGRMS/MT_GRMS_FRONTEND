import type { FC } from 'react';
import type { TenantStatus } from '../../types/admin.types';

export type FilterTabType = 'all' | TenantStatus;

interface TabConfig {
  key: FilterTabType;
  label: string;
  count: number;
}

interface TenantFilterTabsProps {
  activeTab: FilterTabType;
  onSelectTab: (tab: FilterTabType) => void;
  counts?: Partial<Record<FilterTabType, number>>;
}

export const TenantFilterTabs: FC<TenantFilterTabsProps> = ({
  activeTab,
  onSelectTab,
  counts = {},
}) => {
  const tabs: TabConfig[] = [
    { key: 'all', label: 'Tất cả', count: counts.all ?? 128 },
    { key: 'active', label: 'Đang hoạt động', count: counts.active ?? 114 },
    { key: 'expiring', label: 'Sắp hết hạn ≤30d', count: counts.expiring ?? 9 },
    { key: 'grace', label: 'Đang ân hạn', count: counts.grace ?? 3 },
    { key: 'pending', label: 'Chờ kích hoạt', count: counts.pending ?? 2 },
    { key: 'locked', label: 'Bị khóa', count: counts.locked ?? 5 },
  ];

  return (
    <div className="admin-filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`admin-filter-tab ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onSelectTab(tab.key)}
        >
          <span>{tab.label}</span>
          <span className="tab-badge">{tab.count}</span>
        </button>
      ))}
    </div>
  );
};
