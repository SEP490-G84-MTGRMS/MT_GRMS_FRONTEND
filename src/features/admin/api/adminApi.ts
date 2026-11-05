import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  PlanQuotaConfig,
  PlanFeatureConfig,
  PlanTenantSummary,
} from '../types/plan.types';
import type {
  KpiMetric,
  PlanDistribution,
  UrgentAlertTenant,
  MonthlyAnalyticsData,
} from '../types/admin.types';

// ======================== Plan DTOs ========================

export interface BackendPlanDto {
  id: string;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  status: string;
  activeTenantCount: number;
  quotas: PlanQuotaConfig;
  features: PlanFeatureConfig;
  tenants?: PlanTenantSummary[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface PlanKpiBannerResponse {
  totalPlans: number;
  activePlans: number;
  totalActiveTenants: number;
  estimatedMrr: number;
}

export interface CreatePlanPayload {
  code: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  quotas?: PlanQuotaConfig;
  features?: PlanFeatureConfig;
}

export interface UpdatePlanPayload {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  quotas?: PlanQuotaConfig;
  features?: PlanFeatureConfig;
}

// ======================== Tenant DTOs ========================

export interface BackendTenantSummaryDto {
  id: string;
  subdomain: string;
  name: string;
  taxCode?: string | null;
  city?: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: string;
  branchCount: number;
  maxBranches: number;
  staffCount: number;
  maxStaff: number;
  expiryDate?: string | null;
  status: string;
  lockType?: string | null;
  graceDaysRemaining?: number | null;
  daysUntilExpiry?: number | null;
}

export interface BackendTenantBranchDto {
  id: string;
  branchCode: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
}

export interface BackendTenantDetailDto {
  id: string;
  subdomain: string;
  name: string;
  code: string;
  taxCode?: string | null;
  hotline?: string | null;
  address?: string | null;
  city?: string | null;
  status: string;
  currentPlan?: string | null;
  planName: string;
  subscriptionExpiresAt?: string | null;
  gracePeriodExpiresAt?: string | null;
  lockType?: string | null;
  lockReason?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  branchCount: number;
  maxBranches: number;
  staffCount: number;
  maxStaff: number;
  branches: BackendTenantBranchDto[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface UpdateTenantPayload {
  name: string;
  taxCode?: string | null;
  hotline?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface LockTenantPayload {
  lockType: 'SOFT' | 'HARD';
  reason: string;
}

export interface ExtendGracePayload {
  additionalDays: number;
  reason: string;
}

// ======================== APIs ========================

export const planApi = {
  getPlans: async (filter?: { keyword?: string; status?: string }): Promise<ApiResponse<BackendPlanDto[]>> => {
    const res = await httpClient.get<ApiResponse<BackendPlanDto[]>>('/admin/plans', {
      params: filter,
    });
    return res.data;
  },

  getKpis: async (): Promise<ApiResponse<PlanKpiBannerResponse>> => {
    const res = await httpClient.get<ApiResponse<PlanKpiBannerResponse>>('/admin/plans/kpis');
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<BackendPlanDto>> => {
    const res = await httpClient.get<ApiResponse<BackendPlanDto>>(`/admin/plans/${id}`);
    return res.data;
  },

  create: async (payload: CreatePlanPayload): Promise<ApiResponse<BackendPlanDto>> => {
    const res = await httpClient.post<ApiResponse<BackendPlanDto>>('/admin/plans', payload);
    return res.data;
  },

  update: async (id: string, payload: UpdatePlanPayload): Promise<ApiResponse<BackendPlanDto>> => {
    const res = await httpClient.put<ApiResponse<BackendPlanDto>>(`/admin/plans/${id}`, payload);
    return res.data;
  },

  toggleStatus: async (id: string): Promise<ApiResponse<boolean>> => {
    const res = await httpClient.patch<ApiResponse<boolean>>(`/admin/plans/${id}/status`);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    const res = await httpClient.delete<ApiResponse<boolean>>(`/admin/plans/${id}`);
    return res.data;
  },
};

export const tenantApi = {
  getTenants: async (params?: {
    keyword?: string;
    status?: string;
    planCode?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PagedResult<BackendTenantSummaryDto>>> => {
    const res = await httpClient.get<ApiResponse<PagedResult<BackendTenantSummaryDto>>>('/admin/tenants', {
      params,
    });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<BackendTenantDetailDto>> => {
    const res = await httpClient.get<ApiResponse<BackendTenantDetailDto>>(`/admin/tenants/${id}`);
    return res.data;
  },

  update: async (id: string, payload: UpdateTenantPayload): Promise<ApiResponse<BackendTenantDetailDto>> => {
    const res = await httpClient.put<ApiResponse<BackendTenantDetailDto>>(`/admin/tenants/${id}`, payload);
    return res.data;
  },

  lock: async (id: string, payload: LockTenantPayload): Promise<ApiResponse<boolean>> => {
    const res = await httpClient.post<ApiResponse<boolean>>(`/admin/tenants/${id}/lock`, payload);
    return res.data;
  },

  unlock: async (id: string): Promise<ApiResponse<boolean>> => {
    const res = await httpClient.post<ApiResponse<boolean>>(`/admin/tenants/${id}/unlock`);
    return res.data;
  },

  extendGrace: async (id: string, payload: ExtendGracePayload): Promise<ApiResponse<boolean>> => {
    const res = await httpClient.post<ApiResponse<boolean>>(`/admin/tenants/${id}/extend-grace`, payload);
    return res.data;
  },
};

export const dashboardApi = {
  getKpis: async (): Promise<ApiResponse<KpiMetric[]>> => {
    const res = await httpClient.get<ApiResponse<KpiMetric[]>>('/admin/dashboard/kpis');
    return res.data;
  },

  getPlanDistribution: async (): Promise<ApiResponse<PlanDistribution[]>> => {
    const res = await httpClient.get<ApiResponse<PlanDistribution[]>>('/admin/dashboard/plan-distribution');
    return res.data;
  },

  getUrgentAlerts: async (): Promise<ApiResponse<UrgentAlertTenant[]>> => {
    const res = await httpClient.get<ApiResponse<UrgentAlertTenant[]>>('/admin/dashboard/urgent-alerts');
    return res.data;
  },

  getMonthlyAnalytics: async (): Promise<ApiResponse<MonthlyAnalyticsData[]>> => {
    const res = await httpClient.get<ApiResponse<MonthlyAnalyticsData[]>>('/admin/dashboard/analytics');
    return res.data;
  },
};

