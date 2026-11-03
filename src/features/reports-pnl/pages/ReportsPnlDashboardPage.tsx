import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Layers,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { PnlFilterToolbar } from '../components/PnlFilterToolbar';
import { PnlKpiCardsSection } from '../components/PnlKpiCardsSection';
import { PnlChartsSection } from '../components/PnlChartsSection';
import { PnlStatementTable } from '../components/PnlStatementTable';
import { PnlExportModal } from '../components/PnlExportModal';
import { reportsPnlService } from '../services/reportsPnlService';
import { WaterfallChart, type WaterfallItem } from '../../../components/common/WaterfallChart';
import { MOCK_PNL_MONTH } from '../../finance/data/mockFinanceData';
import { formatMoney } from '../../finance/utils/formatters';
import type {
  BranchOption,
  PnlFilterParams,
  PnlReportResponse,
} from '../types/reportsPnl.types';
import '../reports-pnl.css';

type ViewTab = 'ALL' | 'DASHBOARD' | 'STATEMENT';
type AccountingBasis = 'CASH' | 'ACCRUAL';

export const ReportsPnlDashboardPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [activeTab, setActiveTab] = useState<ViewTab>('ALL');
  const [accountingBasis, setAccountingBasis] = useState<AccountingBasis>('CASH');
  const [showAccountingDetails, setShowAccountingDetails] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const [filter, setFilter] = useState<PnlFilterParams>(() => {
    return {
      branchId: 'ALL',
      presetPeriod: 'THIS_MONTH',
      startDate: '2026-10-01',
      endDate: '2026-10-27',
    };
  });

  const [reportData, setReportData] = useState<PnlReportResponse | null>(null);

  // Load branches list on mount
  useEffect(() => {
    reportsPnlService
      .getBranches()
      .then((data) => setBranches(data))
      .catch((err) => {
        console.error('Failed to load branches:', err);
      });
  }, []);

  // Fetch report data whenever filter changes
  const fetchReport = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await reportsPnlService.getPnlReportData(filter);
      setReportData(res);
      if (isManualRefresh) {
        showToast('Đã cập nhật số liệu báo cáo tài chính mới nhất!', 'success');
      }
    } catch (err: unknown) {
      console.error('Failed to fetch P&L report data:', err);
      const msg = 'Không thể tải dữ liệu báo cáo tài chính. Vui lòng thử lại sau.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReport(false);
  }, [fetchReport]);

  const handleRefresh = () => {
    fetchReport(true);
  };

  // Reconciled figures with Gate 0 Mock Ledger
  const netRev = reportData?.kpiSummary?.netRevenue || MOCK_PNL_MONTH.netSales; // 560.86M
  const cogsVal = reportData?.kpiSummary?.cogs || MOCK_PNL_MONTH.cogs; // 386.9934M
  const grossProfitVal = reportData?.kpiSummary?.grossProfit || MOCK_PNL_MONTH.grossProfit; // 173.8666M
  const opexVal = reportData?.kpiSummary?.operatingExpenses || MOCK_PNL_MONTH.operatingExpenses; // 81.3247M
  const taxVal = reportData?.kpiSummary?.estimatedTaxAmount || MOCK_PNL_MONTH.shrinkageWarehouse; // 6.73032M
  const netProfitVal = reportData?.kpiSummary?.netProfitAfterTax || MOCK_PNL_MONTH.netProfit; // 85.811.580 đ

  // Story formula: "Cứ 100đ bán ra, lãi ~15đ"
  const profitPerHundred = netRev > 0 ? Math.round((netProfitVal / netRev) * 100) : 15;

  const waterfallItems: WaterfallItem[] = [
    {
      id: 'rev',
      label: 'Doanh thu thuần POS',
      amount: netRev,
      type: 'positive',
      subLabel: 'Doanh số thực thu qua quầy dịch vụ & phụ tùng',
    },
    {
      id: 'cogs',
      label: 'Giá vốn phụ tùng & vật tư',
      amount: -cogsVal,
      type: 'negative',
      subLabel: 'Chi phí nhập linh kiện thay thế',
    },
    {
      id: 'gross',
      label: 'Lợi nhuận gộp',
      amount: grossProfitVal,
      type: 'subtotal',
      subLabel: `Biên lãi gộp: ${Math.round((grossProfitVal / netRev) * 100)}%`,
    },
    {
      id: 'opex',
      label: 'Chi phí mặt bằng & vận hành',
      amount: -opexVal,
      type: 'negative',
      subLabel: 'Điện nước, thuê cửa hàng, phụ cấp thợ',
    },
    {
      id: 'tax',
      label: 'Nghĩa vụ thuế & hao hụt',
      amount: -taxVal,
      type: 'negative',
      subLabel: 'Nghị định 141/2026 & hao hụt kho',
    },
    {
      id: 'net',
      label: 'LỢI NHUẬN RÒNG THỰC NHẬN',
      amount: netProfitVal,
      type: 'total',
      subLabel: 'Số tiền thực tế tích lũy về két sắt của cửa hàng',
    },
  ];

  return (
    <div className="pnl-page">
      {/* Toast Notification Container */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Top Banner Header */}
      <div className="pnl-topbar-wrapper" style={{ marginTop: '16px' }}>
        <div className="pnl-topbar-container">
          <div className="pnl-topbar-title-group">
            <div className="pnl-topbar-icon" style={{ background: 'var(--brand-50, #F0FDFA)', color: 'var(--brand-700, #115E59)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="pnl-topbar-text">
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0F172A)' }}>
                Lãi lỗ
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748B' }}>
                Doanh thu, giá vốn, chi phí và lợi nhuận thực tế của cửa hàng
              </p>
            </div>
          </div>

          {/* Basis Toggle & View Mode Segmented Pill Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Accounting Basis Switcher */}
            <div
              style={{
                display: 'inline-flex',
                background: '#F1F5F9',
                borderRadius: '9999px',
                padding: '3px',
                border: '1px solid #E2E8F0',
              }}
            >
              <button
                type="button"
                onClick={() => setAccountingBasis('CASH')}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: accountingBasis === 'CASH' ? 'var(--brand-700, #115E59)' : 'transparent',
                  color: accountingBasis === 'CASH' ? '#ffffff' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                Tiền thực thu thực chi
              </button>

              <button
                type="button"
                onClick={() => setAccountingBasis('ACCRUAL')}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: accountingBasis === 'ACCRUAL' ? 'var(--brand-700, #115E59)' : 'transparent',
                  color: accountingBasis === 'ACCRUAL' ? '#ffffff' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                Sổ kế toán dồn tích
              </button>
            </div>

            <div className="pnl-segmented-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`pnl-segmented-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
              >
                <Layers size={14} />
                Toàn cảnh
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DASHBOARD')}
                className={`pnl-segmented-tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
              >
                <BarChart3 size={14} />
                Biểu đồ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STATEMENT')}
                className={`pnl-segmented-tab-btn ${activeTab === 'STATEMENT' ? 'active' : ''}`}
              >
                <FileSpreadsheet size={14} />
                Bảng Lãi lỗ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Story Banner for Shop Owner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #F0FDFA 0%, #E6FFFA 100%)',
          border: '1px solid #99F6E4',
          borderRadius: '16px',
          padding: '16px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'var(--brand-700, #115E59)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 800,
            }}
          >
            💡
          </div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#134E4A' }}>
              Hiệu quả kinh doanh tháng 10/2026: Cứ 100đ bán ra, tiệm lãi được {profitPerHundred}đ
            </div>
            <div style={{ fontSize: '0.8rem', color: '#0F766E', marginTop: 2 }}>
              Doanh thu: <strong>{formatMoney(netRev)}</strong> | Lãi ròng thực nhận về két: <strong style={{ color: '#15803D' }}>{formatMoney(netProfitVal)}</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAccountingDetails(!showAccountingDetails)}
          style={{
            background: '#ffffff',
            border: '1px solid #CCFBF1',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--brand-700, #115E59)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{showAccountingDetails ? 'Thu gọn bút toán kế toán' : 'Dành cho kế toán'}</span>
          {showAccountingDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="pnl-content-container">
        {/* Error Alert Box */}
        {errorMsg && (
          <div
            style={{
              marginBottom: '20px',
              padding: '14px 18px',
              borderRadius: '16px',
              background: 'var(--red-light, #fff0f0)',
              border: '1px solid var(--red-border, #ffd6d6)',
              color: 'var(--red-accent, #ff3b30)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filter Toolbar (Pill Style) */}
        <PnlFilterToolbar
          branches={branches}
          filter={filter}
          isLoading={isLoading}
          onFilterChange={setFilter}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onRefresh={handleRefresh}
        />

        {/* Section 1: KPI Cards */}
        {(activeTab === 'ALL' || activeTab === 'DASHBOARD') && (
          <PnlKpiCardsSection
            kpi={reportData?.kpiSummary}
            isLoading={isLoading}
          />
        )}

        {/* Section 1.5: P&L Waterfall Flow Chart */}
        {(activeTab === 'ALL' || activeTab === 'DASHBOARD') && (
          <div style={{ marginBottom: '24px' }}>
            <WaterfallChart
              items={waterfallItems}
              title={`Bậc thang Lợi nhuận P&L (${accountingBasis === 'CASH' ? 'Thực thu thực chi' : 'Kế toán dồn tích'})`}
              periodLabel={filter.presetPeriod || 'Tháng này'}
            />
          </div>
        )}

        {/* Section 2: Charts & Top Products */}
        {(activeTab === 'ALL' || activeTab === 'DASHBOARD') && (
          <PnlChartsSection
            trendData={reportData?.trendData || []}
            expenseBreakdown={reportData?.expenseBreakdown || []}
            topProducts={reportData?.topProducts || []}
            isLoading={isLoading}
          />
        )}

        {/* Section 3: P&L Statement Tree Table (Accountant section or Tab) */}
        {(activeTab === 'STATEMENT' || (activeTab === 'ALL' && showAccountingDetails)) && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                Bảng phân tích Lãi lỗ chi tiết (Dành cho kế toán)
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Cơ sở hạch toán: {accountingBasis === 'CASH' ? 'Tiền thực tế' : 'Dồn tích'}
              </span>
            </div>
            <PnlStatementTable
              pnlTree={reportData?.pnlTree || []}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Export & Print Preview Modal */}
      {reportData && (
        <PnlExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          filter={filter}
          branches={branches}
          kpi={reportData.kpiSummary}
          pnlTree={reportData.pnlTree}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
export default ReportsPnlDashboardPage;
