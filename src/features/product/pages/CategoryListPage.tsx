import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Folder,
  Edit2,
  Trash2,
  Package,
  RefreshCw,
} from 'lucide-react';
import type { Category } from '../types';
import { categoryApi } from '../api/categoryApi';
import { CategoryModal } from '../components/CategoryModal';
import { TablePagination, NotificationModal } from '../../../components/common';
import { AdminToast, type ToastState } from '../../admin/components';
import '../product.css';

const removeVietnameseTones = (str?: string | null): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
};

export const CategoryListPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter & Pagination state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'has_products' | 'empty'>('all');
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Selection state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  // Toast & Notification state
  const [toast, setToast] = useState<ToastState | null>(null);
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    itemCode?: string;
  } | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load danh sách nhóm hàng từ Backend
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const catList = await categoryApi.getCategories();
      const mappedCategories: Category[] = catList.map((c) => ({
        id: c.id,
        code: c.code || c.categoryCode || '',
        name: c.name,
        description: c.description || '',
        productCount: c.productCount ?? 0,
      }));
      setCategories(mappedCategories);
    } catch (error) {
      console.error('Lỗi tải danh mục:', error);
      showToast('Không thể tải danh sách nhóm hàng.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Reset về trang 1 khi đổi từ khóa tìm kiếm hoặc bộ lọc
  useEffect(() => {
    setPageIndex(1);
  }, [searchTerm, productStatusFilter]);

  // Lọc danh sách nhóm hàng theo từ khóa (tên, mã, mô tả) và trạng thái sản phẩm
  const filteredCategories = useMemo(() => {
    const kw = removeVietnameseTones(searchTerm);
    const rawKw = searchTerm.trim().toLowerCase();

    return categories.filter((cat) => {
      if (productStatusFilter === 'has_products' && (cat.productCount ?? 0) <= 0) {
        return false;
      }
      if (productStatusFilter === 'empty' && (cat.productCount ?? 0) > 0) {
        return false;
      }

      if (!rawKw) return true;

      const nameNorm = removeVietnameseTones(cat.name);
      const codeNorm = (cat.code || '').toLowerCase();
      const descNorm = removeVietnameseTones(cat.description);

      return (
        cat.name.toLowerCase().includes(rawKw) ||
        nameNorm.includes(kw) ||
        codeNorm.includes(rawKw) ||
        (cat.description || '').toLowerCase().includes(rawKw) ||
        descNorm.includes(kw)
      );
    });
  }, [categories, searchTerm, productStatusFilter]);

  // Phân trang phía Client dựa trên dữ liệu đã lọc
  const pagedCategories = useMemo(() => {
    const startIndex = (pageIndex - 1) * pageSize;
    return filteredCategories.slice(startIndex, startIndex + pageSize);
  }, [filteredCategories, pageIndex, pageSize]);

  // Lưu tạo mới hoặc cập nhật nhóm hàng
  const handleSaveCategory = async (
    name: string,
    id?: string,
    code?: string,
    description?: string
  ) => {
    if (id) {
      await categoryApi.updateCategory(id, { name, description });
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Cập nhật nhóm hàng thành công',
        message: `Nhóm hàng "${name}" đã được cập nhật thông tin mới.`,
        itemCode: code,
      });
    } else {
      const created = await categoryApi.createCategory({ name, code, description });
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Thêm nhóm hàng thành công',
        message: `Nhóm hàng "${created.name || name}" đã được thêm vào danh mục.`,
        itemCode: created.code || created.categoryCode || code,
      });
    }
    await fetchCategories();
  };

  // Xóa đơn lẻ nhóm hàng từ Modal hoặc nút trên bảng
  const handleDeleteCategory = async (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (target && target.productCount > 0) {
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Không thể xóa nhóm hàng',
        message: `Nhóm hàng "${target.name}" đang chứa ${target.productCount} sản phẩm liên kết nên không thể xóa.`,
        itemCode: target.code,
      });
      return;
    }

    await categoryApi.deleteCategory(id);
    setSelectedCategoryIds((prev) => prev.filter((item) => item !== id));
    setNotificationModal({
      isOpen: true,
      type: 'success',
      title: 'Đã xóa nhóm hàng',
      message: `Nhóm hàng "${target?.name || ''}" đã được xóa khỏi hệ thống.`,
      itemCode: target?.code,
    });
    await fetchCategories();
  };

  // Xóa hàng loạt các nhóm hàng đã chọn (chỉ xóa các nhóm không có sản phẩm)
  const handleBulkDeleteCategories = async () => {
    if (selectedCategoryIds.length === 0) return;

    const selectedItems = categories.filter((c) => selectedCategoryIds.includes(c.id));
    const nonEmptyItems = selectedItems.filter((c) => (c.productCount ?? 0) > 0);

    if (nonEmptyItems.length > 0) {
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Không thể xóa nhóm hàng đang có sản phẩm',
        message: `Có ${nonEmptyItems.length} nhóm hàng đang chứa sản phẩm (ví dụ: "${nonEmptyItems[0].name}"). Vui lòng bỏ chọn hoặc chuyển sản phẩm sang nhóm khác trước khi xóa.`,
      });
      return;
    }

    try {
      setIsLoading(true);
      for (const id of selectedCategoryIds) {
        await categoryApi.deleteCategory(id);
      }
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Đã xóa nhóm hàng đã chọn',
        message: `Đã xóa thành công ${selectedCategoryIds.length} nhóm hàng khỏi hệ thống.`,
      });
      setSelectedCategoryIds([]);
      await fetchCategories();
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi xảy ra khi xóa nhóm hàng.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="product-management-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Tiêu đề trang đồng bộ với ProductListPage */}
      <div className="product-title-area">
        <Folder size={28} color="#0F766E" />
        <h1>Nhóm hàng</h1>
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
          {filteredCategories.length} nhóm hàng
        </span>
      </div>

      {/* 1. Header Toolbar */}
      <div className="product-header-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
          {/* Ô tìm kiếm nhanh */}
          <div style={{ position: 'relative', minWidth: 240, maxWidth: 340, flex: 1 }}>
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: 34, borderRadius: 9999, width: '100%', height: 38 }}
              placeholder="Tìm theo mã nhóm, tên nhóm hàng, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          </div>

          {/* Bộ lọc số lượng sản phẩm trong nhóm */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 9999,
              padding: '4px 14px',
              minHeight: 38,
            }}
          >
            <Package size={15} color="#0F766E" />
            <select
              value={productStatusFilter}
              onChange={(e) => setProductStatusFilter(e.target.value as 'all' | 'has_products' | 'empty')}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                color: '#1E293B',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Tất cả nhóm hàng ({categories.length})</option>
              <option value="has_products">
                Đang có sản phẩm ({categories.filter((c) => (c.productCount ?? 0) > 0).length})
              </option>
              <option value="empty">
                Nhóm trống ({categories.filter((c) => (c.productCount ?? 0) === 0).length})
              </option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="product-header-actions">
          <button
            type="button"
            className="btn-pill-outline"
            onClick={fetchCategories}
            title="Làm mới danh sách"
            style={{ height: 38 }}
          >
            <RefreshCw size={15} color="#0F766E" />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            className="btn-primary-teal"
            onClick={() => {
              setCategoryToEdit(null);
              setIsCategoryModalOpen(true);
            }}
          >
            <Plus size={16} /> Thêm nhóm hàng
          </button>
        </div>
      </div>

      {/* 2. Main Body: Full-width Table */}
      <div className="product-table-wrapper" style={{ width: '100%' }}>
        {/* Summary bar */}
        <div className="product-table-summary-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              Đang hiển thị <b>{pagedCategories.length}</b> / <b>{filteredCategories.length}</b> nhóm hàng
            </div>

            {selectedCategoryIds.length > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '3px 10px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#991B1B' }}>
                  Đã chọn {selectedCategoryIds.length} nhóm hàng
                </span>
                <button
                  type="button"
                  onClick={handleBulkDeleteCategories}
                  style={{
                    padding: '2px 8px',
                    fontSize: 12,
                    borderRadius: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Trash2 size={13} />
                  Xóa đã chọn
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryIds([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0 4px',
                  }}
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="product-table-scroll supplier-table-scroll-container">
          <table className="product-main-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      pagedCategories.length > 0 &&
                      pagedCategories.every((c) => selectedCategoryIds.includes(c.id))
                    }
                    onChange={() => {
                      const allPageIds = pagedCategories.map((c) => c.id);
                      const isAllSelected = allPageIds.every((id) => selectedCategoryIds.includes(id));
                      if (isAllSelected) {
                        setSelectedCategoryIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
                      } else {
                        setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
                      }
                    }}
                  />
                </th>
                <th style={{ width: 180, minWidth: 150 }}>Mã nhóm hàng</th>
                <th style={{ minWidth: 220 }}>Tên nhóm hàng</th>
                <th>Mô tả</th>
                <th style={{ textAlign: 'center', width: 160 }}>Số lượng hàng hóa</th>
                <th style={{ textAlign: 'center', width: 120 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedCategories.map((cat) => {
                const isChecked = selectedCategoryIds.includes(cat.id);
                const hasProducts = (cat.productCount ?? 0) > 0;

                return (
                  <tr
                    key={cat.id}
                    onClick={() => {
                      setCategoryToEdit(cat);
                      setIsCategoryModalOpen(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id));
                          } else {
                            setSelectedCategoryIds((prev) => [...prev, cat.id]);
                          }
                        }}
                      />
                    </td>

                    {/* Mã nhóm hàng */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: '#F0FDFA',
                            border: '1px solid #CCFBF1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0F766E',
                            flexShrink: 0,
                          }}
                        >
                          <Folder size={14} />
                        </div>
                        <span className="product-code-link">{cat.code || '—'}</span>
                      </div>
                    </td>

                    {/* Tên nhóm hàng (tự động rút gọn bằng ... nếu quá dài) */}
                    <td title={cat.name}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: '#1e293b',
                          display: 'inline-block',
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'bottom',
                        }}
                      >
                        {cat.name.length > 45 ? `${cat.name.slice(0, 45)}...` : cat.name}
                      </span>
                    </td>

                    {/* Mô tả */}
                    <td title={cat.description || ''}>
                      {cat.description ? (
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            display: 'inline-block',
                            maxWidth: 420,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'bottom',
                          }}
                        >
                          {cat.description.length > 65
                            ? `${cat.description.slice(0, 65)}...`
                            : cat.description}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12.5, fontStyle: 'italic' }}>
                          Chưa có mô tả
                        </span>
                      )}
                    </td>

                    {/* Số lượng hàng hóa */}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 9999,
                          backgroundColor: hasProducts ? '#CCFBF1' : '#F1F5F9',
                          color: hasProducts ? '#0F766E' : '#64748B',
                        }}
                      >
                        {cat.productCount ?? 0} sản phẩm
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToEdit(cat);
                            setIsCategoryModalOpen(true);
                          }}
                          title="Chỉnh sửa nhóm hàng"
                          style={{
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            color: '#0F766E',
                            borderRadius: 6,
                            padding: '5px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          title={
                            hasProducts
                              ? `Không thể xóa vì đang có ${cat.productCount} sản phẩm`
                              : 'Xóa nhóm hàng'
                          }
                          disabled={hasProducts}
                          style={{
                            border: '1px solid #FEE2E2',
                            background: hasProducts ? '#F8FAFC' : '#FEF2F2',
                            color: hasProducts ? '#CBD5E1' : '#DC2626',
                            borderRadius: 6,
                            padding: '5px 8px',
                            cursor: hasProducts ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pagedCategories.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <Folder size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Không tìm thấy nhóm hàng nào</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      Vui lòng thử tìm với từ khóa khác hoặc bấm &quot;Thêm nhóm hàng&quot; để tạo mới.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang chuẩn giống ProductListPage */}
        <TablePagination
          currentPage={pageIndex}
          pageSize={pageSize}
          totalItems={filteredCategories.length}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={(page) => setPageIndex(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPageIndex(1);
          }}
          itemLabel="nhóm hàng"
          isLoading={isLoading}
        />
      </div>

      {/* Category Modal (Thêm mới / Chỉnh sửa / Xóa) */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        categoryToEdit={categoryToEdit}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
      />

      {/* Notification Modal */}
      {notificationModal && (
        <NotificationModal
          isOpen={notificationModal.isOpen}
          onClose={() => setNotificationModal(null)}
          type={notificationModal.type}
          title={notificationModal.title}
          message={notificationModal.message}
          itemCode={notificationModal.itemCode}
        />
      )}
    </div>
  );
};
