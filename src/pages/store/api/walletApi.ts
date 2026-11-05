import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from './storeApi';

export interface TopupOrderResponse {
  orderCode: string;
  amount: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  qrUrl: string;
  expiresAt: string;
}

export interface TopupOrderStatusResponse {
  orderCode: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  amount: number;
  newBalance?: number;
  completedAt?: string;
}

export interface WalletBalanceResponse {
  walletBalance: number;
  totalTopup: number;
  totalSpent: number;
}

export interface WalletTransactionItem {
  id: string;
  transactionCode: string;
  type: 'TOPUP' | 'PURCHASE_PLAN' | 'PURCHASE_ADDON' | 'REFUND';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  paymentMethod: string;
  status: string;
  referenceCode?: string;
  createdAt: string;
}

export const walletApi = {
  async createTopupOrder(amount: number): Promise<ApiResponse<TopupOrderResponse>> {
    const res = await httpClient.post<ApiResponse<TopupOrderResponse>>('/tenant/wallet/topup-order', { amount });
    return res.data;
  },

  async getTopupStatus(orderCode: string): Promise<ApiResponse<TopupOrderStatusResponse>> {
    const res = await httpClient.get<ApiResponse<TopupOrderStatusResponse>>(`/tenant/wallet/topup-status/${orderCode}`);
    return res.data;
  },

  async getBalance(): Promise<ApiResponse<WalletBalanceResponse>> {
    const res = await httpClient.get<ApiResponse<WalletBalanceResponse>>('/tenant/wallet/balance');
    return res.data;
  },

  async getTransactions(type?: string): Promise<ApiResponse<WalletTransactionItem[]>> {
    const res = await httpClient.get<ApiResponse<WalletTransactionItem[]>>('/tenant/wallet/transactions', {
      params: type && type !== 'ALL' ? { type } : undefined,
    });
    return res.data;
  },
};

