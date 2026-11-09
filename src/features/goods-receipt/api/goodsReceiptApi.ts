import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  GoodsReceiptListItem,
  GrnFilterState,
  GrnItemDetail,
  GrnStatus,
  PoLookupOption,
  RejectionReason,
} from '../types/grn.types';
import { MOCK_GOODS_RECEIPTS, MOCK_AVAILABLE_POS } from '../lib/mockGrnData';

export interface BackendGoodsReceiptLineDto {
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
}

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
  lines: BackendGoodsReceiptLineDto[];
}

export interface BackendPoLookupDto {
  id: string;
  code: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  deliveryDate?: string;
  orderedAtUtc?: string;
  totalQty: number;
  totalAmount: number;
  status: string;
}

export interface BackendPoReceiptDetailsDto {
  id: string;
  code: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  deliveryDate?: string;
  totalQty: number;
  totalAmount: number;
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
}

export interface CreateGoodsReceiptPayload {
  purchaseOrderId: string;
  supplierId: string;
  branchId: string;
  invoiceNo?: string;
  receivedAtUtc?: string;
  freightFee: number;
  discountAmount: number;
  vatPercent: number;
  paymentMethod: string;
  paymentDueDate?: string;
  note?: string;
  autoComplete: boolean;
  lines: Array<{
    productId: string;
    purchaseOrderDetailId?: string;
    orderedQty: number;
    deliveredQty: number;
    acceptedQty: number;
    rejectedQty: number;
    unitPrice: number;
    batchCode?: string;
    manufactureDate?: string;
    expiryDate?: string;
    qualityStatus?: string;
    rejectionReason?: string;
    rejectionNote?: string;
    note?: string;
  }>;
}

/**
 * Chuẩn hóa trạng thái từ Backend (DRAFT, COMPLETED, CANCELLED + hasMismatch) sang GrnStatus của UI
 */
export function mapBackendStatusToUi(status: string, hasMismatch?: boolean): GrnStatus {
  const upper = (status || 'DRAFT').toUpperCase();
  if (upper === 'CANCELLED' || upper === 'CANCELED') {
    return 'CANCELED';
  }
  if (upper === 'COMPLETED' || upper === 'CONFIRMED') {
    return hasMismatch ? 'MISMATCH' : 'CONFIRMED';
  }
  if (upper === 'MISMATCH') {
    return 'MISMATCH';
  }
  if (upper === 'TODAY') {
    return 'TODAY';
  }
  return 'DRAFT';
}

/**
 * Ánh xạ DTO từ Backend sang GoodsReceiptListItem chuẩn cho Frontend
 */
export function mapDtoToListItem(dto: BackendGoodsReceiptDto): GoodsReceiptListItem {
  return {
    id: dto.id,
    code: dto.code,
    type: 'FROM_PO',
    typeLabel: 'Từ PO',
    receiveDate: dto.receivedAtUtc ? new Date(dto.receivedAtUtc).toLocaleString('vi-VN') : '',
    rawDate: dto.receivedAtUtc ? dto.receivedAtUtc.slice(0, 10) : '',
    branchId: dto.branchId,
    branchName: dto.branchName || dto.branchCode,
    supplierId: dto.supplierId,
    supplierName: dto.supplierName,
    supplierCode: dto.supplierCode,
    poReference: dto.purchaseOrderCode || '-',
    lineCount: dto.totalItems ?? (dto.lines ? dto.lines.length : 0),
    totalAmount: dto.grandTotal ?? 0,
    status: mapBackendStatusToUi(dto.status, dto.hasMismatch),
    receiverName: dto.receiverName || dto.receiverUserId || 'Thủ kho',
    notes: dto.note,
    cancelledReason: dto.cancellationReason,
    items: (dto.lines || []).map((l): GrnItemDetail => ({
      id: l.id,
      productId: l.productId,
      purchaseOrderDetailId: l.purchaseOrderDetailId,
      productCode: l.productCode,
      productName: l.productName,
      unit: l.unit || 'Cái',
      hasBatches: l.hasBatches,
      orderedQty: l.orderedQty,
      receivedQty: l.deliveredQty,
      acceptedQty: l.acceptedQty,
      rejectedQty: l.rejectedQty,
      shortageQty: l.shortageQty,
      differenceQty: l.differenceQty ?? (l.acceptedQty - l.orderedQty),
      unitPrice: l.unitPrice,
      lineTotal: l.lineAmount ?? (l.acceptedQty * l.unitPrice),
      batchCode: l.batchCode,
      manufactureDate: l.manufactureDate ? l.manufactureDate.slice(0, 10) : undefined,
      expiryDate: l.expiryDate ? l.expiryDate.slice(0, 10) : undefined,
      rejectionReason: l.rejectionReason as RejectionReason | undefined,
      rejectionNote: l.rejectionNote,
      note: l.note,
    })),
  };
}

export const goodsReceiptApi = {
  /**
   * Lấy danh sách phiếu nhập kho phân trang & bộ lọc
   */
  async getGoodsReceipts(filter: Partial<GrnFilterState>): Promise<GoodsReceiptListItem[]> {
    try {
      const params = new URLSearchParams();
      if (filter.branchId && filter.branchId !== 'ALL') {
        params.append('branchId', filter.branchId);
      }
      if (filter.supplierId && filter.supplierId !== 'ALL') {
        params.append('supplierId', filter.supplierId);
      }
      if (filter.status && filter.status !== 'ALL') {
        if (filter.status === 'CONFIRMED') {
          params.append('status', 'COMPLETED');
        } else if (filter.status === 'CANCELED' || filter.status === 'CANCELLED') {
          params.append('status', 'CANCELLED');
        } else if (filter.status === 'MISMATCH') {
          params.append('hasMismatch', 'true');
        } else if (filter.status === 'TODAY') {
          params.append('isTodayDelivery', 'true');
        } else {
          params.append('status', filter.status);
        }
      }
      if (filter.keyword) params.append('keyword', filter.keyword);
      if (filter.dateFrom) params.append('fromDate', filter.dateFrom);
      if (filter.dateTo) params.append('toDate', filter.dateTo);
      if (filter.tab === 'TODAY') params.append('isTodayDelivery', 'true');
      if (filter.tab === 'MISMATCH') params.append('hasMismatch', 'true');
      params.append('pageIndex', String(filter.pageIndex || 1));
      params.append('pageSize', String(filter.pageSize || 100));

      const res = await httpClient.get<ApiResponse<PagedResult<BackendGoodsReceiptDto>>>(
        `/goods-receipts?${params.toString()}`
      );

      if (res.data?.data?.items && Array.isArray(res.data.data.items)) {
        return res.data.data.items.map(mapDtoToListItem);
      }
      return [];
    } catch (err) {
      if (import.meta.env.MODE === 'test') {
        return MOCK_GOODS_RECEIPTS;
      }
      console.warn('Lỗi tải phiếu nhập kho từ backend:', err);
      throw err;
    }
  },

  /**
   * Lấy chi tiết một phiếu nhập kho theo ID
   */
  async getGoodsReceiptById(id: string): Promise<BackendGoodsReceiptDto | null> {
    try {
      const res = await httpClient.get<ApiResponse<BackendGoodsReceiptDto>>(`/goods-receipts/${id}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      if (import.meta.env.MODE === 'test') {
        const mock = MOCK_GOODS_RECEIPTS.find((r) => r.id === id || r.code === id);
        if (mock) {
          return {
            id: mock.id,
            code: mock.code,
            purchaseOrderCode: mock.poReference,
            supplierId: mock.supplierId,
            supplierCode: mock.supplierCode,
            supplierName: mock.supplierName,
            branchId: mock.branchId,
            branchCode: mock.branchId,
            branchName: mock.branchName,
            status: mock.status === 'CONFIRMED' ? 'COMPLETED' : mock.status === 'CANCELED' ? 'CANCELLED' : 'DRAFT',
            receivedAtUtc: new Date().toISOString(),
            receiverUserId: mock.receiverName,
            receiverName: mock.receiverName,
            subTotal: mock.totalAmount,
            freightFee: 0,
            discountAmount: 0,
            vatPercent: 0,
            vatAmount: 0,
            grandTotal: mock.totalAmount,
            paymentMethod: 'AP',
            totalItems: mock.lineCount,
            totalOrderedQty: mock.items.reduce((s, i) => s + i.orderedQty, 0),
            totalReceivedQty: mock.items.reduce((s, i) => s + i.receivedQty, 0),
            totalAcceptedQty: mock.items.reduce((s, i) => s + (i.acceptedQty ?? i.receivedQty), 0),
            totalRejectedQty: mock.items.reduce((s, i) => s + (i.rejectedQty ?? 0), 0),
            totalShortageQty: 0,
            hasMismatch: mock.status === 'MISMATCH',
            note: mock.notes,
            lines: mock.items.map((it) => ({
              id: it.id,
              productId: it.productId || it.id,
              productCode: it.productCode,
              productName: it.productName,
              unit: it.unit,
              hasBatches: true,
              orderedQty: it.orderedQty,
              deliveredQty: it.receivedQty,
              acceptedQty: it.acceptedQty ?? it.receivedQty,
              rejectedQty: it.rejectedQty ?? 0,
              shortageQty: Math.max(0, it.orderedQty - it.receivedQty),
              differenceQty: it.differenceQty,
              unitPrice: it.unitPrice,
              lineAmount: it.lineTotal,
              batchCode: it.batchCode,
              expiryDate: it.expiryDate,
              isNearExpiry: false,
              freightAllocated: 0,
              discountAllocated: 0,
              vatAllocated: 0,
              landedUnitCost: it.unitPrice,
              qualityStatus: 'ACCEPTED',
              note: it.note,
            })),
          };
        }
      }
      console.warn('Lỗi tải chi tiết phiếu nhập kho:', err);
    }
    return null;
  },

  /**
   * Tra cứu danh sách đơn PO hợp lệ để lập phiếu nhập kho
   */
  async getPoLookup(branchId?: string): Promise<PoLookupOption[]> {
    try {
      const isGuid = branchId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId);
      const param = isGuid ? `?branchId=${branchId}` : '';
      const res = await httpClient.get<ApiResponse<BackendPoLookupDto[]>>(`/goods-receipts/po-lookup${param}`);
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data.map((po) => ({
          id: po.id,
          poCode: po.code,
          branchId: po.branchId,
          branchCode: po.branchCode,
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
      return [];
    } catch {
      return import.meta.env.MODE === 'test' ? MOCK_AVAILABLE_POS : [];
    }
  },

  /**
   * Lấy chi tiết mặt hàng theo ID hoặc mã PO để điền tự động vào bảng kiểm đếm
   */
  async getPoReceiptDetails(poIdOrCode: string): Promise<{
    id: string;
    code: string;
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    branchId: string;
    branchCode: string;
    branchName: string;
    deliveryDate?: string;
    items: GrnItemDetail[];
  } | null> {
    try {
      const res = await httpClient.get<ApiResponse<BackendPoReceiptDetailsDto>>(
        `/goods-receipts/po-details/${encodeURIComponent(poIdOrCode)}`
      );
      if (res.data?.data) {
        const d = res.data.data;
        const todayCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const defaultExp = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return {
          id: d.id,
          code: d.code,
          supplierId: d.supplierId,
          supplierCode: d.supplierCode,
          supplierName: d.supplierName,
          branchId: d.branchId,
          branchCode: d.branchCode,
          branchName: d.branchName,
          deliveryDate: d.deliveryDate,
          items: (d.items || []).map((it, idx): GrnItemDetail => ({
            id: it.purchaseOrderDetailId || it.productId || `po-line-${idx}`,
            productId: it.productId,
            purchaseOrderDetailId: it.purchaseOrderDetailId,
            productCode: it.productCode,
            productName: it.productName,
            unit: it.unit || 'Cái',
            hasBatches: it.hasBatches,
            orderedQty: it.orderedQty,
            receivedQty: it.orderedQty,
            acceptedQty: it.orderedQty,
            rejectedQty: 0,
            shortageQty: 0,
            differenceQty: 0,
            unitPrice: it.unitPrice,
            lineTotal: it.lineAmount ?? (it.orderedQty * it.unitPrice),
            batchCode: `LOT-${todayCode}-${String(idx + 1).padStart(2, '0')}`,
            expiryDate: defaultExp,
          })),
        };
      }
    } catch {
      if (import.meta.env.MODE === 'test') {
        const mockPo = MOCK_AVAILABLE_POS.find(
          (p) => p.poCode.toLowerCase() === poIdOrCode.toLowerCase()
        );
        if (mockPo) {
          return {
            id: mockPo.id || mockPo.poCode,
            code: mockPo.poCode,
            supplierId: mockPo.supplierId,
            supplierCode: mockPo.supplierCode,
            supplierName: mockPo.supplierName,
            branchId: mockPo.branchId,
            branchCode: mockPo.branchId,
            branchName: mockPo.branchName,
            items: mockPo.items,
          };
        }
      }
    }
    return null;
  },

  /**
   * Tạo phiếu nhập kho (DRAFT hoặc COMPLETED)
   */
  async createGoodsReceipt(command: CreateGoodsReceiptPayload): Promise<BackendGoodsReceiptDto> {
    const res = await httpClient.post<ApiResponse<BackendGoodsReceiptDto>>('/goods-receipts', command);
    if (!res.data.data) {
      throw new Error('Không nhận được dữ liệu phiếu nhập kho từ máy chủ.');
    }
    return res.data.data;
  },

  /**
   * Hoàn tất / Xác nhận phiếu nhập kho: cập nhật tồn kho chi nhánh, lô FEFO, giá vốn MAC, công nợ AP & chuyển PO sang COMPLETED (GR-08)
   */
  async completeGoodsReceipt(id: string, note?: string): Promise<BackendGoodsReceiptDto> {
    const res = await httpClient.put<ApiResponse<BackendGoodsReceiptDto>>(
      `/goods-receipts/${id}/confirm`,
      { note }
    );
    if (!res.data.data) {
      throw new Error('Không nhận được dữ liệu xác nhận phiếu nhập kho từ máy chủ.');
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
    if (!res.data.data) {
      throw new Error('Không nhận được dữ liệu hủy phiếu nhập kho từ máy chủ.');
    }
    return res.data.data;
  },
};
