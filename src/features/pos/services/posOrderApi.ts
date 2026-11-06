import { financeHttpClient } from '../../../api/financeHttpClient';
import type { ApiResponse } from '../../../api/types';
import { generateUuidV7 } from '../../../utils/uuid';

export interface CreateOrderItemDto {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
}

export interface CreateOrderRequest {
  branchId?: string;
  customerId?: string;
  paymentMethod: 'CASH' | 'BANK' | 'CREDIT';
  discountAmount?: number;
  items: CreateOrderItemDto[];
  managerBypassCode?: string;
  note?: string;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  actualPrice: number;
  costPriceAtSale?: number;
  totalLineAmount: number;
  appliedVatRate: number;
  vatAmount: number;
}

export interface CustomerDebtInvoiceDto {
  id: string;
  customerId: string;
  orderId: string;
  orderCode: string;
  totalDebtAmount: number;
  remainingDebtAmount: number;
  dueDate: string;
  status: string;
  isOverdue: boolean;
}

export interface OrderResponse {
  id: string;
  orderCode: string;
  branchId: string;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  orderDate: string;
  items: OrderItemResponse[];
  debtInvoice?: CustomerDebtInvoiceDto;
}

export const posOrderApi = {
  /**
   * Tạo đơn hàng POS (hỗ trợ Tiền mặt, Ngân hàng VietQR, và Bán nợ công nợ khách hàng)
   * Tự động kiểm tra hạn mức tín dụng, sinh bút toán nợ và phiếu thu Sổ quỹ
   */
  async createOrder(request: CreateOrderRequest): Promise<OrderResponse> {
    const idempotencyKey = generateUuidV7();

    const res = await financeHttpClient.post<ApiResponse<OrderResponse>>(
      '/orders',
      {
        branchId: request.branchId,
        customerId: request.customerId,
        paymentMethod: request.paymentMethod,
        discountAmount: request.discountAmount || 0,
        items: request.items,
        managerBypassCode: request.managerBypassCode,
        note: request.note,
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Không thể tạo đơn hàng POS');
    }

    return res.data.data;
  },

  /**
   * Lấy danh sách đơn hàng POS từ máy chủ
   */
  async getOrders(params?: {
    branchId?: string;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<OrderResponse[]> {
    const res = await financeHttpClient.get<ApiResponse<OrderResponse[]>>('/orders', {
      params,
    });

    if (!res.data.success || !res.data.data) {
      return [];
    }

    return res.data.data;
  },

  /**
   * Lấy chi tiết đơn hàng POS theo ID
   */
  async getOrderById(id: string): Promise<OrderResponse | null> {
    try {
      const res = await financeHttpClient.get<ApiResponse<OrderResponse>>(`/orders/${id}`);
      if (!res.data.success || !res.data.data) {
        return null;
      }
      return res.data.data;
    } catch {
      return null;
    }
  },
};

