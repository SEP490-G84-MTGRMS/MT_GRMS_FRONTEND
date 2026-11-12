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
  walletBalance?: number;
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
    walletBalance: backend.walletBalance !== undefined ? backend.walletBalance : existingWalletBalance,
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

  async purchaseSubscription(
    payload: PurchaseSubscriptionPayload
  ): Promise<ApiResponse<PurchaseSubscriptionResult>> {
    const res = await httpClient.post<ApiResponse<PurchaseSubscriptionResult>>(
      '/tenant/subscriptions/purchase',
      payload
    );
    return res.data;
  },

  async activateTrial(): Promise<ApiResponse<PurchaseSubscriptionResult>> {
    const res = await httpClient.post<ApiResponse<PurchaseSubscriptionResult>>(
      '/tenant/subscriptions/trial',
      {}
    );
    return res.data;
  },

  async getSubscriptionHistory(): Promise<ApiResponse<SubscriptionOrderHistoryItem[]>> {
    const res = await httpClient.get<ApiResponse<SubscriptionOrderHistoryItem[]>>('/tenant/subscriptions/history');
    return res.data;
  },

  async getStorageUsage(): Promise<ApiResponse<StorageUsage>> {
    const res = await httpClient.get<ApiResponse<StorageUsage>>('/tenant/storage');
    return res.data;
  },

  async getStorageQuote(extraGb: number): Promise<ApiResponse<StorageQuote>> {
    const res = await httpClient.get<ApiResponse<StorageQuote>>('/tenant/storage/quote', {
      params: { extraGb },
    });
    return res.data;
  },

  async purchaseStorage(extraGb: number, requestId: string): Promise<ApiResponse<StorageQuote>> {
    const res = await httpClient.post<ApiResponse<StorageQuote>>('/tenant/storage/purchase', {
      extraGb,
      requestId,
    });
    return res.data;
  },

  async getBranchAddonQuote(extraBranches: number): Promise<ApiResponse<BranchAddonQuote>> {
    const res = await httpClient.get<ApiResponse<BranchAddonQuote>>('/tenant/branch-addon/quote', { params: { extraBranches } });
    return res.data;
  },

  async purchaseBranchAddon(extraBranches: number, requestId: string): Promise<ApiResponse<BranchAddonQuote>> {
    const res = await httpClient.post<ApiResponse<BranchAddonQuote>>('/tenant/branch-addon/purchase', { extraBranches, requestId });
    return res.data;
  },
};

export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  baseGb: number;
  extraGb: number;
  addonExpiresAt?: string | null;
}

export interface StorageQuote {
  extraGb: number;
  subtotal: number;
  vat: number;
  total: number;
  expiresAt: string;
}

export interface BranchAddonQuote {
  extraBranches: number;
  subtotal: number;
  vat: number;
  total: number;
  expiresAt: string;
}

export interface SubscriptionOrderHistoryItem {
  code: string;
  planName: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export interface PurchaseSubscriptionPayload {
  planCode: string;
  months?: number;
  extraBranches?: number;
  hasStaffManagementAddon?: boolean;
  extraWarehouses?: number;
  extraStorageGb?: number;
  requestId?: string;
  paymentMethod?: 'Wallet' | 'VietQR';
}

export interface PurchaseSubscriptionResult {
  planCode: string;
  planName: string;
  subscriptionExpiresAt: string;
  daysRemaining: number;
  totalAmount: number;
  paymentMethod: string;
  message: string;
}

