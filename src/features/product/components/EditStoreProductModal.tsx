import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC, FormEvent, CSSProperties, ReactNode } from 'react';
import type {
  StoreProductItem,
  StoreSummary,
  EditStoreProductInput,
  StoreProductUnitPrice,
} from '../types/storeProduct.types';
import { X, Save, AlertTriangle, Loader2, AlertCircle, History } from 'lucide-react';
import { PriceHistoryModal } from './PriceHistoryModal';
import '../../supplier/supplier.css';

interface EditStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StoreProductItem | null;
  stores?: StoreSummary[];
  onSave: (storeId: string, productId: string, input: EditStoreProductInput) => Promise<void> | void;
  onToggleStatus?: (item: StoreProductItem) => Promise<void> | void;
}

interface FieldErrors {
  retailPrice?: string;
  minOrderQuantity?: string;
}

/** 4 cột đều: Nhãn | Ô | Nhãn | Ô */
const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  columnGap: 10,
  rowGap: 12,
  alignItems: 'center',
};

const labelStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: '#475569',
  textAlign: 'left',
  lineHeight: 1.3,
  minWidth: 0,
};

const inputBase: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 36,
  padding: '0 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  fontWeight: 600,
  color: '#0f172a',
  boxSizing: 'border-box',
  outline: 'none',
  textAlign: 'left',
};

const readOnlyInput: CSSProperties = {
  ...inputBase,
  backgroundColor: '#f8fafc',
  color: '#475569',
  cursor: 'default',
};

const controlCellStyle: CSSProperties = {
  minWidth: 0,
  width: '100%',
};

/** Mỗi field chiếm 2 cột lưới (nhãn + ô). wide = ô kéo dài 3 cột. */
function FieldPair({
  label,
  children,
  htmlFor,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
  wide?: boolean;
}) {
  return (
    <>
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
      </label>
      <div style={{ ...controlCellStyle, gridColumn: wide ? 'span 3' : 'span 1' }}>{children}</div>
    </>
  );
}

function GridDivider() {
  return <div style={{ gridColumn: '1 / -1', height: 1, background: '#e2e8f0', margin: '2px 0' }} />;
}

export const EditStoreProductModal: FC<EditStoreProductModalProps> = ({
  isOpen,
  onClose,
  product,
  stores = [],
  onSave,
}) => {
  const [retailPriceStr, setRetailPriceStr] = useState<string>('');
  const [minOrderQuantityStr, setMinOrderQuantityStr] = useState<string>('');
  const [unitPriceDrafts, setUnitPriceDrafts] = useState<StoreProductUnitPrice[]>([]);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState<boolean>(false);
  const [showPriceHistory, setShowPriceHistory] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && product) {
      setRetailPriceStr(String(product.retailPrice ?? 0));
      setMinOrderQuantityStr(String(product.minOrderQuantity ?? 1));
      const units =
        product.unitPrices && product.unitPrices.length > 0
          ? product.unitPrices.map((u) => ({ ...u }))
          : [
              {
                unitName: product.unit || 'Cái',
                conversionRate: 1,
                price: product.retailPrice ?? 0,
                isBaseUnit: true,
              },
            ];
      setUnitPriceDrafts(units);
      setStatus(product.status ?? 'Active');
      setFieldErrors({});
      setFormError('');
      setIsSaving(false);
      setShowUnsavedConfirm(false);
    } else if (!isOpen) {
      setRetailPriceStr('');
      setMinOrderQuantityStr('');
      setUnitPriceDrafts([]);
      setFieldErrors({});
      setFormError('');
      setShowUnsavedConfirm(false);
    }
  }, [isOpen, product]);

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  const matchedStore = useMemo(() => {
    if (!product) return null;
    return stores.find((s) => s.id === product.storeId || s.code === product.storeCode);
  }, [stores, product]);

  const storeAddress = matchedStore?.address || '';

  const parsedPrice = useMemo(() => {
    const trimmed = retailPriceStr.trim();
    if (!trimmed) return NaN;
    const num = Number(trimmed);
    return isNaN(num) ? NaN : num;
  }, [retailPriceStr]);

  const isDirty = useMemo(() => {
    if (!product) return false;
    const priceChanged = !isNaN(parsedPrice) && parsedPrice !== product.retailPrice;
    const statusChanged = status !== (product.status ?? 'Active');
    const initialUnits = product.unitPrices && product.unitPrices.length > 0 ? product.unitPrices : null;
    let unitsChanged = false;
    if (initialUnits) {
      unitsChanged =
        unitPriceDrafts.length !== initialUnits.length ||
        unitPriceDrafts.some((u, i) => {
          const init = initialUnits[i];
          return !init || u.price !== init.price || u.unitName !== init.unitName;
        });
    }
    return priceChanged || statusChanged || unitsChanged;
  }, [product, parsedPrice, status, unitPriceDrafts]);

  const handleUnitPriceChange = (index: number, raw: string) => {
    const num = Number(raw);
    setUnitPriceDrafts((prev) => {
      const next = prev.map((u, i) => (i === index ? { ...u, price: Number.isFinite(num) ? num : 0 } : u));
      const base = next.find((u) => u.isBaseUnit) || next[0];
      if (base && base.price > 0) {
        setRetailPriceStr(String(base.price));
      }
      return next;
    });
    if (fieldErrors.retailPrice) {
      setFieldErrors((prev) => ({ ...prev, retailPrice: undefined }));
    }
  };

  const handleRequestClose = useCallback(() => {
    if (isSaving) return;
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  }, [isSaving, isDirty, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUnsavedConfirm) {
          setShowUnsavedConfirm(false);
        } else {
          handleRequestClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showUnsavedConfirm, handleRequestClose]);

  if (!isOpen || !product) return null;

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const trimmedPrice = retailPriceStr.trim();
    if (!trimmedPrice) {
      errors.retailPrice = 'Giá bán không được để trống.';
    } else if (isNaN(parsedPrice)) {
      errors.retailPrice = 'Giá bán phải là số hợp lệ.';
    } else if (parsedPrice <= 0) {
      errors.retailPrice = 'Giá bán phải lớn hơn 0.';
    } else if (parsedPrice > 1_000_000_000) {
      errors.retailPrice = 'Giá bán vượt quá giới hạn.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!validateForm()) return;

    setIsSaving(true);
    setFormError('');

    try {
      const payload: EditStoreProductInput = {
        retailPrice: parsedPrice,
        status,
        ...(product.unitPrices && product.unitPrices.length > 0 ? { unitPrices: unitPriceDrafts } : {}),
      };

      await onSave(product.storeId, product.productId, payload);
      onClose();
    } catch (err: any) {
      setFormError(
        err.response?.data?.message ||
          err.message ||
          'Không thể lưu thay đổi. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        id="modalEditStoreProductBackdrop"
        className="modal-overlay"
        style={{ zIndex: 1050 }}
        onClick={handleRequestClose}
      >
        <div
          id="modalEditStoreProductDialog"
          className="modal-box"
          style={{
            maxWidth: 860,
            width: '96%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
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
                <Save size={18} />
              </div>
              <h2 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Chỉnh sửa sản phẩm tại chi nhánh
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowPriceHistory(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#7c3aed',
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: 6,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <History size={13} />
                Lịch sử giá
              </button>
              <button
                type="button"
                id="btnCloseEditProductModalX"
                onClick={handleRequestClose}
                disabled={isSaving}
                className="modal-close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  color: '#64748b',
                  padding: 4,
                  borderRadius: 6,
                }}
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <form
            id="formEditStoreProduct"
            onSubmit={handleSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
          >
            <div
              className="modal-body"
              style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {formError && (
                <div
                  id="editProductFormErrorBanner"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    marginBottom: 12,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    color: '#b91c1c',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              <div style={formGridStyle}>
                {/* Group A - Store Info */}
                <FieldPair label="Mã chi nhánh" htmlFor="inputStoreCode">
                  <input
                    id="inputStoreCode"
                    type="text"
                    readOnly
                    value={product.storeCode || matchedStore?.code || ''}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <FieldPair label="Tên chi nhánh" htmlFor="inputStoreName">
                  <input
                    id="inputStoreName"
                    type="text"
                    readOnly
                    value={product.storeName || matchedStore?.name || ''}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <FieldPair label="Địa chỉ chi nhánh" htmlFor="inputStoreAddress" wide>
                  <input
                    id="inputStoreAddress"
                    type="text"
                    readOnly
                    value={storeAddress || matchedStore?.address || ''}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <GridDivider />

                {/* Group B - Product Info */}
                <FieldPair label="SKU" htmlFor="inputProductSku">
                  <input
                    id="inputProductSku"
                    type="text"
                    readOnly
                    value={product.sku}
                    style={{ ...readOnlyInput, fontFamily: 'monospace' }}
                  />
                </FieldPair>

                <FieldPair label="Sản phẩm" htmlFor="inputProductName">
                  <input id="inputProductName" type="text" readOnly value={product.name} style={readOnlyInput} />
                </FieldPair>

                <FieldPair label="Mã vạch" htmlFor="inputProductBarcode">
                  <input
                    id="inputProductBarcode"
                    type="text"
                    readOnly
                    value={product.barcode}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <FieldPair label="Ngành hàng" htmlFor="inputProductCategory">
                  <input
                    id="inputProductCategory"
                    type="text"
                    readOnly
                    value={product.category}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <FieldPair label="Đơn vị nhập" htmlFor="inputProductUnit">
                  <input id="inputProductUnit" type="text" readOnly value={product.unit} style={readOnlyInput} />
                </FieldPair>

                <FieldPair label="Giá vốn" htmlFor="inputCostPrice">
                  <input
                    id="inputCostPrice"
                    type="text"
                    readOnly
                    value={`${fmt(product.costPrice)} đ`}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <FieldPair label="Tồn kho" htmlFor="inputCurrentStock">
                  <input
                    id="inputCurrentStock"
                    type="text"
                    readOnly
                    value={`${product.currentStock} ${product.unit}`}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <FieldPair label="MOQ" htmlFor="inputEditMoq">
                  <input
                    id="inputEditMoq"
                    type="number"
                    readOnly
                    value={Number(minOrderQuantityStr) || 1}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <GridDivider />

                {/* Group C - Supplier Info */}
                <FieldPair label="Mã NCC" htmlFor="inputSupplierCode">
                  <input
                    id="inputSupplierCode"
                    type="text"
                    readOnly
                    value={product.primarySupplierCode || ''}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <FieldPair label="Tên NCC" htmlFor="inputSupplierName">
                  <input
                    id="inputSupplierName"
                    type="text"
                    readOnly
                    value={product.primarySupplierName || ''}
                    style={readOnlyInput}
                  />
                </FieldPair>

                <GridDivider />

                {/* Group D - Editable fields */}
                <FieldPair label="Giá bán lẻ niêm yết" htmlFor="inputRetailPrice">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <input
                        id="inputRetailPrice"
                        type="number"
                        min={0}
                        step={100}
                        value={retailPriceStr}
                        onChange={(e) => {
                          setRetailPriceStr(e.target.value);
                          if (fieldErrors.retailPrice) {
                            setFieldErrors((prev) => ({ ...prev, retailPrice: undefined }));
                          }
                        }}
                        style={{
                          ...inputBase,
                          borderColor: fieldErrors.retailPrice ? '#ef4444' : '#cbd5e1',
                        }}
                      />
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, flexShrink: 0 }}>đ</span>
                    </div>
                    {product.costPrice != null && !isNaN(parsedPrice) && (
                      <div style={{ fontSize: 11.5, lineHeight: 1.35 }}>
                        {parsedPrice >= product.costPrice ? (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>
                            Lãi gộp: +{fmt(parsedPrice - product.costPrice)} đ (
                            {parsedPrice > 0
                              ? (((parsedPrice - product.costPrice) / parsedPrice) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>
                            Bán dưới giá vốn! Lỗ: -{fmt(product.costPrice - parsedPrice)} đ
                          </span>
                        )}
                      </div>
                    )}
                    {fieldErrors.retailPrice && (
                      <div style={{ fontSize: 12, color: '#ef4444' }}>{fieldErrors.retailPrice}</div>
                    )}
                  </div>
                </FieldPair>

                <FieldPair label="Trạng thái">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      minHeight: 36,
                      flexWrap: 'wrap',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#15803d',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <input
                        type="radio"
                        id="statusActive"
                        name="storeProductStatus"
                        value="Active"
                        checked={status === 'Active'}
                        onChange={() => setStatus('Active')}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Đang KD</span>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <input
                        type="radio"
                        id="statusInactive"
                        name="storeProductStatus"
                        value="Inactive"
                        checked={status === 'Inactive'}
                        onChange={() => setStatus('Inactive')}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Tạm ngừng</span>
                    </label>
                  </div>
                </FieldPair>

                {product.costPrice && parsedPrice > 0 && parsedPrice < product.costPrice && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '8px 12px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #F59E0B',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: '#92400E',
                    }}
                  >
                    <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Cảnh báo giá bán:</strong> Giá bán tại chi nhánh đang thấp hơn giá vốn (
                      {fmt(product.costPrice)} đ). Cần sự xác nhận của Quản lý chi nhánh.
                    </span>
                  </div>
                )}

                {unitPriceDrafts.length > 1 && (
                  <>
                    <GridDivider />
                    {unitPriceDrafts.map((u, idx) => (
                      <FieldPair
                        key={`${u.unitName}-${idx}`}
                        label={`Giá ${u.unitName}`}
                        htmlFor={`unitPrice-${idx}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <input
                            id={`unitPrice-${idx}`}
                            type="number"
                            min={0}
                            step={100}
                            value={u.price}
                            onChange={(e) => handleUnitPriceChange(idx, e.target.value)}
                            style={{
                              ...inputBase,
                              borderColor:
                                fieldErrors.retailPrice && u.isBaseUnit ? '#ef4444' : '#cbd5e1',
                            }}
                          />
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, flexShrink: 0 }}>
                            đ
                          </span>
                        </div>
                      </FieldPair>
                    ))}
                  </>
                )}
              </div>
            </div>

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
                id="btnCancelEditProduct"
                onClick={handleRequestClose}
                disabled={isSaving}
                className="po-btn po-btn-secondary"
                style={{ height: 36, padding: '0 16px', fontSize: 13 }}
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                id="btnSaveEditProduct"
                disabled={isSaving}
                className="po-btn po-btn-primary"
                style={{
                  height: 36,
                  padding: '0 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  backgroundColor: '#0f766e',
                  borderColor: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: isSaving ? 0.65 : 1,
                }}
              >
                {isSaving ? (
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

      {showUnsavedConfirm && (
        <div
          id="modalUnsavedChangesConfirmBackdrop"
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setShowUnsavedConfirm(false)}
        >
          <div
            id="modalUnsavedChangesConfirmDialog"
            className="modal-box"
            style={{
              maxWidth: 420,
              width: '90%',
              padding: 24,
              borderRadius: 12,
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
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
                <AlertTriangle size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                Hủy thay đổi chưa lưu?
              </h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
              Bạn có một số thay đổi chưa lưu. Bạn có chắc chắn muốn hủy bỏ các thay đổi này không?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                id="btnResumeEditing"
                onClick={() => setShowUnsavedConfirm(false)}
                className="po-btn po-btn-secondary"
                style={{ height: 34, padding: '0 14px', fontSize: 13 }}
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
                Hủy bỏ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriceHistory && product && (
        <PriceHistoryModal
          isOpen={showPriceHistory}
          onClose={() => setShowPriceHistory(false)}
          productId={product.productId}
          productName={product.name}
          branchId={product.storeId}
          branchName={product.storeName}
        />
      )}
    </>
  );
};
