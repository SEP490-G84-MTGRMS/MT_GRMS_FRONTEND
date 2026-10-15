import React from 'react';
import type { LowStockItem } from '../types/dashboard.types';
import { useNavigate } from 'react-router-dom';

export const LowStockWarningCard: React.FC = () => {
  const navigate = useNavigate();

  const lowStockList: LowStockItem[] = [
    {
      id: 'ls1',
      sku: 'DA-SIM-01',
      productName: 'Dầu ăn đậu nành Simply 1L',
      category: 'Gia vị & Dầu ăn',
      currentStock: 3,
      minStockThreshold: 12,
      unit: 'Chai',
      supplierName: 'Công ty TNHH Dầu Thực Vật Cái Lân',
    },
    {
      id: 'ls2',
      sku: 'DU-BH-1KG',
      productName: 'Đường tinh luyện Biên Hòa 1kg',
      category: 'Gia vị & Hạt nêm',
      currentStock: 4,
      minStockThreshold: 20,
      unit: 'Gói',
      supplierName: 'TTC Sugar Biên Hòa',
    },
    {
      id: 'ls3',
      sku: 'TR-BH-10Q',
      productName: 'Trứng gà tươi Ba Huân (Hộp 10 quả)',
      category: 'Thực phẩm tươi',
      currentStock: 2,
      minStockThreshold: 15,
      unit: 'Hộp',
      supplierName: 'Công ty CP Ba Huân',
    },
    {
      id: 'ls4',
      sku: 'NM-NN-900',
      productName: 'Nước mắm Nam Ngư Đệ Nhị 900ml',
      category: 'Nước mắm & Nước tương',
      currentStock: 5,
      minStockThreshold: 18,
      unit: 'Chai',
      supplierName: 'Masan Consumer',
    },
  ];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: '22px 24px',
        border: '1px solid var(--border-light, #EDF2F9)',
        boxShadow: '0 4px 14px rgba(0, 30, 90, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
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
              Cảnh báo Chạm mức Tồn tối thiểu
            </h2>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill, 9999px)',
                backgroundColor: '#FFF8EB',
                color: '#D97706',
              }}
            >
              4 mặt hàng
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginTop: 4 }}>
            Cần lên đơn nhập hàng với nhà cung cấp để tránh đứt gãy nguồn hàng
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/store-owner/purchase-orders/branches')}
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
          Tạo đơn nhập →
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lowStockList.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: '#FAFAFA',
              border: '1px solid #F1F5F9',
            }}
          >
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
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2 }}>
                NCC: <span style={{ color: '#475569' }}>{item.supplierName}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#FF3B30',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  Còn {item.currentStock}{' '}
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                    {item.unit}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Định mức: {item.minStockThreshold}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/store-owner/purchase-orders/create-matrix')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  backgroundColor: '#F0F6FF',
                  color: 'var(--blue-primary, #0066FF)',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid #DBEAFE',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--blue-primary, #0066FF)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0F6FF';
                  e.currentTarget.style.color = 'var(--blue-primary, #0066FF)';
                }}
              >
                Nhập hàng
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
