import React from 'react';
import { Trash2, X } from 'lucide-react';

export interface ProductDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  productName?: string;
  productCode?: string;
  itemCount?: number;
  isDeleting?: boolean;
}

export const ProductDeleteConfirmModal: React.FC<ProductDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productName,
  productCode,
  itemCount,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  const isBulk = itemCount !== undefined && itemCount >= 1;

  return (
    <div
      className="custom-modal-backdrop"
      style={{
        zIndex: 10050,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        className="custom-modal-box"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          maxWidth: 450,
          width: '92vw',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
          title="Đóng"
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
              flexShrink: 0,
            }}
          >
            <Trash2 size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
              {isBulk ? `Xóa ${itemCount} hàng hóa đã chọn?` : 'Xác nhận xóa hàng hóa'}
            </h4>
            {!isBulk && productCode && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                Mã hàng: <b style={{ color: '#0F766E' }}>{productCode}</b>
              </p>
            )}
          </div>
        </div>

        <p style={{ margin: '0 0 24px', fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
          {isBulk ? (
            <>
              Bạn có chắc chắn muốn xóa <b>{itemCount}</b> hàng hóa đã chọn khỏi danh mục kinh doanh? Các sản phẩm này sẽ được cập nhật trạng thái ngừng hoạt động và không xuất hiện trên các màn hình bán hàng.
            </>
          ) : (
            <>
              Bạn có chắc chắn muốn xóa hàng hóa <b>"{productName || 'này'}"</b> khỏi danh mục? Thao tác này sẽ ẩn hàng hóa khỏi danh sách kinh doanh.
            </>
          )}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn-secondary-white"
            onClick={onClose}
            disabled={isDeleting}
            style={{ borderRadius: 8, padding: '8px 18px' }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13.5,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              opacity: isDeleting ? 0.7 : 1,
            }}
            disabled={isDeleting}
            onClick={onConfirm}
          >
            <Trash2 size={15} />
            <span>{isDeleting ? 'Đang xóa...' : 'Đồng ý xóa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
