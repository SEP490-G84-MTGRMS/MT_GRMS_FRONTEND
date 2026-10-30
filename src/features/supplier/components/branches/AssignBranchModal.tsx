import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { X, Check, Store, Search } from 'lucide-react';
import type { SupplierSummary, AssignSupplierToBranchesInput } from '../../types/supplier.types';
import type { BranchListItem } from '../../../purchase-order/types/po.types';

interface AssignBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: SupplierSummary | null;
  suppliers: SupplierSummary[];
  branches: BranchListItem[];
  alreadyAssignedBranchIds?: string[];
  onAssign: (input: AssignSupplierToBranchesInput) => Promise<void>;
}

export const AssignBranchModal: FC<AssignBranchModalProps> = ({
  isOpen,
  onClose,
  supplier,
  suppliers,
  branches,
  alreadyAssignedBranchIds = [],
  onAssign,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [branchSearch, setBranchSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedSupplierId(supplier?.id || (suppliers[0]?.id ?? ''));
      setSelectedBranchIds([]);
      setBranchSearch('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, supplier, suppliers]);

  // Filter branches by keyword
  const filteredBranches = useMemo(() => {
    if (!branchSearch.trim()) return branches;
    const term = branchSearch.toLowerCase().trim();
    return branches.filter(
      (b) =>
        b.code.toLowerCase().includes(term) ||
        b.name.toLowerCase().includes(term) ||
        b.address.toLowerCase().includes(term)
    );
  }, [branches, branchSearch]);

  if (!isOpen) return null;

  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
    setErrorMsg('');
  };

  const handleSelectAll = () => {
    const selectable = filteredBranches
      .filter((b) => !alreadyAssignedBranchIds.includes(b.id))
      .map((b) => b.id);
    setSelectedBranchIds((prev) => Array.from(new Set([...prev, ...selectable])));
    setErrorMsg('');
  };

  const handleDeselectAll = () => {
    setSelectedBranchIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMsg('Vui lòng chọn Nhà cung cấp.');
      return;
    }
    if (selectedBranchIds.length === 0) {
      setErrorMsg('Vui lòng tích chọn ít nhất 1 cửa hàng / chi nhánh để gán.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAssign({
        supplierId: selectedSupplierId,
        branchIds: selectedBranchIds,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi gán chi nhánh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSupplier =
    suppliers.find((s) => s.id === selectedSupplierId) || supplier || suppliers[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInModal 0.18s ease-out',
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #ccfbf1',
              }}
            >
              <Store size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Gán Nhà Cung Cấp Với Cửa Hàng
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                Phân bổ quyền cung ứng mặt hàng cho các chi nhánh trong hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: 12.5,
                  marginBottom: 14,
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Mục 1: Chọn Nhà Cung Cấp */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Nhà cung cấp: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  style={{
                    flex: 1,
                    height: 36,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name} ({s.supplierType === 'Goods' ? 'Hàng hóa' : s.supplierType === 'Service' ? 'Dịch vụ' : 'Hàng & DV'})
                    </option>
                  ))}
                </select>
              </div>
              {currentSupplier && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '6px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span>
                    Mã: <b>{currentSupplier.code}</b>
                  </span>
                  <span>
                    Liên hệ: <b>{currentSupplier.contactPerson || '---'}</b> ({currentSupplier.phone || '---'})
                  </span>
                </div>
              )}
            </div>

            {/* Mục 2: Chọn Chi Nhánh / Cửa Hàng */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <label
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#334155',
                    margin: 0,
                  }}
                >
                  Chọn các Cửa hàng / Chi nhánh phân bổ:{' '}
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      padding: '2px 4px',
                    }}
                  >
                    Chọn tất cả
                  </button>
                  <span style={{ color: '#cbd5e1' }}>|</span>
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
                      padding: '2px 4px',
                    }}
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Ô tìm kiếm nhanh chi nhánh */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: 10,
                }}
              >
                <Search
                  size={14}
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
                  placeholder="Lọc nhanh chi nhánh theo mã, tên, địa chỉ..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 10px 0 32px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Danh sách Checkbox Chi Nhánh */}
              <div
                style={{
                  maxHeight: 250,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  backgroundColor: '#ffffff',
                }}
              >
                {filteredBranches.map((branch) => {
                  const isChecked = selectedBranchIds.includes(branch.id);
                  const isAlreadyAssigned = alreadyAssignedBranchIds.includes(branch.id);

                  return (
                    <div
                      key={branch.id}
                      onClick={() => !isAlreadyAssigned && handleToggleBranch(branch.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: isChecked ? '1px solid #0d9488' : '1px solid #f1f5f9',
                        backgroundColor: isChecked ? '#f0fdfa' : isAlreadyAssigned ? '#f8fafc' : '#ffffff',
                        cursor: isAlreadyAssigned ? 'default' : 'pointer',
                        opacity: isAlreadyAssigned ? 0.6 : 1,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={isChecked || isAlreadyAssigned}
                          disabled={isAlreadyAssigned}
                          onChange={() => !isAlreadyAssigned && handleToggleBranch(branch.id)}
                          style={{ accentColor: '#0f766e', cursor: isAlreadyAssigned ? 'default' : 'pointer' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: 11,
                                color: '#0f766e',
                                backgroundColor: '#ccfbf1',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {branch.code}
                            </span>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>
                              {branch.name}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                            {branch.address}
                          </div>
                        </div>
                      </div>

                      {isAlreadyAssigned && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#0f766e',
                            backgroundColor: '#e6fffa',
                            padding: '2px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ✓ Đã gán
                        </span>
                      )}
                    </div>
                  );
                })}

                {filteredBranches.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '20px 0',
                      color: '#94a3b8',
                      fontSize: 12,
                    }}
                  >
                    Không tìm thấy chi nhánh nào khớp từ khóa "{branchSearch}"
                  </div>
                )}
              </div>

              {/* Thông tin số lượng đã chọn */}
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: '#64748b',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  Đã chọn: <b style={{ color: '#0f766e' }}>{selectedBranchIds.length}</b> / {branches.length} chi nhánh
                </span>
              </div>
            </div>
          </div>

          {/* ── Modal Footer ── */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              backgroundColor: '#f8fafc',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="po-btn po-btn-secondary"
              style={{ height: 34, padding: '0 16px' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedBranchIds.length === 0}
              className="po-btn po-btn-primary"
              style={{
                height: 34,
                padding: '0 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Check size={14} />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu phân bổ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
