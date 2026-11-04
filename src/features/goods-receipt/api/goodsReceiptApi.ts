import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  GoodsReceiptListItem,
  GrnFilterState,
  PoLookupOption,
} from '../types/grn.types';
import { MOCK_GOODS_RECEIPTS, MOCK_AVAILABLE_POS } from '../lib/mockGrnData';

export interface BackendGoodsReceiptDto {
  id: string;
  code: string;
  purchaseOrderId?: string;
  purchaseOrderCode?: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  receivedAtUtc: string;
  invoiceNo?: string;
  receiverUserId: string;
  receiverName?: string;
  confirmedByUserId?: string;
  confirmedAtUtc?: string;
  cancelledByUserId?: string;
  cancelledAtUtc?: string;
  cancellationReason?: string;
  subTotal: number;
  freightFee: number;
  discountAmount: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  paymentMethod: string;
  paymentDueDate?: string;
  totalItems: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  totalAcceptedQty: number;
  totalRejectedQty: number;
  totalShortageQty: number;
  hasMismatch: boolean;
  note?: string;
  lines: Array<{
    id: string;
    productId: string;
    productCode: string;
    productName: string;
    unit: string;
    hasBatches: boolean;
    purchaseOrderDetailId?: string;
    orderedQty: number;
    deliveredQty: number;
    acceptedQty: number;
    rejectedQty: number;
    shortageQty: number;
    differenceQty: number;
    unitPrice: number;
    lineAmount: number;
    batchCode?: string;
    manufactureDate?: string;
    expiryDate?: string;
    isNearExpiry: boolean;
    freightAllocated: number;
    discountAllocated: number;
    vatAllocated: number;
    landedUnitCost: number;
    qualityStatus: string;
    rejectionReason?: string;
    rejectionNote?: string;
    note?: string;
  }>;
}

export const goodsReceiptApi = {
  /**
   * Lấy danh sách phiếu nhập kho phân trang & bộ lọc
   */
  async getGoodsReceipts(filter: Partial<GrnFilterState>): Promise<GoodsReceiptListItem[]> {
    try {
      const params = new URLSearchParams();
      if (filter.branchId && filter.branchId !== 'ALL') params.append('branchId', filter.branchId);
      if (filter.supplierId && filter.supplierId !== 'ALL') params.append('supplierId', filter.supplierId);
      if (filter.status && filter.status !== 'ALL') params.append('status', filter.status);
      if (filter.keyword) params.append('keyword', filter.keyword);
      if (filter.dateFrom) params.append('fromDate', filter.dateFrom);
      if (filter.dateTo) params.append('toDate', filter.dateTo);
      if (filter.tab === 'TODAY') params.append('isTodayDelivery', 'true');
      if (filter.tab === 'MISMATCH') params.append('hasMismatch', 'true');
      params.append('pageIndex', String(filter.pageIndex || 1));
      params.append('pageSize', String(filter.pageSize || 20));

      const res = await httpClient.get<ApiResponse<PagedResult<BackendGoodsReceiptDto>>>(
        `/goods-receipts?${params.toString()}`
      );

      if (res.data?.data?.items && res.data.data.items.length > 0) {
        return res.data.data.items.map((dto) => ({
          id: dto.id,
          code: dto.code,
          type: 'FROM_PO',
          typeLabel: 'Từ PO',
          receiveDate: new Date(dto.receivedAtUtc).toLocaleString('vi-VN'),
          rawDate: dto.receivedAtUtc.slice(0, 10),
          branchId: dto.branchId,
          branchName: dto.branchName || dto.branchCode,
          supplierId: dto.supplierId,
          supplierName: dto.supplierName,
          supplierCode: dto.supplierCode,
          poReference: dto.purchaseOrderCode || '-',
          lineCount: dto.totalItems,
          totalAmount: dto.grandTotal,
          status: dto.status as any,
          receiverName: dto.receiverName || dto.receiverUserId,
          notes: dto.note,
          items: dto.lines.map((l) => ({
            id: l.id,
            productCode: l.productCode,
            productName: l.productName,
            unit: l.unit,
            orderedQty: l.orderedQty,
            receivedQty: l.deliveredQty,
            acceptedQty: l.acceptedQty,
            rejectedQty: l.rejectedQty,
            shortageQty: l.shortageQty,
            differenceQty: l.differenceQty,
            unitPrice: l.unitPrice,
            lineTotal: l.lineAmount,
            batchCode: l.batchCode,
            manufactureDate: l.manufactureDate,
            expiryDate: l.expiryDate,
            rejectionReason: l.rejectionReason as any,
            rejectionNote: l.rejectionNote,
            note: l.note,
          })),
        }));
      }
    } catch {
      // Fallback local mock
    }
    return MOCK_GOODS_RECEIPTS;
  },

  /**
   * Lấy chi tiết một phiếu nhập kho
   */
  async getGoodsReceiptById(id: string): Promise<BackendGoodsReceiptDto | null> {
    try {
      const res = await httpClient.get<ApiResponse<BackendGoodsReceiptDto>>(`/goods-receipts/${id}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  /**
   * Tra cứu danh sách đơn PO hợp lệ để lập phiếu nhập kho
   */
  async getPoLookup(branchId?: string): Promise<PoLookupOption[]> {
    try {
      const param = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
      const res = await httpClient.get<ApiResponse<any[]>>(`/goods-receipts/po-lookup${param}`);
      if (res.data?.data && res.data.data.length > 0) {
        return res.data.data.map((po) => ({
          poCode: po.code,
          branchId: po.branchId,
          branchName: po.branchName,
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          supplierCode: po.supplierCode,
          orderDate: po.orderedAtUtc?.slice(0, 10) || '',
          expectedDeliveryDate: po.deliveryDate?.slice(0, 10) || '',
          items: [],
          notes: '',
        }));
      }
    } catch {
      // Fallback
    }
    return MOCK_AVAILABLE_POS;
  },

  /**
   * Lấy chi tiết mặt hàng theo mã PO để điền tự động vào bảng kiểm đếm
   */
  async getPoReceiptDetails(poIdOrCode: string): Promise<any | null> {
    try {
      const res = await httpClient.get<ApiResponse<any>>(`/goods-receipts/po-details/${poIdOrCode}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback mock
      const mockPo = MOCK_AVAILABLE_POS.find(
        (p) => p.poCode.toLowerCase() === poIdOrCode.toLowerCase()
      );
      if (mockPo) return mockPo;
    }
    return null;
  },

  /**
   * Tạo phiếu nhập kho (DRAFT hoặc COMPLETED)
   */
  async createGoodsReceipt(command: any): Promise<any> {
    const res = await httpClient.post<ApiResponse<any>>('/goods-receipts', command);
    return res.data?.data;
  },

  /**
   * Hoàn tất phiếu nhập kho: cập nhật tồn kho chi nhánh & chuyển trạng thái PO sang COMPLETED (GR-08)
   */
  async completeGoodsReceipt(id: string, note?: string): Promise<any> {
    const res = await httpClient.post<ApiResponse<any>>(`/goods-receipts/${id}/complete`, { note });
    return res.data?.data;
  },

  /**
   * Hủy phiếu nhập kho DRAFT và giải phóng đơn PO (GR-09)
   */
  async cancelGoodsReceipt(id: string, reason: string): Promise<any> {
    const res = await httpClient.post<ApiResponse<any>>(`/goods-receipts/${id}/cancel`, { reason });
    return res.data?.data;
  },
};
