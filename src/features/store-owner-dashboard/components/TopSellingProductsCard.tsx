import React from 'react';
import type { TopProductItem } from '../types/dashboard.types';

export const TopSellingProductsCard: React.FC = () => {
  const topProducts: TopProductItem[] = [
    {
      id: 'tp1',
      rank: 1,
      productName: 'Bia Tiger Crystal lon 330ml',
      category: 'Bia & Rượu',
      soldQty: 180,
      unit: 'Lon',
      totalRevenue: 3240000,
      revenueSharePercent: 17.4,
    },
    {
      id: 'tp2',
      rank: 2,
      productName: 'Dầu ăn Tường An Cooking Oil 1L',
      category: 'Gia vị & Dầu ăn',
      soldQty: 32,
      unit: 'Chai',
      totalRevenue: 1600000,
      revenueSharePercent: 8.6,
    },
    {
      id: 'tp3',
      rank: 3,
      productName: 'Nước ngọt Coca-Cola vị nguyên bản 320ml',
      category: 'Đồ uống có ga',
      soldQty: 145,
      unit: 'Lon',
      totalRevenue: 1450000,
      revenueSharePercent: 7.8,
    },
    {
      id: 'tp4',
      rank: 4,
      productName: 'Sữa tươi Vinamilk ít đường 180ml',
      category: 'Sữa tươi',
      soldQty: 85,
      unit: 'Hộp',
      totalRevenue: 765000,
      revenueSharePercent: 4.1,
    },
    {
      id: 'tp5',
      rank: 5,
      productName: 'Mì gói Hảo Hảo tôm chua cay',
      category: 'Thực phẩm khô',
      soldQty: 110,
      unit: 'Gói',
      totalRevenue: 550000,
      revenueSharePercent: 2.9,
    },
  ];

  const getRankBadge = (rank: number) => {
    const isTop1 = rank === 1;
    const isTop2 = rank === 2;
    const isTop3 = rank === 3;

    return (
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 'var(--radius-pill, 9999px)',
          backgroundColor: isTop1 ? '#0066FF' : isTop2 ? '#00C2FF' : isTop3 ? '#475569' : '#F1F5F9',
          color: isTop1 || isTop2 || isTop3 ? '#ffffff' : '#64748B',
          fontSize: '12px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {rank}
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: '24px 26px',
        border: '1px solid var(--border-light, #EDF2F9)',
        boxShadow: '0 4px 14px rgba(0, 30, 90, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: '17px',
            fontWeight: 800,
            color: 'var(--text-main, #0F172A)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Top Mặt hàng Bán chạy
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginTop: 4 }}>
          Xếp hạng theo tổng doanh số xuất bán hôm nay
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {topProducts.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 14,
              backgroundColor: '#FAFAFA',
              border: '1px solid #F1F5F9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              {getRankBadge(p.rank)}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: 'var(--text-main, #0F172A)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.productName}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: 1 }}>
                  Đã bán: <strong style={{ color: '#0F172A' }}>{p.soldQty}</strong> {p.unit}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: 'var(--text-main, #0F172A)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.totalRevenue.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: 1 }}>
                {p.revenueSharePercent}% doanh số
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
