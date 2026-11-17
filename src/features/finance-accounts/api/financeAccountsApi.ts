import { financeHttpClient } from '../../../api/financeHttpClient';

export type FinanceAccountType = 'Bank' | 'Till' | 'Safe';
export type SepayConnectionStatus = 'NotConfigured' | 'Connected' | 'Error';

export interface FinanceAccountItem {
  id: string;
  branchId?: string | null;
  branchName: string;
  accountName: string;
  accountType: FinanceAccountType;
  bankCode?: string | null;
  bankName?: string | null;
  maskedAccountNumber?: string | null;
  accountHolderName?: string | null;
  currentBalance: number;
  isActive: boolean;
  isDefaultForVietQr: boolean;
  sepayConnectionStatus: SepayConnectionStatus;
  sepayLastVerifiedAtUtc?: string | null;
  sepayLastError?: string | null;
}

export interface SaveFinanceAccountPayload {
  accountName: string;
  accountType: FinanceAccountType;
  branchId?: string | null;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  isDefaultForVietQr: boolean;
  isActive: boolean;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }
export interface SepayConnectionResult { status: string; verifiedAtUtc?: string; webhookUrl?: string; webhookAuthenticationKey?: string }
export interface VietQrAccount { id: string; bankCode: string; bankName: string; accountNumber: string; accountHolderName: string }

export const financeAccountsApi = {
  async list(): Promise<FinanceAccountItem[]> {
    const response = await financeHttpClient.get<ApiResponse<FinanceAccountItem[]>>('/finance-accounts');
    return response.data.data ?? [];
  },
  async getVietQrDefault(branchId?: string): Promise<VietQrAccount> {
    const response = await financeHttpClient.get<ApiResponse<VietQrAccount>>('/finance-accounts/vietqr-default', { params: { branchId } });
    return response.data.data;
  },
  async create(payload: SaveFinanceAccountPayload): Promise<FinanceAccountItem> {
    const response = await financeHttpClient.post<ApiResponse<FinanceAccountItem>>('/finance-accounts', payload);
    return response.data.data;
  },
  async setStatus(id: string, isActive: boolean): Promise<void> {
    await financeHttpClient.patch(`/finance-accounts/${id}/status`, { isActive });
  },
  async connectSepay(id: string, apiToken: string): Promise<SepayConnectionResult> {
    const response = await financeHttpClient.post<ApiResponse<SepayConnectionResult>>(`/finance-accounts/${id}/sepay/connect`, { apiToken });
    return response.data.data;
  },
  async disconnectSepay(id: string): Promise<void> {
    await financeHttpClient.delete(`/finance-accounts/${id}/sepay`);
  },
};
