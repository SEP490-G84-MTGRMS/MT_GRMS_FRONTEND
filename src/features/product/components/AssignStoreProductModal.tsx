import { useState, useMemo, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { StoreSummary, AssignStoreProductInput } from '../types/storeProduct.types';
import { storeProductApi } from '../api/storeProductApi';
import { X, Search, Loader2, Store, AlertCircle } from 'lucide-react';

interface AssignStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreSummary[];
  currentStore?: StoreSummary | null;
  onAssign: (input: AssignStoreProductInput) => void | Promise<void>;
}

interface MasterProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  categoryName: string;
  baseUoM: string;
  costPrice: number;
  moq: number;
  supplierCode?: string;
  supplierName?: string;
}

export const AssignStoreProductModal: FC<AssignStoreProductModalProps> = ({
  isOpen,
  onClose,
  stores,
  currentStore,
  onAssign,
}) => {
  // Store selection
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Products data
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [assignedProductIds, setAssignedProductIds] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Selection state - independent of filters
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Form submission & error states
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const preselect = currentStore?.id || stores[0]?.id || '';
      setSelectedBranchId(preselect);
      setSelectedProductIds([]);
      setSearchTerm('');
      setCategoryFilter('ALL');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, currentStore, stores]);

  // Load products when branch changes: chỉ SP thuộc NCC đang cung cấp cho chi nhánh
  useEffect(() => {
    if (!isOpen || !selectedBranchId) {
      setMasterProducts([]);
      setAssignedProductIds([]);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    setErrorMsg('');

    storeProductApi
      .getAssignableProducts(selectedBranchId)
      .then((items) => {
        if (cancelled) return;

        const mapped: MasterProduct[] = items.map((p) => ({
          id: p.id,
          sku: p.sku,
          barcode: p.barcode,
          name: p.name,
          categoryName: p.categoryName || 'Khác',
          baseUoM: p.baseUoM || 'Cái',
          costPrice: p.costPrice || 0,
          moq: p.moq > 0 ? p.moq : 1,
          supplierCode: p.supplierCode,
          supplierName: p.supplierName,
        }));

        setMasterProducts(mapped);
        setAssignedProductIds(items.filter((p) => p.isAlreadyAssigned).map((p) => p.id));
      })
      .catch((err: any) => {
        if (!cancelled) {
          setMasterProducts([]);
          setAssignedProductIds([]);
          setErrorMsg(
            err.response?.data?.message ||
              err.message ||
              'Không thể tải sản phẩm khả dụng cho chi nhánh.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedBranchId]);

  // Get unique categories for dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    masterProducts.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set).sort();
  }, [masterProducts]);

  // Filtered products: hiện cả đã gán / chưa gán để popup có data; chỉ cho chọn chưa gán
  const filteredProducts = useMemo(() => {
    return masterProducts.filter((p) => {
      if (categoryFilter !== 'ALL' && p.categoryName !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(kw) ||
          p.sku.toLowerCase().includes(kw) ||
          (p.barcode && p.barcode.toLowerCase().includes(kw))
        );
      }
      return true;
    });
  }, [masterProducts, categoryFilter, searchTerm]);

  // Total available assignable products (excluding already assigned)
  const totalAvailableCount = useMemo(() => {
    return masterProducts.filter((p) => !assignedProductIds.includes(p.id)).length;
  }, [masterProducts, assignedProductIds]);

  const availableFilteredProducts = useMemo(
    () => filteredProducts.filter((p) => !assignedProductIds.includes(p.id)),
    [filteredProducts, assignedProductIds]
  );

  const selectedBranch = stores.find((s) => s.id === selectedBranchId);

  // Toggle single product selection
  const handleToggleProduct = (pid: string) => {
    if (assignedProductIds.includes(pid)) return;
    setSelectedProductIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  // Select all or deselect all for currently available (unassigned) filtered products
  const handleSelectAllFiltered = () => {
    const filteredIds = availableFilteredProducts.map((p) => p.id);
    const allFilteredSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedProductIds.includes(id));

    if (allFilteredSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const newSet = new Set([...selectedProductIds, ...filteredIds]);
      setSelectedProductIds(Array.from(newSet));
    }
  };

  // Handle branch change: clear selection to prevent accidental assignment to wrong store
  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    setSelectedProductIds([]);
    setSearchTerm('');
    setCategoryFilter('ALL');
    setErrorMsg('');
  };

  // Form submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedBranchId) {
      setErrorMsg('Vui lòng chọn chi nhánh cần gán sản phẩm.');
      return;
    }

    if (selectedProductIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 sản phẩm để gán vào chi nhánh.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAssign({
        storeId: selectedBranchId,
        productIds: selectedProductIds,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          'Không thể gán sản phẩm vào chi nhánh. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  if (!isOpen) return null;

  const isSubmitDisabled = selectedProductIds.length === 0 || !selectedBranchId || isSubmitting;

  const isAllFilteredSelected =
    availableFilteredProducts.length > 0 &&
    availableFilteredProducts.every((p) => selectedProductIds.includes(p.id));

  return (
    <div
      id="modalAssignStoreProductBackdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.65)',
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
        id="modalAssignStoreProductDialog"
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 1180,
          maxHeight: '92vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
            padding: '16px 24px',
            borderBottom: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
            flexShrink: 0,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Gán Sản Phẩm Vào Chi Nhánh
            </h3>
          </div>
          <button
            type="button"
            id="btnCloseAssignModalX"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#94a3b8',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form
          id="formAssignStoreProduct"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          {/* Scrollable Body */}
          <div
            style={{
              padding: '18px 24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Global Error Message */}
            {errorMsg && (
              <div
                id="assignProductErrorBanner"
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECTION 1 – STORE SELECTION */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '14px 18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Store size={18} style={{ color: '#0d9488' }} />
                <label
                  htmlFor="assignStoreSelect"
                  style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}
                >
                  Chi nhánh gán sản phẩm <span style={{ color: '#ef4444' }}>*</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
                <div>
                  <select
                    id="assignStoreSelect"
                    value={selectedBranchId}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: `1.5px solid ${selectedBranchId ? '#0d9488' : '#cbd5e1'}`,
                      fontSize: '0.9rem',
                      backgroundColor: '#fff',
                      outline: 'none',
                      color: selectedBranchId ? '#0f172a' : '#94a3b8',
                      fontWeight: selectedBranchId ? 600 : 400,
                    }}
                  >
                    <option value="">-- Chọn chi nhánh nhận hàng --</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBranch ? (
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: '#475569',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '8px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div>
                      <strong>Địa chỉ:</strong> {selectedBranch.address || 'Đang cập nhật'}
                    </div>
                    <div>
                      <strong>Quản lý:</strong> {selectedBranch.managerName} &bull;{' '}
                      <strong>Đang kinh doanh:</strong>{' '}
                      <span style={{ color: '#0d9488', fontWeight: 700 }}>
                        {selectedBranch.totalProducts} sản phẩm
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Vui lòng chọn chi nhánh để xem danh sách sản phẩm khả dụng.
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2 – PRODUCT SEARCH AND FILTERS */}
            {selectedBranchId && (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  padding: '8px 0',
                }}
              >
                {/* Search */}
                <div style={{ position: 'relative', flex: 2, minWidth: 260 }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    id="inputSearchAssignableProducts"
                    type="text"
                    placeholder="Tìm theo tên sản phẩm, mã SKU, barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Category filter */}
                <div style={{ minWidth: 200, flex: 1 }}>
                  <select
                    id="selectAssignCategoryFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      backgroundColor: '#fff',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">Tất cả ngành hàng</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Total available products & selection badge */}
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: '#64748b',
                    padding: '8px 14px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span>Khả dụng: <strong>{totalAvailableCount}</strong> sản phẩm</span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>
                    Đã chọn:{' '}
                    <strong
                      id="summarySelectedCount"
                      style={{ color: selectedProductIds.length > 0 ? '#0d9488' : '#64748b' }}
                    >
                      {selectedProductIds.length} sản phẩm
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* SECTION 3 – PRODUCT SELECTION TABLE */}
            {selectedBranchId && (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  maxHeight: 380,
                  overflowY: 'auto',
                }}
              >
                {loadingProducts ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px 16px',
                      color: '#64748b',
                      gap: 8,
                    }}
                  >
                    <Loader2 size={20} className="animate-spin" />
                    <span>Đang tải sản phẩm từ nhà cung cấp của chi nhánh...</span>
                  </div>
                ) : (
                  <table
                    id="tableAssignableProducts"
                    style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}
                  >
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                      <tr
                        style={{
                          borderBottom: '1px solid #cbd5e1',
                          textAlign: 'left',
                          color: '#475569',
                        }}
                      >
                        <th style={{ padding: '10px 14px', width: 44, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            id="chkSelectAllProducts"
                            checked={isAllFilteredSelected}
                            onChange={handleSelectAllFiltered}
                            style={{ cursor: 'pointer', accentColor: '#0d9488', width: 16, height: 16 }}
                          />
                        </th>
                        <th style={{ padding: '10px 14px', width: 120 }}>Mã SKU</th>
                        <th style={{ padding: '10px 14px' }}>Tên sản phẩm</th>
                        <th style={{ padding: '10px 14px', width: 130 }}>Ngành hàng</th>
                        <th style={{ padding: '10px 14px', width: 70, textAlign: 'center' }}>ĐVT</th>
                        <th style={{ padding: '10px 14px', width: 110, textAlign: 'right' }}>Giá vốn</th>
                        <th style={{ padding: '10px 14px', width: 80, textAlign: 'center' }}>MOQ</th>
                        <th style={{ padding: '10px 14px', width: 100, textAlign: 'center' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}
                          >
                            {masterProducts.length === 0
                              ? 'Chi nhánh chưa có sản phẩm khả dụng. Hãy gán nhà cung cấp cho cửa hàng và đảm bảo NCC đã có sản phẩm cung ứng.'
                              : 'Không tìm thấy sản phẩm khớp bộ lọc.'}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const isAssigned = assignedProductIds.includes(p.id);
                          const isSelected = selectedProductIds.includes(p.id);
                          return (
                            <tr
                              key={p.id}
                              onClick={() => {
                                if (!isAssigned) handleToggleProduct(p.id);
                              }}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                backgroundColor: isAssigned
                                  ? '#f8fafc'
                                  : isSelected
                                  ? '#f0fdf4'
                                  : '#fff',
                                cursor: isAssigned ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isAssigned}
                                  onChange={() => handleToggleProduct(p.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    cursor: isAssigned ? 'not-allowed' : 'pointer',
                                    accentColor: '#0d9488',
                                    width: 16,
                                    height: 16,
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: '10px 14px',
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  color: isAssigned ? '#94a3b8' : '#0d9488',
                                }}
                              >
                                {p.sku}
                              </td>
                              <td
                                style={{
                                  padding: '10px 14px',
                                  fontWeight: 600,
                                  color: isAssigned ? '#94a3b8' : '#1e293b',
                                }}
                              >
                                <div>{p.name}</div>
                                {p.supplierName && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                                    NCC: {p.supplierName}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748b' }}>{p.categoryName}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>
                                {p.baseUoM}
                              </td>
                              <td
                                style={{
                                  padding: '10px 14px',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: isAssigned ? '#94a3b8' : '#334155',
                                }}
                              >
                                {fmt(p.costPrice)} đ
                              </td>
                              <td
                                style={{
                                  padding: '10px 14px',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  color: isAssigned ? '#94a3b8' : '#0f766e',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {p.moq}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    backgroundColor: isAssigned ? '#f1f5f9' : '#ecfdf5',
                                    color: isAssigned ? '#64748b' : '#047857',
                                    border: isAssigned ? '1px solid #e2e8f0' : '1px solid #a7f3d0',
                                  }}
                                >
                                  {isAssigned ? 'Đã gán' : 'Chưa gán'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {selectedBranch && (
                <span>
                  {assignedProductIds.length} sản phẩm đã có tại {selectedBranch.name}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                id="btnCancelAssignProducts"
                onClick={onClose}
                disabled={isSubmitting}
                className="po-btn po-btn-secondary"
                style={{
                  height: 38,
                  padding: '0 20px',
                  borderRadius: 6,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                id="btnSubmitAssignProducts"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="po-btn po-btn-primary"
                style={{
                  height: 38,
                  padding: '0 24px',
                  borderRadius: 6,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                  opacity: isSubmitDisabled ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <span>
                  {selectedProductIds.length > 0
                    ? `Gán ${selectedProductIds.length} sản phẩm vào chi nhánh`
                    : 'Gán sản phẩm đã chọn'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
