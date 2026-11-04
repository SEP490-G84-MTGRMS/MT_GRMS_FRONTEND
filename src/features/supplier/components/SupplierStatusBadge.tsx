import type { FC } from 'react';
import type { SupplierType, SupplierCategory, SupplierStatus } from '../types/supplier.types';

export const SupplierTypeBadge: FC<{ type: SupplierType }> = ({ type }) => {
  const labels: Record<SupplierType, string> = {
    Goods: 'Hàng hóa',
    Service: 'Dịch vụ',
    Both: 'Cả hai',
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '11.5px',
        fontWeight: 600,
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #cbd5e1',
        whiteSpace: 'nowrap',
      }}
    >
      {labels[type] || type}
    </span>
  );
};

export const SupplierCategoryBadge: FC<{ category: SupplierCategory }> = ({ category }) => {
  const config: Record<SupplierCategory, { label: string; bg: string; color: string; border: string }> = {
    FRESH: { label: 'Nông sản', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    AMBIENT: { label: 'Đồ khô', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    FROZEN: { label: 'Đông lạnh', bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
    UTILITIES: { label: 'Điện nước', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    RENT: { label: 'Mặt bằng', bg: '#f3e8ff', color: '#7e22ce', border: '#d8b4fe' },
    LOGISTICS: { label: 'Vận chuyển', bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
  };

  const item = config[category] || { label: category, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '11.5px',
        fontWeight: 600,
        backgroundColor: item.bg,
        color: item.color,
        border: `1px solid ${item.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {item.label}
    </span>
  );
};

export const SupplierStatusBadge: FC<{ status: SupplierStatus }> = ({ status }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: '11.5px',
      fontWeight: 700,
      backgroundColor: status === 'Active' ? '#dcfce7' : '#f1f5f9',
      color: status === 'Active' ? '#15803d' : '#64748b',
      border: status === 'Active' ? '1px solid #86efac' : '1px solid #cbd5e1',
      whiteSpace: 'nowrap',
    }}
  >
    {status === 'Active' ? '🟢 Hoạt động' : '⚪ Tạm ngưng'}
  </span>
);

