import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { FC } from 'react';
import {
  BillingKpiBanner,
  BillingFilterToolbar,
  BillingDataTable,
  InvoiceDetailModal,
  ReconcileModal,
} from '../../features/admin/components/billing';
import {
  AdminToast,
  type ToastState,
} from '../../features/admin/components';
import type {
  BillingTransaction,
  BillingKpiSummary,
  BillingFilterParams,
} from '../../features/admin/types/billing.types';
import { billingApi } from '../../features/admin/api/billingApi';
import { mockBillingKpiSummary } from '../../features/admin/data/mockBillingData';
import { FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import './adminPlans.css';
import './adminBilling.css';

export const AdminBillingPage: FC = () => {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [kpis, setKpis] = useState<BillingKpiSummary>(mockBillingKpiSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<BillingFilterParams>({
    keyword: '',
    type: 'ALL',
    status: 'ALL',
    dateRange: 'all',
  });

  // Selected modals
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<BillingTransaction | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedReconcileTx, setSelectedReconcileTx] = useState<BillingTransaction | null>(null);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [txRes, kpiRes] = await Promise.all([
        billingApi.getTransactions(filters),
        billingApi.getBillingKpis(),
      ]);

      if (txRes.success) {
        setTransactions(txRes.data);
      }
      if (kpiRes.success) {
        setKpis(kpiRes.data);
      }
    } catch {
      showToast('Lỗi khi tải dữ liệu giao dịch.', 'warning');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    showToast('Đã làm mới dữ liệu giao dịch mới nhất.', 'success');
  };

  // Handle Filter Update
  const handleFilterChange = (newFilters: Partial<BillingFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Calculate status counts for tabs
  const statusCounts = useMemo(() => {
    return {
      all: transactions.length,
      success: transactions.filter((t) => t.status === 'SUCCESS').length,
      pending: transactions.filter((t) => t.status === 'PENDING').length,
      failed: transactions.filter((t) => t.status === 'FAILED').length,
    };
  }, [transactions]);

  // View Invoice Detail Modal
  const handleViewInvoice = (tx: BillingTransaction) => {
    setSelectedInvoiceTx(tx);
    setIsInvoiceOpen(true);
  };

  // Open Reconcile Modal
  const handleOpenReconcile = (tx: BillingTransaction) => {
    setSelectedReconcileTx(tx);
    setIsReconcileOpen(true);
  };

  // Submit Reconcile
  const handleReconcileSubmit = async (tx: BillingTransaction, note: string) => {
    try {
      const res = await billingApi.reconcileTransaction(tx.id, note);
      if (res.success) {
        showToast(res.message, 'success');
        fetchData();
      } else {
        showToast(res.message, 'warning');
      }
    } catch {
      showToast('Lỗi khi thực hiện đối soát giao dịch.', 'warning');
    }
  };

  // Export CSV/Excel
  const handleExportExcel = () => {
    try {
      const headers = [
        'Mã giao dịch',
        'Mã hóa đơn',
        'Ngày tạo',
        'Chuỗi cửa hàng',
        'Subdomain',
        'Chủ sở hữu',
        'Loại nghiệp vụ',
        'Dịch vụ chi tiết',
        'Số tiền (VND)',
        'Thuế VAT (VND)',
        'Tổng thanh toán (VND)',
        'Phương thức',
        'Mã tham chiếu NH',
        'Trạng thái',
        'Ghi chú',
      ];

      const rows = transactions.map((t) => [
        `"${t.transactionCode}"`,
        `"${t.invoiceCode}"`,
        `"${new Date(t.createdAt).toLocaleString('vi-VN')}"`,
        `"${t.tenantName.replace(/"/g, '""')}"`,
        `"${t.tenantSubdomain}.thviet.vn"`,
        `"${t.ownerName}"`,
        `"${t.type}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        t.amount,
        t.vatAmount,
        t.totalAmount,
        `"${t.paymentMethod}"`,
        `"${t.referenceCode || ''}"`,
        `"${t.status}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent =
        '\uFEFF' + // UTF-8 BOM
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `THViet_SaaS_Billing_Report_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Đã xuất báo cáo giao dịch thành công (.csv)!', 'success');
    } catch {
      showToast('Lỗi khi xuất tệp báo cáo giao dịch.', 'warning');
    }
  };

  return (
    <div className="admin-plans admin-billing-page">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header Hero Banner */}
      <div className="plans-hero">
        <div>
          <p className="plans-eyebrow">QUẢN TRỊ TÀI CHÍNH NỀN TẢNG</p>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Giao dịch & Hóa đơn SaaS</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#0F766E',
                background: '#EAF6F4',
                padding: '3px 10px',
                borderRadius: 9999,
              }}
            >
              Billing & Invoices
            </span>
          </h1>
          <p>
            Theo dõi dòng tiền thuê bao gói, nạp quỹ ví VietQR Napas247, mở rộng chi nhánh và đối soát thanh toán
          </p>
        </div>

        <div className="plans-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <FileSpreadsheet size={15} style={{ color: '#16A34A' }} />
            <span>Xuất báo cáo Excel</span>
          </button>

          {statusCounts.pending > 0 && (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => handleFilterChange({ status: 'PENDING' })}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#D97706', borderColor: '#D97706' }}
            >
              <CheckCircle2 size={15} />
              <span>Cần đối soát ({statusCounts.pending})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <BillingKpiBanner kpis={kpis} />

      {/* Filter and Search Toolbar */}
      <BillingFilterToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        onExportExcel={handleExportExcel}
        isRefreshing={isRefreshing}
        statusCounts={statusCounts}
      />

      {/* Data Table */}
      <BillingDataTable
        transactions={transactions}
        isLoading={isLoading}
        onViewInvoice={handleViewInvoice}
        onReconcile={handleOpenReconcile}
      />

      {/* Modals */}
      <InvoiceDetailModal
        transaction={selectedInvoiceTx}
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setSelectedInvoiceTx(null);
        }}
        onReconcile={handleOpenReconcile}
      />

      <ReconcileModal
        transaction={selectedReconcileTx}
        isOpen={isReconcileOpen}
        onClose={() => {
          setIsReconcileOpen(false);
          setSelectedReconcileTx(null);
        }}
        onSubmit={handleReconcileSubmit}
      />
    </div>
  );
};

export default AdminBillingPage;
