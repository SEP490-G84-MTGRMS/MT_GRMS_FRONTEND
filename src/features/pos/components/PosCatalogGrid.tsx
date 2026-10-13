import { useState } from 'react';
import type { FC } from 'react';
import { Package, Plus } from 'lucide-react';
import type { Product, Category } from '../types/pos.types';

interface Props {
  products: Product[];
  categories: Category[];
  onAddToCart: (product: Product) => void;
}

export const PosCatalogGrid: FC<Props> = ({ products, categories, onAddToCart }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filter theo Category
  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const totalCount = filteredProducts.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="pos-catalog-section">
      <fieldset className="pos-catalog-fieldset">
        <legend className="pos-catalog-legend">
          <b>Danh Mục Mặt Hàng Chọn Nhanh [Chế Độ Bán Thường - Màn Hình Cảm Ứng]</b>
        </legend>

        {/* Bộ lọc Tab Danh mục */}
        <div className="pos-category-tabs-bar">
          <div className="pos-category-tabs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`pos-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategorySelect(cat.id)}
              >
                {cat.name} ({cat.id === 'all' ? products.length : products.filter((p) => p.category === cat.id).length})
              </button>
            ))}
          </div>
          <div className="pos-category-hint">
            Bấm vào ảnh hoặc nút <b>[+]</b> để thêm nhanh vào giỏ hàng
          </div>
        </div>

        {/* Lưới sản phẩm */}
        <div className="pos-products-grid">
          {currentProducts.map((prod) => (
            <div
              key={prod.id}
              className="pos-product-card"
              onClick={() => onAddToCart(prod)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onAddToCart(prod);
                }
              }}
              title={`Nhấp để thêm "${prod.name}" vào hóa đơn`}
            >
              {/* Vùng Ảnh Sản Phẩm chuẩn tỷ lệ 1:1 */}
              <div className="pos-product-image-wrap">
                {prod.imageUrl ? (
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="pos-product-img"
                    loading="lazy"
                    onError={(e) => {
                      // Xử lý khi ảnh lỗi hoặc link chết: ẩn ảnh và hiển thị placeholder fallback
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector(
                        '.pos-product-img-fallback'
                      ) as HTMLElement | null;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}

                {/* Fallback placeholder khi chưa có ảnh hoặc link ảnh lỗi */}
                <div
                  className="pos-product-img-fallback"
                  style={{ display: prod.imageUrl ? 'none' : 'flex' }}
                >
                  <Package size={28} className="pos-product-fallback-icon" />
                  <span className="pos-product-fallback-text">{prod.baseUnit}</span>
                </div>

                {/* Badge tồn kho */}
                {prod.quantityOnHand <= 15 ? (
                  <span className="pos-product-stock-tag low" title="Tồn kho thấp">
                    Còn {prod.quantityOnHand}
                  </span>
                ) : (
                  <span className="pos-product-stock-tag" title="Số lượng tồn kho">
                    Tồn {prod.quantityOnHand}
                  </span>
                )}
              </div>

              {/* Thông tin sản phẩm */}
              <div className="pos-product-info">
                <div className="pos-product-brand">{prod.spec || prod.category}</div>
                <div className="pos-product-name" title={prod.name}>
                  {prod.name}
                </div>
                <div className="pos-product-meta">
                  ĐVT: <b>{prod.baseUnit}</b>
                  {prod.batchCode && (
                    <span className="pos-product-batch-tag"> &bull; Lô: {prod.batchCode}</span>
                  )}
                </div>
                <div className="pos-product-price">
                  {prod.basePrice.toLocaleString('vi-VN')} đ
                </div>
              </div>

              {/* Nút bấm thêm vào giỏ */}
              <button
                type="button"
                className="pos-product-add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(prod);
                }}
                title={`Thêm ${prod.name} vào hóa đơn`}
              >
                <Plus size={13} />
                <span>Thêm</span>
              </button>
            </div>
          ))}
        </div>

        {/* Thanh Phân Trang Chuẩn Hệ Thống (admin-pagination-footer khớp 100% SupplierTable) */}
        <div className="admin-pagination-footer" style={{ marginTop: 12, borderRadius: 'var(--radius-sm)' }}>
          <div>
            Đang hiển thị <b>{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, totalCount)}</b> trong tổng số <b>{totalCount}</b> sản phẩm
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={{
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-soft-blue)',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  color: 'var(--text-main)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="admin-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`admin-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className="admin-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
};
