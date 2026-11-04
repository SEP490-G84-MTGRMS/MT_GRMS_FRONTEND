import { useEffect } from 'react';
import type { FC } from 'react';
import { LayoutGrid, X, Check } from 'lucide-react';
import { PosCatalogGrid } from '../PosCatalogGrid';
import type { Product, Category } from '../../types/pos.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  onAddToCart: (product: Product) => void;
}

export const PosCatalogModal: FC<Props> = ({
  isOpen,
  onClose,
  products,
  categories,
  onAddToCart,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' || e.key === 'F3') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="pos-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 1100 }}
    >
      <div
        className="pos-modal-dialog pos-catalog-modal-dialog"
        style={{
          maxWidth: 1040,
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        }}
      >
        {/* Header Modal */}
        <div
          className="pos-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#f0fdfa',
                border: '1px solid #ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f766e',
              }}
            >
              <LayoutGrid size={16} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>
                Danh Mục Mặt Hàng Bán Thường
              </h2>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
                Chạm / nhấp để thêm nhanh sản phẩm vào giỏ hàng &bull; Nhấn <b>[F3]</b> hoặc <b>[ESC]</b> để đóng
              </p>
            </div>
          </div>

          <button
            type="button"
            className="pos-modal-close-btn"
            onClick={onClose}
            title="Đóng popup (ESC)"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Modal: Catalog Grid */}
        <div className="pos-modal-body pos-catalog-modal-body">
          <PosCatalogGrid
            products={products}
            categories={categories}
            onAddToCart={onAddToCart}
          />
        </div>

        {/* Footer Modal */}
        <div
          className="pos-modal-footer pos-catalog-modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 18px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Mẹo: Sản phẩm được chọn sẽ tự động nhảy vào giỏ hàng ngay lập tức.
          </div>
          <button
            type="button"
            className="pos-btn-primary"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: 'var(--blue-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Check size={15} />
            <span>Xong &amp; Đóng lại [ESC]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
