import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, Save, Trash2, Loader2, AlertCircle, FileText } from 'lucide-react';
import type { UpdateSupplierVatInput } from '../../types/supplier.types';
import '../../supplier.css';

interface Props {
  isOpen: boolean;
  initialCompanyName?: string;
  initialTaxCode?: string;
  initialInvoiceAddress?: string;
  onClose: () => void;
  onSubmit: (input: UpdateSupplierVatInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const SupplierVatModal: FC<Props> = ({
  isOpen,
  initialCompanyName = '',
  initialTaxCode = '',
  initialInvoiceAddress = '',
  onClose,
  onSubmit,
  onDelete,
}) => {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [taxCode, setTaxCode] = useState(initialTaxCode);
  const [invoiceAddress, setInvoiceAddress] = useState(initialInvoiceAddress);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCompanyName(initialCompanyName || '');
      setTaxCode(initialTaxCode || '');
      setInvoiceAddress(initialInvoiceAddress || '');
      setFieldErrors({});
      setApiError(null);
      setIsSubmitting(false);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialCompanyName, initialTaxCode, initialInvoiceAddress]);

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

    const cleanCompany = companyName.trim();
    if (!cleanCompany) {
      errors.companyName = 'Vui lòng nhập tên công ty / doanh nghiệp xuất hóa đơn.';
    } else if (cleanCompany.length > 200) {
      errors.companyName = 'Tên công ty tối đa 200 ký tự.';
    }

    const cleanTax = taxCode.trim();
    if (!cleanTax) {
      errors.taxCode = 'Vui lòng nhập mã số thuế doanh nghiệp.';
    } else {
      const cleanDigits = cleanTax.replace(/[\s-]/g, '');
      if (!/^\d{10}$|^\d{13}$/.test(cleanDigits)) {
        errors.taxCode = 'Mã số thuế phải đúng định dạng 10 hoặc 13 chữ số (VD: 0312345678 hoặc 0312345678-001).';
      }
    }

    const cleanAddress = invoiceAddress.trim();
    if (cleanAddress.length > 300) {
      errors.invoiceAddress = 'Địa chỉ xuất hóa đơn tối đa 300 ký tự.';
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
        companyName: companyName.trim(),
        taxCode: taxCode.trim(),
        invoiceAddress: invoiceAddress.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setApiError(err.message || 'Không thể lưu thông tin hóa đơn VAT.');
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
      setApiError(err.message || 'Không thể xóa thông tin hóa đơn VAT.');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasExistingData = Boolean(initialCompanyName && initialCompanyName.trim());

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 1060 }}>
        <div
          className="modal-box"
          data-testid="supplier-vat-modal"
          style={{
            maxWidth: 540,
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
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={18} />
              </div>
              <div>
                <h2 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Thêm/Cập nhật thông tin hóa đơn VAT
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
              className="modal-close"
              data-testid="btn-close-vat-x"
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
                  data-testid="vat-modal-error"
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

              {/* 1. Tên công ty trên hóa đơn */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Tên Công Ty Trên Hóa Đơn <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  data-testid="vat-company-input"
                  placeholder="VD: Công ty TNHH Nông Sản Long Nhật"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (fieldErrors.companyName) setFieldErrors((prev) => ({ ...prev, companyName: '' }));
                  }}
                  className={`form-input ${fieldErrors.companyName ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13.5,
                    boxSizing: 'border-box',
                    borderColor: fieldErrors.companyName ? '#dc2626' : undefined,
                  }}
                  autoFocus
                />
                {fieldErrors.companyName && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {fieldErrors.companyName}
                  </span>
                )}
              </div>

              {/* 2. Mã số thuế VAT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Mã Số Thuế (10 hoặc 13 số) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  data-testid="vat-tax-code-input"
                  placeholder="VD: 0312345678 hoặc 0312345678-001"
                  value={taxCode}
                  onChange={(e) => {
                    setTaxCode(e.target.value);
                    if (fieldErrors.taxCode) setFieldErrors((prev) => ({ ...prev, taxCode: '' }));
                  }}
                  className={`form-input ${fieldErrors.taxCode ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    borderColor: fieldErrors.taxCode ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.taxCode && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {fieldErrors.taxCode}
                  </span>
                )}
              </div>

              {/* 3. Địa chỉ xuất hóa đơn VAT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Địa Chỉ Xuất Hóa Đơn VAT
                </label>
                <textarea
                  data-testid="vat-address-input"
                  placeholder="VD: Tầng 4, Tòa nhà ABC, 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
                  value={invoiceAddress}
                  rows={2}
                  onChange={(e) => {
                    setInvoiceAddress(e.target.value);
                    if (fieldErrors.invoiceAddress) setFieldErrors((prev) => ({ ...prev, invoiceAddress: '' }));
                  }}
                  className={`form-input ${fieldErrors.invoiceAddress ? 'form-input--error' : ''}`}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 13.5,
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    borderColor: fieldErrors.invoiceAddress ? '#dc2626' : undefined,
                  }}
                />
                {fieldErrors.invoiceAddress && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                    {fieldErrors.invoiceAddress}
                  </span>
                )}
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
                    data-testid="btn-delete-vat"
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
                    <span>Xóa VAT</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  data-testid="btn-cancel-vat"
                  onClick={onClose}
                  disabled={isSubmitting || isDeleting}
                  className="po-btn po-btn-secondary"
                  style={{ height: 36, padding: '0 16px', fontSize: 13 }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-vat"
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
                      <span>Lưu Thông Tin VAT</span>
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
                Xác nhận gỡ thông tin hóa đơn VAT?
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Sau khi xóa, hồ sơ xuất hóa đơn VAT của nhà cung cấp sẽ được đưa về trạng thái chưa thiết lập.
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
