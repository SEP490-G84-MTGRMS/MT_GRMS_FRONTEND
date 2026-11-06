import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  GoodsReceiptListItem,
  GrnFilterState,
  PoLookupOption,
} from '../types/grn.types';
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

const mapUiStatusToBackend = (status?: string): string | undefined => {
  if (!status || status === 'ALL') return undefined;
  if (status === 'CONFIRMED') return 'COMPLETED';
  if (status === 'CANCELED' || status === 'CANCELLED') return 'CANCELLED';
  if (status === 'DRAFT') return 'DRAFT';
  if (status === 'COMPLETED') return 'COMPLETED';
  return undefined;
};

const mapBackendStatusToUi = (
  status: BackendGoodsReceiptDto['status'],
  hasMismatch: boolean
): GoodsReceiptListItem['status'] => {
  if (status === 'CANCELLED') return 'CANCELED';
  if (status === 'COMPLETED') return hasMismatch ? 'MISMATCH' : 'CONFIRMED';
  return status;
};

const mapDtoToListItem = (dto: BackendGoodsReceiptDto): GoodsReceiptListItem => {
  const lines = dto.lines ?? [];
  return {
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
    lineCount: dto.totalItems ?? lines.length,
    totalAmount: dto.grandTotal,
    status: mapBackendStatusToUi(dto.status, !!dto.hasMismatch),
    receiverName: dto.receiverName || dto.receiverUserId || '—',
    hasMismatch: !!dto.hasMismatch,
    notes: dto.note,
    cancelledReason: dto.cancellationReason,
    items: lines.map((l) => ({
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
  };
};

export const goodsReceiptApi = {
  /**
   * Lấy danh sách phiếu nhập kho phân trang & bộ lọc
   */
  async getGoodsReceipts(
    filter: Partial<GrnFilterState>
  ): Promise<{ items: GoodsReceiptListItem[]; totalCount: number }> {
    const params = new URLSearchParams();
    if (filter.branchId && filter.branchId !== 'ALL') params.append('branchId', filter.branchId);
    if (filter.supplierId && filter.supplierId !== 'ALL') params.append('supplierId', filter.supplierId);

    const tab = filter.tab || 'ALL';
    if (tab === 'TODAY') {
      params.append('isTodayDelivery', 'true');
    } else if (tab === 'DRAFT') {
      params.append('status', 'DRAFT');
    } else if (tab === 'MISMATCH') {
      params.append('hasMismatch', 'true');
    } else if (tab === 'COMPLETED') {
      params.append('status', 'COMPLETED');
    } else if (tab === 'CANCELLED') {
      params.append('status', 'CANCELLED');
    } else {
      const backendStatus = mapUiStatusToBackend(filter.status);
      if (backendStatus) params.append('status', backendStatus);
      if (filter.status === 'MISMATCH') params.append('hasMismatch', 'true');
      if (filter.status === 'TODAY') params.append('isTodayDelivery', 'true');
    }

    if (filter.keyword?.trim()) params.append('keyword', filter.keyword.trim());
    if (filter.dateFrom) params.append('fromDate', filter.dateFrom);
    if (filter.dateTo) params.append('toDate', filter.dateTo);
    params.append('pageIndex', String(filter.pageIndex || 1));
    params.append('pageSize', String(filter.pageSize || 20));

    try {
      const res = await httpClient.get<ApiResponse<PagedResult<BackendGoodsReceiptDto>>>(
        `/goods-receipts?${params.toString()}`
      );

      if (res.data?.success && res.data.data) {
        const paged = res.data.data;
        return {
          items: (paged.items ?? []).map(mapDtoToListItem),
          totalCount: paged.totalItems ?? 0,
        };
      }

      return { items: [], totalCount: 0 };
    } catch (err: any) {
      throw new Error(
        err.response?.data?.message || err.message || 'Không thể tải danh sách phiếu nhập kho.'
      );
    }
  },

  /**
   * Lấy chi tiết một phiếu nhập kho
   */
  async getGoodsReceiptById(id: string): Promise<BackendGoodsReceiptDto | null> {
    const res = await httpClient.get<ApiResponse<BackendGoodsReceiptDto>>(`/goods-receipts/${id}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
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
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data.map((po) => ({
          id: String(po.id),
          poCode: po.code,
          branchId: String(po.branchId),
          branchName: po.branchName || po.branchCode || '',
          supplierId: String(po.supplierId),
          supplierName: po.supplierName,
          supplierCode: po.supplierCode,
          orderDate: '',
          expectedDeliveryDate: po.deliveryDate ? String(po.deliveryDate).slice(0, 10) : '',
          items: [],
          notes: '',
        }));
      }
      return [];
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể tải danh sách PO.');
    }
  },

  /**
   * Lấy chi tiết mặt hàng theo ID PO để điền tự động vào bảng kiểm đếm
   */
  async getPoReceiptDetails(poId: string): Promise<{
    id: string;
    code: string;
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    branchId: string;
    branchCode: string;
    branchName: string;
    items: Array<{
      purchaseOrderDetailId: string;
      productId: string;
      productCode: string;
      productName: string;
      unit: string;
      hasBatches: boolean;
      orderedQty: number;
      unitPrice: number;
      lineAmount: number;
    }>;
  } | null> {
    const res = await httpClient.get<ApiResponse<any>>(`/goods-receipts/po-details/${poId}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return null;
  },

  /**
   * Tạo phiếu nhập kho (DRAFT hoặc COMPLETED)
   */
  async createGoodsReceipt(command: Record<string, unknown>): Promise<BackendGoodsReceiptDto> {
    const res = await httpClient.post<ApiResponse<BackendGoodsReceiptDto>>('/goods-receipts', command);
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không thể tạo phiếu nhập kho.');
    }
    return res.data.data;
  },

  /**
   * Hoàn tất phiếu nhập kho: cập nhật tồn kho chi nhánh & chuyển trạng thái PO sang COMPLETED (GR-08)
   */
  async completeGoodsReceipt(id: string, note?: string): Promise<BackendGoodsReceiptDto> {
    const res = await httpClient.post<ApiResponse<BackendGoodsReceiptDto>>(
      `/goods-receipts/${id}/complete`,
      { note }
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không thể hoàn tất phiếu nhập kho.');
    }
    return res.data.data;
  },

  /**
   * Hủy phiếu nhập kho DRAFT và giải phóng đơn PO (GR-09)
   */
  async cancelGoodsReceipt(id: string, reason: string): Promise<BackendGoodsReceiptDto> {
    const res = await httpClient.post<ApiResponse<BackendGoodsReceiptDto>>(
      `/goods-receipts/${id}/cancel`,
      { reason }
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không thể hủy phiếu nhập kho.');
    }
    return res.data.data;
  },
};
