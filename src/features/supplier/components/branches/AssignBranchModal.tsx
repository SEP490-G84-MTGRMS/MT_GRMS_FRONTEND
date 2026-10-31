import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { X, Check, Store, Search, Loader2, AlertCircle } from 'lucide-react';
import type {
  SupplierSummary,
  SupplierBranchAssignmentItem,
  AssignSuppliersToBranchInput,
} from '../../types/supplier.types';
import type { BranchListItem } from '../../../purchase-order/types/po.types';

interface AssignBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: BranchListItem[];
  suppliers: SupplierSummary[];
  assignments: SupplierBranchAssignmentItem[];
  initialBranchId?: string;
  onAssign: (input: AssignSuppliersToBranchInput) => Promise<void>;
}

export const AssignBranchModal: FC<AssignBranchModalProps> = ({
  isOpen,
  onClose,
  branches,
  suppliers,
  assignments,
  initialBranchId,
  onAssign,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Khởi tạo trạng thái khi mở modal
  useEffect(() => {
    if (isOpen) {
      const defaultBranchId =
        initialBranchId && branches.some((b) => b.id === initialBranchId)
          ? initialBranchId
          : branches[0]?.id || '';

      setSelectedBranchId(defaultBranchId);
      setSelectedSupplierIds([]);
      setSupplierSearch('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialBranchId, branches]);

  // Xử lý đổi chi nhánh: Xóa lựa chọn NCC cũ và reset tìm kiếm (BR-04)
  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    setSelectedSupplierIds([]);
    setSupplierSearch('');
    setErrorMsg('');
  };

  // Chi nhánh hiện đang được chọn
  const currentBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId);
  }, [branches, selectedBranchId]);

  // Tập hợp các ID nhà cung cấp ĐÃ ĐƯỢC GÁN và đang ACTIVE tại chi nhánh được chọn (SUP-02)
  const activeAssignedSupplierIdsForBranch = useMemo(() => {
    if (!selectedBranchId) return new Set<string>();
    return new Set(
      assignments
        .filter((a) => a.branchId === selectedBranchId && a.status === 'Active')
        .map((a) => a.supplierId)
    );
  }, [assignments, selectedBranchId]);

  // Danh sách nhà cung cấp khả dụng cho chi nhánh:
  // - NCC đang hoạt động (Active) trên toàn hệ thống (SUP-03)
  // - Chưa được gán Active cho chi nhánh đang chọn (SUP-02)
  // - NCC từng Inactive tại chi nhánh này được phép hiển thị để kích hoạt lại (MAP-06)
  const availableSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (s.status === 'Inactive') return false;
      if (activeAssignedSupplierIdsForBranch.has(s.id)) return false;
      return true;
    });
  }, [suppliers, activeAssignedSupplierIdsForBranch]);

  // Lọc theo từ khóa tìm kiếm (Mã hoặc Tên NCC không phân biệt hoa/thường)
  const filteredAvailableSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return availableSuppliers;
    const term = supplierSearch.toLowerCase().trim();
    return availableSuppliers.filter(
      (s) =>
        s.code.toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(term))
    );
  }, [availableSuppliers, supplierSearch]);

  if (!isOpen) return null;

  // Toggle chọn một nhà cung cấp
  const handleToggleSupplier = (supplierId: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId]
    );
    setErrorMsg('');
  };

  // Chọn tất cả các NCC đang hiển thị và còn khả dụng
  const handleSelectAll = () => {
    const selectableIds = filteredAvailableSuppliers.map((s) => s.id);
    setSelectedSupplierIds((prev) => Array.from(new Set([...prev, ...selectableIds])));
    setErrorMsg('');
  };

  // Bỏ chọn tất cả
  const handleDeselectAll = () => {
    setSelectedSupplierIds([]);
  };

  // Submit form phân bổ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // BR-01: Chưa chọn chi nhánh
    if (!selectedBranchId) {
      setErrorMsg('Vui lòng chọn Cửa hàng / Chi nhánh cần phân bổ.');
      return;
    }

    // BR-02: Chi nhánh bị vô hiệu hóa
    if (currentBranch && (currentBranch as any).isActive === false) {
      setErrorMsg('Chi nhánh này hiện đang bị tạm ngưng, không thể phân bổ nhà cung cấp.');
      return;
    }

    // SUP-01: Chưa chọn nhà cung cấp nào
    if (selectedSupplierIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 nhà cung cấp để phân bổ cho chi nhánh.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onAssign({
        branchId: selectedBranchId,
        supplierIds: selectedSupplierIds,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra trong quá trình lưu phân bổ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAllFilteredSelected =
    filteredAvailableSuppliers.length > 0 &&
    filteredAvailableSuppliers.every((s) => selectedSupplierIds.includes(s.id));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#f0fdfa',
                border: '1px solid #ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store size={20} color="#0f766e" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Thêm nhà cung cấp cho cửa hàng
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Chọn một chi nhánh và gán danh sách các nhà cung cấp phân phối hàng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
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
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#b91c1c',
                  fontSize: 12.5,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Bước 1: Chọn cửa hàng / chi nhánh */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: 6,
                }}
              >
                1. Chọn cửa hàng / chi nhánh <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" disabled>
                  -- Chọn chi nhánh / cửa hàng áp dụng --
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} – {b.name}
                  </option>
                ))}
              </select>

              {currentBranch && (
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  Địa chỉ: {currentBranch.address || 'Chưa cập nhật địa chỉ'}
                </div>
              )}
            </div>

            {/* Bước 2: Chọn nhà cung cấp */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1e293b',
                    margin: 0,
                  }}
                >
                  2. Chọn nhà cung cấp <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>
                  {availableSuppliers.length} NCC khả dụng
                </span>
              </div>

              {/* Ô tìm kiếm NCC */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: 10,
                }}
              >
                <Search
                  size={15}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 12, top: 11 }}
                />
                <input
                  type="text"
                  placeholder="Tìm theo mã hoặc tên nhà cung cấp..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  disabled={isSubmitting || !selectedBranchId}
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 32px 0 34px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {supplierSearch && (
                  <button
                    type="button"
                    onClick={() => setSupplierSearch('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 10,
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Danh sách nhà cung cấp khả dụng */}
              <div
                style={{
                  maxHeight: 280,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                }}
              >
                {!selectedBranchId ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Vui lòng chọn cửa hàng / chi nhánh ở bước 1 để tải danh sách nhà cung cấp.
                  </div>
                ) : availableSuppliers.length === 0 ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    <Check size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>Đã phân bổ toàn bộ</div>
                    <div>Tất cả nhà cung cấp đang hoạt động đã được gán cho chi nhánh này.</div>
                  </div>
                ) : filteredAvailableSuppliers.length === 0 ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    Không tìm thấy nhà cung cấp phù hợp với từ khóa "{supplierSearch}".
                  </div>
                ) : (
                  filteredAvailableSuppliers.map((sup) => {
                    const isSelected = selectedSupplierIds.includes(sup.id);
                    return (
                      <div
                        key={sup.id}
                        onClick={() => handleToggleSupplier(sup.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Đã xử lý ở thẻ div cha
                          style={{
                            width: 16,
                            height: 16,
                            accentColor: '#0f766e',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontWeight: 700,
                                fontSize: 12,
                                color: '#0066FF',
                              }}
                            >
                              {sup.code}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                              {sup.name}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                            {sup.contactPerson || 'Chưa có đầu mối'} · {sup.phone || 'Chưa có SĐT'}
                            {sup.category && ` · ${sup.category}`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Toolbar đếm số lượng & Chọn tất cả */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10,
                  padding: '8px 4px',
                }}
              >
                <div>
                  <span style={{ fontSize: 11.5, color: '#64748b', display: 'block' }}>
                    Chỉ hiển thị nhà cung cấp chưa được gán cho chi nhánh đã chọn.
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: selectedSupplierIds.length > 0 ? '#0f766e' : '#64748b',
                      backgroundColor: selectedSupplierIds.length > 0 ? '#ccfbf1' : '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Đã chọn: {selectedSupplierIds.length} nhà cung cấp
                  </span>
                </div>

                {filteredAvailableSuppliers.length > 0 && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {isAllFilteredSelected ? (
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        Bỏ chọn tất cả
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0f766e',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        Chọn tất cả ({filteredAvailableSuppliers.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Modal */}
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="po-btn po-btn-secondary"
              style={{ height: 36, padding: '0 16px', fontSize: 13 }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedBranchId || selectedSupplierIds.length === 0}
              className="po-btn po-btn-primary"
              style={{
                height: 36,
                padding: '0 20px',
                fontSize: 13,
                fontWeight: 600,
                opacity: isSubmitting || !selectedBranchId || selectedSupplierIds.length === 0 ? 0.6 : 1,
                cursor:
                  isSubmitting || !selectedBranchId || selectedSupplierIds.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu phân bổ ({selectedSupplierIds.length})</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
