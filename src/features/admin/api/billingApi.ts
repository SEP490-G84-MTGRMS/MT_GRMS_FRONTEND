import { httpClient } from '../../../api/httpClient';
import type {
  BillingTransaction,
  BillingKpiSummary,
  BillingFilterParams,
} from '../types/billing.types';
import {
  mockBillingTransactions,
} from '../data/mockBillingData';

// In-memory store for session changes
let inMemoryTransactions: BillingTransaction[] = [...mockBillingTransactions];

export const billingApi = {
  /**
   * Lấy danh sách giao dịch & hóa đơn SaaS có bộ lọc
   */
  async getTransactions(
    filter?: BillingFilterParams
  ): Promise<{ success: boolean; data: BillingTransaction[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filter?.keyword) params.append('keyword', filter.keyword);
      if (filter?.type && filter.type !== 'ALL') params.append('type', filter.type);
      if (filter?.status && filter.status !== 'ALL') params.append('status', filter.status);

      const res = await httpClient.get<{
        success: boolean;
        data: { items: BillingTransaction[]; total: number } | BillingTransaction[];
      }>(`/api/admin/billing/transactions?${params.toString()}`);

      if (res.data && res.data.success) {
        const items = Array.isArray(res.data.data)
          ? res.data.data
          : (res.data.data as { items: BillingTransaction[] }).items;
        return {
          success: true,
          data: items,
          total: Array.isArray(res.data.data) ? items.length : (res.data.data as { total: number }).total,
        };
      }
    } catch {
      // Graceful fallback to mock data
    }

    // Apply client-side filters on inMemoryTransactions
    let result = [...inMemoryTransactions];

    if (filter?.keyword) {
      const q = filter.keyword.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.transactionCode.toLowerCase().includes(q) ||
          t.invoiceCode.toLowerCase().includes(q) ||
          t.tenantName.toLowerCase().includes(q) ||
          t.tenantSubdomain.toLowerCase().includes(q) ||
          t.ownerName.toLowerCase().includes(q) ||
          (t.referenceCode && t.referenceCode.toLowerCase().includes(q))
      );
    }

    if (filter?.type && filter.type !== 'ALL') {
      result = result.filter((t) => t.type === filter.type);
    }

    if (filter?.status && filter.status !== 'ALL') {
      result = result.filter((t) => t.status === filter.status);
    }

    if (filter?.dateRange && filter.dateRange !== 'all') {
      const now = new Date();
      if (filter.dateRange === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        result = result.filter((t) => t.createdAt.startsWith(todayStr));
      } else if (filter.dateRange === '7days') {
        const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter((t) => new Date(t.createdAt) >= past7Days);
      } else if (filter.dateRange === 'month') {
        const monthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
        result = result.filter((t) => t.createdAt.startsWith(monthPrefix));
      }
    }

    return {
      success: true,
      data: result,
      total: result.length,
    };
  },

  /**
   * Lấy số liệu KPI doanh thu và đối soát
   */
  async getBillingKpis(): Promise<{ success: boolean; data: BillingKpiSummary }> {
    try {
      const res = await httpClient.get<{ success: boolean; data: BillingKpiSummary }>(
        '/api/admin/billing/kpi'
      );
      if (res.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    // Tính toán động từ inMemoryTransactions
    const successfulTx = inMemoryTransactions.filter((t) => t.status === 'SUCCESS');
    const pendingTx = inMemoryTransactions.filter((t) => t.status === 'PENDING');
    const totalRev = successfulTx.reduce((sum, t) => sum + (t.type === 'REFUND' ? -t.totalAmount : t.totalAmount), 0);
    const pendingAmt = pendingTx.reduce((sum, t) => sum + t.totalAmount, 0);

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const thisMonthRev = successfulTx
      .filter((t) => t.createdAt.startsWith(currentMonth))
      .reduce((sum, t) => sum + (t.type === 'REFUND' ? -t.totalAmount : t.totalAmount), 0);

    return {
      success: true,
      data: {
        totalRevenue: totalRev,
        revenueThisMonth: thisMonthRev,
        totalTransactions: inMemoryTransactions.length,
        successRate: inMemoryTransactions.length > 0
          ? Math.round((successfulTx.length / inMemoryTransactions.length) * 1000) / 10
          : 100,
        pendingCount: pendingTx.length,
        pendingAmount: pendingAmt,
      },
    };
  },

  /**
   * Duyệt đối soát thủ công cho giao dịch PENDING
   */
  async reconcileTransaction(
    id: string,
    note?: string
  ): Promise<{ success: boolean; message: string; data?: BillingTransaction }> {
    try {
      const res = await httpClient.post<{
        success: boolean;
        message: string;
        data?: BillingTransaction;
      }>(`/api/admin/billing/reconcile/${id}`, { note });
      if (res.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback in-memory
    }

    const txIndex = inMemoryTransactions.findIndex((t) => t.id === id);
    if (txIndex === -1) {
      return { success: false, message: 'Không tìm thấy giao dịch yêu cầu.' };
    }

    const updated: BillingTransaction = {
      ...inMemoryTransactions[txIndex],
      status: 'SUCCESS',
      completedAt: new Date().toISOString(),
      note: note ? `${inMemoryTransactions[txIndex].note || ''} | [Duyệt đối soát]: ${note}` : 'Đã duyệt đối soát khớp tiền thủ công từ Admin Portal.',
      reconciledBy: 'Super Admin',
      reconciledAt: new Date().toISOString(),
    };

    inMemoryTransactions[txIndex] = updated;

    return {
      success: true,
      message: `Đã duyệt đối soát thành công cho giao dịch ${updated.transactionCode}.`,
      data: updated,
    };
  },

  /**
   * Reset mock data về mặc định nếu cần
   */
  resetMockData() {
    inMemoryTransactions = [...mockBillingTransactions];
  },
};
