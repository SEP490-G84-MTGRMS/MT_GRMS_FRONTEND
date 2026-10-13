import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC } from 'react';
import type {
  CashAccount,
  LedgerTransaction,
  CashbookFilterParams,
  CashbookSummaryKPI,
  CreateReceiptDTO,
  CreatePaymentDTO,
  CashReconciliationDTO,
} from '../types/cashbook.types';
import { cashbookService } from '../services/cashbookService';
import { CashAccountsCardSection } from '../components/CashAccountsCardSection';
import { CashbookFilterToolbar } from '../components/CashbookFilterToolbar';
import { CashbookLedgerTable } from '../components/CashbookLedgerTable';
import { CreateReceiptModal } from '../components/CreateReceiptModal';
import { CreatePaymentModal } from '../components/CreatePaymentModal';
import { CashReconciliationModal } from '../components/CashReconciliationModal';
import { CashbookExportModal } from '../components/CashbookExportModal';
import { AdminToast, type ToastState } from '../../admin/components/common/AdminToast';
import '../cashbook.css';

export const CashbookPage: FC = () => {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<CashbookFilterParams>({
    branchId: 'ALL',
    accountId: 'ALL',
    transactionType: 'ALL',
    datePeriod: 'this_month',
    searchQuery: '',
  });

  const [summaryKPI, setSummaryKPI] = useState<CashbookSummaryKPI>({
    totalOpeningBalance: 0,
    totalReceipts: 0,
    totalPayments: 0,
    totalClosingBalance: 0,
    totalCashInDrawers: 0,
    totalBankDeposits: 0,
  });

  // Modal States
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [accountToReconcile, setAccountToReconcile] = useState<CashAccount | null>(null);

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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [accList, kpi, txData] = await Promise.all([
        cashbookService.getCashAccounts(filters.branchId),
        cashbookService.getSummaryKPI(filters.branchId),
        cashbookService.getTransactions(filters, currentPage, pageSize),
      ]);

      setAccounts(accList);
      setSummaryKPI(kpi);
      setTransactions(txData.items);
      setTotalItems(txData.totalItems);
    } catch (error) {
      console.error('Error loading cashbook data:', error);
      showToast('Không thể tải dữ liệu sổ quỹ', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSelectAccount = (accId: string) => {
    setFilters((prev) => ({
      ...prev,
      accountId: prev.accountId === accId ? 'ALL' : accId,
    }));
    setCurrentPage(1);
  };

  const handleOpenReconcile = (acc: CashAccount) => {
    setAccountToReconcile(acc);
    setIsReconcileModalOpen(true);
  };

  const handleCreateReceipt = async (dto: CreateReceiptDTO) => {
    await cashbookService.createReceipt(dto);
    showToast(`Đã lập Phiếu Thu thành công (+${dto.amount.toLocaleString('vi-VN')} đ)`, 'success');
    void loadData();
  };

  const handleCreatePayment = async (dto: CreatePaymentDTO) => {
    await cashbookService.createPayment(dto);
    showToast(`Đã lập Phiếu Chi thành công (-${dto.amount.toLocaleString('vi-VN')} đ)`, 'success');
    void loadData();
  };

  const handleReconcile = async (dto: CashReconciliationDTO) => {
    const adj = await cashbookService.reconcileCashAccount(dto);
    if (adj) {
      showToast(
        `Đã chốt kiểm kê và tạo bút toán điều chỉnh ${adj.transactionCode} (${adj.amount > 0 ? '+' : ''}${adj.amount.toLocaleString('vi-VN')} đ)`,
        'info'
      );
    } else {
      showToast('Kiểm kê két hoàn tất: Số dư khớp hoàn toàn với sổ sách', 'success');
    }
    void loadData();
  };

  const selectedAccountObj = useMemo(
    () => accounts.find((a) => a.id === filters.accountId),
    [accounts, filters.accountId]
  );

  return (
    <div className="cashbook-page-wrapper">
      <AdminToast toast={toast} onClose={closeToast} />

      {/* Header card with action buttons */}
      <div className="cashbook-header-card">
        <div className="cashbook-header-info">
          <h1 className="cashbook-title">
            Sổ Quỹ & Quản Lý Dòng Tiền
            <span className="cashbook-title-badge">FE-17 MT-GRMS</span>
          </h1>
          <p className="cashbook-subtitle">
            Theo dõi dòng tiền tiền mặt tại két, tài khoản ngân hàng và kiểm soát chặt chẽ thu - chi
            toàn chuỗi
          </p>
        </div>

        <div className="cashbook-header-actions">
          <button
            type="button"
            className="cb-btn cb-btn-receipt"
            onClick={() => setIsReceiptModalOpen(true)}
          >
            ➕ Lập Phiếu Thu
          </button>
          <button
            type="button"
            className="cb-btn cb-btn-payment"
            onClick={() => setIsPaymentModalOpen(true)}
          >
            ➖ Lập Phiếu Chi
          </button>
          <button
            type="button"
            className="cb-btn cb-btn-outline"
            onClick={() => setIsExportModalOpen(true)}
          >
            📑 Xuất & In Sổ Quỹ
          </button>
        </div>
      </div>

      {/* Cash accounts list */}
      <CashAccountsCardSection
        accounts={accounts}
        selectedAccountId={filters.accountId}
        onSelectAccount={handleSelectAccount}
        onOpenReconcileModal={handleOpenReconcile}
      />

      {/* KPI stats */}
      <div className="cashbook-kpi-strip">
        <div className="kpi-stat-card">
          <span className="kpi-stat-title">Số dư đầu kỳ</span>
          <span className="kpi-stat-val blue">
            {summaryKPI.totalOpeningBalance.toLocaleString('vi-VN')} đ
          </span>
        </div>
        <div className="kpi-stat-card">
          <span className="kpi-stat-title">Tổng phát sinh Thu (+)</span>
          <span className="kpi-stat-val green">
            +{summaryKPI.totalReceipts.toLocaleString('vi-VN')} đ
          </span>
        </div>
        <div className="kpi-stat-card">
          <span className="kpi-stat-title">Tổng phát sinh Chi (-)</span>
          <span className="kpi-stat-val red">
            -{summaryKPI.totalPayments.toLocaleString('vi-VN')} đ
          </span>
        </div>
        <div className="kpi-stat-card">
          <span className="kpi-stat-title">Số dư cuối kỳ (Tổng quỹ)</span>
          <span className="kpi-stat-val blue">
            {summaryKPI.totalClosingBalance.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Filters toolbar */}
      <CashbookFilterToolbar
        filters={filters}
        onChangeFilter={(updated) => {
          setFilters((prev) => ({ ...prev, ...updated }));
          setCurrentPage(1);
        }}
        onResetFilter={() => {
          setFilters({
            branchId: 'ALL',
            accountId: 'ALL',
            transactionType: 'ALL',
            datePeriod: 'this_month',
            searchQuery: '',
          });
          setCurrentPage(1);
        }}
      />

      {/* Ledger transactions table with pagination */}
      <CashbookLedgerTable
        transactions={transactions}
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Modals rendered conditionally to guarantee fresh lifecycle and zero hook mismatches */}
      {isReceiptModalOpen && (
        <CreateReceiptModal
          isOpen={isReceiptModalOpen}
          accounts={accounts}
          onClose={() => setIsReceiptModalOpen(false)}
          onSubmit={handleCreateReceipt}
        />
      )}

      {isPaymentModalOpen && (
        <CreatePaymentModal
          isOpen={isPaymentModalOpen}
          accounts={accounts}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handleCreatePayment}
        />
      )}

      {isReconcileModalOpen && accountToReconcile && (
        <CashReconciliationModal
          isOpen={isReconcileModalOpen}
          account={accountToReconcile}
          onClose={() => {
            setIsReconcileModalOpen(false);
            setAccountToReconcile(null);
          }}
          onSubmit={handleReconcile}
        />
      )}

      {isExportModalOpen && (
        <CashbookExportModal
          isOpen={isExportModalOpen}
          transactions={transactions}
          selectedAccount={selectedAccountObj}
          onClose={() => setIsExportModalOpen(false)}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
