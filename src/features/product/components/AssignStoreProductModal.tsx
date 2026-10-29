import { useState, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import type { StoreSummary, AssignStoreProductInput } from '../types/storeProduct.types';
import { MASTER_PRODUCTS } from '../../supplier/lib/mockData';
import { X, Search } from 'lucide-react';

interface AssignStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: StoreSummary;
  assignedProductIds: string[];
  onAssign: (input: AssignStoreProductInput) => void;
}

export const AssignStoreProductModal: FC<AssignStoreProductModalProps> = ({
  isOpen,
  onClose,
  currentStore,
  assignedProductIds,
  onAssign,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [defaultMinStock, setDefaultMinStock] = useState<number>(10);
  const [errorMsg, setErrorMsg] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    MASTER_PRODUCTS.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, []);

  const filteredMasterProducts = useMemo(() => {
    return MASTER_PRODUCTS.filter((p) => {
      const isAssigned = assignedProductIds.includes(p.id);
      if (isAssigned) return false; // Only show unassigned products

      if (categoryFilter !== 'ALL' && p.categoryName !== categoryFilter) {
        return false;
      }

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
  }, [assignedProductIds, categoryFilter, searchTerm]);

  if (!isOpen) return null;

  const handleToggleProduct = (pid: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredMasterProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredMasterProducts.map((p) => p.id));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedProductIds.length === 0) {
      setErrorMsg('Vui lòng tích chọn ít nhất 1 sản phẩm để gán vào cửa hàng.');
      return;
    }

    if (defaultMinStock < 0) {
      setErrorMsg('Định mức tồn tối thiểu không thể âm.');
      return;
    }

    onAssign({
      storeId: currentStore.id,
      productIds: selectedProductIds,
      defaultMinStock,
    });

    // Reset state & close
    setSelectedProductIds([]);
    setSearchTerm('');
    onClose();
  };

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

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
          borderRadius: 16,
          width: '100%',
          maxWidth: 720,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Gán Sản Phẩm Vào Cửa Hàng
            </h3>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
              Cửa hàng / Chi nhánh: <strong style={{ color: '#0066FF' }}>{currentStore.name}</strong> ({currentStore.code})
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
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Filter tools inside modal */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm theo tên, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                  Định mức tồn tối thiểu mặc định:
                </label>
                <input
                  type="number"
                  min="1"
                  value={defaultMinStock}
                  onChange={(e) => setDefaultMinStock(Number(e.target.value) || 0)}
                  style={{
                    width: 70,
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>

            {/* Table of Available Master Products */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                overflow: 'hidden',
                maxHeight: 340,
                overflowY: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 12px', width: 40, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={
                          filteredMasterProducts.length > 0 &&
                          selectedProductIds.length === filteredMasterProducts.length
                        }
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', accentColor: '#0066FF' }}
                      />
                    </th>
                    <th style={{ padding: '8px 12px', width: 100 }}>Mã SKU</th>
                    <th style={{ padding: '8px 12px' }}>Tên sản phẩm</th>
                    <th style={{ padding: '8px 12px', width: 110 }}>Ngành hàng</th>
                    <th style={{ padding: '8px 12px', width: 70, textAlign: 'center' }}>ĐVT</th>
                    <th style={{ padding: '8px 12px', width: 110, textAlign: 'right' }}>Giá vốn NCC</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMasterProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
                        Không còn sản phẩm nào phù hợp để gán (hoặc tất cả đã được gán vào chi nhánh này).
                      </td>
                    </tr>
                  ) : (
                    filteredMasterProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => handleToggleProduct(p.id)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleProduct(p.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer', accentColor: '#0066FF' }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#0066FF' }}>
                            {p.sku}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>
                            {p.categoryName || 'Khác'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>
                            {p.baseUoM || 'Gói'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {fmt(p.defaultWholesalePrice || 0)} đ
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#64748b' }}>
              <span>
                Đã chọn: <strong style={{ color: '#0066FF' }}>{selectedProductIds.length}</strong> / {filteredMasterProducts.length} sản phẩm khả dụng
              </span>
              <span>
                Giá bán lẻ niêm yết sẽ tự động đề xuất = Giá vốn x 1.3
              </span>
            </div>
          </div>

          {/* Modal Footer with Pure Text Buttons */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              backgroundColor: '#f8fafc',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="po-btn po-btn-secondary"
              style={{
                height: 34,
                padding: '0 18px',
                borderRadius: 6,
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={selectedProductIds.length === 0}
              className="po-btn po-btn-primary"
              style={{
                height: 34,
                padding: '0 20px',
                borderRadius: 6,
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: selectedProductIds.length === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedProductIds.length === 0 ? 0.6 : 1,
              }}
            >
              {selectedProductIds.length > 0
                ? `Gán ${selectedProductIds.length} sản phẩm đã chọn`
                : 'Gán sản phẩm đã chọn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
