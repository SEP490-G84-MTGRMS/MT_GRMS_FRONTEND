import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, Save, Trash2, Loader2, AlertCircle, Building } from 'lucide-react';
import { VIETNAM_BANKS } from '../../lib/vietQrHelper';
import type { UpdateSupplierBankInput } from '../../types/supplier.types';
import '../../supplier.css';

interface Props {
  isOpen: boolean;
  initialBankName?: string;
  initialAccountNumber?: string;
  initialAccountHolder?: string;
  onClose: () => void;
  onSubmit: (input: UpdateSupplierBankInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function normalizeAccountHolderName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();
}

export const SupplierBankModal: FC<Props> = ({
  isOpen,
  initialBankName = '',
  initialAccountNumber = '',
  initialAccountHolder = '',
  onClose,
  onSubmit,
  onDelete,
}) => {
  const [bankName, setBankName] = useState(initialBankName);
  const [bankAccount, setBankAccount] = useState(initialAccountNumber);
  const [accountHolder, setAccountHolder] = useState(initialAccountHolder);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBankName(initialBankName || '');
      setBankAccount(initialAccountNumber || '');
      setAccountHolder(initialAccountHolder ? normalizeAccountHolderName(initialAccountHolder) : '');
      setFieldErrors({});
      setApiError(null);
      setIsSubmitting(false);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialBankName, initialAccountNumber, initialAccountHolder]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isDeleting, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!bankName.trim()) {
      errors.bankName = 'Vui lòng chọn hoặc nhập tên ngân hàng.';
    }

    const cleanAccount = bankAccount.trim();
    if (!cleanAccount) {
      errors.bankAccount = 'Vui lòng nhập số tài khoản ngân hàng.';
    } else if (!/^[0-9]+$/.test(cleanAccount)) {
      errors.bankAccount = 'Số tài khoản chỉ được chứa các chữ số (0-9).';
    } else if (cleanAccount.length < 6 || cleanAccount.length > 25) {
      errors.bankAccount = 'Số tài khoản thông thường từ 6 đến 25 chữ số.';
    }

    const cleanHolder = accountHolder.trim();
    if (!cleanHolder) {
      errors.accountHolder = 'Vui lòng nhập tên chủ tài khoản thụ hưởng.';
    } else if (cleanHolder.length > 100) {
      errors.accountHolder = 'Tên chủ tài khoản tối đa 100 ký tự.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isDeleting) return;

    setApiError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        accountHolder: normalizeAccountHolderName(accountHolder.trim()),
      });
      onClose();
    } catch (err: any) {
      setApiError(err.message || 'Không thể lưu thông tin tài khoản ngân hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setApiError(err.message || 'Không thể xóa thông tin tài khoản ngân hàng.');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasExistingData = Boolean(initialAccountNumber && initialAccountNumber.trim());

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 1060 }}>
        <div
          className="modal-box"
          data-testid="supplier-bank-modal"
          style={{
            maxWidth: 520,
            width: '95%',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
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
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building size={18} />
              </div>
              <div>
                <h2 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Thêm/Cập nhật tài khoản ngân hàng
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
              className="modal-close"
              data-testid="btn-close-bank-x"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: isSubmitting || isDeleting ? 'not-allowed' : 'pointer',
                color: '#64748b',
                padding: 4,
                borderRadius: 6,
              }}
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className="modal-body"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Error banner */}
              {apiError && (
                <div
                  data-testid="bank-modal-error"
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

              {/* 1. Ngân hàng (Searchable / Select dropdown) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Ngân Hàng <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  data-testid="bank-select"
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    if (fieldErrors.bankName) setFieldErrors((prev) => ({ ...prev, bankName: '' }));
                  }}
                  className={`form-input ${fieldErrors.bankName ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13.5,
                    boxSizing: 'border-box',
                    borderColor: fieldErrors.bankName ? '#dc2626' : undefined,
                  }}
                >
                  <option value="">-- Chọn ngân hàng thụ hưởng --</option>
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.code} value={b.shortName}>
                      {b.shortName} — {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                {fieldErrors.bankName && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {fieldErrors.bankName}
                  </span>
                )}
              </div>

              {/* 2. Số tài khoản (Digits only, Monospace) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Số Tài Khoản <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="account-number-input"
                  placeholder="VD: 1029384756 (chỉ chứa chữ số)"
                  value={bankAccount}
                  onChange={(e) => {
                    // Only digits allowed per R4 requirement
                    const numericOnly = e.target.value.replace(/[^0-9]/g, '');
                    setBankAccount(numericOnly);
                    if (fieldErrors.bankAccount) setFieldErrors((prev) => ({ ...prev, bankAccount: '' }));
                  }}
                  className={`form-input ${fieldErrors.bankAccount ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 600,
                    letterSpacing: 1,
                    borderColor: fieldErrors.bankAccount ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.bankAccount && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {fieldErrors.bankAccount}
                  </span>
                )}
              </div>

              {/* 3. Tên chủ tài khoản (Auto UPPERCASE, normalized diacritics) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Tên Chủ Tài Khoản <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  data-testid="account-holder-input"
                  placeholder="VD: NGUYEN VAN A (tự động viết hoa, không dấu)"
                  value={accountHolder}
                  onChange={(e) => {
                    const normalized = normalizeAccountHolderName(e.target.value);
                    setAccountHolder(normalized);
                    if (fieldErrors.accountHolder) setFieldErrors((prev) => ({ ...prev, accountHolder: '' }));
                  }}
                  className={`form-input ${fieldErrors.accountHolder ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13.5,
                    boxSizing: 'border-box',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    borderColor: fieldErrors.accountHolder ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.accountHolder && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {fieldErrors.accountHolder}
                  </span>
                )}
                <span style={{ fontSize: 11.5, color: '#64748b' }}>
                  Hệ thống tự động chuyển đổi thành chữ in hoa không dấu chuẩn định dạng ngân hàng.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                padding: '12px 20px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {hasExistingData && onDelete && (
                  <button
                    type="button"
                    data-testid="btn-delete-bank"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSubmitting || isDeleting}
                    style={{
                      height: 34,
                      padding: '0 12px',
                      fontSize: 12.5,
                      color: '#dc2626',
                      background: 'transparent',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Xóa tài khoản</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  data-testid="btn-cancel-bank"
                  onClick={onClose}
                  disabled={isSubmitting || isDeleting}
                  className="po-btn po-btn-secondary"
                  style={{ height: 36, padding: '0 16px', fontSize: 13 }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-bank"
                  disabled={isSubmitting || isDeleting}
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
                      <span>Lưu Tài Khoản</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-box"
            style={{
              maxWidth: 400,
              width: '90%',
              padding: 20,
              borderRadius: 12,
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <AlertCircle size={22} color="#dc2626" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                Xác nhận xóa tài khoản ngân hàng?
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Sau khi xóa, hệ thống sẽ đưa thông tin ngân hàng về trạng thái rỗng và gỡ bỏ mã VietQR tương ứng.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="po-btn po-btn-secondary"
                style={{ height: 32, padding: '0 12px', fontSize: 12.5 }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  height: 32,
                  padding: '0 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
