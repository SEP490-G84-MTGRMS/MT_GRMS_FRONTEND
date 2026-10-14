import React from 'react';
import type { TimeFilter } from '../types/dashboard.types';

interface StoreOwnerKpiRowProps {
  timeFilter: TimeFilter;
}

export const StoreOwnerKpiRow: React.FC<StoreOwnerKpiRowProps> = ({ timeFilter }) => {
  // Dữ liệu mô phỏng theo filter
  const kpiData = {
    today: {
      revenue: '18.650.000 đ',
      revPercent: 12.5,
      revSubText: 'so với hôm qua (16.5M đ)',
      orders: '142',
      ordersAvg: 'TB 131.300 đ/đơn',
      cash: '8.200.000 đ',
      vietqr: '10.450.000 đ',
      debt: '4.820.000 đ',
      debtCount: '7 khách hàng ghi sổ',
    },
    yesterday: {
      revenue: '16.580.000 đ',
      revPercent: -2.1,
      revSubText: 'so với ngày trước đó',
      orders: '128',
      ordersAvg: 'TB 129.500 đ/đơn',
      cash: '7.500.000 đ',
      vietqr: '9.080.000 đ',
      debt: '4.650.000 đ',
      debtCount: '6 khách hàng ghi sổ',
    },
    week: {
      revenue: '124.850.000 đ',
      revPercent: 8.7,
      revSubText: 'so với 7 ngày trước',
      orders: '965',
      ordersAvg: 'TB 129.300 đ/đơn',
      cash: '54.200.000 đ',
      vietqr: '70.650.000 đ',
      debt: '4.820.000 đ',
      debtCount: '7 khách hàng đang nợ',
    },
    month: {
      revenue: '512.400.000 đ',
      revPercent: 14.2,
      revSubText: 'so với tháng trước',
      orders: '3.890',
      ordersAvg: 'TB 131.700 đ/đơn',
      cash: '215.000.000 đ',
      vietqr: '297.400.000 đ',
      debt: '4.820.000 đ',
      debtCount: '7 khách hàng đang nợ',
    },
  }[timeFilter];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 18,
      }}
    >
      {/* Thẻ 1: Doanh thu */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: '20px 22px',
          border: '1px solid var(--border-light, #EDF2F9)',
          boxShadow: '0 4px 14px rgba(0, 30, 90, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
            Doanh thu bán lẻ
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: '#F0F6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue-primary, #0066FF)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-main, #0F172A)',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {kpiData.revenue}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill, 9999px)',
                backgroundColor: kpiData.revPercent >= 0 ? '#E8F9EE' : '#FFF0F0',
                color: kpiData.revPercent >= 0 ? '#008738' : '#FF3B30',
              }}
            >
              {kpiData.revPercent >= 0 ? `+${kpiData.revPercent}%` : `${kpiData.revPercent}%`}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>{kpiData.revSubText}</span>
          </div>
        </div>
      </div>

      {/* Thẻ 2: Hóa đơn bán ra */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: '20px 22px',
          border: '1px solid var(--border-light, #EDF2F9)',
          boxShadow: '0 4px 14px rgba(0, 30, 90, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
            Hóa đơn xuất quầy
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-main, #0F172A)',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {kpiData.orders} <span style={{ fontSize: '15px', fontWeight: 600, color: '#64748B' }}>đơn</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>
              {kpiData.ordersAvg}
            </span>
          </div>
        </div>
      </div>

      {/* Thẻ 3: Tiền mặt vs VietQR */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: '20px 22px',
          border: '1px solid var(--border-light, #EDF2F9)',
          boxShadow: '0 4px 14px rgba(0, 30, 90, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
            Dòng tiền quầy thu ngân
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Tiền mặt tại két:</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#1E293B',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {kpiData.cash}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748B' }}>VietQR Chuyển khoản:</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--blue-primary, #0066FF)',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {kpiData.vietqr}
            </span>
          </div>
        </div>
      </div>

      {/* Thẻ 4: Sổ nợ khách hàng */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: '20px 22px',
          border: '1px solid var(--border-light, #EDF2F9)',
          boxShadow: '0 4px 14px rgba(0, 30, 90, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
            Sổ nợ khách quen
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: '#FFF8EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#D97706',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {kpiData.debt}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              {kpiData.debtCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
