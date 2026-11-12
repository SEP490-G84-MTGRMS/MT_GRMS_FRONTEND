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

export const SupplierStatusBadge: FC<{ status: SupplierStatus }> = ({ status }) => {
  const isActive = status === 'Active';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 9999,
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: isActive ? '#f0fdf4' : '#f8fafc',
        color: isActive ? '#15803d' : '#64748b',
        border: isActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
        whiteSpace: 'nowrap',
      }}
    >
      {isActive ? 'Hoạt động' : 'Tạm ngưng'}
    </span>
  );
};
