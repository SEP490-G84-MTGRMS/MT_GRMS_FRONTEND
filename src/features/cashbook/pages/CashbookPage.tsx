import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { Truck, CheckCircle, Plus, MoreHorizontal, FileSpreadsheet, ArrowRightLeft, AlertTriangle, Inbox, ChevronDown, Landmark, Wallet } from 'lucide-react';
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
import { formatMoney } from '../../finance/utils/formatters';
import '../cashbook.css';
import { useAuthStore } from '../../../stores/useAuthStore';

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

  const [filters, setFilters] = useState<CashbookFilterParams>({
    branchId: 'ALL',
    accountId: 'ALL',
    transactionType: 'ALL',
    datePeriod: urlSearch ? 'all' : 'this_month',
    searchQuery: urlSearch,
  });

  useEffect(() => {
    if (urlSearch) {
      setFilters((prev) => ({
        ...prev,
        searchQuery: urlSearch,
        datePeriod: 'all',
        startDate: undefined,
        endDate: undefined,
      }));
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
  };

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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [paymentInitialCategory, setPaymentInitialCategory] = useState<string | undefined>(undefined);
  const [receiptInitialCategory, setReceiptInitialCategory] = useState<string | undefined>(undefined);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [triagePendingCount, setTriagePendingCount] = useState(0);
  const [reconcilingAccount, setReconcilingAccount] = useState<CashAccount | null>(null);

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
        cashbookService.getCashTransits(),
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

  const pendingTransit = transits.find((t) => t.status === 'PENDING');

  return (
    <div className="min-h-screen bg-[#F7F8F7] font-finance">
      <div className="cashbook-page-wrapper">
        <AdminToast toast={toast} onClose={closeToast} />

        {/* Cash Transit Alert Banner */}
        {/* Offline LocalStorage Migration Banner */}
        
        {/* Compact Cash Transit Alert Banner */}
        {pendingTransit && (
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: 12,
              padding: '8px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              boxShadow: '0 1px 3px rgba(217, 119, 6, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: '#F59E0B',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Truck size={16} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: '#B45309',
                    background: '#FDE68A',
                    padding: '2px 7px',
                    borderRadius: 5,
                  }}
                >
                  Đang chuyển
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#92400E' }} className="tabular-nums">
                  {formatMoney(pendingTransit.amount)}
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#78350F' }}>
                  từ <strong>{pendingTransit.fromAccountName}</strong> về <strong>Két sắt</strong> ({pendingTransit.senderName})
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleReportTransitDiscrepancy(pendingTransit.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #D97706',
                  color: '#B45309',
                  padding: '5px 12px',
                  borderRadius: 7,
                  fontWeight: 600,
                  fontSize: '0.78rem',
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
                  padding: '5px 14px',
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 4px rgba(17, 94, 89, 0.2)',
                }}
              >
                <CheckCircle size={14} />
                <span>Đã nhận đủ</span>
              </button>
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
            {/* Subtitle removed for executive clarity */}
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
                  {!isEmployee && triagePendingCount > 0 && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#EF4444',
                        display: 'inline-block',
                      }}
                      title={`${triagePendingCount} giao dịch cần duyệt`}
                    />
                  )}
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
                          <span>Thao tác mở rộng</span>
                          <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>FE-17 Quản trị</span>
                        </div>

                        {/* 1. Internal Transfer */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsTransferModalOpen(true);
                          }}
                          className="cb-more-dropdown-item"
                        >
                          <div className="cb-more-item-icon teal">
                            <ArrowRightLeft size={16} />
                          </div>
                          <div className="cb-more-item-text">
                            <div className="cb-more-item-title">Chuyển quỹ nội bộ</div>
                            <div className="cb-more-item-sub">Két tiền mặt ↔ Ngân hàng</div>
                          </div>
                        </button>
                      </>
                    )}

                    {/* 3. Triage Inbox */}
                    {!isEmployee && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsTriageModalOpen(true);
                        }}
                        className="cb-more-dropdown-item"
                      >
                        <div className="cb-more-item-icon indigo">
                          <Inbox size={16} />
                        </div>
                        <div className="cb-more-item-text">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="cb-more-item-title">Hộp thư duyệt Triage</span>
                            {triagePendingCount > 0 && (
                              <span className="cb-more-badge">{triagePendingCount}</span>
                            )}
                          </div>
                          <div className="cb-more-item-sub">Duyệt giao dịch chuyển khoản treo</div>
                        </div>
                      </button>
                    )}

                    {!isEmployee && (
                      <>
                        <div className="cb-more-dropdown-divider" />
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
      </div>
    </div>
  );
};
