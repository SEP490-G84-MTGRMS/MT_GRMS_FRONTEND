import React, { useCallback, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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

function getLinkedPnlFilter(startDate: string | null, endDate: string | null, branchId?: string | null): PnlFilterParams | undefined {
  const isCalendarDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!startDate || !endDate || !isCalendarDate(startDate) || !isCalendarDate(endDate) || startDate > endDate)
    return undefined;
  return { branchId: branchId || getStoredBranchId(), startDate, endDate, presetPeriod: 'CUSTOM' };
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

const OverviewErrorBanner: React.FC<{ message?: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="finance-error-banner" role="alert">
    <div className="finance-error-banner-content">
      <AlertCircle size={18} />
      <span>{message || 'Không thể tải dữ liệu tổng quan tài chính theo phạm vi đã chọn.'}</span>
    </div>
    <button type="button" onClick={onRetry} className="finance-error-retry-btn">Thử lại</button>
  </div>
);

export const FinanceOverviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: FinanceTabKey = searchParams.get('tab') === 'pnl' ? 'pnl' : 'overview';
  const linkedStartDate = searchParams.get('startDate');
  const linkedEndDate = searchParams.get('endDate');
  const linkedBranchId = searchParams.get('branchId');
  const [overviewFilter, setOverviewFilter] = useState<FinanceOverviewFilter>(() => {
    const base = createInitialOverviewFilter();
    return linkedBranchId ? { ...base, branchId: linkedBranchId } : base;
  });
  const [pnlFilter, setPnlFilter] = useState<PnlFilterParams>(() => {
    const linked = getLinkedPnlFilter(linkedStartDate, linkedEndDate, linkedBranchId);
    if (linked) return linked;
    const base = createInitialPnlFilter();
    return linkedBranchId ? { ...base, branchId: linkedBranchId } : base;
  });
  const { toast, showToast, dismissToast } = useOverviewToast();

  useEffect(() => {
    const linkedFilter = getLinkedPnlFilter(linkedStartDate, linkedEndDate, linkedBranchId);
    if (linkedFilter) setPnlFilter(linkedFilter);
    else if (linkedBranchId) {
      setOverviewFilter((prev) => ({ ...prev, branchId: linkedBranchId }));
      setPnlFilter((prev) => ({ ...prev, branchId: linkedBranchId }));
    }
  }, [linkedStartDate, linkedEndDate, linkedBranchId]);

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
        />

        {activeTab === 'overview' && (
          <div role="tabpanel" aria-label="Sức khỏe tiền mặt" className="finance-overview-panel">
            <FinanceOverviewFilterBar
              value={overviewFilter}
              branches={branchesQuery.data || []}
              onChange={(next) => {
                setOverviewFilter(next);
                setPnlFilter((prev) => ({ ...prev, branchId: next.branchId, startDate: next.startDate, endDate: next.endDate, presetPeriod: next.preset }));
              }}
            />
            {overviewQuery.isError && (
              <OverviewErrorBanner
                message={(overviewQuery.error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (overviewQuery.error as Error)?.message}
                onRetry={handleRefresh}
              />
            )}
            <BranchCashHealthPanel
              data={overviewQuery.data}
              isLoading={overviewQuery.isLoading}
              isFetching={overviewQuery.isFetching}
              onSelectBranch={(branchId) => {
                setOverviewFilter((previous) => ({ ...previous, branchId }));
                setPnlFilter((previous) => ({ ...previous, branchId }));
              }}
            />
          </div>
        )}

        {activeTab === 'pnl' && (
          <div className="finance-pnl-zone" role="tabpanel" aria-label="Lãi lỗ">
            <FinancePnlOverviewPanel
              filter={pnlFilter}
              onFilterChange={(next) => {
                setPnlFilter(next);
                setOverviewFilter((prev) => ({ ...prev, branchId: next.branchId || 'ALL', startDate: next.startDate, endDate: next.endDate, preset: next.presetPeriod }));
              }}
              branches={branchesQuery.data || []}
              reportData={pnlReportQuery.data}
              isLoading={pnlReportQuery.isLoading}
              isFetching={pnlReportQuery.isFetching}
              errorMessage={
                pnlReportQuery.isError
                  ? ((pnlReportQuery.error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 'Không thể tải dữ liệu báo cáo Lãi lỗ.')
                  : null
              }
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default FinanceOverviewPage;
