import { httpClient } from '../../../api/httpClient';

export type DashboardPeriod = 'today' | 'yesterday' | 'last7days' | 'thisMonth';

export interface DashboardBranch { id: string; name: string }
export interface DashboardScope { fromUtc: string; toUtc: string; asOfUtc: string; branchId: string | null; branchName: string }
export interface DashboardTrendPoint { date: string; revenue: number; cogs: number; expenses: number; netProfit: number }
export interface DashboardTopProduct { productId: string; productName: string; quantitySold: number; revenue: number }
export interface DashboardStockItem { productId: string; branchId: string; productName: string; branchName: string; availableQty: number; minStock: number; unit: string }
export interface DashboardExpiryItem { productId: string; branchId: string; productName: string; branchName: string; batchCode: string | null; expiryDate: string; quantityOnHand: number }

export interface StoreOwnerDashboardData {
  scope: DashboardScope;
  branches: DashboardBranch[];
  sales: {
    netRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueGrowthPercent: number | null;
    trend: DashboardTrendPoint[];
    topProducts: DashboardTopProduct[];
  };
  finance: {
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    cogsSource: string;
    cogsWarningNotice: string | null;
  };
  procurement: { pendingApprovalCount: number; awaitingReceiptCount: number; receivedAmountInPeriod: number };
  inventory: {
    lowStockCount: number;
    outOfStockCount: number;
    expiryWarningCount: number;
    lowStockItems: DashboardStockItem[];
    expiringBatches: DashboardExpiryItem[];
  };
  employees: { totalCount: number; activeCount: number };
  tasks?: { title: string; code: string; actionUrl: string }[];
}

export async function getStoreOwnerDashboard(period: DashboardPeriod, branchId: string | null, signal?: AbortSignal): Promise<StoreOwnerDashboardData> {
  const response = await httpClient.get<{ data: StoreOwnerDashboardData }>('/store-owner/dashboard', {
    params: { period, branchId: branchId || undefined },
    signal,
  });
  if (!response.data?.data) throw new Error('Máy chủ chưa trả dữ liệu tổng quan.');
  return response.data.data;
}
