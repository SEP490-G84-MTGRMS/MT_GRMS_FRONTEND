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
    title: 'Bán Hàng Quầy Thu Ngân (POS Barcode)',
    badge: 'Cốt lõi',
    description: 'Thao tác bán hàng siêu tốc bằng phím tắt, in hóa đơn nhiệt K80/K57, quét mã vạch Barcode',
  },
  {
    key: 'fefoExpiryAlert',
    title: 'Cảnh Báo Cận Hạn FEFO 3 Mức Màu',
    badge: 'Đặc quyền Tạp hóa',
    description: 'Theo dõi hạn sử dụng từng lô nhập, cảnh báo trực quan Xanh - Vàng - Đỏ tránh hủy hàng tồn',
  },
  {
    key: 'multiUnitConversion',
    title: 'Quy Đổi Đa Đơn Vị (Thùng / Lốc / Lon)',
    badge: 'Chuyên dụng',
    description: 'Bán lẻ lon lẻ lốc tự trừ kho thùng mẹ với tỷ lệ quy đổi linh hoạt, không lo sai lệch kho',
  },
  {
    key: 'vietQrDynamic',
    title: 'VietQR Động Khớp Tiền Tự Động',
    badge: 'Thanh toán số',
    description: 'Tạo mã QR ngân hàng chuẩn NAPAS kèm đúng số tiền và nội dung, thu ngân rảnh tay không sợ sót',
  },
  {
    key: 'debtZaloBook',
    title: 'Sổ Nợ & Nhắc Nợ Khách Qua Zalo',
    badge: 'Chăm sóc khách',
    description: 'Ghi sổ nợ gối đầu người quen, tạo link sao kê hóa đơn nợ gửi trực tiếp qua Zalo khách hàng',
  },
  {
    key: 'financialReporting',
    title: 'Báo Cáo Doanh Thu & Lãi Lỗ Thực (P&L)',
    badge: 'Quản trị chuyên sâu',
    description: 'Phân tích dòng tiền, chi phí giá vốn FIFO/Bình quân gia quyền, báo cáo lợi nhuận ròng trực quan',
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
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 30, 90, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--blue-light, #f0f6ff)',
              color: 'var(--blue-primary, #0066ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              3. Ma Trận Tính Năng & Phân Quyền Module
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Bật/tắt các phân hệ phần mềm mà người thuê (Tenant) được quyền truy cập
            </p>
          </div>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: activeCount === 6 ? '#dcfce7' : '#f1f5f9',
            color: activeCount === 6 ? '#16a34a' : '#475569',
          }}
        >
          {activeCount} / 6 phân hệ kích hoạt
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {FEATURE_LIST.map((feat) => {
          const isChecked = Boolean(features[feat.key]);
          return (
            <div
              key={feat.key}
              onClick={() => handleToggle(feat.key)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                border: `1.5px solid ${isChecked ? 'var(--blue-primary, #0066ff)' : '#e2e8f0'}`,
                background: isChecked ? '#f8faff' : '#ffffff',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}} // handled by parent onClick
                style={{
                  marginTop: '3px',
                  width: '18px',
                  height: '18px',
                  accentColor: 'var(--blue-primary, #0066ff)',
                  cursor: 'pointer',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: isChecked ? '#0f172a' : '#475569' }}>
                    {feat.title}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: isChecked ? 'var(--blue-light, #f0f6ff)' : '#f1f5f9',
                      color: isChecked ? 'var(--blue-primary, #0066ff)' : '#64748b',
                    }}
                  >
                    {feat.badge}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
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
