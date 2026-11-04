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
              Cảnh báo Tồn tối thiểu
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill, 9999px)',
                backgroundColor: '#FFF8EB',
                color: '#D97706',
                border: '1px solid #FFE8CC',
                whiteSpace: 'nowrap',
              }}
            >
              4 mặt hàng
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', marginTop: 3, lineHeight: 1.4 }}>
            Cần lên đơn nhập hàng để tránh đứt gãy nguồn cung
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/store-owner/purchase-orders/branches')}
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
          Tạo đơn nhập →
        </button>
      </div>

      {/* Danh sách mặt hàng cảnh báo chạm mức tồn */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lowStockList.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px 14px',
              borderRadius: 14,
              backgroundColor: '#FAFAFA',
              border: '1px solid #F1F5F9',
              transition: 'border-color 0.15s ease',
            }}
          >
            {/* Hàng 1: Tên sản phẩm + Badge tồn kho */}
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

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: '#FFF0F0',
                  border: '1px solid #FFD6D6',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>Còn {item.currentStock} {item.unit}</span>
              </div>
            </div>

            {/* Hàng 2: Nhà cung cấp & Định mức + Nút Nhập Hàng */}
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
                <span style={{ color: '#475569', fontWeight: 600 }}>
                  Định mức: {item.minStockThreshold} {item.unit}
                </span>
                <span>•</span>
                <span
                  style={{
                    color: '#64748B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={item.supplierName}
                >
                  {item.supplierName}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/store-owner/purchase-orders/create-matrix')}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--blue-primary, #0066FF)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: '1px solid #DBEAFE',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0, 102, 255, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--blue-primary, #0066FF)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
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
