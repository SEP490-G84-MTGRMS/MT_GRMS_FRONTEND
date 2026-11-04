export type TimeFilter = 'today' | 'yesterday' | 'week' | 'month';

export interface StoreKpiItem {
  id: string;
  title: string;
  value: string;
  subValue?: string;
  changePercent?: number; // e.g. +12.5 or -3.2
  trendText?: string;
  isPositive?: boolean;
  type: 'currency' | 'number' | 'split';
  splitDetails?: {
    cash: string;
    vietqr: string;
  };
}

export interface RevenueDataPoint {
  timeLabel: string;
  revenue: number;
  orderCount: number;
}

export type FefoRiskLevel = 'critical' | 'warning' | 'safe';

export interface FefoBatchItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  batchCode: string;
  expiryDate: string; // YYYY-MM-DD
  daysRemaining: number;
  stockQty: number;
  unit: string;
  riskLevel: FefoRiskLevel;
  discountSuggested?: number; // e.g. 20%
}

export interface LowStockItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  minStockThreshold: number;
  unit: string;
  supplierName: string;
}

export interface TopProductItem {
  id: string;
  rank: number;
  productName: string;
  category: string;
  soldQty: number;
  unit: string;
  totalRevenue: number;
  revenueSharePercent: number;
}
