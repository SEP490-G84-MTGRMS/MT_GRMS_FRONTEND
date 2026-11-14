import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { Truck, CheckCircle, Plus, MoreHorizontal, FileSpreadsheet, ArrowRightLeft, AlertTriangle, ChevronDown, Landmark, Wallet, Search, X } from 'lucide-react';
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
import { TriageInboxModal } from '../components/TriageInboxModal';
import { AdminToast, type ToastState } from '../../admin/components/common/AdminToast';
import { employeeApi } from '../../employee/api/employeeApi';
import { formatMoney } from '../../finance/utils/formatters';
import '../cashbook.css';
import { useAuthStore } from '../../../stores/useAuthStore';
import { posOrderApi, type OwnerUnsettledSummaryResponse } from '../../pos/api/posOrderApi';

export const CashbookPage: FC = () => {
  const { user } = useAuthStore();
  const rawRole = (user?.role || '').toUpperCase();
  const isEmployee = rawRole === 'EMPLOYEE' || rawRole === 'CASHIER' || rawRole === 'STAFF';
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || '';
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transits, setTransits] = useState<CashTransitItem[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  // Tải danh sách chi nhánh để hiển thị linh hoạt trong bộ lọc
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

  const [filters, setFilters] = useState<CashbookFilterParams>({
    branchId: 'ALL',
    accountId: 'ALL',
    transactionType: 'ALL',
    datePeriod: urlSearch ? 'all' : 'this_month',
    searchQuery: urlSearch,
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
    setFilters({
      branchId: 'ALL',
      accountId: 'ALL',
      transactionType: 'ALL',
      datePeriod: 'this_month',
      searchQuery: '',
      startDate: undefined,
      endDate: undefined,
    });
    setCurrentPage(1);
  };

  const [summaryKPI, setSummaryKPI] = useState<CashbookSummaryKPI>({
    totalOpeningBalance: 0,
    totalReceipts: 0,
    totalPayments: 0,
    totalClosingBalance: 0,
    totalCashInDrawers: 0,
    totalBankDeposits: 0,
    totalSafeDepositBalance: 0,
  });

  // Modal States
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [paymentInitialCategory, setPaymentInitialCategory] = useState<string | undefined>(undefined);
  const [receiptInitialCategory, setReceiptInitialCategory] = useState<string | undefined>(undefined);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [triagePendingCount, setTriagePendingCount] = useState(0);
  const [reconcilingAccount, setReconcilingAccount] = useState<CashAccount | null>(null);
  const [ownerUnsettled, setOwnerUnsettled] = useState<OwnerUnsettledSummaryResponse | null>(null);
  const [isOwnerEodModalOpen, setIsOwnerEodModalOpen] = useState(false);
  const [ownerEodNote, setOwnerEodNote] = useState('');
  const [isSettlingOwnerEod, setIsSettlingOwnerEod] = useState(false);
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

  // Ref and click outside listener for More Actions Menu
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };

    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMoreMenuOpen]);

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
      const branchParam = filters.branchId !== 'ALL' ? filters.branchId : undefined;
      const [accs, trns, kpis, txResult] = await Promise.all([
        cashbookService.getCashAccounts(branchParam),
        cashbookService.getCashTransits(branchParam),
        cashbookService.getSummaryKPI(branchParam),
        cashbookService.getTransactions(filters, currentPage, pageSize),
      ]);

      setAccounts(accs);
      setTransits(trns);
      setSummaryKPI(kpis);
      setTransactions(txResult.items);
      setTotalItems(txResult.totalItems);
      try {
        const triageItems = await cashbookService.getPendingTriage(
          filters.branchId !== 'ALL' ? filters.branchId : undefined
        );
        setTriagePendingCount(triageItems.length);
      } catch {
        // Ignore error when loading triage count
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

  useEffect(() => {
    if (isEmployee) return;
    const branchId = operationBranch.id === 'ALL' ? undefined : operationBranch.id;
    posOrderApi.getOwnerUnsettledSummary(branchId)
      .then(setOwnerUnsettled)
      .catch(() => setOwnerUnsettled(null));
  }, [isEmployee, operationBranch.id]);

  // Account Card Selection
  const handleSelectAccount = (accountId: string) => {
    setFilters((prev) => ({
      ...prev,
      accountId: prev.accountId === accountId ? 'ALL' : accountId,
    }));
    setCurrentPage(1);
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

  // Reason Prompt Modal State (Enterprise UX standard - replaces primitive window.prompt)
  const [reasonPrompt, setReasonPrompt] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    placeholder?: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onSubmit: (val: string) => Promise<void>;
  } | null>(null);
  const [reasonValue, setReasonValue] = useState('');
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);
  const [reasonError, setReasonError] = useState('');

  // Report Cash Transit Discrepancy
  const handleReportTransitDiscrepancy = (transitId: string) => {
    setReasonValue('');
    setReasonError('');
    setReasonPrompt({
      isOpen: true,
      title: 'Báo lệch tiền điều chuyển về Két sắt',
      description: 'Nhập thông tin lý do chênh lệch hoặc số tiền thực tế nhận được khi rút két bàn giao:',
      placeholder: 'VD: Thực nhận 1.450.000đ do thiếu 50.000đ tiền lẻ...',
      confirmText: 'Ghi nhận chênh lệch',
      variant: 'warning',
      onSubmit: async (reason: string) => {
        await cashbookService.reportTransitDiscrepancy(transitId, reason);
        showToast('Đã ghi nhận chênh lệch tiền chuyển về két sắt', 'warning');
        void loadData();
      },
    });
  };

  // Void Transaction Handler (Immutable Ledger)
  const handleVoidTransaction = (tx: LedgerTransaction) => {
    setReasonValue('');
    setReasonError('');
    setReasonPrompt({
      isOpen: true,
      title: `Gạch bỏ phiếu [${tx.transactionCode}]`,
      description: `Xác nhận gạch bỏ phiếu ${tx.transactionCode} (${tx.amount.toLocaleString('vi-VN')} đ). Theo nguyên tắc Kế toán Bất biến (Immutable Ledger), hệ thống sẽ tạo tự động một bút toán đối ứng bù trừ, không xóa dữ liệu gốc. Vui lòng nhập lý do:`,
      placeholder: 'VD: Nhập nhầm tài khoản / khách hủy đơn hàng sau thanh toán...',
      confirmText: 'Xác nhận gạch bỏ',
      variant: 'danger',
      onSubmit: async (reason: string) => {
        const comp = await cashbookService.voidTransaction(tx.id, reason);
        showToast(
          `Đã gạch bỏ phiếu ${tx.transactionCode}. Bút toán bù trừ ${comp.transactionCode} đã được tạo tự động!`,
          'success'
        );
        void loadData();
      },
    });
  };

  const handleConfirmReasonPrompt = async () => {
    if (!reasonPrompt) return;
    if (!reasonValue.trim()) {
      setReasonError('Vui lòng nhập lý do để tiếp tục');
      return;
    }
    setIsSubmittingReason(true);
    try {
      await reasonPrompt.onSubmit(reasonValue.trim());
      setReasonPrompt(null);
      setReasonValue('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi thực hiện thao tác', 'error');
    } finally {
      setIsSubmittingReason(false);
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

  const openOwnerDailySettlement = () => {
    if (operationBranch.id === 'ALL') {
      showToast('Hãy chọn một Chi nhánh thao tác trên thanh trên cùng trước khi chốt doanh thu.', 'warning');
      return;
    }
    setIsOwnerEodModalOpen(true);
  };

  const pendingTransits = useMemo(() => transits.filter((t) => t.status === 'PENDING'), [transits]);
  const cashInTransit = useMemo(
    () => pendingTransits.reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    [pendingTransits]
  );
  const primaryPendingTransit = pendingTransits[0];

  // Open Blind Reconciliation Modal from Header Action
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

  const handleSettleOwnerDaily = async () => {
    if (operationBranch.id === 'ALL') {
      showToast('Hãy chọn một Chi nhánh thao tác trên thanh trên cùng trước khi chốt doanh thu.', 'warning');
      return;
    }
    if (!ownerUnsettled || ownerUnsettled.unsettledOrdersCount === 0) {
      showToast('Hiện không có đơn bán lẻ trực tiếp nào của Chủ tiệm chờ chốt cuối ngày.', 'info');
      return;
    }
    setIsSettlingOwnerEod(true);
    try {
      const branchParam = operationBranch.id;
      const res = await posOrderApi.settleOwnerDailyOrders({
        branchId: branchParam,
        note: ownerEodNote.trim() || null,
      });
      showToast(
        `Đã chốt ${res.settledOrdersCount} đơn bán lẻ cuối ngày (${formatMoney(res.totalSettledAmount)}) vào Két sắt & Ngân hàng!`,
        'success'
      );
      setIsOwnerEodModalOpen(false);
      setOwnerEodNote('');
      void posOrderApi.getOwnerUnsettledSummary(operationBranch.id).then(setOwnerUnsettled).catch(() => {});
      void loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Lỗi khi chốt doanh thu cuối ngày', 'error');
    } finally {
      setIsSettlingOwnerEod(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F7] font-finance">
      <div className="cashbook-page-wrapper">
        <AdminToast toast={toast} onClose={closeToast} />

        {/* Thanh đồng bộ Ca & Két POS (Live Cash-in-transit Synced Banner) */}
        {cashInTransit > 0 ? (
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: 16,
              padding: '12px 20px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#F59E0B',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                }}
              >
                <Truck size={20} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#B45309',
                    background: '#FDE68A',
                    padding: '3px 8px',
                    borderRadius: 6,
                    letterSpacing: '0.02em',
                  }}
                >
                  🔄 ĐỒNG BỘ CA & KÉT POS
                </span>
                <span style={{ fontSize: '0.85rem', color: '#78350F' }}>
                  Tiền thu ngân đang nộp về két sắt:
                </span>
                <strong style={{ fontSize: '1.05rem', color: '#92400E' }} className="tabular-nums font-black">
                  {formatMoney(cashInTransit)}
                </strong>
                {primaryPendingTransit && (
                  <span style={{ fontSize: '0.82rem', color: '#92400E', opacity: 0.9 }}>
                    (từ <strong>{primaryPendingTransit.fromAccountName}</strong> • {primaryPendingTransit.senderName})
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => primaryPendingTransit && handleReportTransitDiscrepancy(primaryPendingTransit.id)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D97706',
                  color: '#B45309',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Báo lệch
              </button>
              <button
                type="button"
                onClick={() => primaryPendingTransit && handleConfirmTransit(primaryPendingTransit.id)}
                style={{
                  background: '#0F766E',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(15, 118, 110, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                <CheckCircle size={15} />
                <span>Đã nhận đủ</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 14,
              padding: '8px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
              color: '#166534',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} className="text-emerald-600" />
              <span>
                <strong>✓ Đã đồng bộ Ca & Két:</strong> Tiền thu ngân đang nộp về = <strong className="tabular-nums">0 đ</strong>, không có phiếu chờ duyệt.
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>
              Toàn hệ thống cân bằng
            </span>
          </div>
        )}

        {/* Banner Chốt doanh thu bán lẻ cuối ngày cho Chủ tiệm (không cộng lẻ từng đơn) */}
        {!isEmployee && ownerUnsettled && ownerUnsettled.unsettledOrdersCount > 0 && (
          <div
            style={{
              background: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: 12,
              padding: '10px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              boxShadow: '0 1px 3px rgba(5, 150, 105, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#065F46',
                  background: '#A7F3D0',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                Chờ chốt cuối ngày
              </span>
              <span style={{ fontSize: '0.85rem', color: '#064E3B' }}>
                {operationBranch.id === 'ALL' ? 'Toàn hệ thống đang có ' : `${operationBranch.name} đang có `}<strong>{ownerUnsettled.unsettledOrdersCount} đơn bán lẻ trực tiếp của Chủ tiệm</strong> chưa kết toán vào Sổ quỹ (Tiền mặt: <strong>{formatMoney(ownerUnsettled.cashRevenue)}</strong> · CK/VietQR: <strong>{formatMoney(ownerUnsettled.bankRevenue)}</strong> · Tổng: <strong>{formatMoney(ownerUnsettled.totalRevenue)}</strong>)
              </span>
            </div>
          </div>
        )}

        {/* Executive Header for Store Owner Multi-Branch Treasury */}
        <div className="cashbook-header-card" style={{ padding: "20px 28px", borderRadius: 20 }}>
          <div className="cashbook-header-info">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-teal-200">
                👑 Quản trị dòng tiền Chủ tiệm
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Toàn bộ chi nhánh · Két sắt · Ngân hàng
              </span>
            </div>
            <h1 className="cashbook-title">
              Sổ quỹ & Dòng tiền Toàn hệ thống
            </h1>
          </div>

          <div className="cashbook-header-actions flex items-center gap-2.5 flex-wrap" style={{ position: 'relative' }}>
              {!isEmployee && triagePendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTriageModalOpen(true)}
                  className="h-10 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors animate-pulse"
                  title="Có mục chi vặt cần Chủ tiệm phân loại"
                >
                  <AlertTriangle size={15} className="text-amber-600" />
                  <span>{triagePendingCount} mục cần duyệt</span>
                </button>
              )}

              {!isEmployee && (
                <button
                  type="button"
                  onClick={openOwnerDailySettlement}
                  className="h-10 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-900 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  title="Gộp toàn bộ đơn bán lẻ trực tiếp của Chủ tiệm trong ngày vào Két sắt & Ngân hàng (không cộng lẻ từng đơn)"
                >
                  <CheckCircle size={15} className="text-teal-700" />
                  <span>
                    Chốt cuối ngày
                    {ownerUnsettled && ownerUnsettled.unsettledOrdersCount > 0
                      ? ` (${ownerUnsettled.unsettledOrdersCount})`
                      : ''}
                  </span>
                </button>
              )}

              {/* Header Action 1: Blind Reconciliation 3-step Modal Helper */}
              <button
                type="button"
                className="cb-action-btn cb-action-btn-reconcile"
                id="btn-blind-reconcile"
                disabled={isEmployee}
                style={{ display: isEmployee ? 'none' : undefined }}
                onClick={handleOpenBlindCountModal}
                title="🔍 Mở quy trình kiểm quỹ mù 3 bước (Đếm tiền 9 mệnh giá VND)"
              >
                <Search size={15} className="stroke-[2.5]" />
                <span>🔍 Kiểm kê két mù (3 bước)</span>
              </button>

              {/* Direct Receipt Action */}
              <button
                type="button"
                className="cb-action-btn cb-action-btn-receipt"
                id="btn-create-receipt"
                onClick={() => {
                  setReceiptInitialCategory(undefined);
                  setIsReceiptModalOpen(true);
                }}
              >
                <Plus size={16} className="stroke-[2.5]" />
                <span>+ Thu tiền</span>
              </button>

              {/* Direct Payment Action */}
              <button
                type="button"
                className="cb-action-btn cb-action-btn-payment"
                id="btn-create-payment"
                disabled={isEmployee}
                style={{ display: isEmployee ? 'none' : undefined }}
                onClick={() => {
                  setPaymentInitialCategory(undefined);
                  setIsPaymentModalOpen(true);
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1, userSelect: 'none' }}>−</span>
                <span>Chi tiền</span>
              </button>

              {/* Internal Transfer Action */}
              <button
                type="button"
                className="cb-action-btn cb-action-btn-transfer"
                id="btn-internal-transfer"
                disabled={isEmployee}
                style={{ display: isEmployee ? 'none' : undefined }}
                onClick={() => setIsTransferModalOpen(true)}
                title="Chuyển quỹ nội bộ đối ứng giữa các két và tài khoản ngân hàng"
              >
                <ArrowRightLeft size={15} />
                <span>⇄ Chuyển quỹ nội bộ</span>
              </button>

              {/* More Menu Dropdown for Secondary Administrative Actions */}
              <div style={{ position: 'relative' }} ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((p) => !p)}
                  className={`cb-action-btn cb-action-btn-more ${isMoreMenuOpen ? 'active' : ''}`}
                  title="Thao tác quản trị & nghiệp vụ mở rộng"
                >
                  <MoreHorizontal size={17} style={{ color: isMoreMenuOpen ? '#0F766E' : '#64748B' }} />
                  <span>Thao tác khác</span>
                  <ChevronDown
                    size={14}
                    style={{
                      color: isMoreMenuOpen ? '#0F766E' : '#94A3B8',
                      transition: 'transform 0.2s',
                      transform: isMoreMenuOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>

                {isMoreMenuOpen && (
                  <div className="cb-more-dropdown-menu">
                    {!isEmployee && (
                      <>
                        <div className="cb-more-dropdown-header">
                          <span>Đặc quyền Chủ tiệm</span>
                          <span style={{ fontSize: '10px', color: '#0F766E', fontWeight: 700 }}>Vốn & Thuế</span>
                        </div>

                        {/* Store Owner Quick Action 1: Nộp thuế */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setPaymentInitialCategory('Nộp thuế nhà nước (Tax Payment)');
                            setIsPaymentModalOpen(true);
                          }}
                          className="cb-more-dropdown-item"
                        >
                          <div className="cb-more-item-icon blue">
                            <Landmark size={16} />
                          </div>
                          <div className="cb-more-item-text">
                            <div className="cb-more-item-title">Nộp thuế nhà nước</div>
                            <div className="cb-more-item-sub">Thuế GTGT, TNCN, môn bài</div>
                          </div>
                        </button>

                        {/* Store Owner Quick Action 2: Rút vốn chủ */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setPaymentInitialCategory('Rút vốn chủ (Owner Draw)');
                            setIsPaymentModalOpen(true);
                          }}
                          className="cb-more-dropdown-item"
                        >
                          <div className="cb-more-item-icon purple">
                            <Wallet size={16} />
                          </div>
                          <div className="cb-more-item-text">
                            <div className="cb-more-item-title">Rút lợi nhuận / Vốn chủ</div>
                            <div className="cb-more-item-sub">Owner Draw không tính thuế</div>
                          </div>
                        </button>

                        {/* Store Owner Quick Action 3: Nạp thêm vốn */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setReceiptInitialCategory('Chủ nạp thêm vốn (Capital Contribution)');
                            setIsReceiptModalOpen(true);
                          }}
                          className="cb-more-dropdown-item"
                        >
                          <div className="cb-more-item-icon emerald">
                            <Plus size={16} />
                          </div>
                          <div className="cb-more-item-text">
                            <div className="cb-more-item-title">Nạp thêm vốn kinh doanh</div>
                            <div className="cb-more-item-sub">Bổ sung tiền vào quỹ</div>
                          </div>
                        </button>

                        <div className="cb-more-dropdown-divider" />

                        {/* 4. Export Excel */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsExportModalOpen(true);
                          }}
                          className="cb-more-dropdown-item"
                        >
                          <div className="cb-more-item-icon emerald">
                            <FileSpreadsheet size={16} />
                          </div>
                          <div className="cb-more-item-text">
                            <div className="cb-more-item-title">Xuất sổ kế toán Excel</div>
                            <div className="cb-more-item-sub">Tải file báo cáo thu chi & số dư</div>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

          {/* Integrated Cashflow Equation Band */}
          <div className="w-full pt-3 mt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Đầu kỳ có:</span>
              <strong className="text-gray-900 tabular-nums text-sm">
                {formatMoney(summaryKPI.totalOpeningBalance)}
              </strong>
            </div>

            <span className="text-gray-300 font-extrabold text-sm select-none">+</span>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Tiền vào:</span>
              <strong className="text-emerald-600 tabular-nums text-sm">
                +{formatMoney(summaryKPI.totalReceipts)}
              </strong>
            </div>

            <span className="text-gray-300 font-extrabold text-sm select-none">−</span>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Tiền ra:</span>
              <strong className="text-rose-600 tabular-nums text-sm">
                −{formatMoney(summaryKPI.totalPayments)}
              </strong>
            </div>

            <span className="text-gray-300 font-extrabold text-sm select-none">=</span>

            <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              <span className="text-emerald-800 font-bold">Hiện có:</span>
              <strong className="text-emerald-800 text-sm tabular-nums font-black">
                {formatMoney(summaryKPI.totalClosingBalance)}
              </strong>
            </div>
          </div>
        </div>



        {/* Multi-Accounts Cards (Cash Draws, Safe Deposit, Bank Accounts) */}
        <div style={{ marginTop: 24 }}>
          <CashAccountsCardSection
            accounts={accounts}
            selectedAccountId={filters.accountId}
            onSelectAccount={handleSelectAccount}
            onOpenReconcileModal={
              isEmployee ? undefined : (acc) => setReconcilingAccount(acc)
            }
          />
        </div>

        {/* Filter Toolbar */}
        <div style={{ marginTop: 24 }}>
          <CashbookFilterToolbar
            filters={filters}
            onChangeFilter={handleFilterChange}
            onResetFilter={handleResetFilters}
            branches={branches}
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
            onVoidTransaction={isEmployee ? undefined : handleVoidTransaction}
          />
        </div>


        {/* Modals */}
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

        <TriageInboxModal
          isOpen={isTriageModalOpen}
          onClose={() => setIsTriageModalOpen(false)}
          branchId={filters.branchId !== 'ALL' ? filters.branchId : undefined}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            void loadData();
          }}
        />

        {/* Modal Chốt doanh thu bán lẻ cuối ngày cho Chủ cửa hàng */}
        {isOwnerEodModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
            onClick={() => setIsOwnerEodModalOpen(false)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 520,
                padding: 24,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e2e8f0',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    Chốt Doanh Thu Bán Lẻ Cuối Ngày (Chủ Tiệm)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                    Gộp toàn bộ đơn bán trực tiếp của Chủ cửa hàng thành 1 bút toán tổng vào Két sắt &amp; Ngân hàng
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Chi nhánh được chốt</div>
                  <div style={{ marginTop: 3, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{operationBranch.name}</div>
                  <div style={{ marginTop: 2, fontSize: 11, color: '#64748b' }}>Mã chi nhánh: {operationBranch.code || operationBranch.id}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Số đơn bán lẻ trực tiếp chờ chốt:</span>
                    <strong style={{ color: '#0f172a' }}>{ownerUnsettled?.unsettledOrdersCount || 0} đơn hàng</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#065f46' }}>Doanh thu Tiền mặt (gộp vào Két sắt):</span>
                    <strong style={{ color: '#059669' }}>+{formatMoney(ownerUnsettled?.cashRevenue || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#1e40af' }}>Doanh thu Chuyển khoản / VietQR (gộp vào Ngân hàng):</span>
                    <strong style={{ color: '#2563eb' }}>+{formatMoney(ownerUnsettled?.bankRevenue || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #cbd5e1', fontSize: 14 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Tổng doanh thu kết toán cuối ngày:</span>
                    <strong style={{ fontWeight: 800, color: '#0f766e' }}>{formatMoney(ownerUnsettled?.totalRevenue || 0)}</strong>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#475569', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: '8px 12px' }}>
                  <b>Cơ chế gom bút toán Sổ quỹ:</b> Đối với nhân viên, doanh thu chỉ được cộng gộp khi nhân viên <b>Chốt ca &amp; Chủ duyệt bàn giao</b>. Đối với Chủ tiệm bán trực tiếp (không mở ca), bấm xác nhận bên dưới để gộp 1 lần cuối ngày vào Sổ quỹ thay vì cộng lẻ từng đơn.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Ghi chú kết toán cuối ngày (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={ownerEodNote}
                    onChange={(e) => setOwnerEodNote(e.target.value)}
                    placeholder="VD: Chốt doanh thu bán lẻ cuối ngày của Chủ cửa hàng..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setIsOwnerEodModalOpen(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={isSettlingOwnerEod || !ownerUnsettled || ownerUnsettled.unsettledOrdersCount === 0}
                    onClick={handleSettleOwnerDaily}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: !ownerUnsettled || ownerUnsettled.unsettledOrdersCount === 0 ? '#94a3b8' : '#0f766e',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: !ownerUnsettled || ownerUnsettled.unsettledOrdersCount === 0 || isSettlingOwnerEod ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSettlingOwnerEod ? 'Đang chốt sổ...' : 'Xác Nhận Chốt Doanh Thu Cuối Ngày'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reason / Prompt Modal (Enterprise UX standard - replaces primitive window.prompt) */}
        {reasonPrompt && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() => {
              if (!isSubmittingReason) setReasonPrompt(null);
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                maxWidth: 480,
                width: '100%',
                padding: 24,
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                  {reasonPrompt.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setReasonPrompt(null)}
                  disabled={isSubmittingReason}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  title="Đóng"
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                {reasonPrompt.description}
              </p>

              <div style={{ marginBottom: 16 }}>
                <textarea
                  value={reasonValue}
                  onChange={(e) => {
                    setReasonValue(e.target.value);
                    if (reasonError) setReasonError('');
                  }}
                  rows={3}
                  placeholder={reasonPrompt.placeholder || 'Nhập lý do...'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: reasonError ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
                {reasonError && (
                  <p style={{ color: '#EF4444', fontSize: '0.8rem', margin: '4px 0 0', fontWeight: 600 }}>
                    {reasonError}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setReasonPrompt(null)}
                  disabled={isSubmittingReason}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReasonPrompt}
                  disabled={isSubmittingReason}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background:
                      reasonPrompt.variant === 'danger'
                        ? '#DC2626'
                        : reasonPrompt.variant === 'warning'
                        ? '#D97706'
                        : '#0F766E',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingReason ? 'Đang xử lý...' : reasonPrompt.confirmText || 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
