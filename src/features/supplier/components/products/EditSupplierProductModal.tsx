import { useState } from 'react';
import type { CSSProperties, FC, FormEvent, ReactNode } from 'react';
import type { SupplierProductItem, EditSupplierProductInput } from '../../types/supplier.types';
import { X, Check, AlertCircle } from 'lucide-react';

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
  width: 160,
  flexShrink: 0,
  fontSize: '0.84rem',
  fontWeight: 600,
  color: '#334155',
  lineHeight: '40px',
};

const inputBase: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 40,
  padding: '0 12px',
  borderRadius: 8,
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const readonlyInputStyle: CSSProperties = {
  ...inputBase,
  border: '1px solid #e2e8f0',
  backgroundColor: '#f1f5f9',
  color: '#64748b',
  cursor: 'not-allowed',
};

const editableInputStyle: CSSProperties = {
  ...inputBase,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
};

const FieldRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <label style={labelStyle}>{label}</label>
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
  onSave,
  onClose,
}) => {
  const [agreedPrice, setAgreedPrice] = useState<number>(item.agreedPrice);
  const [moq, setMoq] = useState<number>(item.moq);
  const [isActive, setIsActive] = useState<boolean>(item.status === 'Active');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const unitLabel = item.baseUoM || item.deliveryUoM || 'Cái';
  const costPrice = item.costPrice ?? 0;
  const effectivePrice = agreedPrice > 0 ? agreedPrice : costPrice;
  const fmtCurrency = (val: number) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isNaN(agreedPrice) || agreedPrice < 0) {
      setErrorMsg('Giá nhập thỏa thuận không được âm.');
      return;
    }

    if (agreedPrice === 0 && (costPrice == null || Number.isNaN(costPrice))) {
      setErrorMsg(
        'Không xác định được giá nhập hợp lệ. Nhập giá thỏa thuận hoặc đảm bảo sản phẩm đã có giá vốn.'
      );
      return;
    }

    if (moq < 1) {
      setErrorMsg('MOQ phải từ 1 trở lên.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: item.id,
        deliveryUoM: unitLabel,
        agreedPrice,
        moq,
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
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          Chỉnh sửa điều khoản cung ứng
        </h3>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={20} />
        </button>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <FieldRow label="Nhà cung cấp">
          <input type="text" value={supplierName} readOnly style={readonlyInputStyle} />
        </FieldRow>

        <FieldRow label="Sản phẩm">
          <input type="text" value={item.name} readOnly style={readonlyInputStyle} />
        </FieldRow>

        <FieldRow label="SKU">
          <input type="text" value={item.sku} readOnly style={readonlyInputStyle} />
        </FieldRow>

        <FieldRow label="Barcode">
          <input type="text" value={item.barcode || '—'} readOnly style={readonlyInputStyle} />
        </FieldRow>

        <FieldRow label="Đơn vị tính">
          <input type="text" value={unitLabel} readOnly style={readonlyInputStyle} />
        </FieldRow>

        <FieldRow label="Giá nhập hiệu lực">
          <input type="text" value={fmtCurrency(effectivePrice)} readOnly style={readonlyInputStyle} />
        </FieldRow>

        <FieldRow label="Trạng thái">
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, height: 40 }}>
            <StatusToggle checked={isActive} onChange={setIsActive} />
            <span style={{ fontSize: '0.88rem', color: isActive ? '#15803d' : '#64748b', fontWeight: 600 }}>
              {isActive ? 'Enable' : 'Disable'}
            </span>
          </div>
        </FieldRow>

        <FieldRow label="Giá thỏa thuận">
          <input
            type="number"
            min={0}
            step={1000}
            value={Number.isFinite(agreedPrice) ? agreedPrice : 0}
            onChange={(e) => setAgreedPrice(parseFloat(e.target.value) || 0)}
            style={editableInputStyle}
          />
        </FieldRow>

        <FieldRow label="MOQ">
          <input
            type="number"
            min={1}
            value={moq || ''}
            onChange={(e) => setMoq(parseInt(e.target.value, 10) || 1)}
            style={editableInputStyle}
          />
        </FieldRow>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px solid #e2e8f0',
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isSaving ? 'wait' : 'pointer',
              opacity: isSaving ? 0.75 : 1,
            }}
          >
            <Check size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu'}
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 560,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
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
