import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Wallet,
  Plus,
  FileSpreadsheet,
  ArrowRightLeft,
  AlertTriangle,
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
} from '../types/cashbook.types';
import { cashbookService } from '../services/cashbookService';
import { CashbookFilterToolbar } from '../components/CashbookFilterToolbar';
import { CashbookLedgerTable } from '../components/CashbookLedgerTable';
import { CreateReceiptModal } from '../components/CreateReceiptModal';
import { CreatePaymentModal } from '../components/CreatePaymentModal';
import { InternalTransferModal } from '../components/InternalTransferModal';
import { CashbookExportModal } from '../components/CashbookExportModal';
import { PrintReceiptModal } from '../components/PrintReceiptModal';
import { ReverseTransactionModal } from '../components/ReverseTransactionModal';
import { TriageInboxModal } from '../components/TriageInboxModal';
import { AdminToast, type ToastState } from '../../admin/components/common/AdminToast';
import { employeeApi } from '../../employee/api/employeeApi';
import '../../purchase-order/purchase-order.css';
import '../../../styles/so-list-page.css';
import '../cashbook.css';
import { useAuthStore } from '../../../stores/useAuthStore';
import { PosShiftPage } from '../../pos/pages/PosShiftPage';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { generateUuidV7 } from '../../../utils/uuid';

export const CashbookPage: FC = () => {
  const { user } = useAuthStore();
  const isEmployee = user?.role !== 'STORE_OWNER';
  const [closingBranch, setClosingBranch] = useState<{ id: string; name: string } | null>(null);
  const [isOwnerDepositOpen, setIsOwnerDepositOpen] = useState(false);
  const [ownerDepositAmount, setOwnerDepositAmount] = useState('');
  const [ownerDepositNote, setOwnerDepositNote] = useState('');
  const [isDepositingOwnerCash, setIsDepositingOwnerCash] = useState(false);
  const [operationBranch, setOperationBranch] = useState<{ id: string; code?: string; name: string }>(() => {
    try {
      const stored = localStorage.getItem('mtgrms_active_branch');
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback về toàn hệ thống nếu dữ liệu lưu không hợp lệ.
    }
    return { id: 'ALL', code: 'ALL', name: 'Toàn hệ thống' };
  });

  useEffect(() => {
    const handleBranchChange = (event: Event) => {
      const branch = (event as CustomEvent).detail;
      if (branch?.id) setOperationBranch(branch);
    };
    window.addEventListener('mtgrms:branch-changed', handleBranchChange);
    return () => window.removeEventListener('mtgrms:branch-changed', handleBranchChange);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || '';
  const urlAccountId = searchParams.get('accountId') || 'ALL';
  const urlBranchId = searchParams.get('branchId');

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
      branchId: urlBranchId || 'ALL',
      accountId: urlAccountId,
      transactionType: 'ALL',
      datePeriod: period.datePeriod,
      startDate: period.startDate,
      endDate: period.endDate,
      searchQuery: urlSearch,
      status: 'ALL',
    };
  });

  useEffect(() => {
    // A direct account link keeps its branch; otherwise follow the active branch.
    if (urlBranchId) return;
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
  }, [urlBranchId]);

  useEffect(() => {
    if (urlSearch) {
      setFilters((prev) => ({
        ...prev,
        searchQuery: urlSearch,
        ...(urlBranchId ? { branchId: urlBranchId } : {}),
        ...(urlAccountId !== 'ALL' ? { accountId: urlAccountId, transactionType: 'ALL', status: 'ALL' } : {}),
        datePeriod: 'all',
        startDate: undefined,
        endDate: undefined,
      }));
      setCurrentPage(1);
    }
  }, [urlSearch, urlAccountId, urlBranchId]);

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

  const loadVersion = useRef(0);
  const [loadError, setLoadError] = useState('');

  // Load Data
  const loadData = useCallback(async () => {
    const version = ++loadVersion.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const branchParam = filters.branchId !== 'ALL' ? filters.branchId : undefined;
      const [accs, txResult] = await Promise.all([
        cashbookService.getCashAccounts(branchParam),
        cashbookService.getTransactions(filters, currentPage, pageSize),
      ]);

      if (version !== loadVersion.current) return;
      setAccounts(accs);
      setTransactions(txResult.items);
      setTotalItems(txResult.totalItems);

      try {
        const triageItems = await cashbookService.getPendingTriage(branchParam);
        if (version === loadVersion.current) setTriagePendingCount(triageItems.length);
      } catch {
        if (version === loadVersion.current) setTriagePendingCount(0);
      }
    } catch {
      if (version !== loadVersion.current) return;
      setAccounts([]);
      setTransactions([]);
      setTotalItems(0);
      setTriagePendingCount(0);
      setLoadError('Không tải được dữ liệu sổ quỹ.');
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  useEffect(() => {
    void loadData();
    return () => { loadVersion.current++; };
  }, [loadData]);

  // Create Receipt Handler
  const handleCreateReceipt = async (dto: CreateReceiptDTO, idempotencyKey: string) => {
    const newTx = await cashbookService.createReceipt(dto, idempotencyKey);
    showToast(`Đã ghi nhận Phiếu thu [${newTx.transactionCode}] thành công!`, 'success');

    void loadData();
  };

  const handleOwnerSafeDeposit = async () => {
    const amount = Number(ownerDepositAmount.replace(/\D/g, ''));
    if (operationBranch.id === 'ALL') {
      showToast('Vui lòng chọn một chi nhánh để nộp tiền vào két.', 'error');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Vui lòng nhập số tiền lớn hơn 0.', 'error');
      return;
    }
    try {
      setIsDepositingOwnerCash(true);
      await financeHttpClient.post('/cashbook/owner-safe-deposits', {
        branchId: operationBranch.id, amount, note: ownerDepositNote.trim() || 'Chủ bổ sung tiền vào két sắt',
      }, { headers: { 'Idempotency-Key': generateUuidV7() } });
      setIsOwnerDepositOpen(false);
      setOwnerDepositAmount('');
      setOwnerDepositNote('');
      showToast('Đã nộp tiền vào két sắt chi nhánh.', 'success');
      void loadData();
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Không thể nộp tiền vào két.', 'error');
    } finally {
      setIsDepositingOwnerCash(false);
    }
  };

  // Create Payment Handler
  const handleCreatePayment = async (dto: CreatePaymentDTO, idempotencyKey: string) => {
    const newTx = await cashbookService.createPayment(dto, idempotencyKey);
    showToast(`Đã ghi nhận Phiếu chi [${newTx.transactionCode}] thành công!`, 'success');

    void loadData();
  };

  // Internal Fund Transfer Handler
  const handleTransfer = async (dto: FundTransferDTO, idempotencyKey: string) => {
    const result = await cashbookService.transferFunds(dto, idempotencyKey);
    showToast(
      `Đã tạo lệnh chuyển ${result.payment.amount.toLocaleString('vi-VN')} đ sang két sắt!`,
      'success'
    );

    void loadData();
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

  const selectedAccountObj = useMemo(
    () => accounts.find((a) => a.id === filters.accountId),
    [accounts, filters.accountId]
  );

  const openOwnerDailySettlement = () => {
    if (operationBranch.id === 'ALL') {
      showToast('“Toàn hệ thống” chỉ dùng để xem báo cáo. Hãy chọn một chi nhánh cụ thể để chốt doanh thu.', 'warning');
      return;
    }
    setClosingBranch(operationBranch);
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
          <details className="cb-more-actions" onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('button, a')) event.currentTarget.open = false;
          }}>
            <summary className="po-btn po-btn-secondary">Thao tác khác</summary>
            <div className="cb-more-actions-menu">
              {!isEmployee && (
                <button
                  type="button"
                  className="po-btn po-btn-secondary"
                  onClick={openOwnerDailySettlement}
                  title={operationBranch.id === 'ALL' ? 'Chọn một chi nhánh cụ thể trên thanh trên cùng để chốt doanh thu' : `Chốt doanh thu ${operationBranch.name}`}
                >
                  {operationBranch.id === 'ALL' ? 'Chọn chi nhánh để chốt' : 'Chốt doanh thu ngày'}
                </button>
              )}

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
                className="po-btn po-btn-secondary"
                aria-pressed={filters.sourceType === 'INTERNAL_TRANSFER'}
                onClick={() => {
                  setFilters(current => ({ ...current, sourceType: current.sourceType === 'INTERNAL_TRANSFER' ? undefined : 'INTERNAL_TRANSFER' }));
                  setCurrentPage(1);
                }}
              >
                <span>{filters.sourceType === 'INTERNAL_TRANSFER' ? 'Xem toàn bộ sổ quỹ' : 'Lịch sử chuyển tiền'}</span>
              </button>

              {!isEmployee && <button type="button" className="po-btn po-btn-secondary"
                onClick={() => setIsOwnerDepositOpen(true)} title="Chủ bổ sung tiền mặt vào két sắt chi nhánh">
                <Wallet size={14} /><span>Nộp tiền vào két</span>
              </button>}
            </div>
          </details>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="cb-load-error">
          {loadError} <button type="button" className="po-btn po-btn-secondary" onClick={() => void loadData()}>Thử lại</button>
        </div>
      )}

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
      {!isEmployee && closingBranch && (
        <PosShiftPage
          dailyClosing={{
            branchId: closingBranch.id,
            branchName: closingBranch.name,
            onClose: () => setClosingBranch(null),
            onChange: loadData,
          }}
        />
      )}

      {isOwnerDepositOpen && <div className="cb-modal-backdrop" onClick={() => setIsOwnerDepositOpen(false)}>
        <div className="cb-modal-container" role="dialog" aria-modal="true" aria-label="Nộp tiền vào két sắt"
          onClick={(event) => event.stopPropagation()}>
          <div className="cb-modal-header cb-modal-header--receipt"><div className="cb-modal-heading">
            <div><h2 className="cb-modal-title">Nộp tiền vào két sắt</h2>
              <p className="cb-modal-subtitle">{operationBranch.name} · Chủ bổ sung tiền mặt, không tính doanh thu bán hàng</p></div>
          </div></div>
          <div className="cb-modal-body">
            <label className="cb-form-label" htmlFor="owner-deposit-amount">Số tiền (đ) *</label>
            <input id="owner-deposit-amount" className="cb-form-input" inputMode="numeric"
              value={ownerDepositAmount} onChange={(event) => setOwnerDepositAmount(event.target.value)}
              placeholder="Nhập số tiền" />
            <label className="cb-form-label" htmlFor="owner-deposit-note">Ghi chú</label>
            <input id="owner-deposit-note" className="cb-form-input" value={ownerDepositNote}
              onChange={(event) => setOwnerDepositNote(event.target.value)} placeholder="Nguồn tiền nộp vào két" />
          </div>
          <div className="cb-modal-footer">
            <button type="button" className="po-btn po-btn-secondary" onClick={() => setIsOwnerDepositOpen(false)}>Hủy</button>
            <button type="button" className="po-btn po-btn-primary" disabled={isDepositingOwnerCash}
              onClick={handleOwnerSafeDeposit}>{isDepositingOwnerCash ? 'Đang ghi nhận...' : 'Xác nhận nộp tiền'}</button>
          </div>
        </div>
      </div>}

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
