import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, Plus, Loader2, AlertCircle } from 'lucide-react';
import type { CreateSupplierInput, SupplierCategory, SupplierStatus } from '../types/supplier.types';
import '../supplier.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSupplierInput) => Promise<void>;
}

export const CreateSupplierModal: FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [category, setCategory] = useState<SupplierCategory>('FRESH');
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
      setCategory('FRESH');
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
        category,
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

            {/* 1. Tên NCC */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Tên Nhà Cung Cấp <span style={{ color: '#dc2626' }}>*</span>
              </label>
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

            {/* 2. Số điện thoại */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Số Điện Thoại <span style={{ color: '#dc2626' }}>*</span>
              </label>
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

            {/* 3. Người liên hệ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Người Liên Hệ
              </label>
              <input
                type="text"
                placeholder="VD: Anh Nam (Phòng Kinh Doanh)"
                value={contactPerson}
                onChange={(e) => {
                  setContactPerson(e.target.value);
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

            {/* 4. Email liên hệ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Email Liên Hệ
              </label>
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

            {/* 5. Mã số thuế */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Mã Số Thuế
              </label>
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

            {/* Row 3: Phân loại ngành hàng */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Phân Loại Ngành Hàng
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupplierCategory)}
                className="form-select"
                style={{ width: '100%', height: 38, fontSize: 13.5, boxSizing: 'border-box' }}
              >
                <option value="FRESH">FRESH (Nông sản & Thực phẩm tươi sống)</option>
                <option value="AMBIENT">AMBIENT (Đồ khô & Bách hóa tiêu dùng)</option>
                <option value="FROZEN">FROZEN (Hàng đông lạnh & Thủy hải sản)</option>
                <option value="UTILITIES">UTILITIES (Dịch vụ tiện ích / Điện nước)</option>
                <option value="RENT">RENT (Thuê mặt bằng & Cơ sở vật chất)</option>
                <option value="LOGISTICS">LOGISTICS (Vận tải & Giao nhận hàng hóa)</option>
              </select>
            </div>

            {/* Row 4: Trạng thái hoạt động (Active / Inactive) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Trạng Thái Hoạt Động <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  width: '100%',
                }}
              >
                {/* Option Active */}
                <div
                  onClick={() => setStatus('Active')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: status === 'Active' ? '2px solid #0f766e' : '1px solid #cbd5e1',
                    backgroundColor: status === 'Active' ? '#f0fdfa' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: status === 'Active' ? '5px solid #0f766e' : '2px solid #94a3b8',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: status === 'Active' ? '#0f766e' : '#334155' }}>
                    Đang hoạt động
                  </span>
                </div>

                {/* Option Inactive */}
                <div
                  onClick={() => setStatus('Inactive')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: status === 'Inactive' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: status === 'Inactive' ? '#fef2f2' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: status === 'Inactive' ? '5px solid #dc2626' : '2px solid #94a3b8',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: status === 'Inactive' ? '#dc2626' : '#334155' }}>
                    Ngưng hoạt động
                  </span>
                </div>
              </div>
            </div>

            {/* Row 5: Địa chỉ kho / cửa hàng */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Địa Chỉ Kho / Cửa Hàng
              </label>
              <input
                type="text"
                placeholder="VD: 124 Đường 3/2, Phường 12, Quận 10, TP.HCM"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
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

            {/* Row 6: Ghi chú nhanh */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', minWidth: 'auto' }}>
                Ghi Chú Nhanh
              </label>
              <input
                type="text"
                placeholder="Ghi chú nhanh về chính sách giao nhận, thời gian liên hệ (tùy chọn)..."
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
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
