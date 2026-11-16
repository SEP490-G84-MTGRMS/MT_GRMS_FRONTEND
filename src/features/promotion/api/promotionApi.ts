import { httpClient } from '../../../api/httpClient';

export interface PromotionConditionDto {
  id?: string;
  productId: string;
  productName?: string;
  productRole: 'BUY' | 'GIFT' | 'DISCOUNT';
  minQty: number;
  discountValue?: number;
  note?: string;
}

export interface PromotionDto {
  id: string;
  promotionCode: string;
  promotionName: string;
  type: 'ORDER_DISCOUNT' | 'FIXED_AMOUNT' | 'PERCENT' | 'BUY_X_GET_Y' | 'PRODUCT_DISCOUNT';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
  targetBranches: string;
  budgetLimit?: number;
  totalDiscountGiven: number;
  createdAt: string;
  conditions: PromotionConditionDto[];
}

export interface PromotionCreateRequest {
  promotionCode: string;
  promotionName: string;
  type: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  description?: string;
  targetBranches?: string;
  budgetLimit?: number;
  conditions?: PromotionConditionDto[];
}

export interface PromotionUpdateRequest {
  promotionName: string;
  type: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
  targetBranches?: string;
  budgetLimit?: number;
  conditions?: PromotionConditionDto[];
}

export interface PromotionFilterQuery {
  searchTerm?: string;
  type?: string;
  status?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface CartItemDto {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  conversionRate?: number;
}

export interface CartGiftItemDto {
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  promotionId?: string;
  unitName?: string;
  equivalentValue?: number;
}

export interface CartItemDiscountDto {
  productId: string;
  discountAmount: number;
}

export interface ValidateVoucherResponse {
  isValid: boolean;
  message: string;
  discountAmount: number;
  code?: string;
  promotionId?: string;
  promotionName?: string;
  discountType?: string;
  discountValue?: number;
  allowWithPromotions?: boolean;
}

export interface EvaluateCartRequest {
  items: CartItemDto[];
  subTotal: number;
  couponCode?: string;
  branchId?: string;
  customerId?: string;
}

export interface EvaluateCartResponse {
  subTotal: number;
  totalDiscountAmount: number;
  finalAmount: number;
  appliedPromotions: string[];
  giftItems: CartGiftItemDto[];
  voucherResult?: ValidateVoucherResponse | null;
  itemDiscounts?: CartItemDiscountDto[];
  appliedPromotionId?: string | null;
}

export interface VoucherBatchDto {
  id: string;
  batchCode: string;
  name: string;
  discountType: 'FIXED_AMOUNT' | 'PERCENT';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  totalQuantity: number;
  usedQuantity: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'DEPLETED';
  prefix: string;
  description?: string;
  createdAt: string;
  allowWithPromotions?: boolean;
}

export interface VoucherBatchCreateRequest {
  batchCode: string;
  name: string;
  discountType: 'FIXED_AMOUNT' | 'PERCENT';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  totalQuantity: number;
  startDate: string;
  endDate: string;
  prefix: string;
  description?: string;
  allowWithPromotions?: boolean;
}

export interface VoucherCodeDto {
  id: string;
  promotionId: string;
  code: string;
  status: 'UNUSED' | 'USED' | 'EXPIRED' | 'LOCKED';
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  orderId?: string;
  orderCode?: string;
  usedAt?: string;
  createdAt: string;
}

export interface LoyaltyConfigDto {
  isEnabled: boolean;
  earningRateAmount: number;
  earningPoints: number;
  redemptionRatePoints: number;
  redemptionRateAmount: number;
  minRedemptionPoints: number;
  allowPointsWithPromotions: boolean;
}

export interface LoyaltyLedgerDto {
  id: string;
  transactionCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: 'EARN_PURCHASE' | 'REDEEM_PURCHASE' | 'MANUAL_ADJUST_ADD' | 'MANUAL_ADJUST_SUB' | 'EXPIRED';
  pointsChanged: number;
  balanceAfter: number;
  orderCode?: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export const promotionApi = {
  // 1. Promotions
  async getPromotions(query?: PromotionFilterQuery) {
    const res = await httpClient.get<{ success: boolean; data: { items: PromotionDto[]; totalItems: number; page: number; pageSize: number } }>('/promotions', { params: query });
    return res.data?.data;
  },

  async getPromotionById(id: string) {
    const res = await httpClient.get<{ success: boolean; data: PromotionDto }>(`/promotions/${id}`);
    return res.data?.data;
  },

  async createPromotion(data: PromotionCreateRequest) {
    const res = await httpClient.post<{ success: boolean; data: PromotionDto }>('/promotions', data);
    return res.data?.data;
  },

  async updatePromotion(id: string, data: PromotionUpdateRequest) {
    const res = await httpClient.put<{ success: boolean; data: PromotionDto }>(`/promotions/${id}`, data);
    return res.data?.data;
  },

  async togglePromotionStatus(id: string) {
    const res = await httpClient.patch<{ success: boolean; data: boolean }>(`/promotions/${id}/status`);
    return res.data?.data;
  },

  async deletePromotion(id: string) {
    const res = await httpClient.delete<{ success: boolean; data: boolean }>(`/promotions/${id}`);
    return res.data?.data;
  },

  async evaluateCart(data: EvaluateCartRequest) {
    const res = await httpClient.post<{ success: boolean; data: EvaluateCartResponse }>('/promotions/evaluate-cart', data);
    return res.data?.data;
  },

  async seedSampleData() {
    const res = await httpClient.post<{ success: boolean; data: number }>('/promotions/seed-sample-data');
    return res.data?.data;
  },

  // 2. Vouchers
  async getVoucherBatches(params?: { pageIndex?: number; pageSize?: number; searchTerm?: string; status?: string }) {
    const res = await httpClient.get<{ success: boolean; data: { items: VoucherBatchDto[]; totalItems: number; page: number; pageSize: number } }>('/vouchers', { params });
    return res.data?.data;
  },

  async getVoucherBatchById(id: string) {
    const res = await httpClient.get<{ success: boolean; data: VoucherBatchDto }>(`/vouchers/${id}`);
    return res.data?.data;
  },

  async createVoucherBatch(data: VoucherBatchCreateRequest) {
    const res = await httpClient.post<{ success: boolean; data: VoucherBatchDto }>('/vouchers', data);
    return res.data?.data;
  },

  async generateVoucherCodes(batchId: string, quantity: number, prefix?: string) {
    const res = await httpClient.post<{ success: boolean; data: number }>(`/vouchers/${batchId}/generate-codes`, { quantity, prefix });
    return res.data?.data;
  },

  async getVoucherCodes(batchId: string, params?: { pageIndex?: number; pageSize?: number; status?: string }) {
    const res = await httpClient.get<{ success: boolean; data: { items: VoucherCodeDto[]; totalItems: number; page: number; pageSize: number } }>(`/vouchers/${batchId}/codes`, { params });
    return res.data?.data;
  },

  async deleteVoucherBatch(batchId: string) {
    const res = await httpClient.delete<{ success: boolean; data: boolean }>(`/vouchers/${batchId}`);
    return res.data?.data;
  },

  async toggleVoucherBatchStatus(batchId: string) {
    const res = await httpClient.patch<{ success: boolean; data: boolean }>(`/vouchers/${batchId}/status`);
    return res.data?.data;
  },

  async validateVoucher(code: string, cartTotal: number, customerId?: string, hasOtherPromotions?: boolean) {
    const res = await httpClient.post<{ success: boolean; message?: string; data?: ValidateVoucherResponse }>('/vouchers/validate', {
      code,
      cartTotal,
      customerId,
      hasOtherPromotions,
    });
    if (res.data?.data) {
      return res.data.data;
    }
    return {
      isValid: false,
      message: res.data?.message || 'Mã voucher không tồn tại',
      discountAmount: 0,
    };
  },

  async redeemVoucher(data: { code: string; orderId: string; orderCode: string; customerId?: string; customerName?: string; customerPhone?: string }) {
    const res = await httpClient.post<{ success: boolean; data: { success: boolean; message: string; code: string } }>('/vouchers/redeem', data);
    return res.data?.data;
  },

  // 3. Loyalty Configuration
  async getLoyaltyConfig() {
    const res = await httpClient.get<{ success: boolean; data: LoyaltyConfigDto }>('/loyalty-config');
    return res.data?.data;
  },

  async updateLoyaltyConfig(data: LoyaltyConfigDto) {
    const res = await httpClient.put<{ success: boolean; data: LoyaltyConfigDto }>('/loyalty-config', data);
    return res.data?.data;
  },

  async getLoyaltyLedger() {
    const res = await httpClient.get<{ success: boolean; data: LoyaltyLedgerDto[] }>('/loyalty-config/ledger');
    return res.data?.data ?? [];
  },

  async adjustLoyaltyPoints(data: { customerPhone: string; adjustmentType: 'ADD' | 'SUB'; points: number; reason: string }) {
    const res = await httpClient.post<{ success: boolean; data: LoyaltyLedgerDto }>('/loyalty-config/adjustments', data);
    return res.data?.data;
  },
};

