import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PackageCheck,
  Plus,
  FilePlus,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type {
  GoodsReceiptListItem,
  GrnFilterState,
  GrnFilterTab,
  UserRole,
} from '../types/grn.types';
import { MOCK_GOODS_RECEIPTS } from '../lib/mockGrnData';
import { GrnQuickTabs } from '../components/GrnQuickTabs';
import { GrnFilterBar } from '../components/GrnFilterBar';
import { GrnTable } from '../components/GrnTable';
import { GrnDetailDrawer } from '../components/GrnDetailDrawer';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

const DEFAULT_FILTERS: GrnFilterState = {
  keyword: '',
  branchId: 'ALL',
  supplierId: 'ALL',
  status: 'ALL',
  dateFrom: '',
  dateTo: '',
  tab: 'ALL',
  pageIndex: 1,
  pageSize: 10,
};

export const GoodsReceiptListPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Role management (Store Owner vs Employee)
  const roleParam = searchParams.get('role') as UserRole | null;
  const [role, setRole] = useState<UserRole>(roleParam || defaultRole);
  const employeeBranchId = searchParams.get('branch') || 'BR-01';

  // State
  const [receipts, setReceipts] = useState<GoodsReceiptListItem[]>(MOCK_GOODS_RECEIPTS);
  const [activeTab, setActiveTab] = useState<GrnFilterTab>('ALL');
  const [filterInputs, setFilterInputs] = useState<GrnFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<GrnFilterState>(DEFAULT_FILTERS);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Drawer & Toast State
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptListItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Switch role handler (Store Owner <-> Employee)
  const handleToggleRole = (newRole: UserRole) => {
    setRole(newRole);
    setPageIndex(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('role', newRole);
    if (newRole === 'employee') {
      newParams.set('branch', employeeBranchId);
      setFilterInputs((prev) => ({ ...prev, branchId: employeeBranchId }));
      setAppliedFilters((prev) => ({ ...prev, branchId: employeeBranchId }));
    } else {
      newParams.delete('branch');
      setFilterInputs((prev) => ({ ...prev, branchId: 'ALL' }));
      setAppliedFilters((prev) => ({ ...prev, branchId: 'ALL' }));
    }
    setSearchParams(newParams, { replace: true });
    showToast(
      `Đã chuyển sang góc nhìn ${newRole === 'store_owner' ? 'Chủ cửa hàng (Toàn chuỗi)' : 'Nhân viên kho (Chi nhánh ' + employeeBranchId + ')'}`,
      'info'
    );
  };

  // Base list scoped by role
  const roleScopedReceipts = useMemo(() => {
    if (role === 'employee') {
      return receipts.filter((r) => r.branchId === employeeBranchId);
    }
    return receipts;
  }, [receipts, role, employeeBranchId]);

  // Tab counts (dynamically calculated from role-scoped list)
  const tabCounts = useMemo(() => {
    return {
      all: roleScopedReceipts.length,
      today: roleScopedReceipts.filter((r) => r.status === 'TODAY').length,
      draft: roleScopedReceipts.filter((r) => r.status === 'DRAFT').length,
      mismatch: roleScopedReceipts.filter((r) => r.status === 'MISMATCH').length,
    };
  }, [roleScopedReceipts]);

  // Filter handlers
  const handleFilterInputChange = <K extends keyof GrnFilterState>(
    key: K,
    value: GrnFilterState[K]
  ) => {
    setFilterInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setAppliedFilters({ ...filterInputs });
    setPageIndex(1);
    showToast('Đã áp dụng bộ lọc tìm kiếm', 'info');
  };

  const handleReset = () => {
    const resetBranch = role === 'employee' ? employeeBranchId : 'ALL';
    const resetState: GrnFilterState = {
      ...DEFAULT_FILTERS,
      branchId: resetBranch,
    };
    setFilterInputs(resetState);
    setAppliedFilters(resetState);
    setActiveTab('ALL');
    setPageIndex(1);
    showToast('Đã đặt lại bộ lọc về mặc định', 'info');
  };

  const handleTabChange = (tab: GrnFilterTab) => {
    setActiveTab(tab);
    setPageIndex(1);
  };

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return roleScopedReceipts.filter((r) => {
      // 1. Quick Tab Filter
      if (activeTab === 'TODAY' && r.status !== 'TODAY') return false;
      if (activeTab === 'DRAFT' && r.status !== 'DRAFT') return false;
      if (activeTab === 'MISMATCH' && r.status !== 'MISMATCH') return false;

      // 2. Keyword Filter
      if (appliedFilters.keyword.trim()) {
        const kw = appliedFilters.keyword.trim().toLowerCase();
        const matchKeyword =
          r.code.toLowerCase().includes(kw) ||
          r.poReference.toLowerCase().includes(kw) ||
          r.supplierName.toLowerCase().includes(kw) ||
          r.supplierCode.toLowerCase().includes(kw) ||
          r.branchName.toLowerCase().includes(kw) ||
          r.receiverName.toLowerCase().includes(kw) ||
          r.items.some(
            (it) =>
              it.productCode.toLowerCase().includes(kw) ||
              it.productName.toLowerCase().includes(kw) ||
              (it.batchCode && it.batchCode.toLowerCase().includes(kw))
          );
        if (!matchKeyword) return false;
      }

      // 3. Branch Filter (only for Store Owner)
      if (role === 'store_owner' && appliedFilters.branchId !== 'ALL') {
        if (r.branchId !== appliedFilters.branchId) return false;
      }

      // 4. Supplier Filter
      if (appliedFilters.supplierId !== 'ALL') {
        if (r.supplierId !== appliedFilters.supplierId) return false;
      }

      // 5. Status Filter
      if (appliedFilters.status !== 'ALL') {
        if (r.status !== appliedFilters.status) return false;
      }

      // 6. Date Range Filter
      if (appliedFilters.dateFrom && r.rawDate < appliedFilters.dateFrom) {
        return false;
      }
      if (appliedFilters.dateTo && r.rawDate > appliedFilters.dateTo) {
        return false;
      }

      return true;
    });
  }, [roleScopedReceipts, activeTab, appliedFilters, role]);

  // Paged items
  const pagedReceipts = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredReceipts.slice(start, start + pageSize);
  }, [filteredReceipts, pageIndex, pageSize]);

  // Drawer handlers
  const handleSelectReceipt = (receipt: GoodsReceiptListItem) => {
    setSelectedReceipt(receipt);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  // Action handlers
  const handleActionClick = (action: string, receipt: GoodsReceiptListItem) => {
    if (action === 'RECEIVE_NOW') {
      setSelectedReceipt(receipt);
      setIsDrawerOpen(true);
      showToast(`Bắt đầu tiếp nhận đơn ${receipt.code} tại chi nhánh. Mở phiếu kiểm đếm...`, 'info');
    } else if (action === 'APPROVE_DRAFT') {
      setReceipts((prev) =>
        prev.map((r) => (r.id === receipt.id ? { ...r, status: 'CONFIRMED' } : r))
      );
      showToast(`Đã duyệt hoàn tất phiếu ${receipt.code}. Cập nhật tồn kho theo lô FEFO thành công!`, 'success');
    } else if (action === 'EDIT_DRAFT') {
      setSelectedReceipt(receipt);
      setIsDrawerOpen(true);
      showToast(`Mở giao diện sửa phiếu kiểm đếm ${receipt.code}`, 'info');
    } else if (action === 'RESOLVE_MISMATCH') {
      setSelectedReceipt(receipt);
      setIsDrawerOpen(true);
      showToast(`Mở biên bản đối soát và xử lý lệch cho phiếu ${receipt.code}`, 'warning');
    } else if (action === 'VIEW_BATCH') {
      setSelectedReceipt(receipt);
      setIsDrawerOpen(true);
      showToast(`Xem danh sách lô hàng FEFO đã gán cho phiếu ${receipt.code}`, 'info');
    } else if (action === 'PRINT_RECEIPT') {
      showToast(`Đang kết nối máy in để in phiếu nhập kho ${receipt.code}...`, 'success');
    }
  };

  return (
    <div className="po-matrix-container" style={{ padding: '16px 20px', minHeight: '100vh' }}>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── 1. Page Header with Title, Role Switcher and Actions ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: '#e6f7ff',
              color: 'var(--blue-primary, #0066cc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PackageCheck size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--text-main, #1e293b)',
                  margin: 0,
                  letterSpacing: -0.2,
                }}
              >
                Danh sách phiếu nhập kho GRN & Lịch nhận hàng
              </h1>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                UI-05-03
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
              Quản lý lịch giao nhận hàng hóa từ nhà cung cấp, kiểm soát số lượng theo PO và ghi nhận lô hạn FEFO
            </div>
          </div>
        </div>

        {/* Right side: Role Switcher & New Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Role Switcher Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              padding: 3,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
            }}
            title="Chuyển đổi góc nhìn vai trò để kiểm thử phân quyền"
          >
            <button
              type="button"
              onClick={() => handleToggleRole('store_owner')}
              style={{
                height: 28,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: role === 'store_owner' ? 700 : 500,
                backgroundColor: role === 'store_owner' ? '#ffffff' : 'transparent',
                color: role === 'store_owner' ? 'var(--blue-primary, #0066cc)' : '#475569',
                borderRadius: 6,
                border: 'none',
                boxShadow: role === 'store_owner' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ShieldCheck size={14} />
              <span>Chủ cửa hàng (All)</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleRole('employee')}
              style={{
                height: 28,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: role === 'employee' ? 700 : 500,
                backgroundColor: role === 'employee' ? '#ffffff' : 'transparent',
                color: role === 'employee' ? '#059669' : '#475569',
                borderRadius: 6,
                border: 'none',
                boxShadow: role === 'employee' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <UserCheck size={14} />
              <span>Nhân viên ({employeeBranchId})</span>
            </button>
          </div>

          {/* Action buttons */}
          <button
            type="button"
            onClick={() => showToast('Mở màn hình Nhập kho từ đơn đặt hàng PO (grn_form.html?type=po)', 'info')}
            className="po-btn po-btn-primary"
            style={{ height: 32, padding: '0 12px', fontSize: 12, fontWeight: 700 }}
          >
            <Plus size={14} />
            <span>+ Nhập kho từ PO</span>
          </button>

          <button
            type="button"
            onClick={() => showToast('Mở màn hình Tạo phiếu nhập kho trực tiếp (grn_form.html?type=direct)', 'info')}
            className="po-btn po-btn-outline"
            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
          >
            <FilePlus size={14} />
            <span>+ Tạo GRN trực tiếp</span>
          </button>
        </div>
      </div>

      {/* ── 2. Quick View Tabs ── */}
      <GrnQuickTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={tabCounts}
      />

      {/* ── 3. Unified Filter Bar ── */}
      <GrnFilterBar
        filterInputs={filterInputs}
        role={role}
        employeeBranchId={employeeBranchId}
        onFilterChange={handleFilterInputChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* ── 4. Main Data Table with Sticky Header & Pagination ── */}
      <GrnTable
        receipts={pagedReceipts}
        totalCount={filteredReceipts.length}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={(page) => setPageIndex(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(1);
        }}
        onSelectReceipt={handleSelectReceipt}
        onActionClick={handleActionClick}
        onResetFilters={handleReset}
      />

      {/* ── 5. Slide-over Detail Drawer ── */}
      <GrnDetailDrawer
        receipt={selectedReceipt}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onPrint={(r) => showToast(`Đang in phiếu ${r.code}...`, 'success')}
        onAction={handleActionClick}
      />
    </div>
  );
};
