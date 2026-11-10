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
      gap: 6,
      padding: '3px 10px',
      borderRadius: 9999,
      fontSize: '12px',
      fontWeight: 500,
      backgroundColor: status === 'Active' ? '#E8F9EE' : '#F1F5F9',
      color: status === 'Active' ? '#047857' : '#64748b',
      whiteSpace: 'nowrap',
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: status === 'Active' ? '#00C853' : '#94a3b8',
      }}
    />
    {status === 'Active' ? 'Hoạt động' : 'Tạm ngưng'}
  </span>
);
