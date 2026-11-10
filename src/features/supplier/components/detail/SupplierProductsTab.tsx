import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import type {
  SupplierSummary,
  SupplierProductItem,
  AssignProductInput,
  EditSupplierProductInput,
} from '../../types/supplier.types';
import {
  supplierProductApi,
  type BatchAssignProductInput,
} from '../../api/supplierProductApi';
import { SupplierStatusBadge } from '../SupplierStatusBadge';
import { AssignProductModal } from '../products/AssignProductModal';
import { EditSupplierProductModal } from '../products/EditSupplierProductModal';
import {
  Package,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Props {
  supplier?: SupplierSummary;
  products?: SupplierProductItem[];
  canEdit?: boolean;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const SupplierProductsTab: FC<Props> = ({
  supplier,
  products: initialProducts,
  canEdit = true,
  onNotify,
}) => {
  const [products, setProducts] = useState<SupplierProductItem[]>(initialProducts || []);
  const [totalCount, setTotalCount] = useState<number>(initialProducts?.length || 0);
  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProducts && !!supplier?.id);

  // Filter inputs (draft state)
  const [searchInput, setSearchInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('ALL');
  const [statusInput, setStatusInput] = useState('ALL');

  // Applied filters for API query
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: '',
    categoryFilter: 'ALL',
    statusFilter: 'ALL',
    pageIndex: 1,
    pageSize: 10,
  });

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierProductItem | null>(null);

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN').format(Number.isFinite(val) ? val : 0) + ' đ';

  const notify = useCallback(
    (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
      onNotify?.(msg, type);
    },
    [onNotify]
  );

  // Load Master Products for Assign Modal & category list
  useEffect(() => {
    if (!supplier?.id) return;
    let isMounted = true;
    supplierProductApi
      .getMasterProducts()
      .then((res) => {
        if (isMounted) setMasterProducts(res ?? []);
      })
      .catch(() => {
        // non-blocking
      });
    return () => {
      isMounted = false;
    };
  }, [supplier?.id]);

  // Fetch products of this specific supplier
  const fetchSupplierProducts = useCallback(async () => {
    if (!supplier?.id) {
      if (initialProducts) {
        setProducts(initialProducts);
        setTotalCount(initialProducts.length);
      }
      return;
    }

    setIsLoading(true);
    try {
      const res = await supplierProductApi.getSupplierProducts(supplier.id, {
        searchTerm: appliedFilters.searchTerm,
        productSearch: appliedFilters.searchTerm,
        categoryFilter: appliedFilters.categoryFilter,
        statusFilter: appliedFilters.statusFilter,
        pageIndex: appliedFilters.pageIndex,
        pageSize: appliedFilters.pageSize,
      });
      setProducts(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      notify(err.message || 'Không thể tải danh sách sản phẩm của nhà cung cấp.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supplier?.id, appliedFilters, initialProducts, notify]);

  useEffect(() => {
    void fetchSupplierProducts();
  }, [fetchSupplierProducts]);

  // Available categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    masterProducts.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [products, masterProducts]);

  // Client fallback filtering when initialProducts is passed without supplier API
  const displayedProducts = useMemo(() => {
    if (supplier?.id) return products;
    return products.filter((p) => {
      const matchSearch =
        !appliedFilters.searchTerm ||
        p.name.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase());
      const matchCategory =
        appliedFilters.categoryFilter === 'ALL' ||
        p.categoryName === appliedFilters.categoryFilter;
      const matchStatus =
        appliedFilters.statusFilter === 'ALL' || p.status === appliedFilters.statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [supplier?.id, products, appliedFilters]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAppliedFilters((prev) => ({
      ...prev,
      searchTerm: searchInput.trim(),
      categoryFilter: categoryInput,
      statusFilter: statusInput,
      pageIndex: 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setCategoryInput('ALL');
    setStatusInput('ALL');
    setAppliedFilters({
      searchTerm: '',
      categoryFilter: 'ALL',
      statusFilter: 'ALL',
      pageIndex: 1,
      pageSize: appliedFilters.pageSize,
    });
  };

  const handleAssignProduct = async (input: AssignProductInput) => {
    try {
      const res = await supplierProductApi.assignProduct(input);
      const syncedCount = res?.syncedBranchesCount ?? 0;
      if (syncedCount > 0) {
        notify(
          `Đã gán sản phẩm thành công. Hệ thống đã tự động phân bổ sản phẩm đến ${syncedCount} chi nhánh.`,
          'success'
        );
      } else {
        notify('Đã gán sản phẩm cho nhà cung cấp thành công!', 'success');
      }
      setIsAssignModalOpen(false);
      await fetchSupplierProducts();
      return res;
    } catch (err: any) {
      notify(err.message || 'Thao tác gán sản phẩm không thành công.', 'error');
      throw err;
    }
  };

  const handleAssignBatchProducts = async (input: BatchAssignProductInput) => {
    try {
      const res = await supplierProductApi.assignBatchProducts(input);
      const assignedCount = res?.assignedCount ?? input.productIds.length;
      const syncedCount = res?.syncedBranchesCount ?? 0;
      if (syncedCount > 0) {
        notify(
          `Đã gán thành công ${assignedCount} sản phẩm cho NCC ${supplier?.name || ''}. Tự động phân bổ đến ${syncedCount} chi nhánh.`,
          'success'
        );
      } else {
        notify(
          `Đã gán thành công ${assignedCount} sản phẩm cho NCC ${supplier?.name || ''}!`,
          'success'
        );
      }
      setIsAssignModalOpen(false);
      await fetchSupplierProducts();
      return res;
    } catch (err: any) {
      notify(err.message || 'Thao tác gán sản phẩm không thành công.', 'error');
      throw err;
    }
  };

  const handleSaveEdit = async (input: EditSupplierProductInput) => {
    if (!editingItem) return;
    try {
      await supplierProductApi.updateProduct(
        editingItem.supplierId,
        editingItem.productId,
        input
      );
      if (input.status !== editingItem.status) {
        await supplierProductApi.toggleStatus(
          editingItem.supplierId,
          editingItem.productId,
          input.status
        );
      }
      notify('Đã cập nhật điều khoản cung ứng sản phẩm thành công!', 'success');
      setEditingItem(null);
      await fetchSupplierProducts();
    } catch (err: any) {
      notify(err.message || 'Không thể cập nhật sản phẩm.', 'error');
      throw err;
    }
  };

  const assignedProductIds = useMemo(
    () => products.map((p) => p.productId),
    [products]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / appliedFilters.pageSize));
  const startItem =
    totalCount === 0 ? 0 : (appliedFilters.pageIndex - 1) * appliedFilters.pageSize + 1;
  const endItem = Math.min(appliedFilters.pageIndex * appliedFilters.pageSize, totalCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="supplier-detail-card">
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm, 8px)',
                background: 'var(--blue-light, #f0fdfa)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue-primary, #0f766e)',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h2
                className="supplier-detail-card-title"
                style={{ margin: 0, border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span>Danh Mục Sản Phẩm Cung Ứng ({totalCount})</span>
                {isLoading && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    style={{ color: 'var(--blue-primary, #0f766e)' }}
                  />
                )}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                Bảng giá nhập sỉ hiện tại, số lượng đặt hàng tối thiểu (MOQ) và hạn mức giao thiếu của{' '}
                {supplier?.name ? <b>{supplier.name}</b> : 'nhà cung cấp'}.
              </div>
            </div>
          </div>

          {canEdit && supplier && (
            <button
              type="button"
              data-testid="btn-assign-supplier-product"
              className="po-btn po-btn-primary"
              onClick={() => setIsAssignModalOpen(true)}
            >
              <Plus size={14} />
              <span>Gán sản phẩm mới</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
            padding: '12px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <input
              type="text"
              placeholder="Tìm theo mã SKU hoặc tên sản phẩm..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="admin-search-input"
              style={{
                width: '100%',
                height: 36,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Ngành hàng:
            </span>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              style={{
                height: 36,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                backgroundColor: '#ffffff',
                color: '#1e293b',
              }}
            >
              <option value="ALL">-- Tất cả ngành hàng ({availableCategories.length}) --</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Trạng thái:
            </span>
            <select
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              style={{
                height: 36,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                backgroundColor: '#ffffff',
                color: '#1e293b',
              }}
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="Active">Hoạt động</option>
              <option value="Inactive">Ngưng cung ứng</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <button type="submit" className="po-btn po-btn-primary" style={{ height: 36 }}>
              <Search size={14} />
              <span>Tìm kiếm</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="po-btn po-btn-secondary"
              style={{ height: 36 }}
            >
              <RotateCcw size={14} />
              <span>Đặt lại</span>
            </button>
          </div>
        </form>

        {/* Data Table */}
        <div
          className="admin-table-card"
          style={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
          }}
        >
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ width: 44, textAlign: 'center', padding: '10px 8px', fontSize: 11.5 }}>
                  #
                </th>
                <th style={{ width: 56, textAlign: 'center', padding: '10px 8px', fontSize: 11.5 }}>
                  ẢNH
                </th>
                <th style={{ width: 140, textAlign: 'left', padding: '10px 12px', fontSize: 11.5 }}>
                  MÃ SKU
                </th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11.5 }}>
                  TÊN SẢN PHẨM
                </th>
                <th style={{ width: 140, textAlign: 'left', padding: '10px 12px', fontSize: 11.5 }}>
                  NGÀNH HÀNG
                </th>
                <th style={{ width: 80, textAlign: 'center', padding: '10px 12px', fontSize: 11.5 }}>
                  ĐVT
                </th>
                <th style={{ width: 130, textAlign: 'right', padding: '10px 12px', fontSize: 11.5 }}>
                  GIÁ NHẬP SỈ
                </th>
                <th style={{ width: 100, textAlign: 'right', padding: '10px 12px', fontSize: 11.5 }}>
                  MOQ
                </th>
                <th style={{ width: 125, textAlign: 'right', padding: '10px 12px', fontSize: 11.5 }}>
                  THIẾU CHO PHÉP
                </th>
                <th style={{ width: 120, textAlign: 'center', padding: '10px 12px', fontSize: 11.5 }}>
                  TRẠNG THÁI
                </th>
                {canEdit && (
                  <th style={{ width: 95, textAlign: 'right', padding: '10px 12px', fontSize: 11.5 }}>
                    THAO TÁC
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={canEdit ? 11 : 10}
                    style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <Loader2 size={18} className="animate-spin" />
                      <span>Đang tải danh mục sản phẩm cung ứng...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedProducts.length > 0 ? (
                displayedProducts.map((item, idx) => {
                  const rowIndex =
                    (appliedFilters.pageIndex - 1) * appliedFilters.pageSize + idx + 1;
                  const uom = item.baseUoM || item.deliveryUoM || item.unit || 'Cái';
                  const price = item.effectivePrice ?? item.agreedPrice ?? item.importPrice ?? 0;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        opacity: item.status === 'Inactive' ? 0.65 : 1,
                      }}
                    >
                      {/* 1. STT */}
                      <td
                        style={{
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: 12,
                          color: '#94a3b8',
                        }}
                      >
                        {rowIndex}
                      </td>

                      {/* 2. Ảnh */}
                      <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{
                              width: 36,
                              height: 36,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              display: 'block',
                              margin: '0 auto',
                              background: '#f8fafc',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              border: '1px dashed #cbd5e1',
                              background: '#f8fafc',
                              margin: '0 auto',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              color: '#94a3b8',
                            }}
                          >
                            N/A
                          </div>
                        )}
                      </td>

                      {/* 3. Mã SKU */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#0f766e',
                          }}
                        >
                          {item.sku}
                        </span>
                      </td>

                      {/* 4. Tên sản phẩm */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                          {item.name}
                        </div>
                      </td>

                      {/* 5. Ngành hàng */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                          {item.categoryName || 'Chung'}
                        </span>
                      </td>

                      {/* 6. ĐVT */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                          {uom}
                        </span>
                      </td>

                      {/* 7. Giá nhập sỉ */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: '#0f766e',
                          }}
                        >
                          {fmtCurrency(price)}
                        </span>
                      </td>

                      {/* 8. MOQ */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 12,
                            color: '#475569',
                          }}
                        >
                          {item.moq} {uom}
                        </span>
                      </td>

                      {/* 9. Thiếu cho phép */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 12,
                            color: '#475569',
                          }}
                        >
                          {item.allowedShortageQty ?? 0} {uom}
                        </span>
                      </td>

                      {/* 10. Trạng thái */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <SupplierStatusBadge status={item.status || 'Active'} />
                      </td>

                      {/* 11. Thao tác */}
                      {canEdit && (
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div className="so-list-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => setEditingItem(item)}
                              title="Sửa điều khoản cung ứng"
                            >
                              <Edit2 size={12} /> Sửa
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={canEdit ? 11 : 10}
                    style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <span>Không có sản phẩm nào phù hợp hoặc nhà cung cấp chưa được gán mặt hàng.</span>
                      {canEdit && supplier && (
                        <button
                          type="button"
                          className="po-btn po-btn-primary"
                          onClick={() => setIsAssignModalOpen(true)}
                        >
                          <Plus size={14} />
                          <span>Gán sản phẩm đầu tiên</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          {totalCount > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: 12.5,
                color: '#475569',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>
                  Hiển thị <b>{startItem}</b> – <b>{endItem}</b> trên <b>{totalCount}</b> mặt hàng
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Bản ghi/trang:</span>
                  <select
                    value={appliedFilters.pageSize}
                    onChange={(e) =>
                      setAppliedFilters((prev) => ({
                        ...prev,
                        pageSize: Number(e.target.value),
                        pageIndex: 1,
                      }))
                    }
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  disabled={appliedFilters.pageIndex <= 1}
                  onClick={() =>
                    setAppliedFilters((prev) => ({
                      ...prev,
                      pageIndex: Math.max(1, prev.pageIndex - 1),
                    }))
                  }
                  className="po-btn po-btn-secondary"
                  style={{ height: 28, padding: '0 8px', fontSize: 12 }}
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <span>
                  Trang <b>{appliedFilters.pageIndex}</b> / <b>{totalPages}</b>
                </span>
                <button
                  type="button"
                  disabled={appliedFilters.pageIndex >= totalPages}
                  onClick={() =>
                    setAppliedFilters((prev) => ({
                      ...prev,
                      pageIndex: Math.min(totalPages, prev.pageIndex + 1),
                    }))
                  }
                  className="po-btn po-btn-secondary"
                  style={{ height: 28, padding: '0 8px', fontSize: 12 }}
                >
                  Sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Assign New Product */}
      {canEdit && supplier && (
        <AssignProductModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          supplier={supplier}
          suppliers={[supplier]}
          masterProducts={masterProducts}
          assignedProductIds={assignedProductIds}
          onAssign={handleAssignProduct}
          onAssignBatch={handleAssignBatchProducts}
        />
      )}

      {/* Modal 2: Edit Product Price & MOQ */}
      {canEdit && (
        <EditSupplierProductModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          supplierName={supplier?.name || editingItem?.supplierName || ''}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};
