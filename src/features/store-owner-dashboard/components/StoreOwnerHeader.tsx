import React from 'react';
import type { TimeFilter } from '../types/dashboard.types';
import { useNavigate } from 'react-router-dom';

interface StoreOwnerHeaderProps {
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  branchName?: string;
  storeName?: string;
}

export const StoreOwnerHeader: React.FC<StoreOwnerHeaderProps> = ({
  timeFilter,
  onTimeFilterChange,
  branchName = 'Chi nhánh 1 (Quận 9)',
  storeName = 'Tạp Hóa Minh Đức',
}) => {
  const navigate = useNavigate();

  const filterOptions: { key: TimeFilter; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: 'week', label: '7 ngày qua' },
    { key: 'month', label: 'Tháng này' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '24px 28px',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        border: '1px solid var(--border-light, #EDF2F9)',
        boxShadow: '0 4px 16px rgba(0, 30, 90, 0.04)',
      }}
    >
      {/* Cột trái: Tên cửa hàng & trạng thái ca */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--text-main, #0F172A)',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Tổng quan Bán lẻ
          </h1>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 12px',
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: '#E8F9EE',
              color: '#008738',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid #BBF7D0',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#00C853',
              }}
            />
            Đang mở ca bán
          </span>
        </div>
        <div
          style={{
            fontSize: '13.5px',
            color: 'var(--text-muted, #64748B)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-main, #1E293B)' }}>
            {storeName}
          </span>
          <span>•</span>
          <span>{branchName}</span>
          <span>•</span>
          <span>Cập nhật theo thời gian thực</span>
        </div>
      </div>

      {/* Cột phải: Bộ lọc thời gian & Nút tắt */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        {/* Bộ lọc thời gian Pill Tabs */}
        <div
          style={{
            display: 'inline-flex',
            padding: '3px',
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
          }}
        >
          {filterOptions.map((opt) => {
            const isActive = timeFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onTimeFilterChange(opt.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : '#64748B',
                  backgroundColor: isActive ? 'var(--blue-primary, #0066FF)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Nút thao tác nhanh POS */}
        <button
          type="button"
          onClick={() => navigate('/store-owner/products')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: 'var(--blue-primary, #0066FF)',
            color: '#ffffff',
            fontSize: '13.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)',
            transition: 'background-color 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--blue-hover, #0052CC)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--blue-primary, #0066FF)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Mở Quầy POS
        </button>
      </div>
    </div>
  );
};
