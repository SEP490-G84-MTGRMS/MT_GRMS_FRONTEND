import { financeHttpClient } from '../../../api/financeHttpClient';
import { toVietnamUtcIso } from '../../reports-pnl/services/reportsPnlService';
import type {
  FinanceOverviewFilter,
  FinanceOverviewResponse,
} from '../types/financeOverview.types';

export const financeOverviewService = {
  async getOverview(filter: FinanceOverviewFilter): Promise<FinanceOverviewResponse> {
    const response = await financeHttpClient.get<{ data: FinanceOverviewResponse }>(
      '/finance/overview',
      {
        params: {
          branchId: filter.branchId === 'ALL' ? undefined : filter.branchId,
          fromDate: toVietnamUtcIso(filter.startDate, false),
          toDate: toVietnamUtcIso(filter.endDate, true),
        },
      }
    );
    return response.data.data;
  },
};
