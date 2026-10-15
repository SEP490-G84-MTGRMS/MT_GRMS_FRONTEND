import React from 'react';
import type { FefoBatchItem } from '../types/dashboard.types';
import { useNavigate } from 'react-router-dom';

export const FefoWarningCard: React.FC = () => {
  const navigate = useNavigate();

  const fefoList: FefoBatchItem[] = [
    {
      id: 'f1',
      sku: 'BM-TOAST-01',
      productName: 'Bánh mì sandwich bơ sữa',
      category: 'Bánh tươi',
      batchCode: 'LOT-2610-01',
      expiryDate: '17/10/2026',
      daysRemaining: 3,
      stockQty: 24,
      unit: 'Gói',
      riskLevel: 'critical',
      discountSuggested: 25,
    },
    {
      id: 'f2',
      sku: 'SC-VNM-100',
      productName: 'Sữa chua có đường Vinamilk',
      category: 'Sữa & Chế phẩm',
      batchCode: 'LOT-2610-08',
      expiryDate: '20/10/2026',
      daysRemaining: 6,
      stockQty: 48,
      unit: 'Hộp',
      riskLevel: 'critical',
      discountSuggested: 15,
    },
    {
      id: 'f3',
      sku: 'XX-CP-500',
      productName: 'Xúc xích tiệt trùng CP Red',
      category: 'Thực phẩm khô',
      batchCode: 'LOT-2609-22',
      expiryDate: '25/10/2026',
      daysRemaining: 11,
      stockQty: 35,
      unit: 'Cây',
      riskLevel: 'warning',
      discountSuggested: 10,
    },
    {
      id: 'f4',
      sku: 'ND-BEN-330',
      productName: 'Nước dừa tươi đóng lon Cocoxim',
      category: 'Đồ uống',
      batchCode: 'LOT-2609-15',
      expiryDate: '28/10/2026',
      daysRemaining: 14,
      stockQty: 60,
      unit: 'Lon',
      riskLevel: 'warning',
    },
  ];

  const getRiskBadge = (level: 'critical' | 'warning' | 'safe', days: number) => {
    if (level === 'critical') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: '#FFF0F0',
            color: '#FF3B30',
            border: '1px solid #FFD6D6',
            whiteSpace: 'nowrap',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Còn {days} ngày
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '11.5px',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: 'var(--radius-pill, 9999px)',
          backgroundColor: '#FFF8EB',
          color: '#FF9500',
          border: '1px solid #FFE8CC',
          whiteSpace: 'nowrap',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        Còn {days} ngày
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: '20px 22px',
        border: '1px solid var(--border-light, #EDF2F9)',
        boxShadow: '0 4px 14px rgba(0, 30, 90, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--text-main, #0F172A)',
                margin: 0,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              Cảnh báo Cận hạn FEFO
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill, 9999px)',
                backgroundColor: '#FFF0F0',
                color: '#FF3B30',
                border: '1px solid #FFD6D6',
                whiteSpace: 'nowrap',
              }}
            >
              2 lô khẩn cấp
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', marginTop: 3, lineHeight: 1.4 }}>
            Ưu tiên xuất bán trước các lô cận ngày hết hạn
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/store-owner/products')}
          style={{
            fontSize: '12.5px',
            fontWeight: 700,
            color: 'var(--blue-primary, #0066FF)',
            backgroundColor: '#EFF6FF',
            border: '1px solid #DBEAFE',
            cursor: 'pointer',
            padding: '5px 12px',
            borderRadius: 'var(--radius-pill, 9999px)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0066FF';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#EFF6FF';
            e.currentTarget.style.color = '#0066FF';
          }}
        >
          Xem tất cả →
        </button>
      </div>

      {/* Danh sách các lô cận hạn */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fefoList.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: item.riskLevel === 'critical' ? '#FFFDFD' : '#FAFAFA',
              border: item.riskLevel === 'critical' ? '1px solid #FFE4E4' : '1px solid #F1F5F9',
              transition: 'border-color 0.15s ease',
            }}
          >
            {/* Hàng 1: Tên sản phẩm + Badge ngày còn lại */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--text-main, #0F172A)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0,
                }}
                title={item.productName}
              >
                {item.productName}
              </div>

              {getRiskBadge(item.riskLevel, item.daysRemaining)}
            </div>

            {/* Hàng 2: Mã lô & Hạn sử dụng + Số lượng tồn */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 2 }}>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#94A3B8',
                  }}
                >
                  {item.batchCode}
                </span>
                <span>•</span>
                <span>Hạn: <b style={{ color: item.riskLevel === 'critical' ? '#DC2626' : '#D97706' }}>{item.expiryDate}</b></span>
              </div>

              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Tồn: <span style={{ color: '#0066FF' }}>{item.stockQty}</span>{' '}
                <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#64748B' }}>
                  {item.unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
