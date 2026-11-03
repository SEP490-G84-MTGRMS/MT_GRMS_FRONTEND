import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import type {
  StoreProductItem,
  StoreSummary,
  EditStoreProductInput,
} from '../types/storeProduct.types';
import {
  X,
  AlertTriangle,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Store,
  Package,
  Building2,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';

interface EditStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StoreProductItem | null;
  stores?: StoreSummary[];
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
  stores = [],
  onSave,
  onRemove,
}) => {
  // Input fields state
  const [retailPriceStr, setRetailPriceStr] = useState<string>('');
  const [minOrderQuantityStr, setMinOrderQuantityStr] = useState<string>('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Validation & Error states
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  // Sub-dialogs: confirmation on unsaved changes & removal confirmation
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState<boolean>(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string>('');

  // Reset and sync state when product changes or modal opens
  useEffect(() => {
    if (isOpen && product) {
      setRetailPriceStr(String(product.retailPrice ?? 0));
      setMinOrderQuantityStr(String(product.minOrderQuantity ?? 1));
      setStatus(product.status ?? 'Active');
      setFieldErrors({});
      setFormError('');
      setIsSaving(false);
      setIsRemoving(false);
      setShowUnsavedConfirm(false);
      setShowRemoveConfirm(false);
      setRemoveError('');
    } else if (!isOpen) {
      setRetailPriceStr('');
      setMinOrderQuantityStr('');
      setFieldErrors({});
      setFormError('');
      setShowUnsavedConfirm(false);
      setShowRemoveConfirm(false);
    }
  }, [isOpen, product]);

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  // Look up store address if stores prop is provided
  const matchedStore = useMemo(() => {
    if (!product) return null;
    return stores.find((s) => s.id === product.storeId || s.code === product.storeCode);
  }, [stores, product]);

  const storeAddress = matchedStore?.address || 'Khu vực hoạt động kinh doanh chi nhánh';

  // Parse numeric values safely
  const parsedPrice = useMemo(() => {
    const trimmed = retailPriceStr.trim();
    if (!trimmed) return NaN;
    const num = Number(trimmed);
    return isNaN(num) ? NaN : num;
  }, [retailPriceStr]);

  // Gross profit calculation
  const profitMarginInfo = useMemo(() => {
    if (!product || isNaN(parsedPrice) || parsedPrice <= 0) return null;
    const cost = product.costPrice || 0;
    const profit = parsedPrice - cost;
    const margin = parsedPrice > 0 ? (profit / parsedPrice) * 100 : 0;
    return {
      profit,
      margin: margin.toFixed(1),
      isNegative: profit < 0,
    };
  }, [product, parsedPrice]);

  // Determine whether user made any changes to initial data
  const isDirty = useMemo(() => {
    if (!product) return false;
    const priceChanged = !isNaN(parsedPrice) && parsedPrice !== product.retailPrice;
    const statusChanged = status !== product.status;
    return priceChanged || statusChanged;
  }, [product, parsedPrice, status]);

  // Close handler with dirty check
  const handleRequestClose = useCallback(() => {
    if (isSaving || isRemoving) return;
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

  // Form validation
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

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving || isRemoving) return;

    if (!validateForm()) return;

    setIsSaving(true);
    setFormError('');

    try {
      await onSave(product.storeId, product.productId, {
        retailPrice: parsedPrice,
        status,
      });
      onClose();
    } catch (err: any) {
      setFormError(
        err.response?.data?.message ||
          err.message ||
          'Không thể lưu thay đổi cấu hình sản phẩm. Vui lòng kiểm tra lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Removal Handler
  const handleConfirmRemove = async () => {
    if (!onRemove || !product || isRemoving) return;

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
            maxWidth: 920,
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
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to right, #f8fafc, #ffffff)',
              flexShrink: 0,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Chỉnh Sửa Sản Phẩm Tại Chi Nhánh
              </h3>
            </div>
            <button
              type="button"
              id="btnCloseEditProductModalX"
              onClick={handleRequestClose}
              disabled={isSaving || isRemoving}
              style={{
                background: 'none',
                border: 'none',
                cursor: isSaving || isRemoving ? 'not-allowed' : 'pointer',
                color: '#94a3b8',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Đóng popup (Esc)"
            >
              <X size={20} />
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
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {/* Form Global Error Banner */}
              {formError && (
                <div
                  id="editProductFormErrorBanner"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, lineHeight: 1.4 }}>{formError}</div>
                </div>
              )}

              {/* GROUP A – THÔNG TIN CỬA HÀNG / CHI NHÁNH (Read-only) */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 12,
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: 6,
                  }}
                >
                  <Store size={16} style={{ color: '#0d9488' }} />
                  <span>THÔNG TIN CHI NHÁNH</span>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                    <Lock size={12} /> Chỉ đọc
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Mã cửa hàng
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.storeCode || product.storeId.slice(0, 8)}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Tên cửa hàng / Chi nhánh
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.storeName}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Địa chỉ chi nhánh
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={storeAddress}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.84rem',
                        color: '#475569',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* GROUP B – THÔNG TIN SẢN PHẨM (Read-only) */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 12,
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: 6,
                  }}
                >
                  <Package size={16} style={{ color: '#0d9488' }} />
                  <span>THÔNG TIN SẢN PHẨM (CATALOG CHUẨN)</span>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                    <Lock size={12} /> Chỉ đọc
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Mã SKU
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.sku}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: '#0d9488',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Tên sản phẩm
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.name}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Mã vạch (Barcode)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.barcode || 'N/A'}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.84rem',
                        fontFamily: 'monospace',
                        color: '#475569',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Ngành hàng
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.category || 'Khác'}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.84rem',
                        color: '#334155',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Đơn vị tính (ĐVT)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.unit}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#334155',
                        textAlign: 'center',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Giá vốn nhà cung cấp
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${fmt(product.costPrice)} đ`}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#334155',
                        textAlign: 'right',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Tồn kho thực tế (SOH)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${fmt(product.currentStock)} ${product.unit}`}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: product.currentStock > 0 ? '#0f766e' : '#b91c1c',
                        textAlign: 'right',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* GROUP C – THÔNG TIN NHÀ CUNG CẤP (Read-only) */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 12,
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: 6,
                  }}
                >
                  <Building2 size={16} style={{ color: '#0d9488' }} />
                  <span>THÔNG TIN NHÀ CUNG CẤP CHÍNH</span>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                    <Lock size={12} /> Chỉ đọc
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Mã nhà cung cấp
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.primarySupplierCode || 'NCC-N/A'}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.86rem',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Tên nhà cung cấp
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={product.primarySupplierName || 'Chưa liên kết nhà cung cấp'}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* GROUP D – CẤU HÌNH KINH DOANH TẠI CHI NHÁNH (Editable) */}
              <div
                id="groupStoreBusinessConfig"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #0d9488',
                  borderRadius: 10,
                  padding: '16px 20px',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.08)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#0f766e',
                    marginBottom: 14,
                    borderBottom: '1px solid #ccfbf1',
                    paddingBottom: 8,
                  }}
                >
                  <SlidersHorizontal size={18} />
                  <span>CẤU HÌNH KINH DOANH TẠI CHI NHÁNH</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  {/* Field 1: Giá bán lẻ niêm yết (VNĐ) */}
                  <div>
                    <label
                      htmlFor="inputEditRetailPrice"
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Giá bán lẻ niêm yết (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="inputEditRetailPrice"
                        type="number"
                        min="1"
                        step="100"
                        value={retailPriceStr}
                        onChange={(e) => {
                          setRetailPriceStr(e.target.value);
                          if (fieldErrors.retailPrice) {
                            setFieldErrors((prev) => ({ ...prev, retailPrice: undefined }));
                          }
                        }}
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 36px 0 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${fieldErrors.retailPrice ? '#ef4444' : '#cbd5e1'}`,
                          backgroundColor: '#ffffff',
                          fontSize: '0.94rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.88rem',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        đ
                      </span>
                    </div>

                    {fieldErrors.retailPrice && (
                      <div
                        id="errEditRetailPrice"
                        style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4, fontWeight: 500 }}
                      >
                        {fieldErrors.retailPrice}
                      </div>
                    )}

                    {/* Dynamic Gross Profit Margin */}
                    {profitMarginInfo && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: '0.8rem',
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: profitMarginInfo.isNegative ? '#fef2f2' : '#f0fdf4',
                          color: profitMarginInfo.isNegative ? '#b91c1c' : '#15803d',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {profitMarginInfo.isNegative ? (
                          <>
                            <AlertTriangle size={14} />
                            <span>Cảnh báo: Bán dưới giá vốn! Lỗ gộp: {fmt(profitMarginInfo.profit)} đ ({profitMarginInfo.margin}%)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Lãi gộp ước tính: +{fmt(profitMarginInfo.profit)} đ (Tỷ suất: {profitMarginInfo.margin}%)</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Field 2: Số lượng đặt hàng tối thiểu (MOQ) */}
                  <div>
                    <label
                      htmlFor="inputEditMoq"
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Số lượng đặt hàng tối thiểu (MOQ)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="inputEditMoq"
                        type="number"
                        min="0"
                        step="1"
                        value={minOrderQuantityStr}
                        readOnly
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 70px 0 12px',
                          borderRadius: 8,
                          border: '1.5px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          fontSize: '0.94rem',
                          fontWeight: 700,
                          color: '#475569',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.82rem',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {product.unit}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                      MOQ lấy từ điều khoản nhà cung cấp, chỉ xem tại màn hình chi nhánh.
                    </div>

                    {fieldErrors.minOrderQuantity && (
                      <div
                        id="errEditMoq"
                        style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4, fontWeight: 500 }}
                      >
                        {fieldErrors.minOrderQuantity}
                      </div>
                    )}
                  </div>
                </div>

                {/* Field 3: Trạng thái kinh doanh tại chi nhánh */}
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                    Trạng thái kinh doanh tại chi nhánh <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label
                      id="optStatusActive"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: `1.5px solid ${status === 'Active' ? '#0d9488' : '#e2e8f0'}`,
                        backgroundColor: status === 'Active' ? '#f0fdfa' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="storeProductStatus"
                        value="Active"
                        checked={status === 'Active'}
                        onChange={() => setStatus('Active')}
                        style={{ accentColor: '#0d9488', width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f766e' }}>
                        Đang kinh doanh
                      </span>
                    </label>

                    <label
                      id="optStatusInactive"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: `1.5px solid ${status === 'Inactive' ? '#d97706' : '#e2e8f0'}`,
                        backgroundColor: status === 'Inactive' ? '#fffbeb' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="storeProductStatus"
                        value="Inactive"
                        checked={status === 'Inactive'}
                        onChange={() => setStatus('Inactive')}
                        style={{ accentColor: '#d97706', width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#b45309' }}>
                        Tạm ngừng bán
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
                flexShrink: 0,
              }}
            >
              {/* Left: Destructive Action - Remove from Store */}
              {onRemove ? (
                <button
                  type="button"
                  id="btnRemoveFromStore"
                  onClick={() => setShowRemoveConfirm(true)}
                  disabled={isSaving || isRemoving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 38,
                    padding: '0 16px',
                    borderRadius: 6,
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff',
                    color: '#dc2626',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: isSaving || isRemoving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving && !isRemoving) e.currentTarget.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  <Trash2 size={16} />
                  <span>Xóa khỏi chi nhánh</span>
                </button>
              ) : (
                <div />
              )}

              {/* Right: Cancel & Save */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  id="btnCancelEditProduct"
                  onClick={handleRequestClose}
                  disabled={isSaving || isRemoving}
                  className="po-btn po-btn-secondary"
                  style={{
                    height: 38,
                    padding: '0 20px',
                    borderRadius: 6,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: isSaving || isRemoving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  id="btnSaveEditProduct"
                  onClick={handleSubmit}
                  disabled={isSaving || isRemoving}
                  className="po-btn po-btn-primary"
                  style={{
                    height: 38,
                    padding: '0 24px',
                    borderRadius: 6,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: isSaving || isRemoving ? 'not-allowed' : 'pointer',
                    opacity: isSaving || isRemoving ? 0.65 : 1,
                  }}
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  <span>{isSaving ? 'Đang lưu thay đổi...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Sub-dialog: Confirmation on Unsaved Changes ── */}
      {showUnsavedConfirm && (
        <div
          id="modalUnsavedChangesConfirmBackdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setShowUnsavedConfirm(false)}
        >
          <div
            id="modalUnsavedChangesConfirmDialog"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Hủy thay đổi chưa lưu?
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  Bạn có một số cấu hình đã chỉnh sửa nhưng chưa được lưu lại. Nếu đóng bây giờ, các thay
                  đổi này sẽ bị hủy bỏ.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                id="btnResumeEditing"
                onClick={() => setShowUnsavedConfirm(false)}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                type="button"
                id="btnConfirmDiscardChanges"
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  onClose();
                }}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#dc2626',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-dialog: Confirmation on Remove Product from Store ── */}
      {showRemoveConfirm && (
        <div
          id="modalRemoveConfirmBackdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => !isRemoving && setShowRemoveConfirm(false)}
        >
          <div
            id="modalRemoveConfirmDialog"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid #fecaca',
              overflow: 'hidden',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.02rem', fontWeight: 700, color: '#991b1b' }}>
                  Xác nhận gỡ sản phẩm khỏi chi nhánh
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  Bạn có chắc chắn muốn gỡ sản phẩm{' '}
                  <strong style={{ color: '#0f172a' }}>{product.name}</strong> ({product.sku}) khỏi chi
                  nhánh <strong style={{ color: '#0f172a' }}>{product.storeName}</strong> không?
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    fontSize: '0.78rem',
                    color: '#92400e',
                    lineHeight: 1.4,
                  }}
                >
                  &bull; Thao tác này <strong>KHÔNG</strong> xóa sản phẩm khỏi danh mục sản phẩm tổng (Master Catalog).<br />
                  &bull; <strong>KHÔNG</strong> làm mất dữ liệu lịch sử đơn hàng hoặc chứng từ kho đã có.
                </div>
              </div>
            </div>

            {removeError && (
              <div
                style={{
                  marginTop: 14,
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                }}
              >
                {removeError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                id="btnCancelRemoveProduct"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemoving}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: isRemoving ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id="btnConfirmRemoveProduct"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                style={{
                  height: 36,
                  padding: '0 18px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#dc2626',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: isRemoving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isRemoving && <Loader2 size={15} className="animate-spin" />}
                <span>{isRemoving ? 'Đang gỡ...' : 'Xác nhận gỡ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
