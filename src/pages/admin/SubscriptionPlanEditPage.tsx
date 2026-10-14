import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PlanStatus, PlanQuotaConfig, PlanFeatureConfig, SubscriptionPlan } from '../../features/admin/types/plan.types';
import {
  PlanBasicInfoForm,
  PlanQuotasForm,
  PlanFeaturesForm,
  PlanDangerZone,
} from '../../features/admin/components/subscriptions/forms';
import {
  validatePlanPricing,
  validatePlanQuotas,
} from '../../features/admin/utils/planValidation';
import { mockPlans } from '../../features/admin/data/mockPlanData';

export const SubscriptionPlanEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [yearlyPrice, setYearlyPrice] = useState<number>(0);
  const [status, setStatus] = useState<PlanStatus>('Active');
  const [description, setDescription] = useState('');
  const [quotas, setQuotas] = useState<PlanQuotaConfig>({
    maxBranches: 1,
    maxEmployees: 3,
    maxStorageGb: 5,
    backupFrequency: 'Daily',
  });
  const [features, setFeatures] = useState<PlanFeatureConfig>({
    barcodeScanning: true,
    fefoExpiryAlert: true,
    multiUnitConversion: true,
    vietQrDynamic: true,
    debtZaloBook: false,
    financialReporting: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load existing plan data
  useEffect(() => {
    const found = mockPlans.find((p) => p.id === id || p.code === id);
    if (found) {
      setCurrentPlan(found);
      setName(found.name);
      setMonthlyPrice(found.monthlyPrice);
      setYearlyPrice(found.yearlyPrice);
      setStatus(found.status);
      setDescription(found.description || '');
      setQuotas(found.quotas);
      setFeatures(found.features);
    }
  }, [id]);

  if (!currentPlan) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          background: 'var(--bg-soft-blue, #f7faff)',
          padding: '40px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '480px', margin: '40px auto', background: '#fff', padding: '32px', borderRadius: '16px' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 12px' }}>Không tìm thấy gói dịch vụ</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Gói dịch vụ với định danh <code>{id}</code> không tồn tại hoặc đã bị xóa khỏi hệ thống.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/subscriptions')}
            style={{
              padding: '10px 24px',
              borderRadius: '9999px',
              border: 'none',
              background: 'var(--blue-primary, #0066ff)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Quay lại danh sách gói
          </button>
        </div>
      </div>
    );
  }

  const handleReset = () => {
    setName(currentPlan.name);
    setMonthlyPrice(currentPlan.monthlyPrice);
    setYearlyPrice(currentPlan.yearlyPrice);
    setStatus(currentPlan.status);
    setDescription(currentPlan.description || '');
    setQuotas(currentPlan.quotas);
    setFeatures(currentPlan.features);
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Pricing
    const pricingValidation = validatePlanPricing(monthlyPrice, yearlyPrice);
    // Validate Quotas
    const quotasValidation = validatePlanQuotas(quotas);

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập tên thương mại cho gói dịch vụ';
    }
    if (!pricingValidation.isValid) {
      if (pricingValidation.error?.includes('tháng')) {
        newErrors.monthlyPrice = pricingValidation.error;
      } else {
        newErrors.yearlyPrice = pricingValidation.error || 'Giá cước không hợp lệ';
      }
    }
    if (!quotasValidation.isValid) {
      if (quotasValidation.error?.includes('chi nhánh')) newErrors.maxBranches = quotasValidation.error;
      else if (quotasValidation.error?.includes('nhân viên')) newErrors.maxEmployees = quotasValidation.error;
      else newErrors.maxStorageGb = quotasValidation.error || 'Hạn mức không hợp lệ';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // Update in mock store
    const idx = mockPlans.findIndex((p) => p.id === currentPlan.id);
    if (idx !== -1) {
      mockPlans[idx] = {
        ...currentPlan,
        name,
        monthlyPrice,
        yearlyPrice,
        status,
        description,
        quotas,
        features,
        updatedAt: new Date().toISOString(),
      };
    }

    setToastMessage(`Đã cập nhật thành công gói cước "${name}"!`);

    setTimeout(() => {
      setIsSubmitting(false);
      navigate(`/admin/subscriptions/${currentPlan.id}`);
    }, 1000);
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--bg-soft-blue, #f7faff)',
        padding: '24px 32px 64px',
        boxSizing: 'border-box',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: '#16a34a',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '9999px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => navigate('/admin/subscriptions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--blue-primary, #0066ff)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '12px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Quay lại danh mục Gói dịch vụ
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Chỉnh Sửa Gói Dịch Vụ: {currentPlan.name}
              </h1>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontFamily: "'JetBrains Mono', Consolas, monospace",
                  fontWeight: 700,
                }}
              >
                {currentPlan.code}
              </span>
              <span
                style={{
                  background: currentPlan.activeTenantCount > 0 ? '#dbeafe' : '#f1f5f9',
                  color: currentPlan.activeTenantCount > 0 ? 'var(--blue-primary, #0066ff)' : '#64748b',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Đang có: {currentPlan.activeTenantCount} cửa hàng sử dụng
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748b' }}>
              Cập nhật giá bán, mở rộng quota tài nguyên và phân bổ tính năng áp dụng cho thuê bao
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '10px 20px',
                borderRadius: '9999px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Khôi phục ban đầu
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '10px 24px',
                borderRadius: '9999px',
                border: 'none',
                background: 'var(--blue-primary, #0066ff)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 102, 255, 0.25)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {isSubmitting ? 'Đang lưu...' : '💾 Lưu Cập Nhật Gói'}
            </button>
          </div>
        </div>
      </div>

      {/* Grandfathering Protection Banner */}
      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div
          style={{
            color: 'var(--blue-primary, #0066ff)',
            marginTop: '2px',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
          <strong>Chính sách bảo toàn giá cước (Grandfathering Protection):</strong> Việc điều chỉnh giá niêm yết
          tháng/năm sẽ áp dụng ngay cho các lượt đăng ký mới hoặc khi khách hàng hiện hữu hết hạn chu kỳ hợp đồng và tái ký.
          Các cửa hàng đang hoạt động trong chu kỳ thanh toán hiện tại được bảo lưu nguyên giá đã cam kết ban đầu.
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <PlanBasicInfoForm
          isEdit={true}
          code={currentPlan.code}
          name={name}
          monthlyPrice={monthlyPrice}
          yearlyPrice={yearlyPrice}
          status={status}
          description={description}
          errors={errors}
          onChange={(fields) => {
            if (fields.name !== undefined) setName(fields.name);
            if (fields.monthlyPrice !== undefined) setMonthlyPrice(fields.monthlyPrice);
            if (fields.yearlyPrice !== undefined) setYearlyPrice(fields.yearlyPrice);
            if (fields.status !== undefined) setStatus(fields.status);
            if (fields.description !== undefined) setDescription(fields.description);
          }}
        />

        <PlanQuotasForm
          quotas={quotas}
          errors={errors}
          onChange={(newQuotas) => setQuotas((prev) => ({ ...prev, ...newQuotas }))}
        />

        <PlanFeaturesForm
          features={features}
          onChange={(newFeatures) => setFeatures(newFeatures)}
        />

        {/* Danger Zone: Rule GB-02 */}
        <PlanDangerZone
          plan={currentPlan}
          onDeleted={() => {
            navigate('/admin/subscriptions');
          }}
        />

        {/* Bottom Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '14px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/admin/subscriptions')}
            style={{
              padding: '12px 24px',
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hủy bỏ & Quay lại
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '12px 28px',
              borderRadius: '9999px',
              border: 'none',
              background: 'var(--blue-primary, #0066ff)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0, 102, 255, 0.25)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi Gói Cước'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubscriptionPlanEditPage;
