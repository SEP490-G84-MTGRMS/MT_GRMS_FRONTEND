import type { FC } from 'react';
import type { SupplierReturnKpiSummary } from '../types/supplierReturn.types';

interface Props {
  summary: SupplierReturnKpiSummary;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

export const SupplierReturnKpiCards: FC<Props> = ({ summary }) => {
  const cards = [
    {
      title: 'Tổng phiếu trả hàng',
      value: `${summary.totalCount} phiếu`,
      sub: 'Tất cả các lần đổi/trả NCC',
      border: '#e2e8f0',
      bg: '#ffffff',
      color: '#0f172a',
    },
    {
      title: 'Chờ NCC phản hồi',
      value: `${summary.pendingSupplierCount} phiếu`,
      sub: 'Đang cách ly tồn PENDING_RETURN',
      border: '#fed7aa',
      bg: '#fff7ed',
      color: '#c2410c',
    },
    {
      title: 'Đã duyệt chờ bàn giao',
      value: `${summary.approvedCount} phiếu`,
      sub: 'NCC chấp nhận, sẵn sàng giao xe',
      border: '#bbf7d0',
      bg: '#f0fdf4',
      color: '#15803d',
    },
    {
      title: 'Đã hoàn tất bàn giao',
      value: `${summary.completedCount} phiếu`,
      sub: 'Đã trừ tồn kho chính thức',
      border: '#bae6fd',
      bg: '#f0f9ff',
      color: '#0369a1',
    },
    {
      title: 'Tổng giá trị hàng trả',
      value: `${fmt(summary.totalEstimatedAmount)} đ`,
      sub: 'Theo giá vốn phiếu nhập gốc',
      border: '#fde68a',
      bg: '#fffbeb',
      color: '#b45309',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.3,
            }}
          >
            {c.title}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: c.color,
              marginTop: 4,
              lineHeight: 1.2,
            }}
          >
            {c.value}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
};
