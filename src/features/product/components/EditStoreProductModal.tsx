import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { StoreProductItem, EditStoreProductInput } from '../types/storeProduct.types';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface EditStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StoreProductItem | null;
  onSave: (storeId: string, productId: string, input: EditStoreProductInput) => void;
  onToggleStatus?: (item: StoreProductItem) => void;
  onRemove?: (item: StoreProductItem) => void;
}

export const EditStoreProductModal: FC<EditStoreProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
  onRemove,
}) => {
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(10);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (product) {
      setRetailPrice(product.retailPrice);
      setMinOrderQuantity(product.minOrderQuantity ?? 10);
      setStatus(product.status);
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

    if (minOrderQuantity < 1) {
      setErrorMsg('Số lượng đặt hàng tối thiểu (MOQ) phải từ 1 trở lên.');
      return;
    }

    onSave(product.storeId, product.productId, {
      retailPrice,
      minOrderQuantity,
      status,
    });

    onClose();
  };

  const handleRemoveClick = () => {
    if (!onRemove) return;
    if (
      window.confirm(
        `Bạn có chắc chắn muốn gỡ bỏ sản phẩm "${product.name}" khỏi danh mục kinh doanh của chi nhánh "${product.storeName}" không?`
      )
    ) {
      onRemove(product);
      onClose();
    }
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
          borderRadius: 14,
          width: '100%',
          maxWidth: 520,
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
            padding: '14px 20px',
            borderBottom: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Thao Tác Sản Phẩm Tại Chi Nhánh
            </h3>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Chi nhánh: <strong style={{ color: '#0f766e' }}>{product.storeName}</strong>
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
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: 12.5,
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
                <strong style={{ color: '#334155' }}>{product.category}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Giá vốn NCC:</span>{' '}
                <strong style={{ color: '#475569', fontFamily: 'monospace' }}>
                  {fmt(product.costPrice)} đ
                </strong>
              </div>
            </div>

            {/* Field 1: Selling Price */}
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
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0f766e',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
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
              ) : (
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  Biên lợi nhuận gộp dự kiến: {Math.round(((retailPrice - product.costPrice) / (retailPrice || 1)) * 100)}%
                </div>
              )}
            </div>

            {/* Field 2: Min Order Quantity (MOQ) */}
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
                Số lượng đặt hàng tối thiểu (MOQ) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                value={minOrderQuantity}
                onChange={(e) => setMinOrderQuantity(Number(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                Ngưỡng số lượng tối thiểu để tạo phiếu đặt hàng nhập thêm từ nhà cung cấp.
              </div>
            </div>

            {/* Field 3: Status Toggle */}
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
                  onClick={() => setStatus('Active')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: status === 'Active' ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                    backgroundColor: status === 'Active' ? '#f0fdfa' : '#ffffff',
                    color: status === 'Active' ? '#0f766e' : '#64748b',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🟢 Đang kinh doanh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('Inactive')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: status === 'Inactive' ? '1.5px solid #64748b' : '1px solid #cbd5e1',
                    backgroundColor: status === 'Inactive' ? '#f1f5f9' : '#ffffff',
                    color: status === 'Inactive' ? '#334155' : '#64748b',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>⚪ Tạm ngừng bán</span>
                </button>
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
            }}
          >
            {/* Delete/Remove button on the left */}
            {onRemove ? (
              <button
                type="button"
                onClick={handleRemoveClick}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #fecaca',
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
                title="Gỡ sản phẩm khỏi chi nhánh này"
              >
                <Trash2 size={13} />
                <span>Gỡ khỏi cửa hàng</span>
              </button>
            ) : <div />}

            {/* Cancel & Save buttons on the right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                className="po-btn po-btn-secondary"
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 6,
                  fontSize: 12.5,
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
                  height: 32,
                  padding: '0 18px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: '#0f766e',
                  border: 'none',
                  color: '#ffffff',
                }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStoreProductModal;
