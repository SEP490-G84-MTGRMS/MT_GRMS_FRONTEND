import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlanStatus, PlanQuotaConfig, PlanFeatureConfig, SubscriptionPlan } from '../../features/admin/types/plan.types';
import {
  PlanBasicInfoForm,
  PlanQuotasForm,
  PlanFeaturesForm,
} from '../../features/admin/components/subscriptions/forms';
import {
  validatePlanCode,
  validatePlanPricing,
  validatePlanQuotas,
} from '../../features/admin/utils/planValidation';
import { mockPlans } from '../../features/admin/data/mockPlanData';

export const SubscriptionPlanCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState<number>(399000);
  const [yearlyPrice, setYearlyPrice] = useState<number>(3990000);
  const [status, setStatus] = useState<PlanStatus>('Active');
  const [description, setDescription] = useState('');

  const [quotas, setQuotas] = useState<PlanQuotaConfig>({
    maxBranches: 2,
    maxEmployees: 5,
    maxStorageGb: 10,
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

  const handleReset = () => {
    setCode('');
    setName('');
    setMonthlyPrice(399000);
    setYearlyPrice(3990000);
    setStatus('Active');
    setDescription('');
    setQuotas({
      maxBranches: 2,
      maxEmployees: 5,
      maxStorageGb: 10,
      backupFrequency: 'Daily',
    });
    setFeatures({
      barcodeScanning: true,
      fefoExpiryAlert: true,
      multiUnitConversion: true,
      vietQrDynamic: true,
      debtZaloBook: false,
      financialReporting: false,
    });
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Code
    const codeValidation = validatePlanCode(code, mockPlans.map((p) => p.code));
    // 2. Validate Pricing
    const pricingValidation = validatePlanPricing(monthlyPrice, yearlyPrice);
    // 3. Validate Quotas
    const quotasValidation = validatePlanQuotas(quotas);

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập tên thương mại cho gói dịch vụ';
    }
    if (!codeValidation.isValid) {
      newErrors.code = codeValidation.error || 'Mã gói không hợp lệ';
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

    const newPlan: SubscriptionPlan = {
      id: `plan-${Date.now().toString(36)}`,
      code,
      name,
      monthlyPrice,
      yearlyPrice,
      status,
      description,
      quotas,
      features,
      activeTenantCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Prepend to mock data store
    mockPlans.unshift(newPlan);

    setToastMessage(`Đã khởi tạo thành công gói cước "${name}"! Đang chuyển hướng...`);

    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/admin/subscriptions');
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Khởi Tạo Gói Dịch Vụ Mới
              </h1>
              <span
                style={{
                  background: '#dbeafe',
                  color: 'var(--blue-primary, #0066ff)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                FORM ĐĂNG KÝ
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748b' }}>
              Thiết lập thông số định giá, hạn mức tài nguyên và ma trận phân quyền module cho thuê bao MT-GRMS
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
              Làm lại form
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {isSubmitting ? 'Đang khởi tạo...' : '+ Lưu & Mở Bán Gói Dịch Vụ'}
            </button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <PlanBasicInfoForm
          code={code}
          name={name}
          monthlyPrice={monthlyPrice}
          yearlyPrice={yearlyPrice}
          status={status}
          description={description}
          errors={errors}
          onChange={(fields) => {
            if (fields.code !== undefined) setCode(fields.code);
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
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận & Mở Bán Gói Cước'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubscriptionPlanCreatePage;
