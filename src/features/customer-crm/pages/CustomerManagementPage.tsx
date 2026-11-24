import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FC } from 'react';
import { Users, Plus, FileSpreadsheet, Loader2 } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { useAuthStore } from '../../../stores/useAuthStore';
import { employeeApi } from '../../employee/api/employeeApi';
import { useCustomerCrm } from '../hooks/useCustomerCrm';
import { CustomerFilterBar } from '../components/CustomerFilterBar';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerDrawerDetail } from '../components/CustomerDrawerDetail';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { DebtCollectionModal } from '../components/DebtCollectionModal';
import { CustomerDebtLedgerDrawer } from '../components/CustomerDebtLedgerDrawer';
import type { CollectDebtInput, CreateCustomerInput, UpdateCustomerInput, DebtFilterStatus } from '../types/customer.types';
import '../../purchase-order/purchase-order.css';
import '../../../styles/so-list-page.css';
import '../customer-crm.css';

export const CustomerManagementPage: FC = () => {
  const canManageDebt = useAuthStore((state) => state.user?.role === 'STORE_OWNER');
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || '';
  const {
    customers,
    kpiSummary,
    isLoading,
    refetch,

    searchTerm,
    setSearchTerm,
    selectedTier,
    setSelectedTier,
    selectedDebtStatus,
    setSelectedDebtStatus,

    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    selectedCustomer,
    isFormModalOpen,
    setIsFormModalOpen,
    editingCustomer,
    collectingCustomer,
    setCollectingCustomer,

    handleOpenCreateModal,
    handleOpenEditModal,
    handleOpenCollectModal,
    handleSelectCustomer,
    handleCloseDrawer,

    createMutation,
    updateMutation,
    collectDebtMutation,
  } = useCustomerCrm();

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<string>('name_asc');
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Load branch list for filter
  useEffect(() => {
    let isMounted = true;
    employeeApi
      .getBranches()
      .then((list) => {
        if (isMounted && list && list.length > 0) {
          setBranches(list);
        }
      })
      .catch((err) => console.warn('Could not load branches in CustomerCRM:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch, setSearchTerm]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (term) {
          next.set('search', term);
        } else {
          next.delete('search');
          next.delete('keyword');
        }
        return next;
      },
      { replace: true }
    );
  };

  const [ledgerCustomer, setLedgerCustomer] = useState<any>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingCustomer) {
        await updateMutation.mutateAsync({
          id: editingCustomer.id,
          input: data as UpdateCustomerInput,
        });
        showToast(`Cập nhật thông tin khách hàng ${data.fullName} thành công!`);
      } else {
        await createMutation.mutateAsync(data as CreateCustomerInput);
        showToast(`Thêm mới khách hàng ${data.fullName} thành công!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý dữ liệu khách hàng', 'error');
      throw err;
    }
  };

  const handleCollectDebtConfirm = async (data: CollectDebtInput) => {
    try {
      await collectDebtMutation.mutateAsync(data);
      showToast(
        `Đã lập phiếu thu nợ ${data.amount.toLocaleString('vi-VN')} đ qua ${
          data.method === 'VietQR' ? 'VietQR' : 'Tiền mặt'
        } và đồng bộ Sổ quỹ thành công!`
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi thu nợ', 'error');
    }
  };

  // Filter handlers with page reset
  const handleTierChange = (tier: string) => {
    setSelectedTier(tier);
    setCurrentPage(1);
  };

  const handleDebtStatusChange = (status: DebtFilterStatus) => {
    setSelectedDebtStatus(status);
    setCurrentPage(1);
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentPage(1);
  };

  const handleSortOrderChange = (sort: string) => {
    setSortOrder(sort);
    setCurrentPage(1);
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    setCurrentPage(1);
  };

  const handleToggleDebtOnly = () => {
    setSelectedDebtStatus(selectedDebtStatus === 'DEBT' ? 'ALL' : 'DEBT');
    setCurrentPage(1);
  };

  // Critical debt metrics for header badges
  const totalDebtAR =
    kpiSummary?.totalDebtAR ??
    customers.reduce((sum, c) => sum + Math.max(0, Number(c.currentDebtAR) || 0), 0);

  // Filter & sort customers
  const processedCustomers = useMemo(() => {
    let result = [...customers];

    // Filter by branch
    if (selectedBranch && selectedBranch !== 'ALL') {
      result = result.filter((c) => !c.branchId || c.branchId === selectedBranch);
    }

    // Filter by time range if specified
    if (timeRange !== 'ALL') {
      const now = new Date();
      if (timeRange === 'this_month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        result = result.filter((c) => c.createdAt >= monthStart);
      } else if (timeRange === 'last_month') {
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        result = result.filter((c) => c.createdAt >= prevMonthStart && c.createdAt <= prevMonthEnd);
      } else if (timeRange === 'this_year') {
        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
        result = result.filter((c) => c.createdAt >= yearStart);
      }
    }

    // Sort customers
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'name_desc':
          return (b.fullName || '').localeCompare(a.fullName || '', 'vi');
        case 'debt_desc':
          return (Number(b.currentDebtAR) || 0) - (Number(a.currentDebtAR) || 0);
        case 'debt_asc':
          return (Number(a.currentDebtAR) || 0) - (Number(b.currentDebtAR) || 0);
        case 'points_desc':
          return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
        case 'created_desc':
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        case 'name_asc':
        default:
          return (a.fullName || '').localeCompare(b.fullName || '', 'vi');
      }
    });

    return result;
  }, [customers, sortOrder, timeRange, selectedBranch]);

  const handleResetAllFilters = () => {
    handleSearchChange('');
    setSelectedTier('ALL');
    setSelectedDebtStatus('ALL');
    setSelectedBranch('ALL');
    setSortOrder('name_asc');
    setTimeRange('ALL');
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    if (isExporting) return;
    setIsExporting(true);
    showToast('Đang kết xuất danh sách khách hàng & công nợ ra tệp Excel (.csv)...', 'info');

    try {
      if (!processedCustomers.length) {
        showToast('Không có dữ liệu khách hàng nào để xuất theo bộ lọc hiện tại.', 'warning');
        return;
      }

      const headers = [
        'Mã Khách Hàng',
        'Họ và Tên',
        'Số Điện Thoại',
        'Mã Số Thuế',
        'Công Ty',
        'Công Nợ Hiện Tại (đ)',
        'Điểm Tích Lũy',
        'Trạng Thái',
      ];

      const csvRows = [headers.join(',')];

      for (const c of processedCustomers) {
        const code = c.customerCode || c.id.slice(0, 8).toUpperCase();
        const row = [
          `"${code.replace(/"/g, '""')}"`,
          `"${(c.fullName || '').replace(/"/g, '""')}"`,
          `"${(c.phoneNumber || '').replace(/"/g, '""')}"`,
          `"${(c.taxCode || '').replace(/"/g, '""')}"`,
          `"${(c.companyName || '').replace(/"/g, '""')}"`,
          Math.max(0, Number(c.currentDebtAR) || 0),
          c.loyaltyPoints || 0,
          `"${c.status === 'Active' ? 'Hoạt động' : 'Tạm ngừng'}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.href = url;
      link.setAttribute('download', `KhachHang_CongNo_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Đã xuất thành công ${processedCustomers.length} khách hàng ra tệp Excel (.csv).`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xuất file Excel.', 'error');
    } finally {
      setIsExporting(false);
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
      {toast && (
        <AdminToast
          toast={toast}
          onClose={() => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast(null);
          }}
        />
      )}

      {/* ── 1. Page Header: Fixed Height ~44px Standard Store-Owner Header ── */}
      <div className="so-list-header" style={{ minHeight: 44 }}>
        <div>
          <h1 className="so-list-title">
            <Users size={22} color="var(--blue-primary, #0f766e)" />
            <span>Quản Lý Khách Hàng &amp; Công Nợ</span>
            <span className="so-list-filter-badge">{processedCustomers.length} khách hàng</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          {/* Quick Filter: Tổng nợ */}
          {totalDebtAR > 0 && (
            <button
              type="button"
              className="po-btn po-btn-secondary"
              onClick={handleToggleDebtOnly}
              style={
                selectedDebtStatus === 'DEBT'
                  ? { borderColor: '#0f766e', color: '#0f766e', fontWeight: 700, backgroundColor: '#f0fdfa' }
                  : undefined
              }
              title="Lọc nhanh danh sách khách hàng có nợ"
            >
              <span>Tổng nợ: {totalDebtAR.toLocaleString('vi-VN')} đ</span>
            </button>
          )}

          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={handleExportExcel}
            disabled={isExporting}
            title="Xuất danh sách khách hàng ra tệp Excel (.csv)"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={handleOpenCreateModal}
            title="Thêm mới khách hàng"
          >
            <Plus size={14} />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* ── 2. Standardized Filter Bar (CSS Grid 4x2 ~86px) ── */}
      <CustomerFilterBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedTier={selectedTier}
        onTierChange={handleTierChange}
        selectedDebtStatus={selectedDebtStatus}
        onDebtStatusChange={handleDebtStatusChange}
        selectedBranch={selectedBranch}
        onBranchChange={handleBranchChange}
        branches={branches}
        sortOrder={sortOrder}
        onSortOrderChange={handleSortOrderChange}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        onResetFilters={handleResetAllFilters}
      />

      {/* ── 3. Standardized Customer Table (.so-list-table-card with pinned pagination) ── */}
      <CustomerTable
        customers={processedCustomers}
        isLoading={isLoading}
        onSelect={handleSelectCustomer}
        onEdit={handleOpenEditModal}
        onCollect={canManageDebt ? handleOpenCollectModal : undefined}
        onViewLedger={canManageDebt ? setLedgerCustomer : undefined}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* ── 4. Customer Drawer Detail ── */}
      <CustomerDrawerDetail
        customer={selectedCustomer}
        onClose={handleCloseDrawer}
        onOpenEdit={handleOpenEditModal}
        onOpenCollect={canManageDebt ? handleOpenCollectModal : undefined}
        onViewLedger={canManageDebt ? setLedgerCustomer : undefined}
      />

      {/* ── 5. Create / Edit Modal ── */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCustomer}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* ── 6. Collect Debt Modal (VietQR & Cash) ── */}
      <DebtCollectionModal
        isOpen={canManageDebt && Boolean(collectingCustomer)}
        onClose={() => setCollectingCustomer(null)}
        customer={collectingCustomer}
        onConfirm={handleCollectDebtConfirm}
        isSubmitting={collectDebtMutation.isPending}
      />

      {/* ── 7. Customer Debt Ledger Drawer ── */}
      <CustomerDebtLedgerDrawer
        isOpen={canManageDebt && Boolean(ledgerCustomer)}
        customer={ledgerCustomer}
        onClose={() => setLedgerCustomer(null)}
        onOpenCollect={handleOpenCollectModal}
      />
    </div>
  );
};

export default CustomerManagementPage;

