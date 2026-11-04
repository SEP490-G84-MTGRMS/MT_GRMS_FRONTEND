import type { FC } from 'react';
import type { InventoryKpiSummary } from '../types/inventory.types';

interface Props {
  summary: InventoryKpiSummary;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

export const InventoryKpiCards: FC<Props> = ({ summary }) => {
  const cards = [
    {
      title: 'Tổng SKU',
      value: `${summary.skuCount} SP`,
      sub: `Trên ${summary.branchCount} chi nhánh`,
      border: '#e2e8f0',
      bg: '#ffffff',
      color: '#0f172a',
    },
    {
      title: 'Giá trị tồn kho',
      value: `${fmt(summary.totalValue)} đ`,
      sub: 'Theo giá vốn bình quân',
      border: '#e2e8f0',
      bg: '#ffffff',
      color: '#0f172a',
    },
    {
      title: 'Đang nhập (On-order)',
      value: `${fmt(summary.onOrderUnits)} ĐVT`,
      sub: 'Chờ nhận từ phiếu PO',
      border: '#bae6fd',
      bg: '#f0f9ff',
      color: '#0369a1',
    },
    {
      title: 'Cảnh báo tồn',
      value: `${summary.lowCount + summary.outCount} SKU`,
      sub: `${summary.lowCount} sắp hết, ${summary.outCount} hết hàng`,
      border: '#fecaca',
      bg: '#fff5f5',
      color: '#b91c1c',
    },
    {
      title: 'Cảnh báo HSD ≤ 30 ngày',
      value: `${summary.expiryBatchCount} lô`,
      sub: 'Xem chi tiết hạn dùng',
      border: '#fde68a',
      bg: '#fffbeb',
      color: '#b45309',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 10,
        marginBottom: 10,
        flexShrink: 0,
      }}
    >
      {cards.map((c) => (
        <div
          key={c.title}
          style={{
            border: `1px solid ${c.border}`,
            background: c.bg,
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            {c.title}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: c.color, marginTop: 4, lineHeight: 1.2 }}>
            {c.value}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
};
