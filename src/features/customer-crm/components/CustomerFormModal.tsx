import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, User, Phone, Mail, MapPin, DollarSign, Award, Building } from 'lucide-react';
import type { CustomerDto, MembershipTier } from '../types/customer.types';
import {
  sanitizeCustomerText,
  validateSafeCustomerText,
  validateVietnamesePhone,
  validateDebtLimit,
  normalizeDebtLimit,
} from '../utils/customerValidation';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    fullName: string;
    phoneNumber: string;
    email?: string;
    address?: string;
    taxCode?: string;
    debtLimit: number;
    membershipTier: MembershipTier;
  }) => Promise<void>;
  initialData?: CustomerDto | null;
  isSubmitting: boolean;
}

export const CustomerFormModal: FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [debtLimit, setDebtLimit] = useState<number>(5000000);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('Standard');
  const [errorMsg, setErrorMsg] = useState('');

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setFullName(sanitizeCustomerText(initialData.fullName));
      setPhoneNumber(initialData.phoneNumber || '');
      setEmail(initialData.email || '');
      setAddress(sanitizeCustomerText(initialData.address));
      setTaxCode(initialData.taxCode || '');
      setDebtLimit(normalizeDebtLimit(initialData.debtLimit));
      setMembershipTier(initialData.membershipTier || 'Standard');
    } else {
      setFullName('');
      setPhoneNumber('');
      setEmail('');
      setAddress('');
      setTaxCode('');
      setDebtLimit(5000000);
      setMembershipTier('Standard');
    }
    setErrorMsg('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    const cleanPhone = phoneNumber.trim();
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên khách hàng.');
      return;
    }
    if (!validateSafeCustomerText(fullName)) {
      setErrorMsg('Họ và tên khách hàng không được chứa thẻ HTML hoặc ký tự đặc biệt < >.');
      return;
    }
    if (address.trim() && !validateSafeCustomerText(address)) {
      setErrorMsg('Địa chỉ không được chứa thẻ HTML hoặc ký tự đặc biệt < >.');
      return;
    }
    if (!cleanPhone) {
      setErrorMsg('Vui lòng nhập số điện thoại.');
      return;
    }

    if (!validateVietnamesePhone(cleanPhone)) {
      setErrorMsg('Số điện thoại không đúng định dạng Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return;
    }

    if (!validateDebtLimit(Number(debtLimit))) {
      setErrorMsg('Hạn mức nợ không thể là số âm.');
      return;
    }

    try {
      await onSubmit({
        fullName: sanitizeCustomerText(fullName),
        phoneNumber: cleanPhone,
        email: email.trim() || undefined,
        address: sanitizeCustomerText(address) || undefined,
        taxCode: taxCode.trim() || undefined,
        debtLimit: normalizeDebtLimit(debtLimit),
        membershipTier,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu khách hàng.');
    }
  };

  return (
    <div className="customer-modal-backdrop" onClick={onClose}>
      <div className="customer-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="customer-modal-header">
          <div className="customer-modal-title">
            <User className="w-5 h-5" style={{ color: 'var(--blue-primary, #0F766E)' }} />
            <h3>
              {isEdit ? 'Chỉnh sửa hồ sơ khách hàng' : 'Thêm mới khách hàng & Đối tác'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="action-icon-btn"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="customer-modal-body">
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Họ tên */}
            <div className="form-group">
              <label className="form-label">
                Họ và tên khách hàng <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User className="w-4 h-4 customer-search-icon" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A hoặc Tạp hóa Hoàng Mai"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            {/* SĐT */}
            <div className="form-group">
              <label className="form-label">
                Số điện thoại <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone className="w-4 h-4 customer-search-icon" />
                <input
                  type="tel"
                  required
                  disabled={isEdit} // Không cho đổi SĐT sau khi tạo để giữ định danh
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="form-input"
                  style={{
                    paddingLeft: '40px',
                    backgroundColor: isEdit ? '#F1F5F9' : undefined,
                    color: isEdit ? '#64748B' : undefined,
                  }}
                />
              </div>
              {isEdit && (
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
                  Số điện thoại là mã định danh, không thể thay đổi.
                </p>
              )}
            </div>

            {/* Hạn mức nợ (DebtLimit) & Hạng thẻ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  Hạn mức nợ (VNĐ) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign className="w-4 h-4 customer-search-icon" />
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    required
                    value={debtLimit}
                    onChange={(e) => setDebtLimit(Number(e.target.value))}
                    placeholder="5000000"
                    className="form-input"
                    style={{ paddingLeft: '40px', fontFamily: 'var(--font-mono, monospace)' }}
                  />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
                  Trần nợ tối đa cho phép
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Hạng thành viên
                </label>
                <div style={{ position: 'relative' }}>
                  <Award className="w-4 h-4 customer-search-icon" />
                  <select
                    value={membershipTier}
                    onChange={(e) => setMembershipTier(e.target.value as MembershipTier)}
                    className="form-select"
                    style={{ paddingLeft: '40px' }}
                  >
                    <option value="Standard">Standard (Chuẩn)</option>
                    <option value="Silver">Silver (Bạc)</option>
                    <option value="Gold">Gold (Vàng)</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Email & MST */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail className="w-4 h-4 customer-search-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@gmail.com"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mã số thuế</label>
                <div style={{ position: 'relative' }}>
                  <Building className="w-4 h-4 customer-search-icon" />
                  <input
                    type="text"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    placeholder="0312345678"
                    className="form-input"
                    style={{ paddingLeft: '40px', fontFamily: 'var(--font-mono, monospace)' }}
                  />
                </div>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Địa chỉ</label>
              <div style={{ position: 'relative' }}>
                <MapPin className="w-4 h-4 customer-search-icon" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="customer-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary-pill"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary-pill"
            >
              {isSubmitting && (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              <span>{isEdit ? 'Lưu thay đổi' : 'Tạo khách hàng'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};