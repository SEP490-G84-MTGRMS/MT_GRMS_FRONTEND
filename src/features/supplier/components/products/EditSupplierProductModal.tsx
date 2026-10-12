import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { SupplierProductItem, EditSupplierProductInput } from '../../types/supplier.types';
import { X, Check, Edit2, AlertCircle } from 'lucide-react';

interface EditSupplierProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SupplierProductItem | null;
  supplierName: string;
  onSave: (input: EditSupplierProductInput) => void;
}

interface EditSupplierProductFormProps {
  item: SupplierProductItem;
  supplierName: string;
  onSave: (input: EditSupplierProductInput) => void;
  onClose: () => void;
}

const EditSupplierProductForm: FC<EditSupplierProductFormProps> = ({
  item,
  supplierName,
  onSave,
  onClose,
}) => {
  const [deliveryUoM, setDeliveryUoM] = useState(item.deliveryUoM);
  const [agreedPrice, setAgreedPrice] = useState<number>(item.agreedPrice);
  const [moq, setMoq] = useState<number>(item.moq);
  const [isPrimary, setIsPrimary] = useState<boolean>(item.isPrimary);
  const [supplierProductCode, setSupplierProductCode] = useState(item.supplierProductCode || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (agreedPrice <= 0) {
      setErrorMsg('Giá nhập sỉ thỏa thuận phải lớn hơn 0 VNĐ.');
      return;
    }

    if (moq < 1) {
      setErrorMsg('Số lượng đặt hàng tối thiểu (MOQ) phải từ 1 trở lên.');
      return;
    }

    onSave({
      id: item.id,
      deliveryUoM: deliveryUoM.trim() || item.baseUoM,
      agreedPrice,
      moq,
      isPrimary,
      supplierProductCode: supplierProductCode.trim() || undefined,
    });

    onClose();
  };

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #edf2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #F7FAFF, #ffffff)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: '#eff6ff',
              color: '#0066FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Edit2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#0f172a' }}>
              Chỉnh Sửa Điều Khoản Cung Ứng
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Nhà cung cấp: <b style={{ color: '#0066FF' }}>{supplierName}</b>
            </div>
          </div>
        </div>

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

      {/* Form Body */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: 12,
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

        {/* Product Fixed Info */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 14,
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>{item.name}</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 4,
              fontSize: '0.8rem',
              color: '#64748b',
            }}
          >
            <span>
              Barcode: <b style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.barcode}</b>
            </span>
            <span>•</span>
            <span>
              SKU: <b style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.sku}</b>
            </span>
          </div>
        </div>

        {/* Delivery UoM & Code */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Đơn vị tính giao hàng (*)
            </label>
            <select
              value={deliveryUoM}
              onChange={(e) => setDeliveryUoM(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            >
              <option value="kg">kg (Kilôgam)</option>
              <option value="bottle">bottle (Chai/Lọ)</option>
              <option value="box">box (Hộp/Thùng)</option>
              <option value="pack">pack (Gói/Túi)</option>
              <option value="can">can (Lon)</option>
              <option value="cái">cái (Chiếc)</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Mã sản phẩm phía NCC
            </label>
            <input
              type="text"
              placeholder="SUP-PRD-01"
              value={supplierProductCode}
              onChange={(e) => setSupplierProductCode(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Agreed Price & MOQ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Giá nhập sỉ thỏa thuận (VNĐ) (*)
            </label>
            <input
              type="number"
              min={1000}
              step={500}
              value={agreedPrice || ''}
              onChange={(e) => setAgreedPrice(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1.5px solid #0066FF',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#0066FF',
                fontFamily: 'JetBrains Mono, monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Số lượng tối thiểu (MOQ) (*)
            </label>
            <input
              type="number"
              min={1}
              value={moq || ''}
              onChange={(e) => setMoq(parseInt(e.target.value, 10) || 1)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Primary Supplier Checkbox */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            backgroundColor: '#fefce8',
            border: '1px solid #fef08a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#854d0e' }}>
              Nhà cung cấp chính (Primary Supplier)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a16207' }}>
              Hệ thống ưu tiên NCC này khi đặt hàng tự động bù kho.
            </div>
          </div>
          <input
            type="checkbox"
            id="chkEditPrimary"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#eab308' }}
          />
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            paddingTop: 16,
            borderTop: '1px solid #edf2f7',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: 9999,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 22px',
              borderRadius: 9999,
              border: 'none',
              backgroundColor: 'var(--blue-primary)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
            }}
          >
            <Check size={16} /> Lưu thay đổi
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
        backdropFilter: 'blur(4px)',
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
          borderRadius: 24,
          width: '100%',
          maxWidth: 520,
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
