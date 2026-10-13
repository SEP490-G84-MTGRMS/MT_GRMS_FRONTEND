import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Layers,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { PnlFilterToolbar } from '../components/PnlFilterToolbar';
import { PnlKpiCardsSection } from '../components/PnlKpiCardsSection';
import { PnlChartsSection } from '../components/PnlChartsSection';
import { PnlStatementTable } from '../components/PnlStatementTable';
import { PnlExportModal } from '../components/PnlExportModal';
import { reportsPnlService } from '../services/reportsPnlService';
import type {
  BranchOption,
  PnlFilterParams,
  PnlReportResponse,
} from '../types/reportsPnl.types';
import '../reports-pnl.css';

type ViewTab = 'ALL' | 'DASHBOARD' | 'STATEMENT';

/**
 * Main Page for FE-10: Dashboard KPIs & Profit & Loss Statement (P&L).
 * Fully aligned with MT-GRMS Design System (Deep Teal #0F766E, KiotViet Pills, Be Vietnam Pro).
 */
export const ReportsPnlDashboardPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [activeTab, setActiveTab] = useState<ViewTab>('ALL');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toast state (AdminToast standard)
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
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      branchId: 'ALL',
      presetPeriod: 'THIS_MONTH',
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
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
    } catch (err: any) {
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

  return (
    <div className="pnl-page">
      {/* Toast Notification Container */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Top Banner Header (MT-GRMS Design System Standard) */}
      <div className="pnl-topbar-wrapper">
        <div className="pnl-topbar-container">
          <div className="pnl-topbar-title-group">
            <div className="pnl-topbar-icon">
              <TrendingUp size={24} />
            </div>
            <div className="pnl-topbar-text">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 uppercase tracking-wider">
                  FE-10 • Báo Cáo Tài Chính
                </span>
                <span className="text-gray-300 text-xs">•</span>
                <span className="text-xs text-teal-700 font-semibold">
                  Thời Gian Thực
                </span>
              </div>
              <h1>Dashboard KPIs & Báo Cáo Lãi / Lỗ (P&L)</h1>
              <p>
                Giám sát doanh số POS, giá vốn FEFO, chi phí vận hành dịch vụ ngoài và lợi nhuận ròng.
              </p>
            </div>
          </div>

          {/* View Mode Segmented Pill Tabs */}
          <div className="pnl-segmented-tabs self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`pnl-segmented-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            >
              <Layers size={14} />
              Toàn cảnh All-in-one
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DASHBOARD')}
              className={`pnl-segmented-tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
            >
              <BarChart3 size={14} />
              KPIs & Biểu đồ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('STATEMENT')}
              className={`pnl-segmented-tab-btn ${activeTab === 'STATEMENT' ? 'active' : ''}`}
            >
              <FileSpreadsheet size={14} />
              Bảng P&L Chi Tiết
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pnl-content-container">
        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs font-semibold shadow-xs">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
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

        {/* Section 2: Charts & Top Products with TablePagination */}
        {(activeTab === 'ALL' || activeTab === 'DASHBOARD') && (
          <PnlChartsSection
            trendData={reportData?.trendData || []}
            expenseBreakdown={reportData?.expenseBreakdown || []}
            topProducts={reportData?.topProducts || []}
            isLoading={isLoading}
          />
        )}

        {/* Section 3: P&L Statement Tree Table */}
        {(activeTab === 'ALL' || activeTab === 'STATEMENT') && (
          <div className="mt-4">
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
