import React from 'react';
import type { PlanFeatureConfig } from '../../../types/plan.types';

interface PlanFeaturesFormProps {
  features: PlanFeatureConfig;
  onChange: (features: PlanFeatureConfig) => void;
}

interface FeatureDef {
  key: keyof PlanFeatureConfig;
  title: string;
  badge: string;
  description: string;
}

const FEATURE_LIST: FeatureDef[] = [
  {
    key: 'barcodeScanning',
    title: 'POS Thu Ngân Barcode',
    badge: 'Cốt lõi',
    description: 'Thao tác bán hàng siêu tốc phím tắt, in bill K80/K57, quét mã vạch',
  },
  {
    key: 'fefoExpiryAlert',
    title: 'Cảnh Báo Cận Hạn FEFO',
    badge: 'Tạp hóa',
    description: 'Theo dõi HSD từng lô nhập, cảnh báo Xanh - Vàng - Đỏ tránh hỏng hàng',
  },
  {
    key: 'multiUnitConversion',
    title: 'Quy Đổi Đa Đơn Vị (Thùng/Lon)',
    badge: 'Chuyên dụng',
    description: 'Bán lon lẻ tự trừ kho thùng mẹ với tỷ lệ quy đổi tự động',
  },
  {
    key: 'vietQrDynamic',
    title: 'VietQR Động Khớp Tiền',
    badge: 'Thanh toán',
    description: 'Tạo mã QR NAPAS kèm số tiền và nội dung, thu ngân rảnh tay',
  },
  {
    key: 'debtZaloBook',
    title: 'Sổ Nợ & Nhắc Nợ Zalo',
    badge: 'Sổ nợ',
    description: 'Ghi nợ gối đầu, gửi link sao kê hóa đơn nợ trực tiếp qua Zalo',
  },
  {
    key: 'financialReporting',
    title: 'Báo Cáo Lãi Lỗ Thực (P&L)',
    badge: 'Quản trị',
    description: 'Phân tích dòng tiền, chi phí giá vốn FIFO, báo cáo lợi nhuận ròng',
  },
];

export const PlanFeaturesForm: React.FC<PlanFeaturesFormProps> = ({
  features,
  onChange,
}) => {
  const handleToggle = (key: keyof PlanFeatureConfig) => {
    onChange({
      ...features,
      [key]: !features[key],
    });
  };

  const activeCount = Object.values(features).filter(Boolean).length;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--border-light, #e2e8f0)',
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: '0 1px 4px rgba(0, 30, 90, 0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: 'var(--blue-light, #f0f6ff)',
              color: 'var(--blue-primary, #0066ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
              3. Ma Trận Tính Năng Module
            </h3>
          </div>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            background: activeCount === 6 ? '#dcfce7' : '#f1f5f9',
            color: activeCount === 6 ? '#16a34a' : '#475569',
          }}
        >
          {activeCount}/6 kích hoạt
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {FEATURE_LIST.map((feat) => {
          const isChecked = Boolean(features[feat.key]);
          return (
            <div
              key={feat.key}
              onClick={() => handleToggle(feat.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${isChecked ? 'var(--blue-primary, #0066ff)' : '#e2e8f0'}`,
                background: isChecked ? '#f8faff' : '#ffffff',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--blue-primary, #0066ff)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  margin: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: isChecked ? '#0f172a' : '#475569' }}>
                    {feat.title}
                  </span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      background: isChecked ? 'var(--blue-light, #f0f6ff)' : '#f1f5f9',
                      color: isChecked ? 'var(--blue-primary, #0066ff)' : '#64748b',
                      flexShrink: 0,
                    }}
                  >
                    {feat.badge}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {feat.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
