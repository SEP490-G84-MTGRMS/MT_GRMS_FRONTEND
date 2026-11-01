import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import type { StoreProductItem, EditStoreProductInput } from '../types/storeProduct.types';
import { X, AlertTriangle, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface EditStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StoreProductItem | null;
  onSave: (storeId: string, productId: string, input: EditStoreProductInput) => Promise<void> | void;
  onToggleStatus?: (item: StoreProductItem) => Promise<void> | void;
  onRemove?: (item: StoreProductItem) => Promise<void> | void;
}

interface FieldErrors {
  retailPrice?: string;
  minOrderQuantity?: string;
}

export const EditStoreProductModal: FC<EditStoreProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
  onRemove,
}) => {
  // Input fields state as strings to allow natural user typing and clearing
  const [retailPriceStr, setRetailPriceStr] = useState<string>('');
  const [minOrderQuantityStr, setMinOrderQuantityStr] = useState<string>('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Validation & Error states
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  // Sub-dialogs state: confirmation on unsaved changes & removal confirmation
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState<boolean>(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string>('');

  // Reset and sync state whenever a new product is selected or modal opens
  useEffect(() => {
    if (isOpen && product) {
      setRetailPriceStr(String(product.retailPrice ?? 0));
      setMinOrderQuantityStr(String(product.minOrderQuantity ?? 10));
      setStatus(product.status ?? 'Active');
      setFieldErrors({});
      setFormError('');
      setIsSaving(false);
      setIsRemoving(false);
      setShowUnsavedConfirm(false);
      setShowRemoveConfirm(false);
      setRemoveError('');
    } else if (!isOpen) {
      // Clear completely when closed to ensure zero stale data on next open
      setRetailPriceStr('');
      setMinOrderQuantityStr('');
      setFieldErrors({});
      setFormError('');
      setShowUnsavedConfirm(false);
      setShowRemoveConfirm(false);
    }
  }, [isOpen, product]);

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  // Parse numeric values safely
  const parsedPrice = useMemo(() => {
    const trimmed = retailPriceStr.trim();
    if (!trimmed) return NaN;
    const num = Number(trimmed);
    return isNaN(num) ? NaN : num;
  }, [retailPriceStr]);

  const parsedMoq = useMemo(() => {
    const trimmed = minOrderQuantityStr.trim();
    if (!trimmed) return NaN;
    // Disallow decimals for MOQ: must match integer digits
    if (!/^-?\d+$/.test(trimmed)) return NaN;
    const num = Number(trimmed);
    return isNaN(num) ? NaN : num;
  }, [minOrderQuantityStr]);

  // Determine whether user made any changes to the initial data
  const isDirty = useMemo(() => {
    if (!product) return false;
    const priceChanged = !isNaN(parsedPrice) && parsedPrice !== product.retailPrice;
    const initialMoq = product.minOrderQuantity ?? 10;
    const moqChanged = !isNaN(parsedMoq) && parsedMoq !== initialMoq;
    const statusChanged = status !== product.status;
    return priceChanged || moqChanged || statusChanged;
  }, [product, parsedPrice, parsedMoq, status]);

  // Close handler with dirty check
  const handleRequestClose = useCallback(() => {
    if (isSaving || isRemoving) return; // Prevent closing while an async action is running
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  }, [isSaving, isRemoving, isDirty, onClose]);

  // Keyboard navigation: Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showRemoveConfirm) {
          setShowRemoveConfirm(false);
        } else if (showUnsavedConfirm) {
          setShowUnsavedConfirm(false);
        } else {
          handleRequestClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showRemoveConfirm, showUnsavedConfirm, handleRequestClose]);

  if (!isOpen || !product) return null;

  // Validation function
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // 1. Retail Price validation
    const trimmedPrice = retailPriceStr.trim();
    if (!trimmedPrice) {
      errors.retailPrice = 'Giá bán lẻ niêm yết không được để trống.';
    } else if (isNaN(parsedPrice)) {
      errors.retailPrice = 'Giá bán lẻ phải là một số hợp lệ.';
    } else if (parsedPrice <= 0) {
      errors.retailPrice = 'Giá bán lẻ niêm yết phải lớn hơn 0 VNĐ.';
    } else if (parsedPrice > 1_000_000_000) {
      errors.retailPrice = 'Giá bán lẻ không được vượt quá 1,000,000,000 VNĐ.';
    }

    // 2. MOQ validation
    const trimmedMoq = minOrderQuantityStr.trim();
    if (!trimmedMoq) {
      errors.minOrderQuantity = 'Số lượng đặt hàng tối thiểu (MOQ) không được để trống.';
    } else if (trimmedMoq.includes('.') || trimmedMoq.includes(',')) {
      errors.minOrderQuantity = 'MOQ chỉ nhận số nguyên, không hỗ trợ số thập phân.';
    } else if (isNaN(parsedMoq)) {
      errors.minOrderQuantity = 'MOQ phải là một số nguyên hợp lệ.';
    } else if (parsedMoq < 1) {
      errors.minOrderQuantity = 'Số lượng đặt hàng tối thiểu (MOQ) phải từ 1 trở lên.';
    } else if (parsedMoq > 10_000_000) {
      errors.minOrderQuantity = 'MOQ không được vượt quá 10,000,000.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Save Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (isSaving) return; // Prevent double-clicking

    const isValid = validateForm();
    if (!isValid) return;

    setIsSaving(true);
    try {
      await onSave(product.storeId, product.productId, {
        retailPrice: parsedPrice,
        minOrderQuantity: parsedMoq,
        status,
        supplierId: (product as any).supplierId || undefined,
      });
      // Close only on confirmed success
      onClose();
    } catch (err: any) {
      // Do not close popup, preserve entered values, show clear error
      setFormError(
        err.response?.data?.message ||
          err.message ||
          'Không thể lưu thay đổi sản phẩm tại chi nhánh. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Removal Handler
  const handleConfirmRemove = async () => {
    if (!onRemove || isRemoving) return;
    setIsRemoving(true);
    setRemoveError('');

    try {
      await onRemove(product);
      setShowRemoveConfirm(false);
      onClose();
    } catch (err: any) {
      setRemoveError(
        err.response?.data?.message ||
          err.message ||
          'Không thể gỡ sản phẩm khỏi chi nhánh. Vui lòng thử lại.'
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const isMarginNegative = !isNaN(parsedPrice) && parsedPrice > 0 && parsedPrice < product.costPrice;

  return (
    <>
      {/* ── Main Edit Store Product Popup ── */}
      <div
        id="modalEditStoreProductBackdrop"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}
        onClick={handleRequestClose}
      >
        <div
          id="modalEditStoreProductDialog"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 540,
            maxHeight: '90vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to right, #f8fafc, #ffffff)',
              flexShrink: 0,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Thao Tác Sản Phẩm Tại Chi Nhánh
              </h3>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Chi nhánh:</span>
                <strong style={{ color: '#0f766e', backgroundColor: '#f0fdfa', padding: '1px 8px', borderRadius: 4, border: '1px solid #ccfbf1' }}>
                  {product.storeName}
                </strong>
              </div>
            </div>
            <button
              type="button"
              id="btnCloseEditProductModalX"
              onClick={handleRequestClose}
              disabled={isSaving}
              style={{
                background: 'none',
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                color: '#94a3b8',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSaving) e.currentTarget.style.backgroundColor = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Đóng popup (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body - Scrollable */}
          <form
            id="formEditStoreProduct"
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {/* Form Global Error Banner */}
              {formError && (
                <div
                  id="editProductFormErrorBanner"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, lineHeight: 1.4 }}>{formError}</div>
                </div>
              )}

              {/* Product Summary Information Card (Master attributes) */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px 12px',
                  fontSize: 12.5,
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Sản phẩm:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{product.name}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Mã SKU:</span>{' '}
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#0f766e',
                      backgroundColor: '#f0fdfa',
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid #ccfbf1',
                    }}
                  >
                    {product.sku}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>ĐVT:</span>{' '}
                  <strong style={{ color: '#334155' }}>{product.unit}</strong>{' '}
                  <span style={{ color: '#cbd5e1' }}>•</span>{' '}
                  <span style={{ color: '#64748b' }}>Ngành hàng:</span>{' '}
                  <strong style={{ color: '#334155' }}>{product.category || '---'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Giá vốn NCC:</span>{' '}
                  <strong style={{ color: '#475569', fontFamily: 'monospace' }}>
                    {fmt(product.costPrice)} đ
                  </strong>
                </div>
                <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #e2e8f0', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Nhà cung cấp:</span>{' '}
                    <strong style={{ color: '#1e293b' }}>
                      {product.primarySupplierName || '---'}
                    </strong>
                    {product.primarySupplierCode && (
                      <span style={{ color: '#64748b', fontSize: 11.5, marginLeft: 4 }}>
                        ({product.primarySupplierCode})
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Tồn kho thực tế:</span>{' '}
                    <strong style={{ color: product.currentStock > 0 ? '#0f766e' : '#dc2626' }}>
                      {fmt(product.currentStock)} {product.unit}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Field 1: Giá bán lẻ niêm yết (Retail Price) */}
              <div>
                <label
                  htmlFor="inputRetailPrice"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 6,
                  }}
                >
                  Giá bán lẻ niêm yết (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="inputRetailPrice"
                    type="text"
                    inputMode="numeric"
                    value={retailPriceStr}
                    disabled={isSaving}
                    onChange={(e) => {
                      setRetailPriceStr(e.target.value);
                      if (fieldErrors.retailPrice) {
                        setFieldErrors((prev) => ({ ...prev, retailPrice: undefined }));
                      }
                      setFormError('');
                    }}
                    placeholder="Nhập giá bán lẻ (ví dụ: 195000)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `1px solid ${
                        fieldErrors.retailPrice
                          ? '#ef4444'
                          : isMarginNegative
                          ? '#f59e0b'
                          : '#cbd5e1'
                      }`,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0f766e',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: isSaving ? '#f8fafc' : '#ffffff',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: '#94a3b8',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    đ
                  </span>
                </div>

                {/* Inline field error */}
                {fieldErrors.retailPrice && (
                  <div
                    id="errorMsgRetailPrice"
                    style={{
                      color: '#dc2626',
                      fontSize: 11.5,
                      marginTop: 4,
                      fontWeight: 500,
                    }}
                  >
                    {fieldErrors.retailPrice}
                  </div>
                )}

                {/* Margin feedback */}
                {!fieldErrors.retailPrice && (
                  <>
                    {isMarginNegative ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#d97706',
                          fontSize: 11.5,
                          marginTop: 4,
                        }}
                      >
                        <AlertTriangle size={14} /> Giá bán đang thấp hơn giá vốn ({fmt(product.costPrice)} đ). Cửa hàng sẽ bị lỗ!
                      </div>
                    ) : parsedPrice > 0 ? (
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                        Biên lợi nhuận gộp dự kiến:{' '}
                        <strong style={{ color: '#0f766e' }}>
                          {Math.round(((parsedPrice - product.costPrice) / (parsedPrice || 1)) * 100)}%
                        </strong>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Field 2: Số lượng đặt hàng tối thiểu (MOQ) */}
              <div>
                <label
                  htmlFor="inputMinOrderQuantity"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 6,
                  }}
                >
                  Số lượng đặt hàng tối thiểu (MOQ) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="inputMinOrderQuantity"
                    type="text"
                    inputMode="numeric"
                    value={minOrderQuantityStr}
                    disabled={isSaving}
                    onChange={(e) => {
                      setMinOrderQuantityStr(e.target.value);
                      if (fieldErrors.minOrderQuantity) {
                        setFieldErrors((prev) => ({ ...prev, minOrderQuantity: undefined }));
                      }
                      setFormError('');
                    }}
                    placeholder="Nhập MOQ (ví dụ: 10)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `1px solid ${fieldErrors.minOrderQuantity ? '#ef4444' : '#cbd5e1'}`,
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: isSaving ? '#f8fafc' : '#ffffff',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: '#94a3b8',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    {product.unit}
                  </span>
                </div>

                {/* Inline field error */}
                {fieldErrors.minOrderQuantity && (
                  <div
                    id="errorMsgMinOrderQuantity"
                    style={{
                      color: '#dc2626',
                      fontSize: 11.5,
                      marginTop: 4,
                      fontWeight: 500,
                    }}
                  >
                    {fieldErrors.minOrderQuantity}
                  </div>
                )}

                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  Số lượng tối thiểu khi lập phiếu đặt hàng gửi cho nhà cung cấp (áp dụng theo ĐVT cơ sở: {product.unit}).
                </div>
              </div>

              {/* Field 3: Trạng thái kinh doanh tại chi nhánh */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 6,
                  }}
                >
                  Trạng thái kinh doanh tại chi nhánh
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    id="btnStatusActive"
                    disabled={isSaving}
                    onClick={() => setStatus('Active')}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: status === 'Active' ? '2px solid #0f766e' : '1px solid #cbd5e1',
                      backgroundColor: status === 'Active' ? '#f0fdfa' : '#ffffff',
                      color: status === 'Active' ? '#0f766e' : '#64748b',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CheckCircle2 size={15} color={status === 'Active' ? '#0f766e' : '#94a3b8'} />
                    <span>Đang kinh doanh</span>
                  </button>

                  <button
                    type="button"
                    id="btnStatusInactive"
                    disabled={isSaving}
                    onClick={() => setStatus('Inactive')}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: status === 'Inactive' ? '2px solid #64748b' : '1px solid #cbd5e1',
                      backgroundColor: status === 'Inactive' ? '#f1f5f9' : '#ffffff',
                      color: status === 'Inactive' ? '#1e293b' : '#64748b',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: status === 'Inactive' ? '#64748b' : '#cbd5e1',
                      }}
                    />
                    <span>Tạm ngừng bán</span>
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  Chỉ áp dụng tại <strong>{product.storeName}</strong>, không làm thay đổi trạng thái tại các chi nhánh khác.
                </div>
              </div>
            </div>

            {/* Footer with Actions */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
                flexShrink: 0,
              }}
            >
              {/* Delete / Remove button on the left */}
              {onRemove ? (
                <button
                  type="button"
                  id="btnOpenRemoveConfirmModal"
                  disabled={isSaving}
                  onClick={() => {
                    setRemoveError('');
                    setShowRemoveConfirm(true);
                  }}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid #fecaca',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) e.currentTarget.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                  title="Gỡ sản phẩm khỏi danh mục kinh doanh của chi nhánh"
                >
                  <Trash2 size={13} />
                  <span>Gỡ khỏi cửa hàng</span>
                </button>
              ) : (
                <div />
              )}

              {/* Cancel & Save buttons on the right */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  id="btnCancelEditStoreProduct"
                  disabled={isSaving}
                  onClick={handleRequestClose}
                  style={{
                    height: 34,
                    padding: '0 14px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  id="btnSaveEditStoreProduct"
                  disabled={isSaving}
                  style={{
                    height: 34,
                    padding: '0 18px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    backgroundColor: '#0f766e',
                    border: 'none',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    opacity: isSaving ? 0.75 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) e.currentTarget.style.backgroundColor = '#115e59';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSaving) e.currentTarget.style.backgroundColor = '#0f766e';
                  }}
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Sub-Modal 1: Unsaved Changes Confirmation Dialog ── */}
      {showUnsavedConfirm && (
        <div
          id="modalUnsavedChangesBackdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: 16,
          }}
          onClick={() => setShowUnsavedConfirm(false)}
        >
          <div
            id="modalUnsavedChangesDialog"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Thay đổi chưa được lưu
              </h4>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Bạn đã chỉnh sửa thông tin sản phẩm nhưng chưa lưu lại. Bạn có chắc chắn muốn thoát và hủy bỏ các thay đổi này không?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                id="btnContinueEditing"
                onClick={() => setShowUnsavedConfirm(false)}
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tiếp tục chỉnh sửa
              </button>

              <button
                type="button"
                id="btnDiscardChangesAndClose"
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  onClose();
                }}
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Bỏ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Modal 2: Custom Remove From Branch Confirmation Dialog ── */}
      {showRemoveConfirm && (
        <div
          id="modalRemoveConfirmBackdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: 16,
          }}
          onClick={() => {
            if (!isRemoving) setShowRemoveConfirm(false);
          }}
        >
          <div
            id="modalRemoveConfirmDialog"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 460,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid #fecaca',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  Xác nhận gỡ sản phẩm khỏi chi nhánh
                </h4>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Thao tác sẽ hủy phân bổ sản phẩm tại chi nhánh này
                </div>
              </div>
            </div>

            {removeError && (
              <div
                id="removeConfirmErrorBanner"
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {removeError}
              </div>
            )}

            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn gỡ sản phẩm{' '}
              <strong style={{ color: '#0f172a' }}>"{product.name}"</strong> ({product.sku}) khỏi danh mục kinh doanh của chi nhánh{' '}
              <strong style={{ color: '#0f766e' }}>"{product.storeName}"</strong> không?
            </div>

            {/* Inventory Constraint Notice */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: product.currentStock > 0 ? '#fffbeb' : '#f8fafc',
                border: `1px solid ${product.currentStock > 0 ? '#fde68a' : '#e2e8f0'}`,
                fontSize: 12,
                color: product.currentStock > 0 ? '#b45309' : '#475569',
              }}
            >
              <div>
                Tồn kho thực tế hiện tại:{' '}
                <strong style={{ color: product.currentStock > 0 ? '#d97706' : '#0f766e' }}>
                  {fmt(product.currentStock)} {product.unit}
                </strong>
              </div>
              {product.currentStock > 0 ? (
                <div style={{ marginTop: 4, fontWeight: 500 }}>
                  ⚠️ Sản phẩm đang có tồn kho tại chi nhánh. Hệ thống sẽ chặn thao tác gỡ để đảm bảo an toàn kho.
                </div>
              ) : (
                <div style={{ marginTop: 4, color: '#64748b' }}>
                  ✓ Tồn kho bằng 0. Sản phẩm sẽ được gỡ khỏi danh mục phân bổ an toàn (bảo toàn lịch sử giao dịch).
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                id="btnCancelRemove"
                disabled={isRemoving}
                onClick={() => setShowRemoveConfirm(false)}
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: isRemoving ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                id="btnConfirmRemoveProduct"
                disabled={isRemoving}
                onClick={handleConfirmRemove}
                style={{
                  height: 34,
                  padding: '0 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: isRemoving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isRemoving && <Loader2 size={14} className="animate-spin" />}
                <span>{isRemoving ? 'Đang xử lý...' : 'Xác nhận gỡ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditStoreProductModal;
