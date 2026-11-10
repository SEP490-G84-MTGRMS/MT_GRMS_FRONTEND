import { useState } from 'react';
import type { CSSProperties, FC, FormEvent, ReactNode } from 'react';
import type { SupplierProductItem, EditSupplierProductInput } from '../../types/supplier.types';
import { X, Save, Loader2, AlertCircle, Store } from 'lucide-react';
import '../../supplier.css';

export interface BranchContextInfo {
  branchId: string;
  branchName: string;
  branchInfo?: any;
}

export interface EditSupplierProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SupplierProductItem | null;
  supplierName: string;
  branchContext?: BranchContextInfo | null;
  onSave: (input: EditSupplierProductInput) => void | Promise<void>;
  onSaveBranchProduct?: (
    branchId: string,
    productId: string,
    input: { retailPrice: number; status: 'Active' | 'Inactive' }
  ) => void | Promise<void>;
}

interface EditSupplierProductFormProps {
  item: SupplierProductItem;
  supplierName: string;
  branchContext?: BranchContextInfo | null;
  onSave: (input: EditSupplierProductInput) => void | Promise<void>;
  onSaveBranchProduct?: (
    branchId: string,
    productId: string,
    input: { retailPrice: number; status: 'Active' | 'Inactive' }
  ) => void | Promise<void>;
  onClose: () => void;
}

const labelStyle: CSSProperties = {
  width: 140,
  flexShrink: 0,
  fontSize: 13,
  fontWeight: 600,
  color: '#475569',
  textAlign: 'left',
};

const inputBase: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 38,
  padding: '0 12px',
  borderRadius: 8,
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
  textAlign: 'left',
};

const readonlyInputStyle: CSSProperties = {
  ...inputBase,
  border: '1px solid #cbd5e1',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  cursor: 'not-allowed',
};

const editableInputStyle: CSSProperties = {
  ...inputBase,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
};

const FieldRow: FC<{ label: string; children: ReactNode; htmlFor?: string }> = ({
  label,
  children,
  htmlFor,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <label htmlFor={htmlFor} style={labelStyle}>
      {label}
    </label>
    {children}
  </div>
);

const StatusToggle: FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      width: 52,
      height: 28,
      borderRadius: 999,
      border: 'none',
      padding: 3,
      cursor: 'pointer',
      backgroundColor: checked ? '#3b82f6' : '#9ca3af',
      transition: 'background-color 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: checked ? 'flex-end' : 'flex-start',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        display: 'block',
      }}
    />
  </button>
);

const EditSupplierProductForm: FC<EditSupplierProductFormProps> = ({
  item,
  supplierName,
  branchContext,
  onSave,
  onSaveBranchProduct,
  onClose,
}) => {
  const isBranchMode = !!branchContext && branchContext.branchId !== 'ALL';
  const branchInfo = branchContext?.branchInfo;

  const masterCost = item.costPrice ?? 0;
  const initialWholesalePrice = item.agreedPrice > 0 ? item.agreedPrice : masterCost;
  const [purchasePrice, setPurchasePrice] = useState<number>(initialWholesalePrice);
  const [moq, setMoq] = useState<number>(item.moq);
  const [allowedShortageQty, setAllowedShortageQty] = useState<number>(item.allowedShortageQty ?? 0);

  // Branch-specific retail price & status
  const initialBranchPrice =
    branchInfo?.retailPrice ?? (item.costPrice ?? initialWholesalePrice);
  const [branchRetailPrice, setBranchRetailPrice] = useState<number>(initialBranchPrice);

  const initialIsActive = isBranchMode
    ? (branchInfo?.status ? branchInfo.status === 'Active' : item.status === 'Active')
    : item.status === 'Active';
  const [isActive, setIsActive] = useState<boolean>(initialIsActive);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const unitLabel = item.baseUoM || item.deliveryUoM || 'Cái';

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isBranchMode) {
      if (isNaN(branchRetailPrice) || branchRetailPrice < 0) {
        setErrorMsg('Giá bán tại chi nhánh không được âm.');
        return;
      }

      setIsSaving(true);
      try {
        if (onSaveBranchProduct && branchContext) {
          await onSaveBranchProduct(branchContext.branchId, item.productId, {
            retailPrice: branchRetailPrice,
            status: isActive ? 'Active' : 'Inactive',
          });
        }
        onClose();
      } catch {
        // Parent shows toast; keep modal open
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Whole-system mode
    if (isNaN(purchasePrice) || purchasePrice < 0) {
      setErrorMsg('Giá nhập không được âm.');
      return;
    }

    if (moq < 1) {
      setErrorMsg('MOQ phải từ 1 trở lên.');
      return;
    }

    if (isNaN(allowedShortageQty) || allowedShortageQty < 0) {
      setErrorMsg('Số lượng thiếu hàng cho phép phải ≥ 0.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: item.id,
        deliveryUoM: unitLabel,
        agreedPrice: purchasePrice,
        moq,
        allowedShortageQty,
        isPrimary: item.isPrimary,
        supplierProductCode: item.supplierProductCode,
        status: isActive ? 'Active' : 'Inactive',
      });
      onClose();
    } catch {
      // Parent shows toast; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
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
              backgroundColor: isBranchMode ? '#ecfdf5' : '#f0fdfa',
              color: isBranchMode ? '#059669' : '#0f766e',
              border: `1px solid ${isBranchMode ? '#a7f3d0' : '#ccfbf1'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isBranchMode ? <Store size={18} /> : <Save size={18} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {isBranchMode ? 'Chỉnh sửa sản phẩm tại chi nhánh' : 'Chỉnh sửa điều khoản cung ứng'}
              </h2>
              {isBranchMode && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: '#ecfdf5',
                    color: '#065f46',
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: '1px solid #a7f3d0',
                  }}
                >
                  <Store size={11} color="#059669" />
                  <span>{branchContext?.branchName}</span>
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
              {isBranchMode
                ? `Chỉ cập nhật giá bán & trạng thái tại "${branchContext?.branchName}", không ảnh hưởng các chi nhánh khác.`
                : 'Cập nhật giá sỉ và trạng thái cung ứng của NCC cho toàn bộ chuỗi.'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
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

      <form
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      >
        <div
          className="modal-body"
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {errorMsg && (
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
              <span>{errorMsg}</span>
            </div>
          )}

          <FieldRow label="Nhà cung cấp">
            <input type="text" value={supplierName} readOnly className="form-input" style={readonlyInputStyle} />
          </FieldRow>

          <FieldRow label="Sản phẩm">
            <input type="text" value={item.name} readOnly className="form-input" style={readonlyInputStyle} />
          </FieldRow>

          <FieldRow label="SKU">
            <input
              type="text"
              value={item.sku}
              readOnly
              className="form-input"
              style={{ ...readonlyInputStyle, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            />
          </FieldRow>

          <FieldRow label="Barcode">
            <input
              type="text"
              value={item.barcode || '—'}
              readOnly
              className="form-input"
              style={{ ...readonlyInputStyle, fontFamily: 'var(--font-mono, monospace)' }}
            />
          </FieldRow>

          <FieldRow label="Đơn vị tính">
            <input type="text" value={unitLabel} readOnly className="form-input" style={readonlyInputStyle} />
          </FieldRow>

          <FieldRow label={isBranchMode ? 'Trạng thái tại CN' : 'Trạng thái'}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, height: 38 }}>
              <StatusToggle checked={isActive} onChange={setIsActive} />
              <span style={{ fontSize: 13.5, color: isActive ? '#15803d' : '#64748b', fontWeight: 600 }}>
                {isActive ? 'Enable (Đang kinh doanh)' : 'Disable (Tạm ngưng)'}
              </span>
              {isBranchMode && (
                <span style={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
                  (Chỉ áp dụng tại {branchContext?.branchName})
                </span>
              )}
            </div>
          </FieldRow>

          {isBranchMode ? (
            <>
              {/* Giá bán lẻ tại chi nhánh */}
              <FieldRow label="Giá bán (CN)" htmlFor="inputBranchRetailPrice">
                <input
                  id="inputBranchRetailPrice"
                  type="number"
                  min={0}
                  step={1000}
                  value={Number.isFinite(branchRetailPrice) ? branchRetailPrice : 0}
                  onChange={(e) => setBranchRetailPrice(parseFloat(e.target.value) || 0)}
                  className="form-input"
                  style={editableInputStyle}
                />
              </FieldRow>

              {/* Giá nhập sỉ NCC (Readonly) */}
              <FieldRow label="Giá sỉ từ NCC">
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    value={fmtCurrency(item.effectivePrice ?? item.agreedPrice ?? purchasePrice)}
                    readOnly
                    className="form-input"
                    style={{ ...readonlyInputStyle, color: '#0f766e', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                    (Hợp đồng NCC chuỗi)
                  </span>
                </div>
              </FieldRow>

              {/* Quy cách NCC (Readonly) */}
              <FieldRow label="Quy cách NCC">
                <input
                  type="text"
                  value={`MOQ: ${moq} ${unitLabel} • Cho thiếu: ${allowedShortageQty} ${unitLabel}`}
                  readOnly
                  className="form-input"
                  style={readonlyInputStyle}
                />
              </FieldRow>
            </>
          ) : (
            <>
              <FieldRow label="Giá nhập" htmlFor="inputSupplierPurchasePrice">
                <input
                  id="inputSupplierPurchasePrice"
                  type="number"
                  min={0}
                  step={1000}
                  value={Number.isFinite(purchasePrice) ? purchasePrice : 0}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="form-input"
                  style={editableInputStyle}
                />
              </FieldRow>

              <FieldRow label="MOQ" htmlFor="inputSupplierMoq">
                <input
                  id="inputSupplierMoq"
                  type="number"
                  min={1}
                  value={moq || ''}
                  onChange={(e) => setMoq(parseInt(e.target.value, 10) || 1)}
                  className="form-input"
                  style={editableInputStyle}
                />
              </FieldRow>

              <FieldRow label="Thiếu cho phép" htmlFor="inputAllowedShortageQty">
                <input
                  id="inputAllowedShortageQty"
                  type="number"
                  min={0}
                  value={Number.isFinite(allowedShortageQty) ? allowedShortageQty : 0}
                  onChange={(e) => setAllowedShortageQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="form-input"
                  style={editableInputStyle}
                  title="Số lượng thiếu hàng cho phép"
                />
              </FieldRow>
            </>
          )}
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
            onClick={onClose}
            disabled={isSaving}
            className="po-btn po-btn-secondary"
            style={{ height: 36, padding: '0 16px', fontSize: 13 }}
          >
            Hủy Bỏ
          </button>
          <button
            type="submit"
            disabled={isSaving}
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
    </>
  );
};

export const EditSupplierProductModal: FC<EditSupplierProductModalProps> = ({
  isOpen,
  onClose,
  item,
  supplierName,
  branchContext,
  onSave,
  onSaveBranchProduct,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={onClose}>
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
        onClick={(e) => e.stopPropagation()}
      >
        <EditSupplierProductForm
          key={`${item.id}-${branchContext?.branchId || 'ALL'}`}
          item={item}
          supplierName={supplierName}
          branchContext={branchContext}
          onSave={onSave}
          onSaveBranchProduct={onSaveBranchProduct}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
