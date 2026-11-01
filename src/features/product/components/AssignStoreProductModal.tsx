import { useState, useMemo, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { StoreSummary, AssignStoreProductInput } from '../types/storeProduct.types';
import { storeProductApi } from '../api/storeProductApi';
import { X, Search, Loader2 } from 'lucide-react';

interface AssignStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreSummary[];
  currentStore?: StoreSummary | null;
  onAssign: (input: AssignStoreProductInput) => void;
}

interface MasterProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  categoryName: string;
  baseUoM: string;
  costPrice: number;
}

export const AssignStoreProductModal: FC<AssignStoreProductModalProps> = ({
  isOpen,
  onClose,
  stores,
  currentStore,
  onAssign,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [assignedProductIds, setAssignedProductIds] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [defaultMinStock, setDefaultMinStock] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const preselect = currentStore?.id || stores[0]?.id || '';
      setSelectedBranchId(preselect);
      setSelectedProductIds([]);
      setSearchTerm('');
      setCategoryFilter('ALL');
      setDefaultMinStock(0);
      setErrorMsg('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load products when branch changes
  useEffect(() => {
    if (!isOpen || !selectedBranchId) {
      setMasterProducts([]);
      setAssignedProductIds([]);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    setSelectedProductIds([]);

    Promise.all([
      storeProductApi.getMasterProducts(),
      storeProductApi.getStoreProducts({
        storeId: selectedBranchId,
        categoryFilter: 'ALL',
        statusFilter: 'ALL',
        pageIndex: 1,
        pageSize: 9999,
      }),
    ])
      .then(([all, branchPaged]) => {
        if (cancelled) return;
        const mapped: MasterProduct[] = (all as any[]).map((p) => ({
          id: p.id,
          sku: p.sku || '',
          barcode: p.barcode || '',
          name: p.productName || p.name || '',
          categoryName: p.categoryName || 'Khac',
          baseUoM: p.unitName || p.baseUnit || 'Goi',
          costPrice: p.costPrice || 0,
        }));
        const alreadyAssigned = branchPaged.items.map((i) => i.productId);
        setMasterProducts(mapped);
        setAssignedProductIds(alreadyAssigned);
      })
      .catch(() => {
        if (!cancelled) {
          setMasterProducts([]);
          setAssignedProductIds([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, selectedBranchId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    masterProducts.forEach((p) => { if (p.categoryName) set.add(p.categoryName); });
    return Array.from(set).sort();
  }, [masterProducts]);

  const filteredProducts = useMemo(() => {
    return masterProducts.filter((p) => {
      if (assignedProductIds.includes(p.id)) return false;
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
  }, [masterProducts, assignedProductIds, categoryFilter, searchTerm]);

  if (!isOpen) return null;

  const selectedBranch = stores.find((s) => s.id === selectedBranchId);

  const handleToggleProduct = (pid: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleSubmit = (e: FormEvent) => {
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
    if (defaultMinStock < 0) {
      setErrorMsg('Định mức tồn tối thiểu không thể âm.');
      return;
    }
    onAssign({ storeId: selectedBranchId, productIds: selectedProductIds, defaultMinStock });
    onClose();
  };

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  const isSubmitDisabled = selectedProductIds.length === 0 || !selectedBranchId;

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to right,#F8FAFC,#fff)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Gán Sản Phẩm Vào Chi Nhánh
            </h3>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
              Chọn chi nhánh và sản phẩm muốn đưa vào kinh doanh.
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {errorMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Branch selector */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                Chi nhánh gán sản phẩm <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setSelectedProductIds([]);
                  setSearchTerm('');
                  setCategoryFilter('ALL');
                  setErrorMsg('');
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${selectedBranchId ? '#0066FF' : '#cbd5e1'}`,
                  fontSize: '0.9rem',
                  backgroundColor: '#fff',
                  outline: 'none',
                  color: selectedBranchId ? '#0f172a' : '#94a3b8',
                  fontWeight: selectedBranchId ? 600 : 400,
                }}
              >
                <option value="">-- Chọn chi nhánh --</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
              {selectedBranch && (
                <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedBranch.address} &nbsp;|&nbsp; QL: {selectedBranch.managerName} &nbsp;|&nbsp; Hiện có <strong>{selectedBranch.totalProducts}</strong> sản phẩm
                </div>
              )}
            </div>

            {/* Filters */}
            {selectedBranchId && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, SKU, barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#fff', outline: 'none' }}
                >
                  <option value="ALL">Tất cả ngành hàng</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Tồn tối thiểu mặc định:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defaultMinStock}
                    onChange={(e) => setDefaultMinStock(Math.max(0, Number(e.target.value) || 0))}
                    style={{ width: 72, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }}
                  />
                </div>
              </div>
            )}

            {/* Product table */}
            {selectedBranchId && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', maxHeight: 340, overflowY: 'auto' }}>
                {loadingProducts ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', color: '#64748b', gap: 8 }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang tải danh sách sản phẩm...</span>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '8px 12px', width: 40, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                            onChange={handleSelectAll}
                            style={{ cursor: 'pointer', accentColor: '#0066FF' }}
                          />
                        </th>
                        <th style={{ padding: '8px 12px', width: 105 }}>Mã SKU</th>
                        <th style={{ padding: '8px 12px' }}>Tên sản phẩm</th>
                        <th style={{ padding: '8px 12px', width: 110 }}>Ngành hàng</th>
                        <th style={{ padding: '8px 12px', width: 60, textAlign: 'center' }}>ĐVT</th>
                        <th style={{ padding: '8px 12px', width: 120, textAlign: 'right' }}>Giá vốn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
                            {masterProducts.length === 0
                              ? 'Không có sản phẩm nào trong danh mục tổng.'
                              : 'Tất cả sản phẩm đã được gán vào chi nhánh này, hoặc không khớp bộ lọc.'}
                          </td>
                        </tr>
                      ) : filteredProducts.map((p) => {
                        const isSelected = selectedProductIds.includes(p.id);
                        return (
                          <tr
                            key={p.id}
                            onClick={() => handleToggleProduct(p.id)}
                            style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isSelected ? '#f0f7ff' : '#fff', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                          >
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <input type="checkbox" checked={isSelected} onChange={() => handleToggleProduct(p.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#0066FF' }} />
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#0066FF' }}>{p.sku}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{p.name}</td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{p.categoryName}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{p.baseUoM}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{fmt(p.costPrice)} đ</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Count summary */}
            {selectedBranchId && !loadingProducts && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#64748b' }}>
                <span>
                  Đã chọn: <strong style={{ color: '#0066FF' }}>{selectedProductIds.length}</strong> / {filteredProducts.length} sản phẩm khả dụng
                </span>
                <span style={{ color: '#94a3b8' }}>
                  ({assignedProductIds.length} sản phẩm đã có tại chi nhánh này)
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, backgroundColor: '#f8fafc' }}>
            <button
              type="button"
              onClick={onClose}
              className="po-btn po-btn-secondary"
              style={{ height: 34, padding: '0 18px', borderRadius: 6, fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="po-btn po-btn-primary"
              style={{ height: 34, padding: '0 20px', borderRadius: 6, fontSize: '0.86rem', fontWeight: 600, cursor: isSubmitDisabled ? 'not-allowed' : 'pointer', opacity: isSubmitDisabled ? 0.6 : 1 }}
            >
              {selectedProductIds.length > 0 ? `Gán ${selectedProductIds.length} sản phẩm vào chi nhánh` : 'Gán sản phẩm đã chọn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
