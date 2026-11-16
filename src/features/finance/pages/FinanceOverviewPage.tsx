import React, { useCallback, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminToast, type ToastState } from '../../admin/components';
import {
  formatLocalYmd,
  reportsPnlService,
  type PnlFilterParams,
} from '../../reports-pnl';
import {
  BranchCashHealthPanel,
  FinanceHeader,
  FinanceOverviewFilterBar,
  FinancePnlOverviewPanel,
  type FinanceTabKey,
} from '../components';
import { financeOverviewService } from '../services/financeOverviewService';
import type { FinanceOverviewFilter } from '../types/financeOverview.types';
import { resolvePresetRange } from '../utils/periodRanges';
import '../finance.css';

function getStoredBranchId(): string {
  try {
    const stored = localStorage.getItem('mtgrms_active_branch');
    if (!stored) return 'ALL';
    const branch = JSON.parse(stored);
    return branch?.id || 'ALL';
  } catch {
    return 'ALL';
  }
}

function createInitialOverviewFilter(): FinanceOverviewFilter {
  return {
    branchId: getStoredBranchId(),
    preset: 'THIS_MONTH',
    ...resolvePresetRange('THIS_MONTH'),
  };
}

function createInitialPnlFilter(): PnlFilterParams {
  const today = new Date();
  return {
    branchId: getStoredBranchId(),
    presetPeriod: 'THIS_MONTH',
    startDate: formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: formatLocalYmd(today),
  };
}

function useOverviewToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setToast(null);
  }, []);
  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ id: String(Date.now()), message, type });
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setToast(null);
    }, 3200);
  }, []);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  return { toast, showToast, dismissToast };
}

const OverviewErrorBanner: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="finance-error-banner" role="alert">
    <div className="finance-error-banner-content">
      <AlertCircle size={18} />
      <span>Không thể tải dữ liệu tổng quan tài chính theo phạm vi đã chọn.</span>
    </div>
    <button type="button" onClick={onRetry} className="finance-error-retry-btn">Thử lại</button>
  </div>
);

export const FinanceOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: FinanceTabKey = searchParams.get('tab') === 'pnl' ? 'pnl' : 'overview';
  const [overviewFilter, setOverviewFilter] = useState<FinanceOverviewFilter>(createInitialOverviewFilter);
  const [pnlFilter, setPnlFilter] = useState<PnlFilterParams>(createInitialPnlFilter);
  const { toast, showToast, dismissToast } = useOverviewToast();

  useEffect(() => {
    if (!searchParams.has('tab')) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'overview');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handleBranchChange = (event: Event) => {
      const branchId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!branchId) return;
      setOverviewFilter((previous) => ({ ...previous, branchId }));
      setPnlFilter((previous) => ({ ...previous, branchId }));
    };
    window.addEventListener('mtgrms:branch-changed', handleBranchChange);
    return () => window.removeEventListener('mtgrms:branch-changed', handleBranchChange);
  }, []);

  const branchesQuery = useQuery({
    queryKey: ['finance-overview-branches'],
    queryFn: () => reportsPnlService.getBranches(),
    staleTime: 5 * 60 * 1000,
  });

  const overviewQuery = useQuery({
    queryKey: ['finance-overview-v2', overviewFilter],
    queryFn: () => financeOverviewService.getOverview(overviewFilter),
    enabled: activeTab === 'overview',
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  const pnlReportQuery = useQuery({
    queryKey: ['finance-pnl-report', pnlFilter],
    queryFn: () => reportsPnlService.getPnlReportData(pnlFilter),
    enabled: activeTab === 'pnl',
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const isRefreshing = overviewQuery.isFetching || pnlReportQuery.isFetching;
  const [todayLabel] = useState(() => new Date().toLocaleDateString('vi-VN'));

  const handleRefresh = useCallback(async () => {
    const result = activeTab === 'overview'
      ? await overviewQuery.refetch()
      : await pnlReportQuery.refetch();
    showToast(
      result.isError ? 'Không thể cập nhật dữ liệu. Vui lòng thử lại.' : 'Đã cập nhật dữ liệu tài chính.',
      result.isError ? 'error' : 'success'
    );
  }, [activeTab, overviewQuery, pnlReportQuery, showToast]);

  const handleTabChange = (tab: FinanceTabKey) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('tab', tab);
      return next;
    });
  };

  return (
    <div className="finance-overview-container">
      <AdminToast toast={toast} onClose={dismissToast} />
      <main className="finance-overview-main">
        <FinanceHeader
          todayLabel={todayLabel}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isRefreshing={isRefreshing}
          onRefreshAll={handleRefresh}
          onNavigateCashbook={() => navigate('/store-owner/cashbook')}
          onNavigateCashControl={() => navigate('/store-owner/cash-control?tab=pending')}
        />

        {activeTab === 'overview' && (
          <div role="tabpanel" aria-label="Sức khỏe tiền mặt" className="finance-overview-panel">
            <FinanceOverviewFilterBar value={overviewFilter} branches={branchesQuery.data || []} onChange={setOverviewFilter} />
            {overviewQuery.isError && <OverviewErrorBanner onRetry={handleRefresh} />}
            <BranchCashHealthPanel
              data={overviewQuery.data}
              isLoading={overviewQuery.isLoading}
              isFetching={overviewQuery.isFetching}
              onSelectBranch={(branchId) => setOverviewFilter((previous) => ({ ...previous, branchId }))}
            />
          </div>
        )}

        {activeTab === 'pnl' && (
          <div className="finance-pnl-zone" role="tabpanel" aria-label="Lãi lỗ">
            <FinancePnlOverviewPanel
              filter={pnlFilter}
              onFilterChange={setPnlFilter}
              branches={branchesQuery.data || []}
              reportData={pnlReportQuery.data}
              isLoading={pnlReportQuery.isLoading}
              isFetching={pnlReportQuery.isFetching}
              errorMessage={pnlReportQuery.isError ? 'Không thể tải dữ liệu báo cáo Lãi lỗ.' : null}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default FinanceOverviewPage;
