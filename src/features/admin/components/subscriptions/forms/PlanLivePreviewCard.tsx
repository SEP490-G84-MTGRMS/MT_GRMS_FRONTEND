import React from 'react';
import type { PlanStatus, PlanQuotaConfig, PlanFeatureConfig } from '../../../types/plan.types';

interface PlanLivePreviewCardProps {
  code: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  status: PlanStatus;
  description: string;
  quotas: PlanQuotaConfig;
  features: PlanFeatureConfig;
}

export const PlanLivePreviewCard: React.FC<PlanLivePreviewCardProps> = ({
  code,
  name,
  monthlyPrice,
  yearlyPrice,
  status,
  description,
  quotas,
  features,
}) => {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');

  const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  const cycleLabel = billingCycle === 'monthly' ? '/tháng' : '/năm';
  const discountPercent = monthlyPrice > 0 && yearlyPrice > 0
    ? Math.max(0, Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100))
    : 0;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid var(--border-light, #e2e8f0)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 4px 16px rgba(0, 30, 90, 0.06)',
        position: 'sticky',
        top: '20px',
      }}
    >
      {/* Header bar of preview */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
            👁️ Bản Xem Trước Bảng Giá
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#eff6ff',
              color: 'var(--blue-primary, #0066ff)',
            }}
          >
            LIVE PREVIEW
          </span>
        </div>

        {/* Toggle monthly / yearly */}
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '3px 10px',
              borderRadius: '9999px',
              border: 'none',
              background: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
              color: billingCycle === 'monthly' ? 'var(--blue-primary, #0066ff)' : '#64748b',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '3px 10px',
              borderRadius: '9999px',
              border: 'none',
              background: billingCycle === 'yearly' ? '#ffffff' : 'transparent',
              color: billingCycle === 'yearly' ? 'var(--blue-primary, #0066ff)' : '#64748b',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: billingCycle === 'yearly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Năm {discountPercent > 0 && `(-${discountPercent}%)`}
          </button>
        </div>
      </div>

      {/* Plan Card Preview Box */}
      <div
        style={{
          border: '1.5px solid var(--blue-border, #dbe9fe)',
          borderRadius: '14px',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontWeight: 700,
              background: '#f1f5f9',
              color: '#475569',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            {code || 'PLAN_CODE'}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: status === 'Active' ? '#16a34a' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: status === 'Active' ? '#16a34a' : '#94a3b8',
              }}
            />
            {status === 'Active' ? 'Đang mở bán' : 'Tạm ẩn'}
          </span>
        </div>

        <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          {name || 'Tên gói dịch vụ chưa đặt'}
        </h4>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b', lineHeight: 1.4, minHeight: '34px' }}>
          {description || 'Chưa có mô tả cho gói cước này...'}
        </p>

        {/* Pricing tag */}
        <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span
              style={{
                fontSize: '26px',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 800,
                color: 'var(--blue-primary, #0066ff)',
              }}
            >
              {displayPrice.toLocaleString('vi-VN')}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>đ {cycleLabel}</span>
          </div>
          {billingCycle === 'yearly' && discountPercent > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#16a34a', fontWeight: 600 }}>
              🎉 Tiết kiệm {discountPercent}% so với thanh toán từng tháng
            </p>
          )}
        </div>

        {/* Quotas Summary */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Hạn mức hệ thống đi kèm:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Chi nhánh tối đa</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}>
                {quotas.maxBranches === -1 ? 'Không giới hạn' : `${quotas.maxBranches} cửa hàng`}
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Tài khoản nhân viên</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}>
                {quotas.maxEmployees === -1 ? 'Không giới hạn' : `${quotas.maxEmployees} nhân sự`}
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Lưu trữ Cloud</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}>
                {quotas.maxStorageGb} GB
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Sao lưu dự phòng</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '11.5px' }}>
                {quotas.backupFrequency === 'Daily' ? 'Hàng ngày' : quotas.backupFrequency === 'Hourly' ? 'Mỗi giờ' : 'Hàng tuần'}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Check List */}
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Quyền lợi tính năng mở khóa:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { key: 'barcodeScanning', label: 'Bán hàng quầy thu ngân & Barcode' },
              { key: 'fefoExpiryAlert', label: 'Cảnh báo cận hạn FEFO 3 mức màu' },
              { key: 'multiUnitConversion', label: 'Quy đổi đa đơn vị (Thùng/Lon)' },
              { key: 'vietQrDynamic', label: 'VietQR động khớp tiền tự động' },
              { key: 'debtZaloBook', label: 'Sổ nợ & Nhắc nợ khách qua Zalo' },
              { key: 'financialReporting', label: 'Báo cáo doanh thu & Lãi lỗ P&L' },
            ].map((f) => {
              const active = Boolean(features[f.key as keyof PlanFeatureConfig]);
              return (
                <div
                  key={f.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: active ? '#0f172a' : '#94a3b8',
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: active ? '#dcfce7' : '#f1f5f9',
                      color: active ? '#16a34a' : '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {active ? '✓' : '✕'}
                  </span>
                  <span style={{ textDecoration: active ? 'none' : 'line-through' }}>
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mock button */}
        <div style={{ marginTop: '20px' }}>
          <button
            type="button"
            disabled
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '9999px',
              border: 'none',
              background: 'var(--blue-primary, #0066ff)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'default',
              opacity: 0.9,
            }}
          >
            Đăng ký dùng thử gói này (Mô phỏng)
          </button>
        </div>
      </div>
    </div>
  );
};
