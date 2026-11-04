import { httpClient } from '../../../api/httpClient';
import type { Product, Customer } from '../types/pos.types';

export interface OrderItemCreateDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  productName?: string;
}

export interface OrderCreateRequest {
  branchId: string;
  customerId?: string | null;
  paymentMethod: string;
  items: OrderItemCreateDto[];
  cashTendered?: number | null;
  discountAmount?: number | null;
  managerBypassCode?: string | null;
  note?: string | null;
  creatorRole?: string | null;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  barcode?: string;
  unitName?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  actualPrice: number;
  totalLineAmount: number;
  batchCode?: string;
}

export interface OrderResponse {
  id: string;
  orderCode: string;
  branchId: string;
  branchName?: string;
  customerId?: string;
  customerName?: string;
  orderDate: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  cashTendered: number;
  changeAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  items: OrderItemResponse[];
}

export interface PrintOrderResponse {
  success: boolean;
  message: string;
}

export const posOrderApi = {
  /**
   * Lấy danh sách toàn bộ sản phẩm thực tế từ Backend CSDL (PostgreSQL)
   */
  getAllProducts: async (): Promise<Product[]> => {
    const res = await httpClient.get('/products');
    const rawList = res.data?.data || res.data || [];
    return rawList.map((p: any) => ({
      id: p.id,
      sku: p.sku || p.productCode || '',
      barcode: p.barcode || '',
      name: p.productName || p.name || '',
      imageUrl: p.imageUrl,
      spec: p.taxCategory === 'STANDARD_1PCT' ? 'VAT 1%' : '',
      category: p.categoryName || 'Bách hóa',
      baseUnit: p.unitName || p.baseUnit || 'Cái',
      basePrice: p.basePrice || p.sellingPrice || 0,
      costPrice: p.costPrice || 0,
      quantityOnHand: p.quantityOnHand ?? 100,
      batchCode: 'LÔ-FEFO',
    }));
  },

  /**
   * Lấy danh sách toàn bộ khách hàng thực tế từ Backend CSDL (PostgreSQL)
   */
  getAllCustomers: async (): Promise<Customer[]> => {
    const res = await httpClient.get('/customers');
    const rawList = res.data?.data || res.data || [];
    return rawList.map((c: any) => ({
      id: c.id,
      code: c.code || c.customerCode || '',
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      area: 'Hà Nội',
      ward: '',
      gender: 'Nam',
      group: c.membershipTier || 'Khách hàng',
      loyaltyPoints: c.loyaltyPoints || 0,
      membershipTier: c.membershipTier || 'Standard',
      debtLimit: c.debtLimit || 0,
      currentDebt: c.currentDebt || 0,
      allowDebt: Boolean(c.allowDebt),
      note: c.isBlockedForDebt ? 'Đang bị khóa nợ' : '',
    }));
  },

  /**
   * Tạo đơn hàng bán lẻ POS, tự động trừ kho FEFO, tích điểm và xử lý công nợ
   */
  createOrder: async (data: OrderCreateRequest): Promise<OrderResponse> => {
    const response = await httpClient.post<OrderResponse>('/orders', data);
    return response.data;
  },

  /**
   * In hóa đơn nhiệt POS-58 (khổ 43mm siêu thị mini) 1-Click trực tiếp qua Windows Spooler RAW
   */
  printOrder: async (orderId: string, printerName: string = 'POS-58', cashTendered?: number): Promise<PrintOrderResponse> => {
    const response = await httpClient.post<PrintOrderResponse>(`/orders/${orderId}/print`, {
      printerName,
      cashTendered,
    });
    return response.data;
  },

  /**
   * In hóa đơn nhiệt POS-58 1-Click trực tiếp (Bypass 100% hộp thoại Print Preview của trình duyệt).
   * Hoạt động bằng cách gửi thẳng ESC/POS byte xuống máy in qua Local Print Server (port 3300) hoặc Windows Spooler.
   */
  printDirect: async (receiptData: any): Promise<PrintOrderResponse> => {
    const payload = {
      storeName: receiptData.storeName || 'SIÊU THỊ MINI MT-GROCERY',
      address: receiptData.storeAddress || '123 Xuân Thủy, Cầu Giấy, Hà Nội',
      phone: receiptData.storePhone || '0987.654.321',
      invoiceNo: receiptData.orderCode || 'HD0001',
      tableNo: 'Quầy #01',
      cashier: receiptData.cashierName || 'Thu ngân',
      customer: receiptData.customer?.name || 'Khách lẻ',
      printTime: receiptData.createdAt || new Date().toLocaleString('vi-VN'),
      items: (receiptData.items || []).map((it: any) => ({
        name: it.name,
        qty: it.quantity,
        price: it.unitPrice,
      })),
      subtotal: receiptData.totalItemAmount || 0,
      discountPercent: 0,
      discountAmount: (receiptData.orderDiscountAmount || 0) + (receiptData.pointsDiscountAmount || 0),
      vatPercent: 1,
      vatAmount: receiptData.vatAmount || 0,
      finalTotal: receiptData.finalAmount || 0,
      cashReceived: receiptData.cashTendered || receiptData.finalAmount || 0,
      cashChange: Math.max(0, (receiptData.cashTendered || 0) - (receiptData.finalAmount || 0)),
      printerName: 'POS-58',
    };

    // 1. Ưu tiên: Gọi Local Direct Print Server (port 3300 từ start.bat của Test_may_in_may_quet)
    try {
      const res3300 = await fetch('http://localhost:3300/api/print-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res3300.ok) {
        const data = await res3300.json();
        if (data.success) {
          return { success: true, message: 'Đã in trực tiếp ra máy in POS-58 thành công (1-Click, không popup)!' };
        }
      }
    } catch {
      // Local server port 3300 chưa bật
    }

    // 2. Thử gọi Backend API MT_GRMS .NET
    if (receiptData.orderId) {
      try {
        const backendRes = await httpClient.post<PrintOrderResponse>(`/orders/${receiptData.orderId}/print`, {
          printerName: 'POS-58',
          cashTendered: receiptData.cashTendered,
        });
        if (backendRes.data?.success) {
          return backendRes.data;
        }
      } catch (err: unknown) {
        console.warn('Backend order print error:', err);
      }
    }

    return {
      success: false,
      message: 'Máy in chưa sẵn sàng: Hãy nhấp đúp file start.bat (port 3300) hoặc kiểm tra cáp máy in POS-58 nhé!',
    };
  },

  /**
   * Tra cứu sản phẩm theo mã vạch Barcode hoặc SKU phục vụ máy quét mã vạch USB HID
   */
  getProductByBarcode: async (barcode: string): Promise<any> => {
    const response = await httpClient.get(`/products/barcode/${encodeURIComponent(barcode)}`);
    return response.data?.data || response.data;
  },

  /**
   * Lấy danh sách hóa đơn bán lẻ có bộ lọc & phân trang từ Backend
   */
  getOrders: async (params?: any): Promise<{ items: any[]; totalCount: number }> => {
    const res = await httpClient.get('/orders', { params });
    return res.data;
  },

  /**
   * Lấy thống kê tổng hợp số lượng đơn, doanh thu ca / ngày, tiền mặt vs QR, và đơn đặt trước
   */
  getOrderSummary: async (params?: { branchId?: string; fromDate?: string; toDate?: string }): Promise<any> => {
    const res = await httpClient.get('/orders/summary', { params });
    return res.data;
  },

  /**
   * Tạo đơn đặt trước giữ kho
   */
  createPreOrder: async (data: any): Promise<any> => {
    const res = await httpClient.post('/orders/pre-orders', data);
    return res.data;
  },

  /**
   * Hoàn tất giao hàng đơn đặt trước
   */
  fulfillPreOrder: async (orderId: string, data: { paymentMethod: string; amountPaid: number; note?: string }): Promise<any> => {
    const res = await httpClient.put(`/orders/${orderId}/fulfill`, data);
    return res.data;
  },

  /**
   * Hủy hóa đơn hoặc đơn đặt trước, tự động hoàn trả tồn kho về BranchStocks
   */
  cancelOrder: async (orderId: string, data: { reason: string; note?: string; userRole?: string }): Promise<any> => {
    const res = await httpClient.put(`/orders/${orderId}/cancel`, data);
    return res.data;
  },

  /**
   * Đổi / Trả hàng chuẩn KiotViet: hoàn kho hàng trả, trừ kho FEFO hàng mới, bù trừ chênh lệch
   */
  returnExchangeOrder: async (orderId: string, data: {
    returnedItems: Array<{ productId: string; quantity: number; unitPrice: number }>;
    newItems: Array<{ productId: string; quantity: number; unitPrice: number; discountAmount?: number }>;
    settlementMethod: string;
    note?: string;
  }): Promise<any> => {
    const res = await httpClient.post(`/orders/${orderId}/return-exchange`, data);
    return res.data;
  },
};
