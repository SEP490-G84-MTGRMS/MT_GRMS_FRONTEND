import React, { useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Layers,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ToastState } from '../../admin/components';
import { PnlFilterToolbar } from './PnlFilterToolbar';
import { PnlKpiCardsSection } from './PnlKpiCardsSection';
import { PnlChartsSection } from './PnlChartsSection';
import { PnlStatementTable } from './PnlStatementTable';
import { PnlExportModal } from './PnlExportModal';
import { WaterfallChart, type WaterfallItem } from '../../../components/common/WaterfallChart';
import { formatMoney } from '../../finance/utils/formatters';
import type {
  BranchOption,
  KpiSummaryData,
  PnlFilterParams,
  PnlReportResponse,
} from '../types/reportsPnl.types';
import '../reports-pnl.css';

type ViewTab = 'ALL' | 'DASHBOARD' | 'STATEMENT';
type AccountingBasis = 'CASH' | 'ACCRUAL';

/**
 * Props for the reusable Profit & Loss (P&L) report section.
 */
export interface PnlReportSectionProps {
  filter: PnlFilterParams;
  onFilterChange: (newFilter: PnlFilterParams) => void;
  branches: BranchOption[];
  reportData?: PnlReportResponse | null;
  isLoading: boolean;
  isFetching?: boolean;
  errorMsg?: string | null;
  onRefresh: () => void;
  isExportModalOpen?: boolean;
  onOpenExportModal?: () => void;
  onCloseExportModal?: () => void;
  onShowToast?: (message: string, type?: ToastState['type']) => void;
  hideRefreshButton?: boolean;
  embedded?: boolean;
  accountingMode?: boolean;
}

interface PnlReportBodyProps {
  filter: PnlFilterParams;
  onFilterChange: (newFilter: PnlFilterParams) => void;
  branches: BranchOption[];
  reportData?: PnlReportResponse | null;
  isLoading: boolean;
  isFetching?: boolean;
  errorMsg?: string | null;
  onRefresh: () => void;
  hideRefreshButton?: boolean;
  activeTab: ViewTab;
  accountingBasis: AccountingBasis;
  accountingMode?: boolean;
  showAccountingDetails: boolean;
  onToggleAccountingDetails: () => void;
  onOpenExportModal: () => void;
  onShowToast?: (message: string, type?: ToastState['type']) => void;
}

/**
 * Builds waterfall chart items from P&L KPI summary figures.
 */
export function buildWaterfallItems(
  kpi: KpiSummaryData | undefined,
  grossMarginDisplay: number
): WaterfallItem[] {
  const netRev = kpi?.netRevenue ?? 0;
  const cogsVal = kpi?.cogs ?? 0;
  const grossProfitVal = kpi?.grossProfit ?? 0;
  const opexTotal = (kpi?.operatingExpenses ?? 0) + (kpi?.shrinkageLoss ?? 0);
  const taxVal = kpi?.estimatedTaxAmount ?? 0;
  const netProfitVal = kpi?.netProfitAfterTax ?? 0;
  const taxPct = netRev > 0 ? Math.round((taxVal / netRev) * 1000) / 10 : 1.5;

  return [
    {
      id: 'rev', label: 'Doanh thu thuần POS', amount: netRev,
      type: 'positive', subLabel: 'Doanh số thực thu sau chiết khấu & trả hàng',
    },
    {
      id: 'cogs', label: 'Giá vốn hàng bán (COGS)', amount: -cogsVal,
      type: 'negative', subLabel: 'Giá vốn xuất kho đối soát S2c-HKD',
    },
    {
      id: 'gross', label: 'Lợi nhuận gộp', amount: grossProfitVal,
      type: 'subtotal', subLabel: `Biên lãi gộp: ${grossMarginDisplay}%`,
    },
    {
      id: 'opex', label: 'Chi phí mặt bằng & vận hành', amount: -opexTotal,
      type: 'negative', subLabel: 'Điện nước, thuê cửa hàng, nhân sự & xóa nợ xấu',
    },
    {
      id: 'tax',
      label: `Nghĩa vụ thuế HKD (${taxPct}%)`,
      amount: -taxVal,
      type: 'negative',
      subLabel: taxPct === 1.5
        ? 'GTGT 1.0% + TNCN 0.5% theo TT 152/2025/TT-BTC'
        : `GTGT + TNCN (thuế suất hiệu dụng ${taxPct}%)`,
    },
    {
      id: 'net', label: 'LỢI NHUẬN RÒNG THỰC NHẬN', amount: netProfitVal,
      type: 'total', subLabel: 'Số tiền thực tế tích lũy về két sắt của cửa hàng',
    },
  ];
}

function computePnlSummaryMetrics(kpi?: KpiSummaryData) {
  const netRevenue = kpi?.netRevenue ?? 0;
  const grossProfit = kpi?.grossProfit ?? 0;
  const netProfitAfterTax = kpi?.netProfitAfterTax ?? 0;
  const taxAmount = kpi?.estimatedTaxAmount ?? 0;
  const profitPerHundred = netRevenue > 0 ? Math.round((netProfitAfterTax / netRevenue) * 100) : 0;
  const grossMarginDisplay = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100) : 0;

  return {
    netRevenue,
    netProfitAfterTax,
    taxAmount,
    profitPerHundred,
    grossMarginDisplay,
  };
}

function useControlledExportModal(
  isExportModalOpen?: boolean,
  onOpenExportModal?: () => void,
  onCloseExportModal?: () => void
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = isExportModalOpen !== undefined;
  const isOpen = isControlled ? isExportModalOpen : internalOpen;

  const openModal = () => {
    onOpenExportModal?.();
    if (!isControlled) {
      setInternalOpen(true);
    }
  };

  const closeModal = () => {
    onCloseExportModal?.();
    if (!isControlled) {
      setInternalOpen(false);
    }
  };

  return { isOpen, openModal, closeModal };
}

const AccountingBasisSwitcher: React.FC<{
  basis: AccountingBasis;
  onChange: (basis: AccountingBasis) => void;
}> = ({ basis, onChange }) => (
  <div className="pnl-basis-switcher" role="group" aria-label="Cơ sở hạch toán">
    <button
      type="button"
      aria-pressed={basis === 'CASH'}
      onClick={() => onChange('CASH')}
      className={`pnl-basis-btn ${basis === 'CASH' ? 'active' : ''}`}
    >
      Tiền thực thu thực chi
    </button>
    <button
      type="button"
      aria-pressed={basis === 'ACCRUAL'}
      onClick={() => onChange('ACCRUAL')}
      className={`pnl-basis-btn ${basis === 'ACCRUAL' ? 'active' : ''}`}
    >
      Sổ kế toán dồn tích
    </button>
  </div>
);

const PnlViewModeTabs: React.FC<{
  activeTab: ViewTab;
  onChange: (tab: ViewTab) => void;
}> = ({ activeTab, onChange }) => (
  <div className="pnl-segmented-tabs" role="tablist" aria-label="Chế độ xem P&L">
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'ALL'}
      onClick={() => onChange('ALL')}
      className={`pnl-segmented-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
    >
      <Layers size={14} />
      Toàn cảnh
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'DASHBOARD'}
      onClick={() => onChange('DASHBOARD')}
      className={`pnl-segmented-tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
    >
      <BarChart3 size={14} />
      Biểu đồ
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'STATEMENT'}
      onClick={() => onChange('STATEMENT')}
      className={`pnl-segmented-tab-btn ${activeTab === 'STATEMENT' ? 'active' : ''}`}
    >
      <FileSpreadsheet size={14} />
      Bảng Lãi lỗ
    </button>
  </div>
);

const PnlSectionHeader: React.FC<{
  embedded: boolean;
  accountingBasis: AccountingBasis;
  onBasisChange: (basis: AccountingBasis) => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}> = ({ embedded, accountingBasis, onBasisChange, activeTab, onTabChange }) => (
  <div className="pnl-topbar-wrapper pnl-section-header-card">
    <div className="pnl-topbar-container">
      <div className="pnl-topbar-title-group">
        <div
          className="pnl-topbar-icon"
          style={{ background: 'var(--brand-50, #F0FDFA)', color: 'var(--brand-700, #115E59)' }}
        >
          <TrendingUp size={24} />
        </div>
        <div className="pnl-topbar-text">
          {embedded ? (
            <h2 id="pnl-section-title">Báo cáo Lãi lỗ (P&amp;L)</h2>
          ) : (
            <h1 id="pnl-section-title">Báo cáo Lãi lỗ (P&amp;L)</h1>
          )}
          <p>Doanh thu, giá vốn, chi phí vận hành và lợi nhuận thực tế theo kỳ</p>
        </div>
      </div>

      <div className="pnl-header-controls">
        <AccountingBasisSwitcher basis={accountingBasis} onChange={onBasisChange} />
        <PnlViewModeTabs activeTab={activeTab} onChange={onTabChange} />
      </div>
    </div>
    <p className="pnl-basis-disclaimer">
      Chế độ hiển thị góc nhìn diễn giải (số liệu tổng hợp chung từ đơn bán POS &amp; chứng từ đã duyệt)
    </p>
  </div>
);

const PnlErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="pnl-error-banner" role="alert">
    <AlertCircle size={18} style={{ flexShrink: 0 }} />
    <span>{message}</span>
  </div>
);

const PnlStoryBanner: React.FC<{
  startDate: string;
  endDate: string;
  profitPerHundred: number;
  netRevenue: number;
  netProfitAfterTax: number;
  showAccountingDetails: boolean;
  onToggleAccountingDetails: () => void;
}> = ({
  startDate,
  endDate,
  profitPerHundred,
  netRevenue,
  netProfitAfterTax,
  showAccountingDetails,
  onToggleAccountingDetails,
}) => (
  <div className="pnl-story-banner">
    <div className="pnl-story-left">
      <div className="pnl-story-icon" aria-hidden="true">
        💡
      </div>
      <div>
        <div className="pnl-story-title">
          Hiệu quả kinh doanh kỳ {startDate} → {endDate}: Cứ 100đ bán ra, tiệm lãi được {profitPerHundred}đ
        </div>
        <div className="pnl-story-subtitle">
          Doanh thu thuần: <strong>{formatMoney(netRevenue)}</strong> | Lãi ròng thực nhận về két:{' '}
          <strong style={{ color: '#15803D' }}>{formatMoney(netProfitAfterTax)}</strong>
        </div>
      </div>
    </div>

    <button
      type="button"
      onClick={onToggleAccountingDetails}
      className="pnl-story-toggle-btn"
    >
      <span>{showAccountingDetails ? 'Thu gọn bút toán kế toán' : 'Dành cho kế toán'}</span>
      {showAccountingDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  </div>
);

const PnlDashboardContent: React.FC<{
  reportData: PnlReportResponse | null | undefined;
  isLoading: boolean;
  accountingBasis: AccountingBasis;
  presetPeriod: string;
  waterfallItems: WaterfallItem[];
}> = ({ reportData, isLoading, accountingBasis, presetPeriod, waterfallItems }) => (
  <>
    <PnlKpiCardsSection kpi={reportData?.kpiSummary} isLoading={isLoading} />
    <div className="pnl-waterfall-wrapper">
      <WaterfallChart
        items={waterfallItems}
        title={`Bậc thang Lợi nhuận P&L (${accountingBasis === 'CASH' ? 'Thực thu thực chi' : 'Kế toán dồn tích'})`}
        periodLabel={presetPeriod || 'Tháng này'}
      />
    </div>
    <PnlChartsSection
      trendData={reportData?.trendData || []}
      expenseBreakdown={reportData?.expenseBreakdown || []}
      topProducts={reportData?.topProducts || []}
      isLoading={isLoading}
    />
  </>
);

const PnlStatementContent: React.FC<{
  reportData: PnlReportResponse | null | undefined;
  isLoading: boolean;
  taxAmount: number;
  accountingBasis: AccountingBasis;
  accountingMode?: boolean;
}> = ({ reportData, isLoading, taxAmount, accountingBasis, accountingMode }) => (
  <div className="pnl-statement-section">
    <div className="pnl-statement-header">
      <h3>Bảng phân tích Lãi lỗ chi tiết (Dành cho kế toán)</h3>
      <span>Cơ sở hạch toán: {accountingBasis === 'CASH' ? 'Tiền thực tế' : 'Dồn tích'}</span>
    </div>
    <PnlStatementTable
      pnlTree={reportData?.pnlTree || []}
      isLoading={isLoading}
      estimatedTaxAmount={taxAmount}
      cogsComparison={reportData?.kpiSummary?.cogsComparison}
      accountingMode={accountingMode || accountingBasis === 'ACCRUAL'}
    />
  </div>
);

const PnlReportBody: React.FC<PnlReportBodyProps> = ({
  filter, onFilterChange, branches, reportData, isLoading, isFetching = false,
  errorMsg, onRefresh, hideRefreshButton = false, activeTab, accountingBasis,
  accountingMode, showAccountingDetails, onToggleAccountingDetails, onOpenExportModal,
  onShowToast,
}) => {
  const metrics = computePnlSummaryMetrics(reportData?.kpiSummary);
  const waterfallItems = buildWaterfallItems(reportData?.kpiSummary, metrics.grossMarginDisplay);
  const showCharts = activeTab === 'ALL' || activeTab === 'DASHBOARD';
  const showStatement = activeTab === 'STATEMENT' || (activeTab === 'ALL' && showAccountingDetails);

  return (
    <div className="pnl-content-container">
      <PnlFilterToolbar
        branches={branches} filter={filter} isLoading={isLoading || Boolean(isFetching)}
        onFilterChange={onFilterChange} onOpenExportModal={onOpenExportModal}
        onRefresh={onRefresh} hideRefresh={hideRefreshButton}
        onShowToast={onShowToast}
      />
      {errorMsg && <PnlErrorBanner message={errorMsg} />}
      <PnlStoryBanner
        startDate={filter.startDate} endDate={filter.endDate}
        profitPerHundred={metrics.profitPerHundred} netRevenue={metrics.netRevenue}
        netProfitAfterTax={metrics.netProfitAfterTax}
        showAccountingDetails={showAccountingDetails}
        onToggleAccountingDetails={onToggleAccountingDetails}
      />
      {showCharts && (
        <PnlDashboardContent
          reportData={reportData} isLoading={isLoading} accountingBasis={accountingBasis}
          presetPeriod={filter.presetPeriod} waterfallItems={waterfallItems}
        />
      )}
      {showStatement && (
        <PnlStatementContent
          reportData={reportData} isLoading={isLoading}
          taxAmount={metrics.taxAmount} accountingBasis={accountingBasis}
          accountingMode={accountingMode}
        />
      )}
    </div>
  );
};

/**
 * Reusable P&L report section supporting standalone and embedded overview modes.
 */
export const PnlReportSection: React.FC<PnlReportSectionProps> = (props) => {
  const { filter, branches, reportData, onShowToast, embedded = false, accountingMode = false } = props;
  const [activeTab, setActiveTab] = useState<ViewTab>('ALL');
  const [accountingBasis, setAccountingBasis] = useState<AccountingBasis>(() => (accountingMode ? 'ACCRUAL' : 'CASH'));
  const [showAccountingDetails, setShowAccountingDetails] = useState(false);
  const exportModal = useControlledExportModal(
    props.isExportModalOpen,
    props.onOpenExportModal,
    props.onCloseExportModal
  );

  return (
    <section
      id="pnl-section"
      aria-labelledby="pnl-section-title"
      className={embedded ? 'pnl-embedded-section' : 'pnl-standalone-section'}
      style={{ scrollMarginTop: '24px' }}
    >
      <PnlSectionHeader
        embedded={embedded} accountingBasis={accountingBasis}
        onBasisChange={setAccountingBasis} activeTab={activeTab} onTabChange={setActiveTab}
      />
      <PnlReportBody
        filter={filter} onFilterChange={props.onFilterChange} branches={branches}
        reportData={reportData} isLoading={props.isLoading} isFetching={props.isFetching}
        errorMsg={props.errorMsg} onRefresh={props.onRefresh}
        hideRefreshButton={props.hideRefreshButton} activeTab={activeTab}
        accountingBasis={accountingBasis} accountingMode={accountingMode} showAccountingDetails={showAccountingDetails}
        onToggleAccountingDetails={() => setShowAccountingDetails((prev) => !prev)}
        onOpenExportModal={exportModal.openModal}
        onShowToast={onShowToast}
      />
      {reportData && (
        <PnlExportModal
          isOpen={exportModal.isOpen} onClose={exportModal.closeModal} filter={filter}
          branches={branches} kpi={reportData.kpiSummary} pnlTree={reportData.pnlTree}
          onShowToast={onShowToast}
        />
      )}
    </section>
  );
};
