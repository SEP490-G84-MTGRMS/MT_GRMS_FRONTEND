import React from 'react';
import { useNavigate } from 'react-router-dom';

export const StoreQuickActionsCard: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Mở Quầy Thu Ngân POS',
      sub: 'Quét mã vạch & thanh toán VietQR',
      to: '/store-owner/products',
      primary: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      label: 'Tạo Đơn Nhập Hàng Ma Trận',
      sub: 'Lên đơn nhanh từ nhiều nhà cung cấp',
      to: '/store-owner/purchase-orders/create-matrix',
      primary: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      label: 'Kiểm Kê Kho Định Kỳ',
      sub: 'Cân đối tồn kho thực tế và trên sổ',
      to: '/store-owner/products',
      primary: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      label: 'Sổ Quỹ & Thu Nợ Khách',
      sub: 'Theo dõi tiền mặt, bank và sổ ghi nợ',
      to: '/store-owner/expenses?view=cashbook',
      primary: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
  ];

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
          Phím tắt Thao tác Nhanh
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginTop: 4 }}>
          Các chức năng thường dùng nhất trong ca làm việc
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actions.map((act) => (
          <button
            key={act.label}
            type="button"
            onClick={() => navigate(act.to)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              borderRadius: 16,
              backgroundColor: act.primary ? 'var(--blue-light, #F0F6FF)' : '#FAFAFA',
              border: act.primary ? '1px solid var(--blue-border, #DBE9FE)' : '1px solid #F1F5F9',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = act.primary ? '#E1EFFF' : '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = act.primary ? 'var(--blue-light, #F0F6FF)' : '#FAFAFA';
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-pill, 9999px)',
                backgroundColor: act.primary ? 'var(--blue-primary, #0066FF)' : '#E2E8F0',
                color: act.primary ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {act.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: act.primary ? 'var(--blue-primary, #0066FF)' : 'var(--text-main, #0F172A)',
                }}
              >
                {act.label}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2 }}>{act.sub}</div>
            </div>

            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
};
