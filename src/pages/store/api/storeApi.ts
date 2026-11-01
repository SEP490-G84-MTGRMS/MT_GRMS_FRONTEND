import { httpClient } from '../../../api/httpClient';
import type { StoreInfo } from '../storeData';

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  errorCode?: string | null;
  data: T;
}

export interface BackendTenantStoreResponse {
  id: string;
  subdomain: string;
  name: string;
  code: string;
  taxCode?: string;
  hotline?: string;
  address?: string;
  city?: string;
  status: string;
  currentPlan?: string;
  planName?: string;
  subscriptionExpiresAt?: string;
  gracePeriodExpiresAt?: string;
  lockType?: string;
  lockReason?: string;
  branchCount: number;
  maxBranches: number;
  staffCount: number;
  maxStaff: number;
}

export interface UpdateStoreInfoPayload {
  name: string;
  taxCode?: string;
  hotline?: string;
  address?: string;
  city?: string;
}

export interface BackendPricingPlanResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  status: string;
  quotas?: {
    maxBranches: number;
    maxEmployees: number;
    maxStorageGb: number;
    backupFrequency: string;
  };
  features?: {
    fefoExpiryAlert: boolean;
    multiUnitConversion: boolean;
    vietQrDynamic: boolean;
    debtZaloBook: boolean;
    barcodeScanning: boolean;
    financialReporting: boolean;
  };
}

export const mapBackendStoreToFrontend = (
  backend: BackendTenantStoreResponse,
  existingWalletBalance = 1250000
): StoreInfo => {
  const expiresAt = backend.subscriptionExpiresAt ? backend.subscriptionExpiresAt.split('T')[0] : '2027-12-31';
  let daysRemaining = 30;
  if (backend.subscriptionExpiresAt) {
    const diff = new Date(backend.subscriptionExpiresAt).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return {
    tenantId: backend.id,
    name: backend.name,
    subdomain: backend.subdomain,
    code: backend.code,
    taxCode: backend.taxCode || '',
    hotline: backend.hotline || '',
    address: backend.address || '',
    city: backend.city || '',
    email: `${backend.subdomain}@mtgrms.vn`,
    status: (backend.status as StoreInfo['status']) || 'ACTIVE',
    currentPlan: backend.planName || backend.currentPlan || 'Gói Chuyên Nghiệp',
    subscriptionExpiresAt: expiresAt,
    daysRemaining,
    branchesCount: backend.branchCount,
    industry: 'Tạp hóa & Siêu thị',
    walletBalance: existingWalletBalance,
  };
};

export const storeApi = {
  async getStoreInfo(): Promise<ApiResponse<BackendTenantStoreResponse>> {
    const res = await httpClient.get<ApiResponse<BackendTenantStoreResponse>>('/tenant/store-info');
    return res.data;
  },

  async updateStoreInfo(payload: UpdateStoreInfoPayload): Promise<ApiResponse<BackendTenantStoreResponse>> {
    const res = await httpClient.put<ApiResponse<BackendTenantStoreResponse>>('/tenant/store-info', payload);
    return res.data;
  },

  async getPricingPlans(): Promise<ApiResponse<BackendPricingPlanResponse[]>> {
    const res = await httpClient.get<ApiResponse<BackendPricingPlanResponse[]>>('/tenant/pricing-plans');
    return res.data;
  },
};
