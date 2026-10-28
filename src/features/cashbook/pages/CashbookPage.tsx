import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { Truck, CheckCircle, Plus, MoreHorizontal, FileSpreadsheet, ArrowRightLeft, X } from 'lucide-react';
import type {
  CashAccount,
  LedgerTransaction,
  CashbookFilterParams,
  CashbookSummaryKPI,
  CreateReceiptDTO,
  CreatePaymentDTO,
  FundTransferDTO,
  CashReconciliationDTO,
  CashTransitItem,
} from '../types/cashbook.types';
import { cashbookService } from '../services/cashbookService';
import { CashAccountsCardSection } from '../components/CashAccountsCardSection';
import { CashbookFilterToolbar } from '../components/CashbookFilterToolbar';
import { CashbookLedgerTable } from '../components/CashbookLedgerTable';
import { CreateReceiptModal } from '../components/CreateReceiptModal';
import { CreatePaymentModal } from '../components/CreatePaymentModal';
import { InternalTransferModal } from '../components/InternalTransferModal';
import { CashReconciliationModal } from '../components/CashReconciliationModal';
import { CashbookExportModal } from '../components/CashbookExportModal';
import { AdminToast, type ToastState } from '../../admin/components/common/AdminToast';
import { formatMoney } from '../../finance/utils/formatters';
import '../cashbook.css';

export const CashbookPage: FC = () => {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transits, setTransits] = useState<CashTransitItem[]>([]);
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
    totalOpeningBalance: 345_050_000, // Standardized per Decision D2
    totalReceipts: 16_450_000,
    totalPayments: 2_200_000,
    totalClosingBalance: 359_300_000, // 345.050.000 + 16.450.000 - 2.200.000
    totalCashInDrawers: 20_700_000,
    totalBankDeposits: 178_250_000,
    totalSafeDepositBalance: 150_000_000,
  });

  // Modal States
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isQuickActionSheetOpen, setIsQuickActionSheetOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
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

  // Load Initial Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accs, trns, kpis, txResult] = await Promise.all([
        cashbookService.getCashAccounts(),
        cashbookService.getCashTransits(),
        cashbookService.getSummaryKPI(),
        cashbookService.getTransactions(filters, currentPage, pageSize),
      ]);

      setAccounts(accs);
      setTransits(trns);
      // Reconcile opening balance to 345.05M per Decision D2
      setSummaryKPI({
        ...kpis,
        totalOpeningBalance: 345_050_000,
        totalClosingBalance: 359_300_000,
      });
      setTransactions(txResult.items);
      setTotalItems(txResult.totalItems);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi tải dữ liệu sổ quỹ', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Account Card Selection
  const handleSelectAccount = (accountId: string) => {
    setFilters((prev) => ({
      ...prev,
      accountId: prev.accountId === accountId ? 'ALL' : accountId,
    }));
    setCurrentPage(1);
  };

  // Open Blind Reconciliation Modal
  const handleOpenReconcile = (account: CashAccount) => {
    setAccountToReconcile(account);
    setIsReconcileModalOpen(true);
  };

  // Submit Blind Reconciliation
  const handleReconcileSubmit = async (data: {
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
        systemBalance: accountToReconcile?.currentBalance || 12_500_000,
        actualCountedBalance: data.actualBalance,
        differenceAmount: data.difference,
        reason: data.reason,
        auditedBy: data.countedBy,
        breakdown: data.denominations,
      };
      await cashbookService.reconcileCashAccount(dto);
      showToast('Đã hoàn tất kiểm két và lập phiếu điều chỉnh sổ sách!', 'success');
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi kiểm két', 'error');
    }
  };

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

  // Confirm Cash Transit (Store Owner Only)
  const handleConfirmTransit = async (transitId: string) => {
    try {
      await cashbookService.confirmTransitReceived(transitId);
      showToast('Chủ tiệm đã xác nhận nhận đủ tiền vào Két sắt thành công!', 'success');
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi xác nhận tiền về két sắt', 'error');
    }
  };

  // Report Cash Transit Discrepancy
  const handleReportTransitDiscrepancy = async (transitId: string) => {
    const reason = window.prompt(
      'Báo lệch tiền điều chuyển về Két sắt:\n\nNhập lý do chênh lệch hoặc số tiền thực nhận:'
    );
    if (!reason || !reason.trim()) return;

    try {
      await cashbookService.reportTransitDiscrepancy(transitId, reason.trim());
      showToast('Đã ghi nhận chênh lệch tiền chuyển về két sắt', 'warning');
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi ghi nhận chênh lệch', 'error');
    }
  };

  // Void Transaction Handler (Immutable Ledger)
  const handleVoidTransaction = async (tx: LedgerTransaction) => {
    const reason = window.prompt(
      `Xác nhận gạch bỏ phiếu [${tx.transactionCode}] - ${tx.amount.toLocaleString('vi-VN')} đ?\n\n(Quy tắc Sổ cái bất biến: Hệ thống sẽ tạo 1 phiếu đối ứng bù trừ, không xóa phiếu gốc trên cơ sở dữ liệu).\n\nNhập lý do hủy:`
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      const comp = await cashbookService.voidTransaction(tx.id, reason.trim());
      showToast(
        `Đã gạch bỏ phiếu ${tx.transactionCode}. Bút toán bù trừ ${comp.transactionCode} đã được tạo tự động!`,
        'success'
      );
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi hủy phiếu', 'error');
    }
  };

  const selectedAccountObj = useMemo(
    () => accounts.find((a) => a.id === filters.accountId),
    [accounts, filters.accountId]
  );

  const pendingTransit = transits.find((t) => t.status === 'PENDING');

  return (
    <div className="min-h-screen bg-[#F7F8F7] font-finance">
      <div className="cashbook-page-wrapper">
        <AdminToast toast={toast} onClose={closeToast} />

        {/* Cash Transit Alert Banner */}
        {pendingTransit && (
          <div
            style={{
              background: 'linear-gradient(90deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1px solid #FCD34D',
              borderRadius: 14,
              padding: '14px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#F59E0B',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Truck size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#B45309',
                      background: '#FDE68A',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Tiền đang chuyển
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#92400E' }}>
                    {pendingTransit.transferCode}
                  </span>
                </div>
                <div style={{ marginTop: 2 }}>
                  <strong style={{ fontSize: '1.05rem', color: '#92400E' }} className="tabular-nums">
                    {formatMoney(pendingTransit.amount)}
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: '#78350F', marginLeft: 8 }}>
                    đang chuyển từ <strong>{pendingTransit.fromAccountName}</strong> về{' '}
                    <strong>Két sắt chủ shop</strong> ({pendingTransit.senderName})
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleReportTransitDiscrepancy(pendingTransit.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #D97706',
                  color: '#B45309',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Báo lệch
              </button>
              <button
                type="button"
                onClick={() => handleConfirmTransit(pendingTransit.id)}
                style={{
                  background: '#115E59',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(17, 94, 89, 0.25)',
                }}
              >
                <CheckCircle size={16} />
                <span>Đã nhận đủ</span>
              </button>
            </div>
          </div>
        )}

        {/* Clean Header with Single Primary Action */}
        <div className="cashbook-header-card">
          <div className="cashbook-header-info">
            <h1 className="cashbook-title">
              Tiền của tôi
            </h1>
            <p className="cashbook-subtitle">
              Nhật ký thu chi: ghi rồi không ai sửa hay xóa được · Đồng bộ giữa Két quầy, Két sắt và Ngân hàng
            </p>
          </div>

          <div className="cashbook-header-actions" style={{ position: 'relative' }}>
            {/* Single Primary Action Button */}
            <button
              type="button"
              className="btn-primary-teal"
              id="btn-single-primary-action"
              onClick={() => setIsQuickActionSheetOpen(true)}
            >
              <Plus size={18} />
              <span>+ Thu / Chi tiền</span>
            </button>

            {/* More Menu Dropdown for Secondary Actions */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((p) => !p)}
                className="w-12 h-12 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors"
                title="Thao tác khác"
              >
                <MoreHorizontal size={20} />
              </button>

              {isMoreMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    background: '#FFFFFF',
                    borderRadius: 12,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #E5E7EB',
                    width: 220,
                    zIndex: 30,
                    padding: 6,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsTransferModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                  >
                    <ArrowRightLeft size={16} className="text-[#115E59]" />
                    <span>Chuyển quỹ nội bộ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsExportModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    <span>Xuất sổ kế toán Excel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visual Ledger Equation Band (Reconciled: 345,05tr + 16,45tr - 2,2tr = 359,3tr) */}
        <div className="cashbook-summary-bar">
          <div className="cb-summary-item">
            <span className="cb-summary-label">Đầu kỳ có:</span>
            <span className="cb-summary-value balance-value tabular-nums">
              {formatMoney(summaryKPI.totalOpeningBalance)}
            </span>
          </div>

          <span className="cb-summary-operator">+</span>

          <div className="cb-summary-item">
            <span className="cb-summary-label">Tiền vào:</span>
            <span className="cb-summary-value income-value tabular-nums">
              +{formatMoney(summaryKPI.totalReceipts)}
            </span>
          </div>

          <span className="cb-summary-operator">−</span>

          <div className="cb-summary-item">
            <span className="cb-summary-label">Tiền ra:</span>
            <span className="cb-summary-value expense-value tabular-nums">
              −{formatMoney(summaryKPI.totalPayments)}
            </span>
          </div>

          <span className="cb-summary-operator">=</span>

          <div className="cb-summary-item highlight">
            <span className="cb-summary-label">Hiện có:</span>
            <span className="cb-summary-value closing-value tabular-nums">
              {formatMoney(summaryKPI.totalClosingBalance)}
            </span>
          </div>
        </div>

        {/* Multi-Accounts Cards (Cash Draws, Safe Deposit, Bank Accounts) */}
        <div style={{ marginTop: 24 }}>
          <CashAccountsCardSection
            accounts={accounts}
            selectedAccountId={filters.accountId}
            onSelectAccount={handleSelectAccount}
            onOpenReconcileModal={handleOpenReconcile}
          />
        </div>

        {/* Filter Toolbar */}
        <div style={{ marginTop: 24 }}>
          <CashbookFilterToolbar
            filters={filters}
            onChangeFilter={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
            onResetFilter={() =>
              setFilters({
                branchId: 'ALL',
                accountId: 'ALL',
                transactionType: 'ALL',
                datePeriod: 'this_month',
                searchQuery: '',
              })
            }
          />
        </div>

        {/* Immutable Ledger Table */}
        <div style={{ marginTop: 16 }}>
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
            onVoidTransaction={handleVoidTransaction}
          />
        </div>

        {/* Quick Action Sheet (Modal for + Thu / Chi tiền) */}
        {isQuickActionSheetOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 font-finance"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-[16px] max-w-lg w-full p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">Chọn thao tác thu chi</h3>
                <button
                  type="button"
                  onClick={() => setIsQuickActionSheetOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionSheetOpen(false);
                    setIsReceiptModalOpen(true);
                  }}
                  className="p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-left transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl mb-3 shadow-sm">
                    +
                  </div>
                  <h4 className="text-lg font-bold text-emerald-950">Thu tiền</h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Ghi nhận tiền vào quỹ (Bán hàng, thu khác)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionSheetOpen(false);
                    setIsPaymentModalOpen(true);
                  }}
                  className="p-5 rounded-2xl border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-left transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-700 text-white flex items-center justify-center font-bold text-xl mb-3 shadow-sm">
                    −
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Chi tiền</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Ghi nhận tiền ra (Điện, nước, mặt bằng...)
                  </p>
                </button>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setIsQuickActionSheetOpen(false)}
                  className="btn-text-cancel"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <CreateReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          accounts={accounts}
          onSubmit={handleCreateReceipt}
        />

        <CreatePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          accounts={accounts}
          onSubmit={handleCreatePayment}
        />

        <InternalTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          accounts={accounts}
          onSubmit={handleTransfer}
        />

        <CashReconciliationModal
          isOpen={isReconcileModalOpen}
          onClose={() => {
            setIsReconcileModalOpen(false);
            setAccountToReconcile(null);
          }}
          account={accountToReconcile}
          onSubmit={handleReconcileSubmit}
        />

        <CashbookExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          transactions={transactions}
          selectedAccount={selectedAccountObj}
          onShowToast={showToast}
        />
      </div>
    </div>
  );
};
