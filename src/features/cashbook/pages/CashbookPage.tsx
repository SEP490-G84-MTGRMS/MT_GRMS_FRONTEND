import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Wallet,
  Plus,
  FileSpreadsheet,
  ArrowRightLeft,
  AlertTriangle,
  Search,
  BarChart3,
  Loader2,
} from 'lucide-react';
import type {
  CashAccount,
  LedgerTransaction,
  CashbookFilterParams,
  CreateReceiptDTO,
  CreatePaymentDTO,
  FundTransferDTO,
  CashReconciliationDTO,
} from '../types/cashbook.types';
import { cashbookService } from '../services/cashbookService';
import { CashbookFilterToolbar } from '../components/CashbookFilterToolbar';
import { CashbookLedgerTable } from '../components/CashbookLedgerTable';
import { CreateReceiptModal } from '../components/CreateReceiptModal';
import { CreatePaymentModal } from '../components/CreatePaymentModal';
import { InternalTransferModal } from '../components/InternalTransferModal';
import { CashReconciliationModal } from '../components/CashReconciliationModal';
import { CashbookExportModal } from '../components/CashbookExportModal';
import { PrintReceiptModal } from '../components/PrintReceiptModal';
import { ReverseTransactionModal } from '../components/ReverseTransactionModal';
import { TriageInboxModal } from '../components/TriageInboxModal';
import { AdminToast, type ToastState } from '../../admin/components/common/AdminToast';
import { employeeApi } from '../../employee/api/employeeApi';
import '../../purchase-order/purchase-order.css';
import '../../../styles/so-list-page.css';
import '../cashbook.css';

export const CashbookPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || '';

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  // Tải danh sách chi nhánh để hiển thị trong bộ lọc
  useEffect(() => {
    let isMounted = true;
    employeeApi
      .getBranches()
      .then((list) => {
        if (isMounted && list && list.length > 0) {
          setBranches(list);
        }
      })
      .catch((err) => console.warn('Could not load branches in Cashbook:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const getInitialPeriod = (): { datePeriod: CashbookFilterParams['datePeriod']; startDate?: string; endDate?: string } => {
    if (urlSearch) {
      return { datePeriod: 'all', startDate: undefined, endDate: undefined };
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    return {
      datePeriod: 'this_month',
      startDate: startStr,
      endDate: endStr,
    };
  };

  const [filters, setFilters] = useState<CashbookFilterParams>(() => {
    const period = getInitialPeriod();
    return {
      branchId: 'ALL',
      accountId: 'ALL',
      transactionType: 'ALL',
      datePeriod: period.datePeriod,
      startDate: period.startDate,
      endDate: period.endDate,
      searchQuery: urlSearch,
      status: 'ALL',
    };
  });

  useEffect(() => {
    // Initial sync from active branch storage
    try {
      const stored = localStorage.getItem('mtgrms_active_branch');
      if (stored) {
        const b = JSON.parse(stored);
        if (b?.id) {
          setFilters((prev) => ({ ...prev, branchId: b.id }));
          setCurrentPage(1);
        }
      }
    } catch {}

    const handleGlobalBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>;
      const branch = customEvent.detail;
      if (branch?.id) {
        setFilters((prev) => ({
          ...prev,
          branchId: branch.id,
        }));
        setCurrentPage(1);
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    };
  }, []);

  useEffect(() => {
    if (urlSearch) {
      setFilters((prev) => ({
        ...prev,
        searchQuery: urlSearch,
        datePeriod: 'all',
        startDate: undefined,
        endDate: undefined,
      }));
      setCurrentPage(1);
    }
  }, [urlSearch]);

  const handleFilterChange = (updated: Partial<CashbookFilterParams>) => {
    if (updated.searchQuery !== undefined) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (updated.searchQuery) {
            next.set('search', updated.searchQuery);
          } else {
            next.delete('search');
            next.delete('keyword');
          }
          return next;
        },
        { replace: true }
      );
    }
    setFilters((prev) => ({ ...prev, ...updated }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('search');
        next.delete('keyword');
        return next;
      },
      { replace: true }
    );
    const period = getInitialPeriod();
    setFilters({
      branchId: 'ALL',
      accountId: 'ALL',
      transactionType: 'ALL',
      sourceType: undefined,
      datePeriod: period.datePeriod,
      startDate: period.startDate,
      endDate: period.endDate,
      searchQuery: '',
      counterpartyQuery: '',
      status: 'ALL',
    });
    setCurrentPage(1);
  };

  // Modal States
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [paymentInitialCategory, setPaymentInitialCategory] = useState<string | undefined>(undefined);
  const [receiptInitialCategory, setReceiptInitialCategory] = useState<string | undefined>(undefined);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [triagePendingCount, setTriagePendingCount] = useState(0);
  const [reconcilingAccount, setReconcilingAccount] = useState<CashAccount | null>(null);
  const [printingTx, setPrintingTx] = useState<LedgerTransaction | null>(null);
  const [voidingTx, setVoidingTx] = useState<LedgerTransaction | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
      setToast({
        id: `toast-${Date.now()}`,
        message,
        type,
      });
    },
    []
  );

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchParam = filters.branchId !== 'ALL' ? filters.branchId : undefined;
      const [accs, txResult] = await Promise.all([
        cashbookService.getCashAccounts(branchParam),
        cashbookService.getTransactions(filters, currentPage, pageSize),
      ]);

      setAccounts(accs);
      setTransactions(txResult.items);
      setTotalItems(txResult.totalItems);

      try {
        const triageItems = await cashbookService.getPendingTriage(branchParam);
        setTriagePendingCount(triageItems.length);
      } catch {
        // Non-blocking for triage count
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi tải dữ liệu sổ quỹ', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Create Receipt Handler
  const handleCreateReceipt = async (dto: CreateReceiptDTO) => {
    try {
      const newTx = await cashbookService.createReceipt(dto);
      showToast(`Đã ghi nhận Phiếu thu [${newTx.transactionCode}] thành công!`, 'success');
      setIsReceiptModalOpen(false);
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi lập phiếu thu', 'error');
    }
  };

  // Create Payment Handler
  const handleCreatePayment = async (dto: CreatePaymentDTO) => {
    try {
      const newTx = await cashbookService.createPayment(dto);
      showToast(`Đã ghi nhận Phiếu chi [${newTx.transactionCode}] thành công!`, 'success');
      setIsPaymentModalOpen(false);
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi lập phiếu chi', 'error');
    }
  };

  // Internal Fund Transfer Handler
  const handleTransfer = async (dto: FundTransferDTO) => {
    try {
      const result = await cashbookService.transferFunds(dto);
      showToast(
        `Đã tạo lệnh chuyển ${result.payment.amount.toLocaleString('vi-VN')} đ sang két sắt!`,
        'success'
      );
      setIsTransferModalOpen(false);
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi điều chuyển tiền', 'error');
    }
  };

  // Void Transaction Handler (Immutable Ledger)
  const handleConfirmVoid = async (reason: string) => {
    if (!voidingTx) return;
    try {
      const comp = await cashbookService.voidTransaction(voidingTx.id, reason);
      showToast(
        `Đã gạch bỏ phiếu ${voidingTx.transactionCode}. Bút toán bù trừ ${comp.transactionCode} đã được tạo tự động!`,
        'success'
      );
      setVoidingTx(null);
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi gạch bỏ phiếu', 'error');
      throw err;
    }
  };

  // Reconcile Cash Account Handler (Blind Count)
  const handleReconcileAccount = async (data: {
    accountId: string;
    actualBalance: number;
    difference: number;
    reason: string;
    countedBy: string;
    denominations: Record<number, number>;
  }) => {
    try {
      const dto: CashReconciliationDTO = {
        accountId: data.accountId,
        systemBalance: reconcilingAccount?.currentBalance ?? 0,
        actualCountedBalance: data.actualBalance,
        differenceAmount: data.difference,
        reason: data.reason,
        auditedBy: data.countedBy,
        breakdown: data.denominations,
      };
      const adj = await cashbookService.reconcileCashAccount(dto);
      if (adj) {
        showToast(
          `Đã hoàn tất kiểm kê két và tự động lập bút toán điều chỉnh [${adj.transactionCode}]!`,
          'warning'
        );
      } else {
        showToast('Đã xác nhận kiểm kê két: Tiền mặt thực tế khớp 100% với sổ sách!', 'success');
      }
      setReconcilingAccount(null);
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi đối soát két tiền mặt', 'error');
    }
  };

  const selectedAccountObj = useMemo(
    () => accounts.find((a) => a.id === filters.accountId),
    [accounts, filters.accountId]
  );

  // Open Blind Reconciliation Modal
  const handleOpenBlindCountModal = () => {
    const targetAccount =
      (filters.accountId !== 'ALL' && accounts.find((a) => a.id === filters.accountId && a.accountType === 'CASH')) ||
      accounts.find((a) => a.accountType === 'CASH' && !a.isSafeDeposit) ||
      accounts.find((a) => a.accountType === 'CASH') ||
      accounts[0] ||
      null;

    if (targetAccount) {
      setReconcilingAccount(targetAccount);
    } else {
      showToast('Không tìm thấy tài khoản tiền mặt để kiểm kê', 'warning');
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
      <AdminToast toast={toast} onClose={closeToast} />

      {/* ── Header: Fixed Height ~44px Standard Store-Owner Header ── */}
      <div className="so-list-header" style={{ minHeight: 44 }}>
        <div>
          <h1 className="so-list-title">
            <Wallet size={22} color="var(--blue-primary, #0f766e)" />
            <span>Sổ Quỹ Thu Chi</span>
            <span className="so-list-filter-badge">{totalItems} giao dịch</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          {triagePendingCount > 0 && (
            <button
              type="button"
              onClick={() => setIsTriageModalOpen(true)}
              className="po-btn po-btn-secondary"
              style={{ borderColor: '#fcd34d', backgroundColor: '#fffbeb', color: '#b45309' }}
              title="Có mục chi vặt cần Chủ tiệm phân loại"
            >
              <AlertTriangle size={14} />
              <span>{triagePendingCount} mục cần duyệt</span>
            </button>
          )}

          <Link
            to="/store-owner/finance?tab=overview"
            className="po-btn po-btn-secondary"
            title="Xem Báo cáo Tổng quan Dòng tiền & Két"
          >
            <BarChart3 size={14} />
            <span>Báo cáo dòng tiền</span>
          </Link>

          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => setIsExportModalOpen(true)}
            title="Xuất sổ kế toán Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            id="btn-internal-transfer"
            className="po-btn po-btn-secondary"
            onClick={() => setIsTransferModalOpen(true)}
            title="Chuyển quỹ nội bộ đối ứng giữa các két và tài khoản ngân hàng"
          >
            <ArrowRightLeft size={14} />
            <span>Chuyển quỹ nội bộ</span>
          </button>

          <button
            type="button"
            id="btn-blind-reconcile"
            className="po-btn po-btn-secondary"
            onClick={handleOpenBlindCountModal}
            title="Kiểm kê két mù (3 bước)"
          >
            <Search size={14} />
            <span>Kiểm kê két</span>
          </button>

          <button
            type="button"
            id="btn-create-payment"
            className="po-btn po-btn-secondary"
            style={{ color: '#dc2626', borderColor: '#fecaca' }}
            onClick={() => {
              setPaymentInitialCategory(undefined);
              setIsPaymentModalOpen(true);
            }}
            title="Lập phiếu chi tiền"
          >
            <span style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1 }}>−</span>
            <span>Chi tiền</span>
          </button>

          <button
            type="button"
            id="btn-create-receipt"
            className="po-btn po-btn-primary"
            onClick={() => {
              setReceiptInitialCategory(undefined);
              setIsReceiptModalOpen(true);
            }}
            title="Lập phiếu thu tiền"
          >
            <Plus size={14} />
            <span>Thu tiền</span>
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar: CSS Grid 4 columns x 2 rows ~86px ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <CashbookFilterToolbar
          filters={filters}
          accounts={accounts}
          branches={branches}
          onChangeFilter={handleFilterChange}
          onResetFilter={handleResetFilters}
        />
      </div>

      {/* ── Table Card: Fixed Head, Scrollable Body, Pinned TablePagination ── */}
      <CashbookLedgerTable
        transactions={transactions}
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        onVoidTransaction={(tx) => setVoidingTx(tx)}
        onPrintTransaction={(tx) => setPrintingTx(tx)}
      />

      {/* ── Modals ── */}
      <CreateReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setReceiptInitialCategory(undefined);
        }}
        accounts={accounts}
        initialCategory={receiptInitialCategory}
        onSubmit={handleCreateReceipt}
      />

      <CreatePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentInitialCategory(undefined);
        }}
        accounts={accounts}
        initialCategory={paymentInitialCategory}
        onSubmit={handleCreatePayment}
      />

      <InternalTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        onSubmit={handleTransfer}
      />

      <CashReconciliationModal
        isOpen={Boolean(reconcilingAccount)}
        onClose={() => setReconcilingAccount(null)}
        account={reconcilingAccount}
        accounts={accounts}
        onSubmit={handleReconcileAccount}
      />

      <CashbookExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        selectedAccount={selectedAccountObj}
        onShowToast={showToast}
      />

      <PrintReceiptModal
        isOpen={Boolean(printingTx)}
        onClose={() => setPrintingTx(null)}
        transaction={printingTx}
      />

      <ReverseTransactionModal
        isOpen={Boolean(voidingTx)}
        onClose={() => setVoidingTx(null)}
        transaction={voidingTx}
        onConfirm={handleConfirmVoid}
      />

      <TriageInboxModal
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        branchId={filters.branchId !== 'ALL' ? filters.branchId : undefined}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          void loadData();
        }}
      />
    </div>
  );
};
