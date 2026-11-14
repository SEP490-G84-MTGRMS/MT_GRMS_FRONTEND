import { useState } from 'react';
import type { CSSProperties, FC, FormEvent, ReactNode } from 'react';
import type { SupplierProductItem, EditSupplierProductInput } from '../../types/supplier.types';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import '../../supplier.css';

interface EditSupplierProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SupplierProductItem | null;
  supplierName: string;
  onSave: (input: EditSupplierProductInput) => void | Promise<void>;
}

interface EditSupplierProductFormProps {
  item: SupplierProductItem;
  supplierName: string;
  onSave: (input: EditSupplierProductInput) => void | Promise<void>;
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

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN').format(Number.isFinite(val) ? val : 0);

const parseCurrency = (str: string): number => {
  const cleaned = String(str ?? '').replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

const EditSupplierProductForm: FC<EditSupplierProductFormProps> = ({
  item,
  supplierName,
  onSave,
  onClose,
}) => {
  const masterCost = item.costPrice ?? 0;
  // 0 / chưa thỏa thuận → để trống (không copy Master vào field), BE lưu NULL
  const initialPrice = item.agreedPrice > 0 ? item.agreedPrice : 0;
  const [purchasePriceText, setPurchasePriceText] = useState<string>(
    initialPrice > 0 ? formatCurrency(initialPrice) : ''
  );
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [moq, setMoq] = useState<number>(item.moq);
  const [allowedShortageQty, setAllowedShortageQty] = useState<number>(item.allowedShortageQty ?? 0);
  const [isActive, setIsActive] = useState<boolean>(item.status === 'Active');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const unitLabel = item.deliveryUoM || item.baseUoM || 'Cái';

  const handlePurchasePriceChange = (raw: string) => {
    // Khi đang gõ: chỉ giữ số (tránh nhảy caret vì dấu phân cách)
    setPurchasePriceText(raw.replace(/[^\d]/g, ''));
    if (errorMsg) setErrorMsg('');
  };

  const handlePurchasePriceFocus = () => {
    setIsPriceFocused(true);
    const digits = purchasePriceText.replace(/[^\d]/g, '');
    setPurchasePriceText(digits);
  };

  const handlePurchasePriceBlur = () => {
    setIsPriceFocused(false);
    const amount = parseCurrency(purchasePriceText);
    setPurchasePriceText(amount > 0 ? formatCurrency(amount) : '');
  };

  const purchasePriceDisplay = isPriceFocused
    ? purchasePriceText
    : purchasePriceText
      ? formatCurrency(parseCurrency(purchasePriceText))
      : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const purchasePrice = parseCurrency(purchasePriceText);
    if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
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
            Chỉnh sửa điều khoản cung ứng
          </h2>
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

          <FieldRow label="Trạng thái">
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, height: 38 }}>
              <StatusToggle checked={isActive} onChange={setIsActive} />
              <span style={{ fontSize: 13.5, color: isActive ? '#15803d' : '#64748b', fontWeight: 600 }}>
                {isActive ? 'Enable' : 'Disable'}
              </span>
            </div>
          </FieldRow>

          <FieldRow label="Giá nhập" htmlFor="inputSupplierPurchasePrice">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="inputSupplierPurchasePrice"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={purchasePriceDisplay}
                  onChange={(e) => handlePurchasePriceChange(e.target.value)}
                  onFocus={handlePurchasePriceFocus}
                  onBlur={handlePurchasePriceBlur}
                  className="form-input"
                  style={{
                    ...editableInputStyle,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                  }}
                  placeholder={
                    masterCost > 0
                      ? `Master ${formatCurrency(masterCost)}`
                      : 'Trống = dùng giá Master'
                  }
                  title="Để trống = chưa thỏa thuận (dùng giá Master khi đặt hàng)"
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>đ</span>
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {masterCost > 0
                  ? `Master: ${formatCurrency(masterCost)} đ · Để trống = chưa thỏa thuận`
                  : 'Để trống = chưa thỏa thuận (dùng giá Master khi đặt hàng)'}
              </span>
            </div>
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
  onSave,
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
          key={item.id}
          item={item}
          supplierName={supplierName}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
