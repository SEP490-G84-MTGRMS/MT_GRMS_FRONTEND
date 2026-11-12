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

export interface TrialStatus {
  state: 'ELIGIBLE' | 'ACTIVE' | 'EXPIRED' | 'PAID' | 'REVIEW_REQUIRED';
  planCode?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  trialStartedAt?: string | null;
  trialExpiresAt?: string | null;
  isExpired?: boolean;
  isNoPlan?: boolean;
  isLocked?: boolean;
  destination: 'CONFIRM' | 'DASHBOARD' | 'SUBSCRIPTIONS';
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
  const expiresAt = backend.subscriptionExpiresAt ? backend.subscriptionExpiresAt.split('T')[0] : 'Chưa kích hoạt';
  let daysRemaining = 0;
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
    currentPlan: backend.planName || backend.currentPlan || 'Chưa chọn gói',
    subscriptionExpiresAt: expiresAt,
    daysRemaining,
    branchesCount: backend.branchCount,
    industry: 'Tạp hóa & Siêu thị',
    walletBalance: backend.walletBalance !== undefined ? backend.walletBalance : existingWalletBalance,
  };
};

export const mapStoreProblemMessage = (
  err: unknown,
  fallback = 'Không thể thực hiện thao tác. Vui lòng thử lại.',
): string => {
  const anyErr = err as Record<string, any> | undefined;
  const data = anyErr?.response?.data ?? anyErr?.data ?? anyErr;
  const code = String(data?.code ?? data?.errorCode ?? anyErr?.errorCode ?? '').toUpperCase();
  const detail = data?.detail ?? data?.message ?? data?.title ?? anyErr?.message;

  const codeMap: Record<string, string> = {
    TRIAL_ALREADY_USED: 'Tài khoản hoặc cửa hàng này đã sử dụng gói dùng thử miễn phí.',
    TRIAL_NOT_ELIGIBLE: 'Cửa hàng không đủ điều kiện kích hoạt gói dùng thử.',
    TRIAL_ENDPOINT_REQUIRED: 'Vui lòng dùng nút kích hoạt dùng thử 3 ngày để trải nghiệm.',
    SUBSCRIPTION_REQUIRED: 'Gói dịch vụ chưa được kích hoạt hoặc đã hết hạn. Vui lòng chọn gói để tiếp tục.',
    INSUFFICIENT_WALLET_BALANCE: detail || 'Số dư ví gian hàng không đủ. Vui lòng nạp thêm tiền vào ví.',
    INVALID_PLAN_CODE: 'Gói dịch vụ được chọn không hợp lệ.',
    DOWNGRADE_NOT_ALLOWED: 'Gian hàng đang sử dụng Gói Pro, không hỗ trợ hạ cấp xuống Gói Thường.',
    IDEMPOTENCY_PAYLOAD_MISMATCH: 'Thông tin gói chọn đã thay đổi. Vui lòng đóng và mở lại hộp thoại thanh toán.',
    IDEMPOTENCY_IN_PROGRESS: 'Yêu cầu đang được xử lý. Vui lòng đợi trong giây lát.',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này cho cửa hàng hiện tại.',
  };

  return codeMap[code] || (typeof detail === 'string' && detail.trim() ? detail : fallback);
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

  async activateTrial(idempotencyKey?: string): Promise<ApiResponse<TrialStatus>> {
    const res = await httpClient.post<ApiResponse<TrialStatus>>(
      '/tenant/subscriptions/trial',
      {},
      { headers: { 'Idempotency-Key': idempotencyKey || crypto.randomUUID() } }
    );
    return res.data;
  },

  async getTrialStatus(): Promise<ApiResponse<TrialStatus>> {
    const res = await httpClient.get<ApiResponse<TrialStatus>>('/tenant/subscriptions/trial-status');
    return res.data;
  },

  async getSubscriptionAccessStatus(): Promise<ApiResponse<TrialStatus>> {
    const res = await httpClient.get<ApiResponse<TrialStatus>>('/tenant/subscriptions/access-status');
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

