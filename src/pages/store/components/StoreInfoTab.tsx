import { useEffect, useState, type FC, type FormEvent } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import type { StoreInfo } from '../storeData';

interface StoreInfoTabProps {
  storeInfo: StoreInfo;
  onUpdateStoreInfo: (updated: Partial<StoreInfo>) => Promise<boolean>;
}

export const StoreInfoTab: FC<StoreInfoTabProps> = ({ storeInfo, onUpdateStoreInfo }) => {
  const [formData, setFormData] = useState({ name: storeInfo.name, hotline: storeInfo.hotline, taxCode: storeInfo.taxCode, city: storeInfo.city, address: storeInfo.address });
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setFormData({ name: storeInfo.name, hotline: storeInfo.hotline, taxCode: storeInfo.taxCode, city: storeInfo.city, address: storeInfo.address });
    setFieldErrors({});
  }, [storeInfo]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const hasChanges = (Object.keys(formData) as (keyof typeof formData)[]).some((key) => formData[key] !== storeInfo[key]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const errors: typeof fieldErrors = {};
    for (const { key, label, maxLength } of fields) {
      if (maxLength !== undefined && formData[key].trim().length > maxLength) {
        errors[key] = `${label} tối đa ${maxLength} ký tự.`;
      }
    }
    if (!formData.name.trim()) {
      errors.name = 'Vui lòng nhập tên cửa hàng.';
    }
    if (formData.hotline.trim() && !/^\+?[0-9]{9,12}$/.test(formData.hotline.trim())) {
      errors.hotline = 'Số điện thoại phải có 9–12 chữ số, có thể bắt đầu bằng +.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setIsSaving(true);
    try {
      const success = await onUpdateStoreInfo(formData);
      showToast(success ? 'Cập nhật thông tin cửa hàng thành công!' : 'Không thể lưu thông tin. Vui lòng thử lại!', success ? 'success' : 'error');
    } catch {
      showToast('Đã xảy ra lỗi khi kết nối máy chủ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const fields: { key: keyof typeof formData; label: string; type?: string; placeholder?: string; maxLength?: number }[] = [
    { key: 'name', label: 'Tên cửa hàng', maxLength: 150, placeholder: 'VD: Demo - Tạp hóa Việt một cửa hàng' },
    { key: 'hotline', label: 'Số điện thoại liên hệ', type: 'tel', placeholder: 'VD: 0910000003' },
    { key: 'taxCode', label: 'Mã số thuế', maxLength: 50, placeholder: 'Nhập mã số thuế doanh nghiệp / hộ kinh doanh' },
    { key: 'city', label: 'Tỉnh / Thành phố', maxLength: 100, placeholder: 'VD: Hà Nội, TP. Hồ Chí Minh...' },
    { key: 'address', label: 'Địa chỉ', maxLength: 255, placeholder: 'VD: Số 123 Đường Nguyễn Hoàng, Nam Từ Liêm' },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {toastMessage && (
        <div role="status" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, background: toastMessage.type === 'success' ? '#0F172A' : '#7F1D1D', color: '#fff', padding: '12px 20px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toastMessage.text}
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>Thông tin gian hàng</h2>
        <div style={{ marginTop: 6, fontSize: 13, color: '#64748B' }}>
          Mã gian hàng: <strong style={{ fontFamily: 'var(--font-mono)', color: '#0F172A' }}>{storeInfo.code || storeInfo.tenantId}</strong>
        </div>
      </div>

      <form className="profile-card" onSubmit={handleSave} noValidate>
        <div className="profile-card-header">
          <div className="profile-card-title">Thông tin cửa hàng</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields.map(({ key, label, type, placeholder }) => (
            <div
              key={key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#334155',
              }}
            >
              <label htmlFor={`store-info-${key}`}>{label}{key === 'name' && ' *'}</label>
              <input
                id={`store-info-${key}`}
                type={type || 'text'}
                required={key === 'name'}
                aria-invalid={Boolean(fieldErrors[key])}
                aria-describedby={fieldErrors[key] ? `store-info-${key}-error` : undefined}
                value={formData[key]}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormData((current) => ({ ...current, [key]: value }));
                  if (fieldErrors[key]) {
                    setFieldErrors((current) => ({ ...current, [key]: undefined }));
                  }
                }}
                placeholder={placeholder}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  border: `1px solid ${fieldErrors[key] ? '#DC2626' : '#CBD5E1'}`,
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 14,
                  fontWeight: 400,
                }}
              />
              {fieldErrors[key] && (
                <span id={`store-info-${key}-error`} role="alert" style={{ color: '#DC2626', fontWeight: 500 }}>
                  {fieldErrors[key]}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            type="submit"
            disabled={!hasChanges || isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--blue-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              opacity: !hasChanges || isSaving ? 0.6 : 1,
              cursor: !hasChanges || isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
              transition: 'all 0.15s ease',
            }}
          >
            <Save size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};
