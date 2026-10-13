import React, { useState, useMemo } from 'react';
import {
  Plus,
  Download,
  Upload,
  Search,
  Printer,
  ShieldCheck,
  Package,
} from 'lucide-react';
import type { ProductItem, Category } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../services/mockData';
import { CategorySidebar } from '../components/CategorySidebar';
import { CategoryModal } from '../components/CategoryModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { ComboFormModal } from '../components/ComboFormModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../product.css';

export const ProductListPage: React.FC = () => {
  // State
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  // RBAC switch (StoreOwner vs Cashier) for BR-SEC-01 verification
  const [userRole, setUserRole] = useState<'StoreOwner' | 'Cashier'>('StoreOwner');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [stockCriteria, setStockCriteria] = useState<'all' | 'in_stock' | 'out_of_stock' | 'below_min' | 'negative'>('all');
  const [createdTime, setCreatedTime] = useState<'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null);

  const [isComboFormOpen, setIsComboFormOpen] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Table selection
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Category Actions
  const handleToggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((cid) => cid !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  };

  const handleSelectAllCategories = () => {
    if (selectedCategoryIds.length === categories.length) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(categories.map((c) => c.id));
    }
  };

  const handleSaveCategory = (name: string, id?: string) => {
    if (id) {
      // Edit
      setCategories(
        categories.map((c) => (c.id === id ? { ...c, name } : c))
      );
      showToast(`Đã cập nhật nhóm hàng: ${name}`);
    } else {
      // Create new
      const nextId = String(Date.now());
      const nextCode = `CAT-${String(categories.length + 1).padStart(3, '0')}`;
      const newCat: Category = {
        id: nextId,
        code: nextCode,
        name,
        productCount: 0,
        depth: 0,
      };
      setCategories([...categories, newCat]);
      showToast(`Đã tạo nhóm hàng mới: ${name} (${nextCode})`);
    }
  };

  const handleDeleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setCategories(categories.filter((c) => c.id !== id));
    showToast(`Đã xóa nhóm hàng: ${cat.name}`);
  };

  // Product CRUD
  const handleSaveProduct = (data: Partial<ProductItem>, saveAndAddNew?: boolean) => {
    if (productToEdit) {
      // Update
      const updated = products.map((p) =>
        p.id === productToEdit.id ? ({ ...p, ...data, updatedAt: new Date().toLocaleDateString('vi-VN') } as ProductItem) : p
      );
      setProducts(updated);
      showToast(`Cập nhật hàng hóa "${data.productName}" thành công.`);
      if (selectedProduct && selectedProduct.id === productToEdit.id) {
        setSelectedProduct({ ...selectedProduct, ...data } as ProductItem);
      }
    } else {
      // Create
      const newProd: ProductItem = {
        id: `prod-${Date.now()}`,
        productCode: data.productCode || `SP${Math.floor(100000 + Math.random() * 900000)}`,
        barcode: data.barcode || '',
        productName: data.productName || '',
        categoryId: data.categoryId || '',
        categoryName: data.categoryName || '',
        baseUnit: data.baseUnit || 'Gói',
        sellingPrice: data.sellingPrice || 0,
        costPrice: data.costPrice ?? null,
        onHand: data.onHand || 0,
        committed: 0,
        status: 'Active',
        isFavorite: false,
        isCombo: false,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        updatedAt: new Date().toLocaleDateString('vi-VN'),
        minStock: data.minStock || 0,
        maxStock: data.maxStock || 9999,
        vatRate: data.vatRate || 8,
        description: data.description || '',
        internalNote: data.internalNote || '',
        uomConversions: data.uomConversions || [],
        branchStocks: [
          { branchId: 'b-1', branchName: 'Chi nhánh trung tâm', onHand: 0, available: 0, committed: 0 },
        ],
        stockLedger: [],
      };
      setProducts([newProd, ...products]);

      // update category count
      setCategories(
        categories.map((c) =>
          c.id === newProd.categoryId ? { ...c, productCount: c.productCount + 1 } : c
        )
      );
      showToast(`Tạo mới hàng hóa "${newProd.productName}" thành công.`);
    }

    if (saveAndAddNew) {
      setProductToEdit(null);
    }
  };

  const handleSaveCombo = (data: Partial<ProductItem>) => {
    const newCombo: ProductItem = {
      id: `prod-cb-${Date.now()}`,
      productCode: data.productCode || `CB${Math.floor(100000 + Math.random() * 900000)}`,
      barcode: data.barcode || '',
      productName: data.productName || '',
      categoryId: data.categoryId || '',
      categoryName: data.categoryName || '',
      baseUnit: data.baseUnit || 'Giỏ quà',
      sellingPrice: data.sellingPrice || 0,
      costPrice: data.costPrice ?? null,
      onHand: data.onHand || 0,
      committed: 0,
      status: 'Active',
      isFavorite: false,
      isCombo: true,
      comboComponents: data.comboComponents || [],
      createdAt: new Date().toLocaleDateString('vi-VN'),
      updatedAt: new Date().toLocaleDateString('vi-VN'),
      minStock: data.minStock || 5,
      maxStock: data.maxStock || 50,
      vatRate: 8,
      description: data.description || '',
      internalNote: data.internalNote || '',
      branchStocks: [
        { branchId: 'b-1', branchName: 'Chi nhánh trung tâm', onHand: data.onHand || 0, available: data.onHand || 0, committed: 0 },
      ],
      stockLedger: [],
    };
    setProducts([newCombo, ...products]);
    showToast(`Tạo mới gói Combo "${newCombo.productName}" thành công.`);
  };

  const handleDeleteProduct = (product: ProductItem) => {
    // BR-DATA-01 Check: If has transactions -> Soft Delete (Discontinued)
    if (product.hasTransactions) {
      setProducts(
        products.map((p) =>
          p.id === product.id ? { ...p, status: 'Discontinued' } : p
        )
      );
      showToast(
        `Sản phẩm đã có lịch sử giao dịch. Chuyển trạng thái sang "Ngừng kinh doanh" (Soft Delete theo BR-DATA-01).`,
        'warning'
      );
    } else {
      // Hard delete
      setProducts(products.filter((p) => p.id !== product.id));
      showToast(`Đã xóa sản phẩm "${product.productName}" khỏi danh mục.`);
    }
    setIsDetailModalOpen(false);
  };

  const handleToggleStatus = (product: ProductItem) => {
    const nextStatus = product.status === 'Active' ? 'Discontinued' : 'Active';
    setProducts(
      products.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
    );
    showToast(
      `Đã chuyển trạng thái sản phẩm sang: ${nextStatus === 'Active' ? 'Đang bán' : 'Ngừng kinh doanh'}`
    );
    if (selectedProduct && selectedProduct.id === product.id) {
      setSelectedProduct({ ...selectedProduct, status: nextStatus });
    }
  };

  const handleDuplicateProduct = (product: ProductItem) => {
    const cloned: ProductItem = {
      ...product,
      id: `prod-copy-${Date.now()}`,
      productCode: `SP${Math.floor(100000 + Math.random() * 900000)}`,
      barcode: `893${Math.floor(100000000 + Math.random() * 900000000)}`,
      productName: `${product.productName} (Bản sao)`,
      hasTransactions: false,
      onHand: 0,
      committed: 0,
      stockLedger: [],
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };
    setProducts([cloned, ...products]);
    showToast(`Đã sao chép thành công sản phẩm: ${cloned.productName}`);
    setIsDetailModalOpen(false);
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProducts(
      products.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Search
      if (searchTerm.trim()) {
        const kw = searchTerm.trim().toLowerCase();
        const matchCode = item.productCode.toLowerCase().includes(kw);
        const matchBarcode = item.barcode.toLowerCase().includes(kw);
        const matchName = item.productName.toLowerCase().includes(kw);
        if (!matchCode && !matchBarcode && !matchName) return false;
      }

      // Categories
      if (selectedCategoryIds.length > 0) {
        if (!selectedCategoryIds.includes(item.categoryId)) return false;
      }

      // Stock criteria
      if (stockCriteria === 'in_stock' && item.onHand <= 0) return false;
      if (stockCriteria === 'out_of_stock' && item.onHand !== 0) return false;
      if (stockCriteria === 'below_min' && item.onHand >= (item.minStock || 0)) return false;
      if (stockCriteria === 'negative' && item.onHand >= 0) return false;

      return true;
    });
  }, [products, searchTerm, selectedCategoryIds, stockCriteria]);

  // Totals
  const totalStock = filteredProducts.reduce((sum, p) => sum + p.onHand, 0);
  const totalCommitted = filteredProducts.reduce((sum, p) => sum + p.committed, 0);

  // Export mock
  const handleExport = () => {
    showToast(`Đang xuất file Excel cho ${filteredProducts.length} sản phẩm...`);
  };

  // Import mock
  const handleImport = () => {
    showToast('Chọn file Excel (.xlsx) để import danh mục hàng hóa.');
  };

  // Barcode Print mock
  const handlePrintBarcode = () => {
    showToast('Đang kết nối máy in tem mã vạch Barcode...');
  };

  return (
    <div className="product-management-container">
      {/* Toast */}
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* 1. Header Toolbar */}
      <div className="product-header-toolbar">
        <div className="product-title-area">
          <Package size={28} color="#0F766E" />
          <h1>Hàng hóa</h1>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 9999,
              backgroundColor: '#ccfbf1',
              color: '#0f766e',
            }}
          >
            {filteredProducts.length} sản phẩm
          </span>
        </div>

        {/* Ô tìm kiếm nhanh */}
        <div style={{ flex: 1, maxWidth: 360, position: 'relative', margin: '0 12px' }}>
          <input
            type="text"
            className="filter-input"
            style={{ paddingLeft: 34, borderRadius: 9999 }}
            placeholder="🔍 Theo mã SKU, tên hàng, barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
        </div>

        {/* Actions buttons */}
        <div className="product-header-actions">
          {/* RBAC Role Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1f5f9',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={14} color="#0F766E" />
            <span>Vai trò:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              style={{ border: 'none', background: 'none', fontWeight: 700, color: '#0F766E', outline: 'none', cursor: 'pointer' }}
            >
              <option value="StoreOwner">Chủ cửa hàng (Xem giá vốn)</option>
              <option value="Cashier">Thu ngân (Che giá vốn - BR-SEC-01)</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-primary-teal"
            onClick={() => {
              setProductToEdit(null);
              setIsProductFormOpen(true);
            }}
          >
            <Plus size={16} /> Thêm hàng hóa
          </button>

          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => setIsComboFormOpen(true)}
          >
            <Plus size={16} /> Thêm combo - đóng gói
          </button>

          <button type="button" className="btn-secondary-white" onClick={handleImport} title="Nhập danh mục từ Excel">
            <Upload size={15} /> Import
          </button>

          <button type="button" className="btn-secondary-white" onClick={handleExport} title="Xuất danh mục ra Excel">
            <Download size={15} /> Xuất file
          </button>

          <button type="button" className="btn-secondary-white" onClick={handlePrintBarcode} title="In tem mã vạch theo tồn kho">
            <Printer size={15} /> In mã vạch
          </button>
        </div>
      </div>

      {/* 2. Main Body Grid: Sidebar + Table */}
      <div className="product-content-grid">
        {/* Left Column: Sidebar Filters */}
        <CategorySidebar
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={handleToggleCategory}
          onSelectAll={handleSelectAllCategories}
          onOpenCreateModal={() => {
            setCategoryToEdit(null);
            setIsCategoryModalOpen(true);
          }}
          onOpenEditModal={(cat) => {
            setCategoryToEdit(cat);
            setIsCategoryModalOpen(true);
          }}
          stockCriteria={stockCriteria}
          onChangeStockCriteria={setStockCriteria}
          createdTime={createdTime}
          onChangeCreatedTime={setCreatedTime}
          customDate={customDate}
          onChangeCustomDate={setCustomDate}
          supplierFilter={supplierFilter}
          onChangeSupplierFilter={setSupplierFilter}
        />

        {/* Right Column: Main Data Table */}
        <div className="product-table-wrapper">
          {/* Summary bar */}
          <div className="product-table-summary-bar">
            <div>
              Đang hiển thị <b>{filteredProducts.length}</b> mặt hàng
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                Tổng tồn kho: <span className="product-table-summary-stat">{totalStock.toLocaleString()}</span>
              </div>
              <div>
                Khách đặt: <span className="product-table-summary-stat">{totalCommitted.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="product-main-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredProducts.length > 0 &&
                        selectedProductIds.length === filteredProducts.length
                      }
                      onChange={() => {
                        if (selectedProductIds.length === filteredProducts.length) {
                          setSelectedProductIds([]);
                        } else {
                          setSelectedProductIds(filteredProducts.map((p) => p.id));
                        }
                      }}
                    />
                  </th>
                  <th style={{ width: 36, textAlign: 'center' }}>★</th>
                  <th style={{ width: 140 }}>Mã hàng</th>
                  <th>Tên hàng hóa</th>
                  <th style={{ textAlign: 'right', width: 110 }}>Giá bán</th>
                  {userRole === 'StoreOwner' && (
                    <th style={{ textAlign: 'right', width: 110 }}>Giá vốn</th>
                  )}
                  <th style={{ textAlign: 'right', width: 90 }}>Tồn kho</th>
                  <th style={{ textAlign: 'right', width: 90 }}>Khách đặt</th>
                  <th style={{ width: 140 }}>Thời gian tạo</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isChecked = selectedProductIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsDetailModalOpen(true);
                      }}
                      style={{
                        backgroundColor: p.status === 'Discontinued' ? '#f8fafc' : undefined,
                        opacity: p.status === 'Discontinued' ? 0.75 : 1,
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id));
                            } else {
                              setSelectedProductIds([...selectedProductIds, p.id]);
                            }
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`favorite-star-btn ${p.isFavorite ? 'active' : ''}`}
                          onClick={(e) => handleToggleFavorite(p.id, e)}
                          title="Đánh dấu yêu thích"
                        >
                          {p.isFavorite ? '★' : '☆'}
                        </button>
                      </td>
                      <td>
                        <span
                          className="product-code-link"
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          {p.productCode}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{ fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          {p.productName}
                        </span>
                        {p.isCombo && <span className="badge-combo">Combo</span>}
                        {p.uomConversions && p.uomConversions.length > 0 && (
                          <span className="badge-uom-tag">+{p.uomConversions.length} ĐVT</span>
                        )}
                        {p.status === 'Discontinued' && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              color: '#dc2626',
                              background: '#fee2e2',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Ngừng kinh doanh
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {p.sellingPrice.toLocaleString()} đ
                      </td>
                      {userRole === 'StoreOwner' && (
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          {p.costPrice != null ? `${p.costPrice.toLocaleString()} đ` : '—'}
                        </td>
                      )}
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: p.onHand <= 0 ? '#ef4444' : '#0F766E',
                        }}
                      >
                        {p.onHand}
                      </td>
                      <td style={{ textAlign: 'right' }}>{p.committed}</td>
                      <td style={{ fontSize: 12.5, color: '#64748b' }}>{p.createdAt}</td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={userRole === 'StoreOwner' ? 9 : 8}
                      style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}
                    >
                      <Package size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                      <div style={{ fontSize: 15, fontWeight: 600 }}>Không tìm thấy sản phẩm nào</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Vui lòng thử tìm với từ khóa khác hoặc đặt lại bộ lọc.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        categoryToEdit={categoryToEdit}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
      />

      {/* 4. Product Form Modal (Add / Edit Standard Product) */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        productToEdit={productToEdit}
        categories={categories}
        onClose={() => setIsProductFormOpen(false)}
        onSave={handleSaveProduct}
        onOpenCreateCategoryModal={() => {
          setCategoryToEdit(null);
          setIsCategoryModalOpen(true);
        }}
        userRole={userRole}
      />

      {/* 5. Combo Form Modal */}
      <ComboFormModal
        isOpen={isComboFormOpen}
        categories={categories}
        availableProducts={products}
        onClose={() => setIsComboFormOpen(false)}
        onSave={handleSaveCombo}
        onOpenCreateCategoryModal={() => {
          setCategoryToEdit(null);
          setIsCategoryModalOpen(true);
        }}
      />

      {/* 6. Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        product={selectedProduct}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={(prod) => {
          setIsDetailModalOpen(false);
          setProductToEdit(prod);
          setIsProductFormOpen(true);
        }}
        onDelete={handleDeleteProduct}
        onToggleStatus={handleToggleStatus}
        onDuplicate={handleDuplicateProduct}
        userRole={userRole}
      />
    </div>
  );
};
