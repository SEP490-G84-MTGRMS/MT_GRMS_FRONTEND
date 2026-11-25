import './adminPlans.css';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlanStatus, PlanQuotaConfig, PlanFeatureConfig } from '../../features/admin/types/plan.types';
import { AdminToast, type ToastState } from '../../features/admin/components';
import {
  PlanBasicInfoForm,
  PlanQuotasForm,
  PlanFeaturesForm,
  PlanLivePreviewCard,
} from '../../features/admin/components/subscriptions/forms';
import {
  validatePlanCode,
  validatePlanPricing,
  validatePlanQuotas,
} from '../../features/admin/utils/planValidation';
import { planApi } from '../../features/admin/api';

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
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const codeValidation = validatePlanCode(code);
    const pricingValidation = validatePlanPricing(monthlyPrice, yearlyPrice);
    const quotasValidation = validatePlanQuotas(quotas);

    const newErrors: Record<string, string> = {};
    if (name.trim().length < 2 || name.trim().length > 100) newErrors.name = 'Tên gói phải có từ 2 đến 100 ký tự';
    if (!codeValidation.isValid) newErrors.code = codeValidation.error || 'Mã không hợp lệ';
    if (!pricingValidation.isValid) {
      if (pricingValidation.error?.includes('tháng')) newErrors.monthlyPrice = pricingValidation.error;
      else newErrors.yearlyPrice = pricingValidation.error || 'Giá không hợp lệ';
    }
    if (!quotasValidation.isValid) {
      if (quotasValidation.error?.includes('chi nhánh')) newErrors.maxBranches = quotasValidation.error;
      else if (quotasValidation.error?.includes('nhân viên')) newErrors.maxEmployees = quotasValidation.error;
      else newErrors.maxStorageGb = quotasValidation.error || 'Quota không hợp lệ';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await planApi.create({
        isActive: status === 'Active',
        code,
        name: name.trim(),
        monthlyPrice,
        yearlyPrice,
        description,
        quotas,
        features,
      });

      if (res.success && res.data) {
        showToast(`Đã khởi tạo thành công gói cước "${name}"!`, 'success');
        setTimeout(() => {
          setIsSubmitting(false);
          navigate('/admin/subscriptions');
        }, 800);
      } else {
        setIsSubmitting(false);
        showToast(res.message || 'Không thể khởi tạo gói cước', 'error');
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || 'Lỗi khi kết nối với máy chủ Backend', 'error');
    }
  };

  return (
    <div className="admin-plans admin-plans-form"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--bg-soft-blue, #f7faff)',
        padding: '16px 28px 48px',
        boxSizing: 'border-box',
      }}
    >
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Header compact */}
      <div className="plans-page-heading" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/subscriptions')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '9999px',
                color: 'var(--blue-primary, #0066ff)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '5px 12px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Quay lại danh mục
            </button>

            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Khởi Tạo Gói Dịch Vụ Mới
            </h1>
            <span
              style={{
                background: '#dbeafe',
                color: 'var(--blue-primary, #0066ff)',
                padding: '2px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              FORM ĐĂNG KÝ
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '7px 16px',
                borderRadius: '9999px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Làm lại form
            </button>
            <button
              type="submit"
              form="plan-create-form"
              disabled={isSubmitting}
              style={{
                padding: '7px 20px',
                borderRadius: '9999px',
                border: 'none',
                background: 'var(--blue-primary, #0066ff)',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0, 102, 255, 0.2)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {isSubmitting ? 'Đang lưu...' : '+ Lưu & Mở Bán Gói'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Form Controls (60%) vs Right Live Preview Card (40%) */}
      <form id="plan-create-form" className="plans-editor" onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(520px, 1.4fr) minmax(360px, 0.95fr)',
            gap: '18px',
            alignItems: 'start',
          }}
        >
          {/* CỘT TRÁI: Form Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <PlanBasicInfoForm
              code={code}
              name={name}
              monthlyPrice={monthlyPrice}
              yearlyPrice={yearlyPrice}
              status={status}
              description={description}
              errors={errors}
              onChange={(fields) => {
                if (fields.code !== undefined) setCode(fields.code.toUpperCase());
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
          </div>

          {/* CỘT PHẢI: Live Preview Bảng Giá Khách Hàng */}
          <div>
            <PlanLivePreviewCard
              code={code}
              name={name}
              monthlyPrice={monthlyPrice}
              yearlyPrice={yearlyPrice}
              status={status}
              description={description}
              quotas={quotas}
              features={features}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubscriptionPlanCreatePage;
