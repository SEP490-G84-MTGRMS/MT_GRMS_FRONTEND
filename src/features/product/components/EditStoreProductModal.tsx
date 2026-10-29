import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { StoreProductItem, EditStoreProductInput } from '../types/storeProduct.types';
import { X, AlertTriangle } from 'lucide-react';

interface EditStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StoreProductItem | null;
  onSave: (storeId: string, productId: string, input: EditStoreProductInput) => void;
}

export const EditStoreProductModal: FC<EditStoreProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
}) => {
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(10);
  const [shelfLocation, setShelfLocation] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (product) {
      setRetailPrice(product.retailPrice);
      setMinStockLevel(product.minStockLevel);
      setShelfLocation(product.shelfLocation || '');
      setErrorMsg('');
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (retailPrice <= 0) {
      setErrorMsg('Giá bán lẻ niêm yết phải lớn hơn 0 VNĐ.');
      return;
    }

    if (minStockLevel < 0) {
      setErrorMsg('Định mức tồn an toàn tối thiểu không thể nhỏ hơn 0.');
      return;
    }

    onSave(product.storeId, product.productId, {
      retailPrice,
      minStockLevel,
      shelfLocation: shelfLocation.trim(),
    });

    onClose();
  };

  const isMarginNegative = retailPrice < product.costPrice;

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
          borderRadius: 16,
          width: '100%',
          maxWidth: 540,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
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
            borderBottom: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Cập Nhật Sản Phẩm Tại Chi Nhánh
            </h3>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
              Chi nhánh: <strong style={{ color: '#0066FF' }}>{product.storeName}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Product Summary Info Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                fontSize: '0.83rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Sản phẩm:</span>{' '}
                <strong style={{ color: '#1e293b' }}>{product.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Mã SKU:</span>{' '}
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0066FF' }}>
                  {product.sku}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Giá vốn NCC:</span>{' '}
                <strong style={{ color: '#334155' }}>{fmt(product.costPrice)} đ</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Tồn kho hiện tại:</span>{' '}
                <strong style={{ color: '#0f766e' }}>{fmt(product.currentStock)} {product.unit}</strong>
              </div>
            </div>

            {/* Selling Price */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Giá bán lẻ niêm yết (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={retailPrice}
                onChange={(e) => setRetailPrice(Number(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${isMarginNegative ? '#f59e0b' : '#cbd5e1'}`,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {isMarginNegative ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: '0.78rem', marginTop: 4 }}>
                  <AlertTriangle size={14} /> Giá bán đang thấp hơn giá vốn ({fmt(product.costPrice)} đ). Cửa hàng sẽ bị lỗ!
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                  Biên lợi nhuận gộp dự kiến: {Math.round(((retailPrice - product.costPrice) / (retailPrice || 1)) * 100)}%
                </div>
              )}
            </div>

            {/* Min Stock Level */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Định mức tồn tối thiểu / an toàn (Min Stock) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(Number(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                Hệ thống sẽ gắn cờ cảnh báo khi tồn kho thực tế chạm hoặc dưới ngưỡng này.
              </div>
            </div>

            {/* Shelf Location */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Vị trí trưng bày / Kệ hàng
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Kệ A1-02, Gian hàng số 3..."
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Footer with Pure Text Buttons */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              backgroundColor: '#f8fafc',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="po-btn po-btn-secondary"
              style={{
                height: 34,
                padding: '0 18px',
                borderRadius: 6,
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="po-btn po-btn-primary"
              style={{
                height: 34,
                padding: '0 20px',
                borderRadius: 6,
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
