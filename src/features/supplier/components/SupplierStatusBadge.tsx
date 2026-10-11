import type { FC } from 'react';
import type { SupplierType, SupplierCategory, SupplierStatus } from '../types/supplier.types';

export const SupplierTypeBadge: FC<{ type: SupplierType }> = ({ type }) => {
  const cls = { Goods: 'badge--goods', Service: 'badge--service', Both: 'badge--both' };
  const labels: Record<SupplierType, string> = {
    Goods: 'Hàng hóa',
    Service: 'Dịch vụ',
    Both: 'Cả hai',
  };
  return (
    <span
      className={`badge ${cls[type]}`}
      style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}
    >
      {labels[type]}
    </span>
  );
};

export const SupplierCategoryBadge: FC<{ category: SupplierCategory }> = ({ category }) => {
  const cls: Record<SupplierCategory, string> = {
    FRESH: 'badge--fresh',
    AMBIENT: 'badge--ambient',
    FROZEN: 'badge--frozen',
    UTILITIES: 'badge--utilities',
    RENT: 'badge--rent',
    LOGISTICS: 'badge--logistics',
  };
  const labels: Record<SupplierCategory, string> = {
    FRESH: '🥦 Nông sản',
    AMBIENT: '📦 Đồ khô',
    FROZEN: '❄️ Đông lạnh',
    UTILITIES: '⚡ Điện nước',
    RENT: '🏠 Mặt bằng',
    LOGISTICS: '🚚 Vận chuyển',
  };
  return (
    <span
      className={`badge ${cls[category]}`}
      style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}
    >
      {labels[category]}
    </span>
  );
};

export const SupplierStatusBadge: FC<{ status: SupplierStatus }> = ({ status }) =>
  status === 'Active' ? (
    <span className="admin-badge admin-badge-active" style={{ fontSize: '11px', padding: '2px 8px' }}>
      Hoạt động
    </span>
  ) : (
    <span className="admin-badge admin-badge-danger" style={{ fontSize: '11px', padding: '2px 8px' }}>
      Tạm ngưng
    </span>
  );

