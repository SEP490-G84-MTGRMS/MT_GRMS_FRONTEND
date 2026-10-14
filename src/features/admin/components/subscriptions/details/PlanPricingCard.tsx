import React from 'react';
import type { SubscriptionPlan } from '../../../types/plan.types';
import { DollarSign, Info } from 'lucide-react';

interface PlanPricingCardProps {
  plan: SubscriptionPlan;
}

export const PlanPricingCard: React.FC<PlanPricingCardProps> = ({ plan }) => {
  const formatPrice = (v: number) => {
    return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
  };

  const discountPercent = plan.yearlyPrice > 0 && plan.monthlyPrice > 0
    ? Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)
    : 0;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(0, 30, 90, 0.04)',
        padding: '22px 24px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <DollarSign size={18} color="var(--blue-primary)" />
        <span>1. Thông tin Niêm yết & Biểu phí (Pricing & Billing)</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '14px 24px',
          fontSize: 13.5,
        }}
      >
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Mã gói dịch vụ:</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue-primary)', marginTop: 2 }}>
            {plan.code} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>(Bất biến)</span>
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)' }}>Trạng thái mở bán:</span>
          <div style={{ marginTop: 2 }}>
            <span
              className={plan.status === 'Active' ? 'admin-badge-success' : 'admin-badge-secondary'}
              style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}
            >
              {plan.status === 'Active' ? 'Active - Đang mở bán' : 'Inactive - Tạm ngừng bán'}
            </span>
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)' }}>Tên gói thương mại:</span>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
            {plan.name}
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)' }}>Khách hàng đang dùng:</span>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 2 }}>
            {plan.activeTenantCount} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>doanh nghiệp thuê</span>
          </div>
        </div>

        <div style={{ padding: 12, backgroundColor: 'var(--bg-soft-blue)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đơn giá theo tháng</span>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--blue-primary)', marginTop: 2 }}>
            {formatPrice(plan.monthlyPrice)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>/ tháng</span>
          </div>
        </div>

        <div style={{ padding: 12, backgroundColor: 'var(--bg-soft-blue)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đơn giá theo năm</span>
            {discountPercent > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                Tiết kiệm ~{discountPercent}%
              </span>
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0f766e', marginTop: 2 }}>
            {formatPrice(plan.yearlyPrice)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>/ năm</span>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <span style={{ color: 'var(--text-muted)' }}>Mô tả định vị gói cước:</span>
          <div style={{ color: 'var(--text-main)', marginTop: 4, lineHeight: 1.5 }}>
            {plan.description || 'Chưa cập nhật mô tả chi tiết cho gói cước này.'}
          </div>
        </div>
      </div>

      {/* CALLOUT: GRANDFATHERING */}
      <div
        style={{
          marginTop: 16,
          padding: '10px 14px',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          fontSize: 12.5,
          color: '#334155',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          lineHeight: 1.45,
        }}
      >
        <Info size={16} color="var(--blue-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <b>Chính sách bảo lưu giá (Grandfathering):</b> Việc điều chỉnh đơn giá niêm yết sẽ chỉ có hiệu lực với các hợp đồng đăng ký mới hoặc khi khách hàng gia hạn chu kỳ tiếp theo. Các hợp đồng đang còn thời hạn của {plan.activeTenantCount} tenant hiện tại sẽ giữ nguyên mức giá cũ.
        </div>
      </div>
    </div>
  );
};
