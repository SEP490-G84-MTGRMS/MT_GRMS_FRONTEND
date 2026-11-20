import { useState } from 'react';
import type { FC } from 'react';
import { Package, Plus } from 'lucide-react';
import { TablePagination } from '../../../components/common';
import type { Product, Category } from '../types/pos.types';

interface Props {
  products: Product[];
  categories: Category[];
  onAddToCart: (product: Product) => void;
}

export const PosCatalogGrid: FC<Props> = ({ products, categories, onAddToCart }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(18);

  // Filter theo Category
  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const totalCount = filteredProducts.length;

  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
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
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Lưới sản phẩm */}
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
            <Package size={48} style={{ margin: '0 auto 12px auto', color: '#cbd5e1' }} />
            <p style={{ fontWeight: 600, fontSize: 15, margin: 0, color: '#334155' }}>
              Chi nhánh chưa được gán sản phẩm để bán
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '6px 0 0 0' }}>
              Vui lòng gán sản phẩm vào danh mục chi nhánh trong cấu hình quản trị trước khi thực hiện bán hàng.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <p style={{ fontWeight: 500, fontSize: 14 }}>Không tìm thấy sản phẩm nào trong nhóm này</p>
          </div>
        ) : (
          <div className="pos-catalog-products-container">
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
                  {/* Vùng Ảnh Sản Phẩm */}
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

                    {/* Nút Floating Action Button [+] nổi bật ở góc dưới bên phải ảnh */}
                    <button
                      type="button"
                      className="pos-product-floating-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(prod);
                      }}
                      title={`Thêm ${prod.name} vào hóa đơn`}
                      aria-label={`Thêm ${prod.name} vào hóa đơn`}
                    >
                      <Plus size={16} strokeWidth={2.6} />
                    </button>
                  </div>

                  {/* Thông tin sản phẩm */}
                  <div className="pos-product-info">
                    <div className="pos-product-name" title={prod.name}>
                      {prod.name}
                    </div>

                    <div className="pos-product-bottom-row">
                      <div className="pos-product-price-box">
                        <span className="pos-product-price">
                          {prod.basePrice.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="pos-product-unit">
                          / {prod.baseUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thanh Phân Trang Dùng Chung Chuẩn Prototype - Luôn cố định ở đáy hộp thoại, không bị trôi khi cuộn sản phẩm */}
        {filteredProducts.length > 0 && (
          <div className="pos-catalog-pagination-wrap">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalCount}
              itemLabel="sản phẩm"
              pageSizeOptions={[12, 18, 24, 48]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              className="rounded-md border border-[#e2e8f0]"
            />
          </div>
        )}
      </fieldset>
    </div>
  );
};
