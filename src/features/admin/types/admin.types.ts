/**
 * MT-GRMS - SaaS Master Admin Types & Contracts
 * Định nghĩa cấu trúc dữ liệu cho Master Dashboard & Quản lý Khách hàng thuê
 */

export type PlanType = 'basic' | 'advanced' | 'enterprise';

export type TenantStatus = 'active' | 'expiring' | 'grace' | 'pending' | 'locked';

export type LockType = 'soft' | 'hard';

export interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  taxCode: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: PlanType;
  branchCount: number;
  maxBranches: number | 'unlimited';
  staffCount: number;
  maxStaff: number | 'unlimited';
  expiryDate: string;
  status: TenantStatus;
  lockType?: LockType;
  graceDaysRemaining?: number;
  daysUntilExpiry?: number;
}

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  unit?: string;
  subText: string;
  trendText?: string;
  trendType?: 'up' | 'down' | 'neutral';
  icon: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

export interface CronJob {
  id: string;
  code: string;
  name: string;
  schedule: string;
  statusText: string;
  isHealthy: boolean;
}

export interface PlanDistribution {
  id: string;
  planName: string;
  subtitle: string;
  tenantCount: number;
  percentage: number;
  revenueText: string;
  color: string;
}

export interface UrgentAlertTenant {
  subdomain: string;
  name: string;
  ownerName: string;
  hotline: string;
  planText: string;
  expiryNotice: string;
  statusText: string;
  statusType: 'expiring' | 'grace' | 'locked';
}

export interface RevenueBreakdown {
  basic: number;
  advanced: number;
  enterprise: number;
}

export interface MonthlyAnalyticsData {
  month: string;
  shortMonth: string;
  mrr: number;
  mrrFormatted: string;
  arr: number;
  arrFormatted: string;
  arpu: number;
  arpuFormatted: string;
  revenueBreakdown: RevenueBreakdown;
  newTenants: number;
  activeTenants: number;
  totalOrders: number;
  ordersFormatted: string;
  growthRate: string;
  churnRate: string;
}



export interface QuotaItem {
  id: string;
  label: string;
  used: number;
  total: number | string;
  unit: string;
  percentage: number;
  color: string;
}

export interface FeatureFlagItem {
  id: string;
  name: string;
  enabled: boolean;
}
