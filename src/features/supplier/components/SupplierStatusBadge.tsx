import type { FC } from 'react';
import type { SupplierType, SupplierStatus } from '../types/supplier.types';

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
