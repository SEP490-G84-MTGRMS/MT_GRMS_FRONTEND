import React from 'react';
import { useNavigate } from 'react-router-dom';

export const StoreQuickActionsCard: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'pos',
      label: 'Mở Quầy Thu Ngân POS',
      sub: 'Bán lẻ & quét VietQR',
      to: '/store-owner/products',
      primary: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      id: 'matrix-po',
      label: 'Đơn Nhập Ma Trận',
      sub: 'Lên đơn nhiều NCC',
      to: '/store-owner/purchase-orders/create-matrix',
      primary: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      id: 'inventory-check',
      label: 'Kiểm Kê Kho Định Kỳ',
      sub: 'Cân đối tồn thực tế',
      to: '/store-owner/products',
      primary: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      id: 'cashbook-debt',
      label: 'Sổ Quỹ & Nợ Khách',
      sub: 'Theo dõi tiền & nợ sổ',
      to: '/store-owner/expenses?view=cashbook',
      primary: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        borderRadius: 20,
        padding: '14px 20px',
        border: '1px solid var(--border-light, #EDF2F9)',
        boxShadow: '0 3px 12px rgba(0, 30, 90, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingRight: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--blue-primary, #0066FF)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main, #0F172A)' }}>
            Thao tác nhanh
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>Phím tắt chức năng quầy</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          flex: 1,
        }}
      >
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={() => navigate(act.to)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 14px',
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: act.primary ? 'var(--blue-primary, #0066FF)' : '#F8FAFC',
              color: act.primary ? '#ffffff' : 'var(--text-main, #0F172A)',
              border: act.primary ? 'none' : '1px solid #E2E8F0',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: act.primary ? '0 4px 12px rgba(0, 102, 255, 0.22)' : 'none',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (act.primary) {
                e.currentTarget.style.backgroundColor = 'var(--blue-hover, #0052CC)';
              } else {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.borderColor = 'var(--blue-border, #DBE9FE)';
              }
            }}
            onMouseLeave={(e) => {
              if (act.primary) {
                e.currentTarget.style.backgroundColor = 'var(--blue-primary, #0066FF)';
              } else {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: act.primary ? 'rgba(255,255,255,0.2)' : '#E2E8F0',
                color: act.primary ? '#ffffff' : '#334155',
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
                  fontSize: '12.5px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {act.label}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  color: act.primary ? 'rgba(255,255,255,0.85)' : '#64748B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {act.sub}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

