import type { FC } from 'react';
import type { SupplierType, SupplierCategory, SupplierStatus } from '../types/supplier.types';

export const SupplierTypeBadge: FC<{ type: SupplierType }> = ({ type }) => {
  const labels: Record<SupplierType, string> = {
    Goods: 'Hàng hóa',
    Service: 'Dịch vụ',
    Both: 'Cả hai',
  };
  return (
    <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#374151' }}>
      {labels[type]}
    </span>
  );
};

export const SupplierCategoryBadge: FC<{ category: SupplierCategory }> = ({ category }) => {
  const labels: Record<SupplierCategory, string> = {
    FRESH: 'Nông sản',
    AMBIENT: 'Đồ khô',
    FROZEN: 'Đông lạnh',
    UTILITIES: 'Điện nước',
    RENT: 'Mặt bằng',
    LOGISTICS: 'Vận chuyển',
  };
  return (
    <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#374151' }}>
      {labels[category]}
    </span>
  );
};

export const SupplierStatusBadge: FC<{ status: SupplierStatus }> = ({ status }) => (
  <span
    style={{
      fontSize: '12.5px',
      fontWeight: 500,
      color: status === 'Active' ? '#15803d' : '#991b1b',
    }}
  >
    {status === 'Active' ? 'Hoạt động' : 'Tạm ngưng'}
  </span>
);

