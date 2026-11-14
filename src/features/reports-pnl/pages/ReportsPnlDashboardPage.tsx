import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AdminToast, type ToastState } from '../../admin/components';
import { formatLocalYmd } from '../components/PnlFilterToolbar';
import { PnlReportSection } from '../components/PnlReportSection';
import { reportsPnlService } from '../services/reportsPnlService';
import type { PnlFilterParams } from '../types/reportsPnl.types';
import '../reports-pnl.css';

const PNL_FETCH_ERROR_MSG = 'Không thể tải dữ liệu báo cáo tài chính. Vui lòng thử lại sau.';

function createDefaultPnlFilter(): PnlFilterParams {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    branchId: 'ALL',
    presetPeriod: 'THIS_MONTH',
    startDate: formatLocalYmd(firstDay),
    endDate: formatLocalYmd(today),
  };
}

function usePnlToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearTimer();
  }, [clearTimer]);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    clearTimer();
    setToast({ id: String(Date.now()), message, type });
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setToast(null);
    }, 3200);
  }, [clearTimer]);

  const clearToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  return { toast, showToast, clearToast };
}

/**
 * Standalone Profit & Loss (P&L) dashboard page wrapper.
 */
export const ReportsPnlDashboardPage: React.FC = () => {
  const [filter, setFilter] = useState<PnlFilterParams>(createDefaultPnlFilter);
  const { toast, showToast, clearToast } = usePnlToast();

  const branchesQuery = useQuery({
    queryKey: ['reports-pnl-branches'],
    queryFn: () => reportsPnlService.getBranches(),
  });

  const reportQuery = useQuery({
    queryKey: [
      'reports-pnl-standalone',
      filter.branchId,
      filter.presetPeriod,
      filter.startDate,
      filter.endDate,
    ],
    queryFn: () => reportsPnlService.getPnlReportData(filter),
    placeholderData: keepPreviousData,
  });

  const handleRefresh = async () => {
    try {
      const result = await reportQuery.refetch();
      if (result.isError) {
        showToast(PNL_FETCH_ERROR_MSG, 'error');
        return;
      }
      showToast('Đã cập nhật số liệu báo cáo tài chính mới nhất!', 'success');
    } catch (err) {
      console.error('Failed to refresh P&L report data:', err);
      showToast(PNL_FETCH_ERROR_MSG, 'error');
    }
  };

  return (
    <div className="pnl-page">
      <AdminToast toast={toast} onClose={clearToast} />
      <PnlReportSection
        filter={filter}
        onFilterChange={setFilter}
        branches={branchesQuery.data ?? []}
        reportData={reportQuery.data ?? null}
        isLoading={reportQuery.isLoading}
        isFetching={reportQuery.isFetching}
        errorMsg={reportQuery.isError ? PNL_FETCH_ERROR_MSG : null}
        onRefresh={handleRefresh}
        onShowToast={showToast}
        embedded={false}
      />
    </div>
  );
};

export default ReportsPnlDashboardPage;
