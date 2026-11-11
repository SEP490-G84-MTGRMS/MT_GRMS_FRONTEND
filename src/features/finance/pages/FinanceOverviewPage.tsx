import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Printer,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { formatCompactMoney, formatMoney } from '../utils/formatters';
import {
  cashbookService,
  type BackendCashbookSummaryResponse,
} from '../../cashbook/services/cashbookService';
import type { CashAccount } from '../../cashbook/types/cashbook.types';
import { financeHttpClient } from '../../../api/financeHttpClient';
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
  overdueAmount?: number;
  totalOverdueAmount?: number;
  overdueCount?: number;
}

interface CashMetrics {
  cashAtRegisters: number;
  safeDeposit: number;
  bankBalances: number;
  cashInTransit: number;
  totalAssets: number;
  pctCash: number;
  pctSafe: number;
  pctBank: number;
  pctTransit: number;
}

interface PillarsSummaryData {
  totalCustomerDebt: number;
  overLimitCustomersCount: number;
  totalDebtorsCount: number;
  overduePayablesAmount: number;
  overduePayablesCount: number;
  netProfitMonth: number;
  netMarginPct: number;
  activePeriodLabel: string;
  taxDueYear: number;
  currentYear: number;
}

interface UrgentTodoItemConfig {
  id: string;
  variant: 'danger' | 'warning';
  title: string;
  subtitle: string;
  ctaLabel: string;
  onAction: () => void;
}

interface ZoneAQueriesResult {
  cashAccountsQuery: UseQueryResult<CashAccount[], Error>;
  cashSummaryQuery: UseQueryResult<BackendCashbookSummaryResponse | undefined, Error>;
  debtsSummaryQuery: UseQueryResult<DebtsSummaryResponse | null, Error>;
  expensesSummaryQuery: UseQueryResult<ExpensesSummaryResponse | null, Error>;
  taxSummaryQuery: UseQueryResult<HouseholdTaxSummaryDto, Error>;
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
  return {
    branchId: 'ALL',
    presetPeriod: 'THIS_MONTH',
    startDate: formatLocalYmd(firstDayOfMonth),
    endDate: formatLocalYmd(today),
  };
}

/**
 * Smoothly scrolls the viewport to the embedded Zone B P&L section.
 */
function scrollToPnlSection(): void {
  document.getElementById('pnl-section')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
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
  cashSummary: BackendCashbookSummaryResponse | undefined
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

  const cashInTransit = 0;
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

  return {
    totalCustomerDebt: debts?.totalDebtAR || 0,
    overLimitCustomersCount: debts?.overLimitCount || 0,
    totalDebtorsCount: debts?.totalCustomers || 0,
    overduePayablesAmount: expenses?.overdueAmount ?? expenses?.totalOverdueAmount ?? 0,
    overduePayablesCount: expenses?.overdueCount || 0,
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
 * Scrolls smoothly to the embedded P&L section when `?tab=pnl` or `#pnl` is active and Zone A is ready.
 */
function usePnlDeepLinkScroll(isReady: boolean): void {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const scrolledKeyRef = useRef<string | null>(null);
  const tabParam = searchParams.get('tab') ?? '';
  const hash = location.hash ?? '';
  const isPnlDeepLink = tabParam === 'pnl' || hash === '#pnl';
  const deepLinkKey = `${tabParam}|${hash}`;

  useEffect(() => {
    if (!isPnlDeepLink) {
      scrolledKeyRef.current = null;
      return;
    }
    if (!isReady || scrolledKeyRef.current === deepLinkKey) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      scrolledKeyRef.current = deepLinkKey;
      scrollToPnlSection();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isPnlDeepLink, isReady, deepLinkKey]);
}

/**
 * Loads real-time Zone A cashbook, debt, expense, and tax queries.
 */
function useZoneAQueries(currentYear: number): ZoneAQueriesResult {
  const cashAccountsQuery = useQuery({
    queryKey: ['finance-overview-cash-accounts'],
    queryFn: () => cashbookService.getCashAccounts(),
  });

  const cashSummaryQuery = useQuery({
    queryKey: ['finance-overview-cash-summary'],
    queryFn: async () => {
      const res = await financeHttpClient.get<{ data: BackendCashbookSummaryResponse }>(
        '/cashbook/summary'
      );
      return res.data?.data;
    },
  });

  const debtsSummaryQuery = useQuery({
    queryKey: ['finance-overview-debts-summary'],
    queryFn: () =>
      fetchOptionalSummary<DebtsSummaryResponse>('/customers/debts/summary', 'debts summary'),
  });

  const expensesSummaryQuery = useQuery({
    queryKey: ['finance-overview-expenses-summary'],
    queryFn: () =>
      fetchOptionalSummary<ExpensesSummaryResponse>('/expenses/summary', 'expenses summary'),
  });

  const taxSummaryQuery = useQuery({
    queryKey: ['tax-summary-overview', currentYear],
    queryFn: () =>
      taxSnapshotApi.getTaxSummary({
        year: currentYear,
        periodType: TaxPeriodType.Year,
        periodNumber: currentYear,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
      }),
  });

  return {
    cashAccountsQuery,
    cashSummaryQuery,
    debtsSummaryQuery,
    expensesSummaryQuery,
    taxSummaryQuery,
  };
}

/**
 * Loads branch options and period P&L report data shared between Card #3 and Zone B.
 */
function usePnlSectionQueries(pnlFilter: PnlFilterParams) {
  const branchesQuery = useQuery<BranchOption[], Error>({
    queryKey: ['finance-pnl-branches'],
    queryFn: () => reportsPnlService.getBranches(),
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
  const refetchPnlReport = pnlReportQuery.refetch;

  const handleRefreshAll = useCallback(async () => {
    try {
      const results = await Promise.all([
        refetchCashAccounts(),
        refetchCashSummary(),
        refetchDebtsSummary(),
        refetchExpensesSummary(),
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
    refetchCashAccounts, refetchCashSummary, refetchDebtsSummary,
    refetchExpensesSummary, refetchPnlReport, refetchTaxSummary, showToast,
  ]);

  const isRefreshing =
    zoneA.cashAccountsQuery.isFetching ||
    zoneA.cashSummaryQuery.isFetching ||
    zoneA.debtsSummaryQuery.isFetching ||
    zoneA.expensesSummaryQuery.isFetching ||
    zoneA.taxSummaryQuery.isFetching ||
    pnlReportQuery.isFetching;

  return { handleRefreshAll, isRefreshing };
}

interface OverviewHeaderProps {
  todayLabel: string;
  isRefreshing: boolean;
  canExport: boolean;
  onRefreshAll: () => void;
  onOpenExportModal: () => void;
  onNavigateCashbook: () => void;
}

const OverviewHeader: React.FC<OverviewHeaderProps> = ({
  todayLabel,
  isRefreshing,
  canExport,
  onRefreshAll,
  onOpenExportModal,
  onNavigateCashbook,
}) => (
  <div className="finance-overview-header">
    <div className="finance-overview-title">
      <h1>Tổng quan Tài chính</h1>
      <p>
        Dòng tiền tức thời, công nợ hôm nay và kết quả kinh doanh Lãi lỗ ({todayLabel})
      </p>
    </div>
    <div className="finance-overview-actions">
      <button
        type="button"
        onClick={onRefreshAll}
        disabled={isRefreshing}
        className="finance-btn-secondary"
        title="Làm mới dữ liệu từ máy chủ"
      >
        <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
        <span>Cập nhật</span>
      </button>
      <button
        type="button"
        onClick={onOpenExportModal}
        disabled={!canExport}
        className="finance-btn-secondary"
        title="In và xuất báo cáo Lãi lỗ"
      >
        <Printer size={15} />
        <span>In & Xuất Báo Cáo</span>
      </button>
      <button
        type="button"
        onClick={onNavigateCashbook}
        className="btn-primary-teal"
        id="btn-quick-receipt-payment"
      >
        <span>+ Thu / Chi tiền</span>
      </button>
    </div>
  </div>
);

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

const CashAllocationBar: React.FC<{ metrics: CashMetrics }> = ({ metrics }) => (
  <div
    className="finance-allocation-track"
    role="progressbar"
    aria-valuenow={100}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      style={{ width: `${metrics.pctCash}%`, background: '#115E59' }}
      title={`Tiền mặt quầy: ${formatMoney(metrics.cashAtRegisters)}`}
    />
    <div
      style={{ width: `${metrics.pctSafe}%`, background: '#2DD4BF' }}
      title={`Két sắt chủ shop: ${formatMoney(metrics.safeDeposit)}`}
    />
    <div
      style={{ width: `${metrics.pctBank}%`, background: '#94A3B8' }}
      title={`Ngân hàng: ${formatMoney(metrics.bankBalances)}`}
    />
    {metrics.cashInTransit > 0 && (
      <div
        style={{ width: `${metrics.pctTransit}%`, background: '#B45309' }}
        title={`Đang chuyển về két sắt: ${formatMoney(metrics.cashInTransit)}`}
      />
    )}
  </div>
);

const CashAllocationLegend: React.FC<{ metrics: CashMetrics }> = ({ metrics }) => {
  const legendItems = [
    { label: 'Tiền quầy:', value: formatCompactMoney(metrics.cashAtRegisters), color: '#115E59' },
    { label: 'Két sắt:', value: formatCompactMoney(metrics.safeDeposit), color: '#2DD4BF' },
    { label: 'Ngân hàng:', value: formatCompactMoney(metrics.bankBalances), color: '#94A3B8' },
    {
      label: 'Đang chuyển:',
      value: metrics.cashInTransit > 0 ? formatCompactMoney(metrics.cashInTransit) : '0đ',
      color: '#B45309',
    },
  ];

  return (
    <div className="finance-legend-grid">
      {legendItems.map((item) => (
        <div key={item.label} className="finance-legend-item">
          <span className="finance-legend-dot" style={{ background: item.color }} />
          <span className="finance-legend-label">{item.label}</span>
          <span className="finance-legend-val">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

const CashSnapshotHeroCard: React.FC<{ isLoading: boolean; metrics: CashMetrics }> = ({
  isLoading,
  metrics,
}) => (
  <section aria-labelledby="hero-title" className="finance-hero-card">
    <div className="finance-hero-header">
      <div>
        <span id="hero-title" className="finance-hero-title-text">
          Tiền hiện có hôm nay (có thể tiêu ngay)
        </span>
        <div className="finance-hero-amount">
          {isLoading ? (
            <span style={{ fontSize: '1.5rem', color: '#94A3B8' }}>Đang tải số dư...</span>
          ) : (
            formatMoney(metrics.totalAssets)
          )}
        </div>
      </div>

      <div className="finance-hero-badge">
        <TrendingUp size={16} />
        <span>Dữ liệu thực từ sổ quỹ & tài khoản ngân hàng</span>
      </div>
    </div>

    <div>
      <CashAllocationBar metrics={metrics} />
      <CashAllocationLegend metrics={metrics} />
    </div>
  </section>
);

/**
 * Builds the list of urgent daily financial tasks requiring owner attention.
 */
function buildUrgentTasks(
  overduePayablesCount: number,
  overduePayablesAmount: number,
  overLimitCustomersCount: number,
  onNavigateExpenses: () => void,
  onNavigateCustomers: () => void
): UrgentTodoItemConfig[] {
  const tasks: UrgentTodoItemConfig[] = [];

  if (overduePayablesCount > 0) {
    tasks.push({
      id: 'overdue-payables',
      variant: 'danger',
      title: `${overduePayablesCount} khoản phải trả đã quá hạn (${formatMoney(overduePayablesAmount)})`,
      subtitle: 'Các khoản chi phí dịch vụ quá hạn thanh toán cần được giải ngân',
      ctaLabel: 'Xem chi tiết',
      onAction: onNavigateExpenses,
    });
  }

  if (overLimitCustomersCount > 0) {
    tasks.push({
      id: 'over-limit-customers',
      variant: 'warning',
      title: `${overLimitCustomersCount} khách hàng vượt hạn mức nợ`,
      subtitle: 'Cần thu hồi công nợ trước khi tiếp tục cho phép ghi nợ đơn mới',
      ctaLabel: 'Thu nợ ngay',
      onAction: onNavigateCustomers,
    });
  }

  return tasks;
}

const UrgentTodoItem: React.FC<{ task: UrgentTodoItemConfig }> = ({ task }) => (
  <div className={`finance-todo-item ${task.variant}`}>
    <div className="finance-todo-left">
      <div className={`finance-todo-icon ${task.variant}`}>!</div>
      <div>
        <h3 className={`finance-todo-title ${task.variant}`}>{task.title}</h3>
        <p className={`finance-todo-sub ${task.variant}`}>{task.subtitle}</p>
      </div>
    </div>
    <button type="button" onClick={task.onAction} className={`finance-todo-btn ${task.variant}`}>
      {task.ctaLabel}
    </button>
  </div>
);

interface UrgentTodoSectionProps {
  pillars: PillarsSummaryData;
  onNavigateExpenses: () => void;
  onNavigateCustomers: () => void;
}

const UrgentTodoSection: React.FC<UrgentTodoSectionProps> = ({
  pillars,
  onNavigateExpenses,
  onNavigateCustomers,
}) => {
  const tasks = buildUrgentTasks(
    pillars.overduePayablesCount,
    pillars.overduePayablesAmount,
    pillars.overLimitCustomersCount,
    onNavigateExpenses,
    onNavigateCustomers
  );

  if (tasks.length === 0) {
    return (
      <section aria-label="Việc cần làm trong ngày" className="finance-todo-empty-strip">
        <div className="finance-todo-empty-left">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>
            Việc cần làm trong ngày: Tuyệt vời! Không có khoản nợ quá hạn hoặc khoản chi nào cần xử
            lý khẩn cấp hôm nay.
          </span>
        </div>
        <span className="finance-todo-empty-badge">0 việc khẩn</span>
      </section>
    );
  }

  return (
    <section aria-labelledby="tasks-title" className="finance-todo-section">
      <div className="finance-todo-header">
        <h2 id="tasks-title">Việc cần làm trong ngày</h2>
        <span className="finance-todo-count-badge">{tasks.length} việc</span>
      </div>
      <div className="finance-todo-list">
        {tasks.map((task) => (
          <UrgentTodoItem key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
};

interface SummaryPillarCardProps {
  title: string;
  badgeText?: string;
  valueText: string;
  valueColor?: string;
  subNote?: string;
  footerLeftText: string;
  footerLeftColor: string;
  footerLeftBold?: boolean;
  ctaLabel: string;
  isPending?: boolean;
  onClick: () => void;
}

const SummaryPillarCard: React.FC<SummaryPillarCardProps> = ({
  title, badgeText, valueText, valueColor, subNote,
  footerLeftText, footerLeftColor, footerLeftBold = false,
  ctaLabel, isPending = false, onClick,
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={title}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    className="finance-summary-card"
    style={isPending ? { opacity: 0.7 } : undefined}
  >
    <div>
      <div className="finance-summary-header-row">
        <span className="finance-summary-title">{title}</span>
        {badgeText && <span className="finance-summary-period-badge">{badgeText}</span>}
      </div>
      <div className="finance-summary-val" style={valueColor ? { color: valueColor } : undefined}>
        {valueText}
      </div>
      {subNote && (
        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: -8, marginBottom: 8 }}>
          {subNote}
        </div>
      )}
    </div>
    <div className="finance-summary-footer">
      <span style={{ color: footerLeftColor, fontWeight: footerLeftBold ? 700 : 600 }}>
        {footerLeftText}
      </span>
      <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        {ctaLabel} <ChevronRight size={14} />
      </span>
    </div>
  </div>
);

interface SummaryPillarsGridProps {
  pillars: PillarsSummaryData;
  isPnlPending: boolean;
  onNavigate: (path: string) => void;
}

/**
 * Builds the P&L and tax summary cards for the bottom-right pillars.
 */
function buildPnlAndTaxCards(
  pillars: PillarsSummaryData,
  onNavigate: (path: string) => void,
  isPnlPending: boolean
): Array<SummaryPillarCardProps & { id: string }> {
  return [
    {
      id: 'net-profit-pnl',
      title: 'Lợi nhuận ròng PnL',
      badgeText: pillars.activePeriodLabel,
      valueText: formatMoney(pillars.netProfitMonth),
      valueColor: pillars.netProfitMonth >= 0 ? '#15803D' : '#DC2626',
      footerLeftText: `Tỷ suất lợi nhuận: ${pillars.netMarginPct}%`,
      footerLeftColor: '#475569',
      ctaLabel: 'Xem phân tích bên dưới',
      isPending: isPnlPending,
      onClick: scrollToPnlSection,
    },
    {
      id: 'tax-due-year',
      title: `Thuế năm nay (Lũy kế ${pillars.currentYear})`,
      valueText: formatMoney(pillars.taxDueYear),
      valueColor: '#B45309',
      subNote: 'Theo Thông tư 152/2025/TT-BTC',
      footerLeftText: 'Kỳ thuế hiện tại',
      footerLeftColor: '#B45309',
      ctaLabel: 'Kê khai thuế',
      onClick: () => onNavigate('/store-owner/tax-snapshots'),
    },
  ];
}

/**
 * Builds the 4 summary pillar cards configuration from Zone A and Zone B data.
 */
function buildSummaryCards(
  pillars: PillarsSummaryData,
  onNavigate: (path: string) => void,
  isPnlPending: boolean
): Array<SummaryPillarCardProps & { id: string }> {
  const hasDebtors = pillars.totalDebtorsCount > 0;
  const hasOverdue = pillars.overduePayablesCount > 0;
  return [
    {
      id: 'customer-debt',
      title: 'Khách đang nợ mình',
      valueText: formatMoney(pillars.totalCustomerDebt),
      footerLeftText: hasDebtors ? `${pillars.totalDebtorsCount} khách hàng ghi nợ` : 'Không có nợ xấu',
      footerLeftColor: '#B45309',
      ctaLabel: 'Xem sổ nợ',
      onClick: () => onNavigate('/store-owner/customers'),
    },
    {
      id: 'service-payables',
      title: 'Phải trả dịch vụ',
      valueText: formatMoney(pillars.overduePayablesAmount),
      footerLeftText: hasOverdue ? `${pillars.overduePayablesCount} khoản quá hạn` : 'Đã thanh toán đủ',
      footerLeftColor: hasOverdue ? '#DC2626' : '#15803D',
      footerLeftBold: true,
      ctaLabel: 'Xem chi tiết',
      onClick: () => onNavigate('/store-owner/expenses'),
    },
    ...buildPnlAndTaxCards(pillars, onNavigate, isPnlPending),
  ];
}

const SummaryPillarsGrid: React.FC<SummaryPillarsGridProps> = ({
  pillars,
  isPnlPending,
  onNavigate,
}) => {
  const cards = buildSummaryCards(pillars, onNavigate, isPnlPending);
  return (
    <section aria-label="Tóm tắt 4 trụ cột tài chính" className="finance-summary-grid">
      {cards.map(({ id, ...cardProps }) => (
        <SummaryPillarCard key={id} {...cardProps} />
      ))}
    </section>
  );
};

const PnlZoneDivider: React.FC = () => (
  <div className="finance-zone-divider" aria-hidden="true">
    <div className="finance-zone-divider-line" />
    <span className="finance-zone-divider-label">
      <BarChart3 size={14} />
      Phân tích Lãi lỗ & Hiệu quả kinh doanh theo kỳ
    </span>
    <div className="finance-zone-divider-line" />
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
    />
  </div>
);

interface FinanceOverviewZoneAProps {
  isLoading: boolean;
  isError: boolean;
  isPnlPending: boolean;
  cashMetrics: CashMetrics;
  pillars: PillarsSummaryData;
  onRetry: () => void;
  onNavigate: (path: string) => void;
}

const FinanceOverviewZoneA: React.FC<FinanceOverviewZoneAProps> = ({
  isLoading,
  isError,
  isPnlPending,
  cashMetrics,
  pillars,
  onRetry,
  onNavigate,
}) => (
  <>
    {isError && <OverviewErrorBanner onRetry={onRetry} />}
    <CashSnapshotHeroCard isLoading={isLoading} metrics={cashMetrics} />
    <UrgentTodoSection
      pillars={pillars}
      onNavigateExpenses={() => onNavigate('/store-owner/expenses')}
      onNavigateCustomers={() => onNavigate('/store-owner/customers')}
    />
    <SummaryPillarsGrid pillars={pillars} isPnlPending={isPnlPending} onNavigate={onNavigate} />
  </>
);

/**
 * Coordinates Zone A & Zone B state, queries, deep-linking, and actions for FinanceOverviewPage.
 */
function useFinanceOverviewController() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [todayLabel] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pnlFilter, setPnlFilter] = useState<PnlFilterParams>(createInitialPnlFilter);

  const { toast, showToast, dismissToast } = useOverviewToast();
  const zoneA = useZoneAQueries(currentYear);
  const { branchesQuery, pnlReportQuery } = usePnlSectionQueries(pnlFilter);
  const refresh = useOverviewRefresh(zoneA, pnlReportQuery, showToast);

  const isLoading = zoneA.cashAccountsQuery.isLoading || zoneA.cashSummaryQuery.isLoading;
  usePnlDeepLinkScroll(!isLoading);

  const cashMetrics = computeCashMetrics(
    zoneA.cashAccountsQuery.data || [],
    zoneA.cashSummaryQuery.data
  );
  const pillars = buildPillarsSummary(
    zoneA,
    pnlReportQuery.data,
    pnlFilter.presetPeriod,
    currentYear
  );

  return {
    todayLabel,
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
    cashMetrics,
    pillars,
    ...refresh,
  };
}

/**
 * Unified Finance Overview Page combining Zone A (real-time cash & daily obligations)
 * and Zone B (period P&L analytics) powered by a single shared React Query source of truth.
 */
export const FinanceOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const ctrl = useFinanceOverviewController();

  return (
    <div className="finance-overview-container">
      <AdminToast toast={ctrl.toast} onClose={ctrl.dismissToast} />
      <main className="finance-overview-main">
        <OverviewHeader
          todayLabel={ctrl.todayLabel}
          isRefreshing={ctrl.isRefreshing}
          canExport={Boolean(ctrl.pnlReportQuery.data)}
          onRefreshAll={ctrl.handleRefreshAll}
          onOpenExportModal={() => ctrl.setIsExportModalOpen(true)}
          onNavigateCashbook={() => navigate('/store-owner/cashbook')}
        />
        <FinanceOverviewZoneA
          isLoading={ctrl.isLoading}
          isError={ctrl.isError}
          isPnlPending={ctrl.isPnlPending}
          cashMetrics={ctrl.cashMetrics}
          pillars={ctrl.pillars}
          onRetry={ctrl.handleRefreshAll}
          onNavigate={navigate}
        />
        <PnlZoneDivider />
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
        />
      </main>
    </div>
  );
};
export default FinanceOverviewPage;
