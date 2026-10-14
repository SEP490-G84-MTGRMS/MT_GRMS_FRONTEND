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
          Còn {days} ngày
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 'var(--radius-pill, 9999px)',
          backgroundColor: '#FFF8EB',
          color: '#FF9500',
          border: '1px solid #FFE8CC',
          whiteSpace: 'nowrap',
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
        padding: '24px 26px',
        border: '1px solid var(--border-light, #EDF2F9)',
        boxShadow: '0 4px 14px rgba(0, 30, 90, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: 'var(--text-main, #0F172A)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Cảnh báo Cận hạn FEFO
            </h2>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill, 9999px)',
                backgroundColor: '#FFF0F0',
                color: '#FF3B30',
              }}
            >
              2 lô khẩn cấp
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginTop: 4 }}>
            Ưu tiên xuất bán trước theo nguyên tắc lô nhập trước hết hạn trước
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/store-owner/products')}
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--blue-primary, #0066FF)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 'var(--radius-pill, 9999px)',
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
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: item.riskLevel === 'critical' ? '#FFFDFD' : '#FAFAFA',
              border: item.riskLevel === 'critical' ? '1px solid #FFE4E4' : '1px solid #F1F5F9',
            }}
          >
            {/* Cột Tên & Lô */}
            <div style={{ flex: 1, minWidth: 0 }}>
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
                {item.productName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748B',
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
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
                <span>Hạn: {item.expiryDate}</span>
              </div>
            </div>

            {/* Cột Số lượng & Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#0F172A',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.stockQty}{' '}
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                    {item.unit}
                  </span>
                </div>
              </div>

              {getRiskBadge(item.riskLevel, item.daysRemaining)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
