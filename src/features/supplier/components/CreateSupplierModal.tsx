import { useState, useEffect } from 'react';
import type { CSSProperties, FC, FormEvent } from 'react';
import { X, Plus, Loader2, AlertCircle } from 'lucide-react';
import type { CreateSupplierInput, SupplierStatus } from '../types/supplier.types';
import { StatusToggle } from './StatusToggle';
import '../supplier.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSupplierInput) => Promise<void>;
}

const LABEL_WIDTH = 168;

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  width: LABEL_WIDTH,
  minWidth: LABEL_WIDTH,
  paddingTop: 10,
  lineHeight: 1.3,
  flexShrink: 0,
};

const fieldColStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const inputStyle: CSSProperties = {
  width: '100%',
  height: 38,
  fontSize: 13.5,
  boxSizing: 'border-box',
};

const errorStyle: CSSProperties = {
  fontSize: 12,
  color: '#dc2626',
  display: 'block',
};

export const CreateSupplierModal: FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<SupplierStatus>('Active');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setContactPerson('');
      setEmail('');
      setTaxCode('');
      setAddress('');
      setNote('');
      setStatus('Active');
      setFieldErrors({});
      setApiError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Vui lòng nhập tên nhà cung cấp.';
    } else if (trimmedName.length > 200) {
      errors.name = 'Tên nhà cung cấp không được vượt quá 200 ký tự.';
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errors.phone = 'Vui lòng nhập số điện thoại.';
    } else {
      // Validate phone: must contain 8-15 digits, only numbers, optional leading '+', spaces or hyphens
      const cleanDigits = trimmedPhone.replace(/[\s\-()]/g, '');
      const phoneRegex = /^\+?[0-9]{8,15}$/;
      if (!phoneRegex.test(cleanDigits)) {
        errors.phone = 'Số điện thoại không hợp lệ (chỉ chứa 8 - 15 chữ số, không chứa chữ cái).';
      }
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Địa chỉ email không đúng định dạng.';
      } else if (trimmedEmail.length > 150) {
        errors.email = 'Email không được vượt quá 150 ký tự.';
      }
    }

    const cleanTax = taxCode.trim();
    if (cleanTax) {
      const cleanDigits = cleanTax.replace(/[\s-]/g, '');
      if (!/^\d{10}$|^\d{13}$/.test(cleanDigits)) {
        errors.taxCode = 'Mã số thuế phải đúng định dạng 10 hoặc 13 chữ số (VD: 0312345678 hoặc 0312345678-001).';
      }
    }

    if (contactPerson.trim().length > 100) {
      errors.contactPerson = 'Tên người liên hệ tối đa 100 ký tự.';
    }

    if (address.trim().length > 300) {
      errors.address = 'Địa chỉ tối đa 300 ký tự.';
    }

    if (note.trim().length > 500) {
      errors.note = 'Ghi chú tối đa 500 ký tự.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setApiError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        contactPerson: contactPerson.trim() || name.trim(),
        email: email.trim() || undefined,
        taxCode: taxCode.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
        status,
        supplierType: 'Goods',
        paymentTermDays: 30,
        creditLimit: 0,
      });
      onClose();
    } catch (err: any) {
      setApiError(err.message || 'Không thể tạo nhà cung cấp. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-box"
        style={{
          maxWidth: 640,
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background: '#f8fafc',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                border: '1px solid #ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Thêm Mới Nhà Cung Cấp
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="modal-close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#64748b',
              padding: 4,
              borderRadius: 6,
            }}
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div
            className="modal-body"
            style={{
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* API Error Banner */}
            {apiError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  color: '#b91c1c',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{apiError}</span>
              </div>
            )}

            {/* Label + input cùng hàng */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
              <label style={labelStyle}>
                Tên Nhà Cung Cấp <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={fieldColStyle}>
                <input
                  type="text"
                  placeholder="VD: Nông Sản Sạch Ba Miền"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={`form-input ${fieldErrors.name ? 'form-input--error' : ''}`}
                  style={{
                    ...inputStyle,
                    borderColor: fieldErrors.name ? '#dc2626' : undefined,
                  }}
                  autoFocus
                />
                {fieldErrors.name && <span style={errorStyle}>{fieldErrors.name}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
              <label style={labelStyle}>
                Số Điện Thoại <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={fieldColStyle}>
                <input
                  type="tel"
                  placeholder="VD: 0912345678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className={`form-input ${fieldErrors.phone ? 'form-input--error' : ''}`}
                  style={{
                    ...inputStyle,
                    fontFamily: 'var(--font-mono, monospace)',
                    borderColor: fieldErrors.phone ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.phone && <span style={errorStyle}>{fieldErrors.phone}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
              <label style={labelStyle}>Người Liên Hệ</label>
              <div style={fieldColStyle}>
                <input
                  type="text"
                  placeholder="VD: Anh Nam (Phòng Kinh Doanh)"
                  value={contactPerson}
                  onChange={(e) => {
                    setContactPerson(e.target.value);
                    if (fieldErrors.contactPerson) setFieldErrors((prev) => ({ ...prev, contactPerson: '' }));
                  }}
                  className="form-input"
                  style={inputStyle}
                />
                {fieldErrors.contactPerson && (
                  <span style={errorStyle}>{fieldErrors.contactPerson}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
              <label style={labelStyle}>Email Liên Hệ</label>
              <div style={fieldColStyle}>
                <input
                  type="email"
                  placeholder="VD: contact@nongsanbamien.vn"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  className={`form-input ${fieldErrors.email ? 'form-input--error' : ''}`}
                  style={{
                    ...inputStyle,
                    fontFamily: 'var(--font-mono, monospace)',
                    borderColor: fieldErrors.email ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.email && <span style={errorStyle}>{fieldErrors.email}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
              <label style={labelStyle}>Mã Số Thuế</label>
              <div style={fieldColStyle}>
                <input
                  type="text"
                  placeholder="VD: 0312345678 (tùy chọn)"
                  value={taxCode}
                  onChange={(e) => {
                    setTaxCode(e.target.value);
                    if (fieldErrors.taxCode) setFieldErrors((prev) => ({ ...prev, taxCode: '' }));
                  }}
                  className={`form-input ${fieldErrors.taxCode ? 'form-input--error' : ''}`}
                  style={{
                    ...inputStyle,
                    fontFamily: 'var(--font-mono, monospace)',
                    borderColor: fieldErrors.taxCode ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.taxCode && <span style={errorStyle}>{fieldErrors.taxCode}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <label style={labelStyle}>Trạng Thái</label>
              <div style={fieldColStyle}>
                <StatusToggle
                  label=""
                  checked={status === 'Active'}
                  onChange={(next) => setStatus(next ? 'Active' : 'Inactive')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
              <label style={labelStyle}>Địa Chỉ Kho / Cửa Hàng</label>
              <div style={fieldColStyle}>
                <input
                  type="text"
                  placeholder="VD: 124 Đường 3/2, Phường 12, Quận 10, TP.HCM"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: '' }));
                  }}
                  className="form-input"
                  style={inputStyle}
                />
                {fieldErrors.address && <span style={errorStyle}>{fieldErrors.address}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
              <label style={labelStyle}>Ghi Chú Nhanh</label>
              <div style={fieldColStyle}>
                <input
                  type="text"
                  placeholder="Ghi chú nhanh về chính sách giao nhận, thời gian liên hệ (tùy chọn)..."
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (fieldErrors.note) setFieldErrors((prev) => ({ ...prev, note: '' }));
                  }}
                  className="form-input"
                  style={inputStyle}
                />
                {fieldErrors.note && <span style={errorStyle}>{fieldErrors.note}</span>}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="modal-footer"
            style={{
              padding: '12px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="po-btn po-btn-secondary"
              style={{ height: 36, padding: '0 16px', fontSize: 13 }}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="po-btn po-btn-primary"
              style={{
                height: 36,
                padding: '0 18px',
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: '#0f766e',
                borderColor: '#0f766e',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Plus size={15} />
                  <span>Tạo Nhà Cung Cấp</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
