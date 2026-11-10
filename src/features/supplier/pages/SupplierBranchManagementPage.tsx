import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import {
  EditAssignmentModal,
  type EditAssignmentSavePayload,
} from '../components/branches/EditAssignmentModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { supplierBranchApi } from '../api/supplierBranchApi';
import { supplierApi } from '../api/supplierApi';
import { branchApi } from '../../purchase-order/api/branchApi';
import { Building2, Plus, Store, Loader2 } from 'lucide-react';
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
  pageSize: 15,
};

export const SupplierBranchManagementPage: FC = () => {
  const { id: paramSupplierId } = useParams<{ id?: string }>();

  // Suppliers & Branches state
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
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
  const [editItem, setEditItem] = useState<SupplierBranchAssignmentItem | null>(null);
  const [isUpdatingEdit, setIsUpdatingEdit] = useState(false);

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
        setSuppliers(res.items ?? []);
      } catch (err: any) {
        showToast(err.message || 'Không thể tải danh sách nhà cung cấp.', 'error');
      }
    };
    loadSuppliers();
  }, []);

  // Fetch real branches list
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await branchApi.getBranches({ pageIndex: 1, pageSize: 100 });
        setBranches(res.items ?? []);
      } catch (err: any) {
        showToast(err.message || 'Không thể tải danh sách chi nhánh.', 'error');
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
      if (input.status === 'Inactive') {
        for (const supplierId of input.supplierIds) {
          await supplierBranchApi.updateAssignmentStatus(
            supplierId,
            input.branchId,
            'Inactive',
            input.inactiveReason
          );
        }
      }
      showToast(`Đã phân bổ thành công ${input.supplierIds.length} nhà cung cấp cho cửa hàng.`);
      setIsAssignModalOpen(false);
      await fetchAssignments();
    } catch (err: any) {
      showToast(err.message || 'Không thể thực hiện gán nhà cung cấp cho cửa hàng.', 'error');
    }
  };

  const handleSaveEdit = async (payload: EditAssignmentSavePayload) => {
    if (!editItem) return;
    setIsUpdatingEdit(true);
    try {
      const statusChanged = payload.status !== editItem.status;
      if (statusChanged) {
        await supplierBranchApi.updateAssignmentStatus(
          editItem.supplierId,
          editItem.branchId,
          payload.status,
          payload.inactiveReason
        );
      }

      await supplierBranchApi.updateAssignmentDeliveryDays(
        editItem.supplierId,
        editItem.branchId,
        payload.deliveryDays
      );

      showToast(`Đã cập nhật phân bổ tại "${editItem.branchName}".`);
      setEditItem(null);
      await fetchAssignments();
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật phân bổ.', 'error');
    } finally {
      setIsUpdatingEdit(false);
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

      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <Store size={22} color="var(--blue-primary, #0f766e)" />
            <span>Cửa Hàng với nhà cung cấp</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          <Link
            to="/store-owner/suppliers"
            className="po-btn po-btn-secondary"
            title="Quay lại danh sách nhà cung cấp"
          >
            <Building2 size={14} />
            <span>Danh sách NCC</span>
          </Link>
          <Link
            to="/store-owner/stores/products"
            className="po-btn po-btn-secondary"
            title="Quản lý sản phẩm theo cửa hàng / chi nhánh"
          >
            <Store size={14} />
            <span>Sản phẩm theo Cửa hàng</span>
          </Link>
          <button
            type="button"
            id="btnOpenAssignBranchModal"
            className="po-btn po-btn-primary"
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
        onEdit={(item) => setEditItem(item)}
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

      <EditAssignmentModal
        item={editItem}
        isSubmitting={isUpdatingEdit}
        onClose={() => {
          if (!isUpdatingEdit) setEditItem(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
};
