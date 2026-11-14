import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import {
  FinanceHeader,
  HeroCashCards,
  ActionInbox,
  SummaryPillars,
  type CashMetrics,
  type FinanceTabKey,
  type PillarsSummaryData,
} from '../components';
import {
  cashbookService,
  type BackendCashbookSummaryResponse,
} from '../../cashbook/services/cashbookService';
import type { CashAccount } from '../../cashbook/types/cashbook.types';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { posShiftApi } from '../../pos/api/posShiftApi';
import type { PendingMovementsSummaryResponse } from '../../pos/types/posShift.types';
import { taxSnapshotApi } from '../../tax-snapshot/api/taxSnapshotApi';
import {
  TaxCalculationMethod,
  TaxPeriodType,
  type HouseholdTaxSummaryDto,
} from '../../tax-snapshot/types/taxSnapshot';
import { AdminToast, type ToastState } from '../../admin/components';
import {
  PnlReportSection,
  formatLocalYmd,
  reportsPnlService,
  type PnlFilterParams,
} from '../../reports-pnl';
import '../finance.css';

type BranchOption = Awaited<ReturnType<typeof reportsPnlService.getBranches>>[number];
type PnlReportResponse = Awaited<ReturnType<typeof reportsPnlService.getPnlReportData>>;

interface DebtsSummaryResponse {
  totalDebtAR?: number;
  overLimitCount?: number;
  totalCustomers?: number;
}

interface ExpensesSummaryResponse {
  totalAmount?: number;
  totalCount?: number;
  paidAmount?: number;
  paidCount?: number;
  pendingApprovalAmount?: number;
  pendingApprovalCount?: number;
  totalPendingAmount?: number;
  overdueAmount?: number;
  totalOverdueAmount?: number;
  overdueCount?: number;
}

interface ZoneAQueriesResult {
  cashAccountsQuery: UseQueryResult<CashAccount[], Error>;
  cashSummaryQuery: UseQueryResult<BackendCashbookSummaryResponse | undefined, Error>;
  debtsSummaryQuery: UseQueryResult<DebtsSummaryResponse | null, Error>;
  expensesSummaryQuery: UseQueryResult<ExpensesSummaryResponse | null, Error>;
  taxSummaryQuery: UseQueryResult<HouseholdTaxSummaryDto, Error>;
  pendingMovementsQuery: UseQueryResult<PendingMovementsSummaryResponse, Error>;
}

const PRESET_PERIOD_LABELS: Record<PnlFilterParams['presetPeriod'], string> = {
  TODAY: 'Hôm nay',
  LAST_7_DAYS: '7 ngày qua',
  THIS_MONTH: 'Tháng này',
  LAST_MONTH: 'Tháng trước',
  THIS_QUARTER: 'Quý này',
  CUSTOM: 'Tùy chọn ngày',
};

/**
 * Builds the default P&L filter covering the current calendar month.
 */
function createInitialPnlFilter(): PnlFilterParams {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let initialBranch = 'ALL';
  try {
    const stored = localStorage.getItem('mtgrms_active_branch');
    if (stored) {
      const b = JSON.parse(stored);
      if (b?.id) initialBranch = b.id;
    }
  } catch {}
  return {
    branchId: initialBranch,
    presetPeriod: 'THIS_MONTH',
    startDate: formatLocalYmd(firstDayOfMonth),
    endDate: formatLocalYmd(today),
  };
}

/**
 * Fetches an optional summary endpoint and rethrows on failure after logging.
 */
async function fetchOptionalSummary<T>(
  endpoint: string,
  contextLabel: string
): Promise<T | null> {
  try {
    const res = await financeHttpClient.get<{ data?: T } & T>(endpoint);
    return (res.data?.data ?? res.data ?? null) as T | null;
  } catch (err) {
    console.error(`Failed to fetch ${contextLabel}:`, err);
    throw err;
  }
}

/**
 * Computes real-time cash balances and allocation percentages across vaults and accounts.
 */
function computeCashMetrics(
  accounts: CashAccount[],
  cashSummary: BackendCashbookSummaryResponse | undefined,
  cashInTransit: number = 0
): CashMetrics {
  const cashAtRegisters =
    cashSummary?.totalCashInDrawers ??
    accounts
      .filter((a) => a.accountType === 'CASH' && !a.isSafeDeposit)
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const safeDeposit =
    cashSummary?.totalSafeDepositBalance ??
    accounts
      .filter((a) => a.isSafeDeposit)
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const bankBalances =
    cashSummary?.totalBankDeposits ??
    accounts
      .filter((a) => a.accountType === 'BANK')
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const totalAssets =
    (cashSummary?.totalClosingBalance ?? cashAtRegisters + safeDeposit + bankBalances) +
    cashInTransit;

  const toPct = (val: number) => (totalAssets > 0 ? Math.round((val / totalAssets) * 100) : 0);

  return {
    cashAtRegisters,
    safeDeposit,
    bankBalances,
    cashInTransit,
    totalAssets,
    pctCash: toPct(cashAtRegisters),
    pctSafe: toPct(safeDeposit),
    pctBank: toPct(bankBalances),
    pctTransit: toPct(cashInTransit),
  };
}

/**
 * Aggregates Zone A and Zone B data into the 4 summary pillars without duplicate requests.
 */
function buildPillarsSummary(
  zoneA: ZoneAQueriesResult,
  pnlReportData: PnlReportResponse | undefined,
  presetPeriod: PnlFilterParams['presetPeriod'],
  currentYear: number
): PillarsSummaryData {
  const debts = zoneA.debtsSummaryQuery.data;
  const expenses = zoneA.expensesSummaryQuery.data;
  const tax = zoneA.taxSummaryQuery.data;

  const overduePayablesAmount =
    expenses?.totalPendingAmount ??
    (expenses?.pendingApprovalAmount ?? ((expenses?.totalAmount ?? 0) - (expenses?.paidAmount ?? 0)));
  const overduePayablesCount =
    expenses?.overdueCount ??
    expenses?.pendingApprovalCount ??
    ((expenses?.totalCount !== undefined && expenses?.paidCount !== undefined)
      ? Math.max(0, expenses.totalCount - expenses.paidCount)
      : (overduePayablesAmount > 0 ? 1 : 0));
  return {
    totalCustomerDebt: debts?.totalDebtAR || 0,
    overLimitCustomersCount: debts?.overLimitCount || 0,
    totalDebtorsCount: debts?.totalCustomers || 0,
    overduePayablesAmount,
    overduePayablesCount,
    netProfitMonth: Number(pnlReportData?.kpiSummary?.netProfit ?? 0),
    netMarginPct: Number(pnlReportData?.kpiSummary?.netMarginPct ?? 0),
    activePeriodLabel: PRESET_PERIOD_LABELS[presetPeriod] ?? 'Tháng này',
    taxDueYear: tax?.taxDueYtd ?? tax?.totalTaxAmount ?? 0,
    currentYear,
  };
}

/**
 * Manages toast state with automatic timeout cleanup on unmount or manual close.
 */
function useOverviewToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToastTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearToastTimer, [clearToastTimer]);

  const showToast = useCallback(
    (message: string, type: ToastState['type'] = 'success') => {
      clearToastTimer();
      setToast({ id: String(Date.now()), message, type });
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, 3200);
    },
    [clearToastTimer]
  );

  const dismissToast = useCallback(() => {
    clearToastTimer();
    setToast(null);
  }, [clearToastTimer]);

  return { toast, showToast, dismissToast };
}

/**
 * Loads real-time Zone A cashbook, debt, expense, and tax queries.
 */
function useZoneAQueries(currentYear: number, branchId?: string, enabled = true): ZoneAQueriesResult {
  const branchParam = branchId === 'ALL' ? undefined : branchId;

  const cashAccountsQuery = useQuery({
    queryKey: ['finance-overview-cash-accounts', branchId],
    queryFn: () => cashbookService.getCashAccounts(branchParam),
    enabled,
  });

  const cashSummaryQuery = useQuery({
    queryKey: ['finance-overview-cash-summary', branchId],
    queryFn: async () => {
      const res = await financeHttpClient.get<{ data: BackendCashbookSummaryResponse }>(
        '/cashbook/summary',
        { params: branchParam ? { branchId: branchParam } : undefined }
      );
      return res.data?.data;
    },
    enabled,
  });

  const debtsSummaryQuery = useQuery({
    queryKey: ['finance-overview-debts-summary', branchId],
    queryFn: () =>
      fetchOptionalSummary<DebtsSummaryResponse>(
        branchParam ? `/customers/debts/summary?branchId=${branchParam}` : '/customers/debts/summary',
        'debts summary'
      ),
    enabled,
  });

  const expensesSummaryQuery = useQuery({
    queryKey: ['finance-overview-expenses-summary', branchId],
    queryFn: () =>
      fetchOptionalSummary<ExpensesSummaryResponse>(
        branchParam ? `/expenses/summary?branchId=${branchParam}` : '/expenses/summary',
        'expenses summary'
      ),
    enabled,
  });

  const taxSummaryQuery = useQuery({
    queryKey: ['tax-summary-overview', currentYear, branchId],
    queryFn: () =>
      taxSnapshotApi.getTaxSummary({
        year: currentYear,
        periodType: TaxPeriodType.Year,
        periodNumber: currentYear,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
      }),
    enabled,
  });

  const pendingMovementsQuery = useQuery({
    queryKey: ['finance-overview-pending-movements', branchId],
    queryFn: async () => {
      try {
        return await posShiftApi.getPendingMovements(branchParam);
      } catch (err) {
        console.error('Failed to fetch pending movements for cash-in-transit:', err);
        return { pendingApprovalsCount: 0, unconfirmedDropsCount: 0, movements: [] };
      }
    },
    enabled,
  });

  return {
    cashAccountsQuery,
    cashSummaryQuery,
    debtsSummaryQuery,
    expensesSummaryQuery,
    taxSummaryQuery,
    pendingMovementsQuery,
  };
}

/**
 * Loads branch options and period P&L report data shared between Card #3 and Zone B.
 */
function usePnlSectionQueries(pnlFilter: PnlFilterParams, enabled = true) {
  const branchesQuery = useQuery<BranchOption[], Error>({
    queryKey: ['finance-pnl-branches'],
    queryFn: () => reportsPnlService.getBranches(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const pnlReportQuery = useQuery<PnlReportResponse, Error>({
    queryKey: [
      'finance-pnl-report',
      pnlFilter.branchId,
      pnlFilter.presetPeriod,
      pnlFilter.startDate,
      pnlFilter.endDate,
    ],
    queryFn: () => reportsPnlService.getPnlReportData(pnlFilter),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  return { branchesQuery, pnlReportQuery };
}

/**
 * Provides coordinated refresh handling for Zone A and Zone B queries with toast feedback.
 */
function useOverviewRefresh(
  zoneA: ZoneAQueriesResult,
  pnlReportQuery: UseQueryResult<PnlReportResponse, Error>,
  showToast: (message: string, type?: ToastState['type']) => void
) {
  const refetchCashAccounts = zoneA.cashAccountsQuery.refetch;
  const refetchCashSummary = zoneA.cashSummaryQuery.refetch;
  const refetchDebtsSummary = zoneA.debtsSummaryQuery.refetch;
  const refetchExpensesSummary = zoneA.expensesSummaryQuery.refetch;
  const refetchTaxSummary = zoneA.taxSummaryQuery.refetch;
  const refetchPendingMovements = zoneA.pendingMovementsQuery.refetch;
  const refetchPnlReport = pnlReportQuery.refetch;

  const handleRefreshAll = useCallback(async () => {
    try {
      const results = await Promise.all([
        refetchCashAccounts(),
        refetchCashSummary(),
        refetchDebtsSummary(),
        refetchExpensesSummary(),
        refetchPendingMovements(),
        refetchPnlReport(),
        refetchTaxSummary(),
      ]);
      if (results.some((res) => res.isError)) {
        showToast('Một số dữ liệu chưa thể làm mới. Vui lòng thử lại.', 'warning');
        return;
      }
      showToast('Đã cập nhật số liệu tài chính mới nhất!', 'success');
    } catch (err) {
      console.error('Failed to refresh finance overview data:', err);
      showToast('Không thể cập nhật số liệu tài chính. Vui lòng thử lại.', 'error');
    }
  }, [
    refetchCashAccounts,
    refetchCashSummary,
    refetchDebtsSummary,
    refetchExpensesSummary,
    refetchPendingMovements,
    refetchPnlReport,
    refetchTaxSummary,
    showToast,
  ]);

  const isRefreshing =
    zoneA.cashAccountsQuery.isFetching ||
    zoneA.cashSummaryQuery.isFetching ||
    zoneA.debtsSummaryQuery.isFetching ||
    zoneA.expensesSummaryQuery.isFetching ||
    zoneA.taxSummaryQuery.isFetching ||
    zoneA.pendingMovementsQuery.isFetching ||
    pnlReportQuery.isFetching;

  return { handleRefreshAll, isRefreshing };
}

const OverviewErrorBanner: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="finance-error-banner">
    <div className="finance-error-banner-content">
      <AlertCircle size={18} color="#DC2626" />
      <span>
        Không thể kết nối đến máy chủ kế toán để tải số dư quỹ. Vui lòng kiểm tra dịch vụ backend
        hoặc thử lại.
      </span>
    </div>
    <button type="button" onClick={onRetry} className="finance-error-retry-btn">
      Thử lại
    </button>
  </div>
);

interface EmbeddedPnlSectionProps {
  filter: PnlFilterParams;
  onFilterChange: (newFilter: PnlFilterParams) => void;
  branches: BranchOption[];
  pnlReportQuery: UseQueryResult<PnlReportResponse, Error>;
  onRefresh: () => void;
  isExportModalOpen: boolean;
  onOpenExportModal: () => void;
  onCloseExportModal: () => void;
  onShowToast: (message: string, type?: ToastState['type']) => void;
  accountingMode: boolean;
}

const EmbeddedPnlSection: React.FC<EmbeddedPnlSectionProps> = ({
  filter,
  onFilterChange,
  branches,
  pnlReportQuery,
  onRefresh,
  isExportModalOpen,
  onOpenExportModal,
  onCloseExportModal,
  onShowToast,
  accountingMode,
}) => (
  <div className="finance-pnl-zone">
    <PnlReportSection
      filter={filter}
      onFilterChange={onFilterChange}
      branches={branches}
      reportData={pnlReportQuery.data}
      isLoading={pnlReportQuery.isLoading}
      isFetching={pnlReportQuery.isFetching}
      errorMsg={
        pnlReportQuery.isError
          ? 'Không thể tải dữ liệu báo cáo Lãi lỗ. Vui lòng thử lại sau.'
          : null
      }
      onRefresh={onRefresh}
      isExportModalOpen={isExportModalOpen}
      onOpenExportModal={onOpenExportModal}
      onCloseExportModal={onCloseExportModal}
      onShowToast={onShowToast}
      hideRefreshButton={true}
      embedded={true}
      accountingMode={accountingMode}
    />
  </div>
);

/**
 * Controller hook managing finance overview state, queries, and interactions.
 */
function useFinanceOverviewController() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [todayLabel] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pnlFilter, setPnlFilter] = useState<PnlFilterParams>(createInitialPnlFilter);
  const [accountingMode, setAccountingMode] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: FinanceTabKey = rawTab === 'pnl' ? 'pnl' : 'overview';

  useEffect(() => {
    if (rawTab !== 'overview' && rawTab !== 'pnl') {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'overview');
      setSearchParams(next, { replace: true });
    }
  }, [rawTab, searchParams, setSearchParams]);

  const { toast, showToast, dismissToast } = useOverviewToast();
  const zoneA = useZoneAQueries(currentYear, pnlFilter.branchId, activeTab === 'overview');
  const { branchesQuery, pnlReportQuery } = usePnlSectionQueries(pnlFilter);
  const refresh = useOverviewRefresh(zoneA, pnlReportQuery, showToast);
  const isLoading = zoneA.cashAccountsQuery.isLoading || zoneA.cashSummaryQuery.isLoading;

  // Synchronize branch from global top navigation
  useEffect(() => {
    const handleGlobalBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>;
      const branch = customEvent.detail;
      if (branch?.id) {
        setPnlFilter((prev) => ({
          ...prev,
          branchId: branch.id,
        }));
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    };
  }, []);

  const pendingMovements = zoneA.pendingMovementsQuery.data?.movements || [];
  const unconfirmedDropsCount = zoneA.pendingMovementsQuery.data?.unconfirmedDropsCount ??
    pendingMovements.filter(
      (m) =>
        (m.category === 'CASH_DRAW' || (m.category as unknown) === 2) &&
        !m.isConfirmedByOwner
    ).length;

  const pendingApprovalsCount = zoneA.pendingMovementsQuery.data?.pendingApprovalsCount ?? 0;

  const cashInTransit = pendingMovements
    .filter(
      (m) =>
        (m.category === 'CASH_DRAW' || (m.category as unknown) === 2) &&
        !m.isConfirmedByOwner
    )
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const cashMetrics = computeCashMetrics(
    zoneA.cashAccountsQuery.data || [],
    zoneA.cashSummaryQuery.data,
    cashInTransit
  );

  const pillars = buildPillarsSummary(
    zoneA,
    pnlReportQuery.data,
    pnlFilter.presetPeriod,
    currentYear
  );

  const handleTabChange = useCallback((tab: FinanceTabKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  }, [setSearchParams]);

  const handleToggleAccountingMode = useCallback(() => {
    setAccountingMode((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'Đã bật Chế độ Kế toán (hiện đối chiếu dồn tích & thực thu chi).'
          : 'Đã ẩn thuật ngữ kế toán để xem đơn giản.',
        'info'
      );
      return next;
    });
  }, [showToast]);

  return {
    todayLabel,
    activeTab,
    handleTabChange,
    accountingMode,
    handleToggleAccountingMode,
    toast,
    showToast,
    dismissToast,
    pnlFilter,
    setPnlFilter,
    branches: branchesQuery.data || [],
    pnlReportQuery,
    isExportModalOpen,
    setIsExportModalOpen,
    isLoading,
    isError: zoneA.cashAccountsQuery.isError || zoneA.cashSummaryQuery.isError,
    isPnlPending: pnlReportQuery.isPlaceholderData && pnlReportQuery.isFetching,
    cashAccounts: zoneA.cashAccountsQuery.data || [],
    cashMetrics,
    cashInTransit,
    unconfirmedDropsCount,
    pendingApprovalsCount,
    pillars,
    ...refresh,
  };
}

/**
 * Unified Finance Overview Page combining Zone A (real-time cash & daily obligations)
 * and Zone B (period P&L analytics) with individual account hero cards, action inbox,
 * and 6-step visual P&L waterfall chart.
 */
export const FinanceOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const ctrl = useFinanceOverviewController();

  const showZoneA = ctrl.activeTab === 'overview';
  const showZoneB = ctrl.activeTab === 'pnl';

  return (
    <div className="finance-overview-container">
      <AdminToast toast={ctrl.toast} onClose={ctrl.dismissToast} />
      <main className="finance-overview-main">
        {/* Top Header & Sub-tabs */}
        <FinanceHeader
          todayLabel={ctrl.todayLabel}
          activeTab={ctrl.activeTab}
          onTabChange={ctrl.handleTabChange}
          accountingMode={ctrl.accountingMode}
          onToggleAccountingMode={ctrl.handleToggleAccountingMode}
          isRefreshing={ctrl.isRefreshing}
          onRefreshAll={ctrl.handleRefreshAll}
          onNavigateCashbook={() => navigate('/store-owner/cashbook')}
          onNavigateCashControl={() => navigate('/store-owner/cash-control?tab=pending')}
        />

        {ctrl.isError && <OverviewErrorBanner onRetry={ctrl.handleRefreshAll} />}

        {/* Zone A: Real-Time Cash Health & Daily Obligations */}
        {showZoneA && (
          <>
            <HeroCashCards
              isLoading={ctrl.isLoading}
              metrics={ctrl.cashMetrics}
              accounts={ctrl.cashAccounts}
              onNavigateCashbook={() => navigate('/store-owner/cashbook')}
              onNavigateCashControl={() => navigate('/store-owner/cash-control?tab=pending')}
            />

            <ActionInbox
              unconfirmedDropsCount={ctrl.unconfirmedDropsCount}
              pendingApprovalsCount={ctrl.pendingApprovalsCount}
              cashInTransit={ctrl.cashInTransit}
              overduePayablesCount={ctrl.pillars.overduePayablesCount}
              overduePayablesAmount={ctrl.pillars.overduePayablesAmount}
              overLimitCustomersCount={ctrl.pillars.overLimitCustomersCount}
              onNavigateCashControl={() => navigate('/store-owner/cash-control?tab=pending')}
              onNavigateExpenses={() => navigate('/store-owner/expenses')}
              onNavigateCustomers={() => navigate('/store-owner/customers')}
            />

            <SummaryPillars
              pillars={ctrl.pillars}
              isPnlPending={ctrl.isPnlPending}
              onNavigate={navigate}
              onScrollToPnl={() => navigate('/store-owner/finance?tab=pnl')}
            />
          </>
        )}

        {/* Zone Divider between Zone A and Zone B */}
        {/* Zone B: Profit & Loss (P&L) Waterfall & Reports */}
        {showZoneB && (
          <EmbeddedPnlSection
            filter={ctrl.pnlFilter}
            onFilterChange={ctrl.setPnlFilter}
            branches={ctrl.branches}
            pnlReportQuery={ctrl.pnlReportQuery}
            onRefresh={ctrl.handleRefreshAll}
            isExportModalOpen={ctrl.isExportModalOpen}
            onOpenExportModal={() => ctrl.setIsExportModalOpen(true)}
            onCloseExportModal={() => ctrl.setIsExportModalOpen(false)}
            onShowToast={ctrl.showToast}
            accountingMode={ctrl.accountingMode}
          />
        )}
      </main>
    </div>
  );
};

export default FinanceOverviewPage;
