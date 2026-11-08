import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { X, Check, Store, Search, Loader2, AlertCircle } from 'lucide-react';
import type {
  SupplierSummary,
  SupplierBranchAssignmentItem,
  AssignSuppliersToBranchInput,
} from '../../types/supplier.types';
import type { BranchListItem } from '../../../purchase-order/types/po.types';
import { supplierApi } from '../../api/supplierApi';
import { StatusToggle } from '../StatusToggle';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_OPTIONS = [
  { val: 1, label: 'T2' },
  { val: 2, label: 'T3' },
  { val: 3, label: 'T4' },
  { val: 4, label: 'T5' },
  { val: 5, label: 'T6' },
  { val: 6, label: 'T7' },
  { val: 0, label: 'CN' },
] as const;

function mapDeliveryDaysToJs(days?: string[]): number[] {
  if (!days?.length) return [1, 2, 3, 4, 5, 6];
  return days
    .map((day) => DAY_NAMES.indexOf(day as (typeof DAY_NAMES)[number]))
    .filter((index) => index >= 0);
}

function mapJsDaysToNames(days: number[]): string[] {
  return days.map((day) => DAY_NAMES[day]).filter(Boolean);
}

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
  const [deliveryDaysBySupplier, setDeliveryDaysBySupplier] = useState<Record<string, number[]>>({});
  const [loadingDeliveryFor, setLoadingDeliveryFor] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [inactiveReason, setInactiveReason] = useState('');

  // Khởi tạo trạng thái khi mở modal
  useEffect(() => {
    if (isOpen) {
      const defaultBranchId =
        initialBranchId && branches.some((b) => b.id === initialBranchId)
          ? initialBranchId
          : branches[0]?.id || '';

      setSelectedBranchId(defaultBranchId);
      setSelectedSupplierIds([]);
      setDeliveryDaysBySupplier({});
      setSupplierSearch('');
      setErrorMsg('');
      setIsSubmitting(false);
      setStatus('Active');
      setInactiveReason('');
    }
  }, [isOpen, initialBranchId, branches]);

  // Xử lý đổi chi nhánh: Xóa lựa chọn NCC cũ và reset tìm kiếm (BR-04)
  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    setSelectedSupplierIds([]);
    setDeliveryDaysBySupplier({});
    setSupplierSearch('');
    setErrorMsg('');
  };

  const ensureDeliveryDaysForSupplier = useCallback(async (supplierId: string) => {
    setDeliveryDaysBySupplier((prev) => {
      if (prev[supplierId]) return prev;
      return { ...prev, [supplierId]: [1, 2, 3, 4, 5, 6] };
    });
    setLoadingDeliveryFor(supplierId);
    try {
      const cfg = await supplierApi.getDeliveryConfig(supplierId);
      const days = mapDeliveryDaysToJs(cfg?.deliveryDays);
      setDeliveryDaysBySupplier((prev) => ({ ...prev, [supplierId]: days.length ? days : [1, 2, 3, 4, 5, 6] }));
    } catch {
      // giữ mặc định Mon-Sat
    } finally {
      setLoadingDeliveryFor((cur) => (cur === supplierId ? null : cur));
    }
  }, []);

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
    setSelectedSupplierIds((prev) => {
      if (prev.includes(supplierId)) {
        setDeliveryDaysBySupplier((daysMap) => {
          const next = { ...daysMap };
          delete next[supplierId];
          return next;
        });
        return prev.filter((id) => id !== supplierId);
      }
      void ensureDeliveryDaysForSupplier(supplierId);
      return [...prev, supplierId];
    });
    setErrorMsg('');
  };

  // Chọn tất cả các NCC đang hiển thị và còn khả dụng
  const handleSelectAll = () => {
    const selectableIds = filteredAvailableSuppliers.map((s) => s.id);
    setSelectedSupplierIds((prev) => Array.from(new Set([...prev, ...selectableIds])));
    selectableIds.forEach((id) => {
      void ensureDeliveryDaysForSupplier(id);
    });
    setErrorMsg('');
  };

  // Bỏ chọn tất cả
  const handleDeselectAll = () => {
    setSelectedSupplierIds([]);
    setDeliveryDaysBySupplier({});
  };

  const handleToggleDeliveryDay = (supplierId: string, dayVal: number) => {
    setDeliveryDaysBySupplier((prev) => {
      const current = prev[supplierId] ?? [1, 2, 3, 4, 5, 6];
      const exists = current.includes(dayVal);
      const next = exists ? current.filter((d) => d !== dayVal) : [...current, dayVal];
      return { ...prev, [supplierId]: next };
    });
    setErrorMsg('');
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

    const missingDays = selectedSupplierIds.some(
      (id) => !deliveryDaysBySupplier[id] || deliveryDaysBySupplier[id].length === 0
    );
    if (missingDays) {
      setErrorMsg('Mỗi nhà cung cấp cần chọn ít nhất 1 ngày giao hàng trong tuần.');
      return;
    }

    if (status === 'Inactive' && !inactiveReason.trim()) {
      setErrorMsg('Vui lòng nhập lý do khi đặt trạng thái Disable.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onAssign({
        branchId: selectedBranchId,
        supplierIds: selectedSupplierIds,
        items: selectedSupplierIds.map((supplierId) => ({
          supplierId,
          deliveryDays: mapJsDaysToNames(deliveryDaysBySupplier[supplierId] || []),
        })),
        status,
        inactiveReason: status === 'Inactive' ? inactiveReason.trim() : undefined,
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
          maxWidth: 920,
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

              {/* Danh sách nhà cung cấp dạng bảng */}
              <div
                style={{
                  maxHeight: 320,
                  overflow: 'auto',
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: 42, padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            onChange={() =>
                              isAllFilteredSelected ? handleDeselectAll() : handleSelectAll()
                            }
                            style={{ width: 15, height: 15, accentColor: '#0f766e', cursor: 'pointer' }}
                            title={isAllFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                          />
                        </th>
                        <th
                          style={{
                            padding: '8px 10px',
                            textAlign: 'left',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Mã NCC
                        </th>
                        <th
                          style={{
                            padding: '8px 10px',
                            textAlign: 'left',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                          }}
                        >
                          Tên nhà cung cấp
                        </th>
                        <th
                          style={{
                            padding: '8px 10px',
                            textAlign: 'left',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Liên hệ
                        </th>
                        <th
                          style={{
                            padding: '8px 10px',
                            textAlign: 'left',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          SĐT
                        </th>
                        <th
                          style={{
                            padding: '8px 10px',
                            textAlign: 'left',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                            minWidth: 220,
                          }}
                        >
                          Ngày giao
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAvailableSuppliers.map((sup) => {
                        const isSelected = selectedSupplierIds.includes(sup.id);
                        const days = deliveryDaysBySupplier[sup.id] ?? [];
                        const isLoadingDays = loadingDeliveryFor === sup.id;
                        return (
                          <tr
                            key={sup.id}
                            onClick={() => handleToggleSupplier(sup.id)}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = isSelected ? '#f0fdfa' : '#ffffff';
                            }}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => handleToggleSupplier(sup.id)}
                                style={{
                                  width: 15,
                                  height: 15,
                                  accentColor: '#0f766e',
                                  cursor: 'pointer',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono, monospace)',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  color: '#0f766e',
                                }}
                              >
                                {sup.code}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{sup.name}</span>
                            </td>
                            <td style={{ padding: '8px 10px', verticalAlign: 'middle', fontSize: 12.5, color: '#475569' }}>
                              {sup.contactPerson || '—'}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                verticalAlign: 'middle',
                                fontSize: 12.5,
                                color: '#475569',
                                fontFamily: 'var(--font-mono, monospace)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {sup.phone || '—'}
                            </td>
                            <td
                              style={{ padding: '6px 10px', verticalAlign: 'middle' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isSelected ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {WEEKDAY_OPTIONS.map((day) => {
                                      const isChecked = days.includes(day.val);
                                      return (
                                        <label
                                          key={day.val}
                                          title={day.label}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: isChecked ? '#0f766e' : '#64748b',
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                            userSelect: 'none',
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={isSubmitting || isLoadingDays}
                                            onChange={() => handleToggleDeliveryDay(sup.id, day.val)}
                                            style={{
                                              width: 13,
                                              height: 13,
                                              accentColor: '#0f766e',
                                              cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                            }}
                                          />
                                          {day.label}
                                        </label>
                                      );
                                    })}
                                  </div>
                                  {isLoadingDays && (
                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Đang tải lịch NCC…</span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: 11.5, color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                    Chỉ hiển thị nhà cung cấp chưa được gán cho chi nhánh đã chọn. Tick ngày giao ngay trên từng dòng đã chọn.
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

            {/* Trạng thái phân bổ — cuối popup */}
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <StatusToggle
                checked={status === 'Active'}
                disabled={isSubmitting}
                onChange={(next) => {
                  setStatus(next ? 'Active' : 'Inactive');
                  setErrorMsg('');
                }}
              />
              {status === 'Inactive' && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Lý do tạm ngưng
                  </label>
                  <textarea
                    value={inactiveReason}
                    onChange={(e) => setInactiveReason(e.target.value)}
                    rows={2}
                    placeholder="Nhập lý do..."
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
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
