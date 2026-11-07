import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, Save, Loader2, AlertCircle, Lock } from 'lucide-react';
import type { SupplierSummary, SupplierStatus, UpdateBasicSupplierInput } from '../types/supplier.types';
import { StatusToggle } from './StatusToggle';
import '../supplier.css';

interface Props {
  isOpen: boolean;
  supplier: SupplierSummary | null;
  onClose: () => void;
  onSubmit: (input: UpdateBasicSupplierInput) => Promise<void>;
}

export const EditSupplierModal: FC<Props> = ({ isOpen, supplier, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [status, setStatus] = useState<SupplierStatus>('Active');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // Initialize data when modal opens or supplier changes
  useEffect(() => {
    if (isOpen && supplier) {
      setName(supplier.name || '');
      setPhone(supplier.phone || '');
      setContactPerson(supplier.contactPerson || '');
      setEmail(supplier.email || '');
      setTaxCode(supplier.taxCode || '');
      setStatus(supplier.status || 'Active');
      setAddress(supplier.address || '');
      setNote(supplier.note || '');
      setFieldErrors({});
      setApiError(null);
      setIsSubmitting(false);
      setIsDirty(false);
      setShowUnsavedConfirm(false);
    }
  }, [isOpen, supplier]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isDirty]);

  if (!isOpen || !supplier) return null;

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

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
      const cleanDigits = trimmedPhone.replace(/[\s\-()]/g, '');
      const phoneRegex = /^\+?[0-9]{8,15}$/;
      if (!phoneRegex.test(cleanDigits)) {
        errors.phone = 'Số điện thoại không hợp lệ (chỉ chứa 8 - 15 chữ số, không chứa chữ cái).';
      }
    }

    if (contactPerson.trim().length > 100) {
      errors.contactPerson = 'Tên người liên hệ tối đa 100 ký tự.';
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Địa chỉ email không đúng định dạng (VD: example@domain.com).';
      } else if (trimmedEmail.length > 150) {
        errors.email = 'Email không vượt quá 150 ký tự.';
      }
    }

    const cleanTax = taxCode.trim();
    if (cleanTax) {
      const cleanDigits = cleanTax.replace(/[\s-]/g, '');
      if (!/^\d{10}$|^\d{13}$/.test(cleanDigits)) {
        errors.taxCode = 'Mã số thuế phải đúng định dạng 10 hoặc 13 chữ số (VD: 0312345678 hoặc 0312345678-001).';
      }
    }

    if (address.trim().length > 300) {
      errors.address = 'Địa chỉ không vượt quá 300 ký tự.';
    }

    if (note.trim().length > 500) {
      errors.note = 'Ghi chú không vượt quá 500 ký tự.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !supplier) return;

    setApiError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: supplier.id,
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        status,
        taxCode: taxCode.trim(),
        address: address.trim(),
        note: note.trim(),
      });
      setIsDirty(false);
      onClose();
    } catch (err: any) {
      setApiError(err.message || 'Không thể cập nhật nhà cung cấp. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 1050 }}>
        <div
          className="modal-box"
          style={{
            maxWidth: 580,
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
            data-testid="edit-general-info-modal-header"
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
                <Save size={18} />
              </div>
              <div>
                <h2 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Sửa Thông Tin Chung
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="modal-close"
              data-testid="btn-close-general-info-x"
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
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div
              className="modal-body"
              data-testid="edit-general-info-modal"
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
                  data-testid="edit-general-info-error"
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

              {/* 1. Supplier Code (Read-Only) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', minWidth: 'auto' }}>
                  Mã Nhà Cung Cấp
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    type="text"
                    data-testid="input-supplier-code"
                    value={supplier.code}
                    disabled
                    readOnly
                    className="form-input"
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 13.5,
                      boxSizing: 'border-box',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      cursor: 'not-allowed',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      paddingRight: 36,
                      border: '1px solid #cbd5e1',
                    }}
                  />
                  <Lock size={15} color="#94a3b8" style={{ position: 'absolute', right: 12, pointerEvents: 'none' }} />
                </div>
              </div>

              {/* 2. Supplier Name (Editable, Required) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                  Tên Nhà Cung Cấp <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  data-testid="input-supplier-name"
                  placeholder="Nhập tên nhà cung cấp..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={`form-input ${fieldErrors.name ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13.5,
                    boxSizing: 'border-box',
                    borderColor: fieldErrors.name ? '#dc2626' : undefined,
                  }}
                  autoFocus
                />
                {fieldErrors.name && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3, display: 'block' }}>
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* 3. Phone Number (Editable, Required) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                  Số Điện Thoại <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="tel"
                  data-testid="input-supplier-phone"
                  placeholder="VD: 0912345678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className={`form-input ${fieldErrors.phone ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13.5,
                    fontFamily: 'var(--font-mono, monospace)',
                    boxSizing: 'border-box',
                    borderColor: fieldErrors.phone ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.phone && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3, display: 'block' }}>
                    {fieldErrors.phone}
                  </span>
                )}
              </div>

              {/* 4. Contact Person (Editable, Optional) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                  Người Liên Hệ
                </label>
                <input
                  type="text"
                  data-testid="input-supplier-contact"
                  placeholder="VD: Anh Nam (Phòng Kinh Doanh)"
                  value={contactPerson}
                  onChange={(e) => {
                    setContactPerson(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.contactPerson) setFieldErrors((prev) => ({ ...prev, contactPerson: '' }));
                  }}
                  className="form-input"
                  style={{ width: '100%', height: 38, fontSize: 13.5, boxSizing: 'border-box' }}
                />
                {fieldErrors.contactPerson && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3, display: 'block' }}>
                    {fieldErrors.contactPerson}
                  </span>
                )}
              </div>

              {/* 5. Email (Monospace, Optional) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                  Email Liên Hệ
                </label>
                <input
                  type="email"
                  data-testid="input-supplier-email"
                  placeholder="VD: contact@ncc.vn (tùy chọn)"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  className={`form-input ${fieldErrors.email ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13.5,
                    fontFamily: 'var(--font-mono, monospace)',
                    boxSizing: 'border-box',
                    borderColor: fieldErrors.email ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.email && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3, display: 'block' }}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* 6. Mã số thuế */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                  Mã Số Thuế
                </label>
                <input
                  type="text"
                  data-testid="input-supplier-tax-code"
                  placeholder="VD: 0312345678 (tùy chọn)"
                  value={taxCode}
                  onChange={(e) => {
                    setTaxCode(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.taxCode) setFieldErrors((prev) => ({ ...prev, taxCode: '' }));
                  }}
                  className={`form-input ${fieldErrors.taxCode ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13.5,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-mono, monospace)',
                    borderColor: fieldErrors.taxCode ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.taxCode && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3, display: 'block' }}>
                    {fieldErrors.taxCode}
                  </span>
                )}
              </div>

              {/* 7. Business Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <StatusToggle
                  checked={status === 'Active'}
                  disabled={isSubmitting}
                  onChange={(next) => {
                    setStatus(next ? 'Active' : 'Inactive');
                    setIsDirty(true);
                  }}
                />
              </div>

              {/* 8. Address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                  Địa Chỉ Kho / Cửa Hàng
                </label>
                <input
                  type="text"
                  data-testid="input-supplier-address"
                  placeholder="VD: 124 Đường 3/2, Phường 12, Quận 10, TP.HCM"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: '' }));
                  }}
                  className="form-input"
                  style={{ width: '100%', height: 38, fontSize: 13.5, boxSizing: 'border-box' }}
                />
                {fieldErrors.address && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3, display: 'block' }}>
                    {fieldErrors.address}
                  </span>
                )}
              </div>

              {/* 9. Quick Note */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                  Ghi Chú Nhanh
                </label>
                <input
                  type="text"
                  data-testid="input-supplier-notes"
                  placeholder="Ghi chú nhanh về chính sách giao nhận, thời gian liên hệ (tùy chọn)..."
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.note) setFieldErrors((prev) => ({ ...prev, note: '' }));
                  }}
                  className="form-input"
                  style={{ width: '100%', height: 38, fontSize: 13.5, boxSizing: 'border-box' }}
                />
                {fieldErrors.note && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3, display: 'block' }}>
                    {fieldErrors.note}
                  </span>
                )}
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
                data-testid="btn-cancel-general-info"
                onClick={handleRequestClose}
                disabled={isSubmitting}
                className="po-btn po-btn-secondary"
                style={{ height: 36, padding: '0 16px', fontSize: 13 }}
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                data-testid="btn-save-general-info"
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
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Lưu Thay Đổi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog for Unsaved Changes */}
      {showUnsavedConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-box"
            style={{
              maxWidth: 420,
              width: '90%',
              padding: 24,
              borderRadius: 12,
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#fffbeb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                Thay đổi chưa được lưu
              </h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
              Bạn có một số thay đổi chưa lưu cho nhà cung cấp <strong>{supplier.name}</strong>. Bạn có chắc chắn muốn hủy bỏ các thay đổi này không?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowUnsavedConfirm(false)}
                className="po-btn po-btn-secondary"
                style={{ height: 34, padding: '0 14px', fontSize: 13 }}
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  setIsDirty(false);
                  onClose();
                }}
                className="po-btn"
                style={{
                  height: 34,
                  padding: '0 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                }}
              >
                Bỏ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
