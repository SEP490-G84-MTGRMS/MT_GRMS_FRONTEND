import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { INITIAL_SUPPLIERS } from '../lib/mockData';
import { MOCK_BRANCH_LIST } from '../../purchase-order/lib/mockData';
import type {
  SupplierSummary,
  SupplierBranchAssignmentItem,
  SupplierBranchFilterState,
  AssignSuppliersToBranchInput,
} from '../types/supplier.types';
import type { BranchListItem } from '../../purchase-order/types/po.types';
import {
  SupplierBranchFilterBar,
  type SupplierBranchFilterValues,
} from '../components/branches/SupplierBranchFilterBar';
import { SupplierBranchTable } from '../components/branches/SupplierBranchTable';
import { AssignBranchModal } from '../components/branches/AssignBranchModal';
import { AssignmentStatusModal } from '../components/branches/AssignmentStatusModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { supplierBranchApi } from '../api/supplierBranchApi';
import { supplierApi } from '../api/supplierApi';
import { branchApi } from '../../purchase-order/api/branchApi';
import { Building2, Download, Plus, Store, Package, Loader2 } from 'lucide-react';
import '../../purchase-order/purchase-order.css';
import '../supplier.css';

const DEFAULT_FILTERS: SupplierBranchFilterState = {
  supplierCodes: [],
  supplierNames: [],
  branchCodes: [],
  branchNames: [],
  supplierId: 'ALL',
  branchId: 'ALL',
  status: 'ALL',
  pageIndex: 1,
  pageSize: 10,
};

export const SupplierBranchManagementPage: FC = () => {
  const { id: paramSupplierId } = useParams<{ id?: string }>();

  // Suppliers & Branches state
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>(INITIAL_SUPPLIERS);
  const [branches, setBranches] = useState<BranchListItem[]>(MOCK_BRANCH_LIST);
  const [assignments, setAssignments] = useState<SupplierBranchAssignmentItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Applied filter criteria state
  const [appliedFilters, setAppliedFilters] = useState<SupplierBranchFilterState>(() => ({
    ...DEFAULT_FILTERS,
    supplierId: paramSupplierId || 'ALL',
  }));

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [statusItem, setStatusItem] = useState<SupplierBranchAssignmentItem | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Fetch real suppliers list for filter dropdowns
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await supplierApi.getSuppliers({ pageIndex: 1, pageSize: 100 });
        if (res.items && res.items.length > 0) {
          setSuppliers(res.items);
        }
      } catch {
        // Keep initial suppliers fallback
      }
    };
    loadSuppliers();
  }, []);

  // Fetch real branches list
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await branchApi.getBranches({ pageIndex: 1, pageSize: 100 });
        if (res.items && res.items.length > 0) {
          setBranches(res.items);
        }
      } catch {
        // Keep initial branches fallback
      }
    };
    loadBranches();
  }, []);

  // Fetch branch assignments based on applied filters & pagination
  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await supplierBranchApi.getBranchAssignments(appliedFilters);
      setAssignments(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách phân bổ cửa hàng.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Current active supplier (if a single supplier is selected)
  const currentSupplier = useMemo(() => {
    if (appliedFilters.supplierId !== 'ALL') {
      return suppliers.find((s) => s.id === appliedFilters.supplierId) || suppliers[0];
    }
    return suppliers[0];
  }, [suppliers, appliedFilters.supplierId]);

  // Filter Search & Reset Handlers
  const handleApplySearch = (newValues: SupplierBranchFilterValues) => {
    setAppliedFilters((prev) => ({
      ...prev,
      ...newValues,
      pageIndex: 1,
    }));
  };

  const handleResetFilters = () => {
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handlePageChange = (page: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageIndex: page }));
  };

  const handlePageSizeChange = (size: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }));
  };

  // Assign & Unassign Handlers
  const handleAssignBranches = async (input: AssignSuppliersToBranchInput) => {
    try {
      await supplierBranchApi.assignSuppliersToBranch(input);
      showToast(`Đã phân bổ thành công ${input.supplierIds.length} nhà cung cấp cho cửa hàng.`);
      setIsAssignModalOpen(false);
      await fetchAssignments();
    } catch (err: any) {
      showToast(err.message || 'Không thể thực hiện gán nhà cung cấp cho cửa hàng.', 'error');
    }
  };

  const handleToggleStatus = (item: SupplierBranchAssignmentItem) => {
    setStatusItem(item);
  };

  const handleConfirmStatus = async (reason?: string) => {
    if (!statusItem) return;

    const nextStatus = statusItem.status === 'Active' ? 'Inactive' : 'Active';
    setIsUpdatingStatus(true);
    try {
      await supplierBranchApi.updateAssignmentStatus(
        statusItem.supplierId,
        statusItem.branchId,
        nextStatus,
        reason
      );
      showToast(
        nextStatus === 'Inactive'
          ? `Đã tạm ngưng phân bổ tại "${statusItem.branchName}".`
          : `Đã kích hoạt phân bổ tại "${statusItem.branchName}".`
      );
      setStatusItem(null);
      await fetchAssignments();
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật trạng thái phân bổ.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div
      className="po-matrix-container"
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Page Header theo chuẩn PoList / SupplierListPage ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Store size={22} color="var(--blue-primary, #0f766e)" />
            <span>Cửa Hàng với nhà cung cấp</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to="/store-owner/suppliers"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Quay lại danh sách nhà cung cấp"
          >
            <Building2 size={14} />
            <span>Danh sách NCC</span>
          </Link>
          <Link
            to="/store-owner/suppliers/products"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Quản lý danh mục sản phẩm theo NCC"
          >
            <Package size={14} />
            <span>Sản phẩm theo NCC</span>
          </Link>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => showToast('Đang kết xuất danh sách phân bổ ra tệp Excel (.xlsx)...', 'info')}
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            id="btnOpenAssignBranchModal"
            className="po-btn po-btn-primary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => setIsAssignModalOpen(true)}
          >
            <Plus size={14} />
            <span>Gán với Cửa hàng</span>
          </button>
        </div>
      </div>

      {/* ── Context Card khi lọc theo 1 NCC cụ thể ── */}
      {appliedFilters.supplierId !== 'ALL' && currentSupplier && (
        <div
          style={{
            flexShrink: 0,
            marginBottom: 8,
            backgroundColor: '#ffffff',
            border: '1px solid #ccfbf1',
            borderRadius: 8,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 1px 2px rgba(13, 148, 136, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #99f6e4',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#0f766e',
                  }}
                >
                  {currentSupplier.code}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {currentSupplier.name}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Người liên hệ: <b>{currentSupplier.contactPerson || '---'}</b> • Điện thoại:{' '}
                <b>{currentSupplier.phone || '---'}</b> • Điều khoản: <b>{currentSupplier.paymentTermDays} ngày</b>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#0f766e',
                backgroundColor: '#f0fdfa',
                padding: '4px 12px',
                borderRadius: 20,
                border: '1px solid #ccfbf1',
              }}
            >
              Đang phân bổ tới {totalCount} chi nhánh
            </span>
            <button
              type="button"
              onClick={() => setAppliedFilters((prev) => ({ ...prev, supplierId: 'ALL', pageIndex: 1 }))}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 12,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Xem tất cả NCC
            </button>
          </div>
        </div>
      )}

      {/* ── UNIFIED FILTER BAR THEO CHUẨN SUPPLIER LIST ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <SupplierBranchFilterBar
          initialValues={appliedFilters}
          suppliers={suppliers}
          branches={branches}
          onSearch={handleApplySearch}
          onReset={handleResetFilters}
        />
      </div>

      {/* ── MAIN DATA TABLE WITH FIXED HEADER & INTEGRATED PAGING ── */}
      <SupplierBranchTable
        assignments={assignments}
        totalCount={totalCount}
        pageIndex={appliedFilters.pageIndex}
        pageSize={appliedFilters.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onToggleStatus={handleToggleStatus}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
      />

      {/* Modal: Thêm nhà cung cấp cho cửa hàng (Refactored Flow) */}
      <AssignBranchModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        branches={branches}
        suppliers={suppliers}
        assignments={assignments}
        initialBranchId={appliedFilters.branchId !== 'ALL' ? appliedFilters.branchId : undefined}
        onAssign={handleAssignBranches}
      />

      <AssignmentStatusModal
        item={statusItem}
        isSubmitting={isUpdatingStatus}
        onClose={() => {
          if (!isUpdatingStatus) setStatusItem(null);
        }}
        onConfirm={handleConfirmStatus}
      />
    </div>
  );
};
