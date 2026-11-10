import { httpClient } from '../../../api/httpClient';
import type {
  StocktakeListItem,
  StocktakeDetail,
  StocktakeLine,
  StocktakeFilterState,
  CreateStocktakePayload,
  ReviewStocktakePayload,
  CreateReturnFromStocktakePayload,
  LinkedSupplierReturnSummary,
} from '../types/stocktake.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapLineDto = (dto: any): StocktakeLine => {
  const eligible =
    dto.eligibleReturnQty !== undefined
      ? Number(dto.eligibleReturnQty)
      : Number(dto.defectiveQty || 0) +
        (dto.nearExpiryAction === 'NEAR_EXPIRY_RETURN' || dto.nearExpiryAction === 'RETURN_SUPPLIER'
          ? Number(dto.nearExpiryQty || 0)
          : 0);
  const returned = Number(dto.returnedQty || 0);
  return {
    id: dto.id,
    branchStockId: dto.branchStockId || null,
    productId: dto.productId,
    sku: dto.sku || dto.productCode || '',
    productName: dto.productName || '',
    unit: dto.unit || dto.unitName || 'Cái',
    batchCode: dto.batchCode ?? dto.batchNumber ?? null,
    expiryDate: dto.expiryDate || null,
    shelfLocation: dto.shelfLocation || null,
    supplierId: dto.supplierId || null,
    supplierName: dto.supplierName || null,
    goodsReceiptId: dto.originalGrnId ?? dto.goodsReceiptId ?? null,
    goodsReceiptNo: dto.originalGrnCode ?? dto.goodsReceiptNo ?? null,
    goodsReceiptLineId: dto.originalGrnLineId ?? dto.goodsReceiptLineId ?? null,
    unitCost: Number(dto.unitCost ?? dto.unitPrice ?? 0),
    systemQty: Number(dto.systemQty || 0),
    goodQty: Number(dto.goodQty || 0),
    defectiveQty: Number(dto.defectiveQty || 0),
    damagedQty: Number(dto.damagedQty || 0),
    nearExpiryQty: Number(dto.nearExpiryQty || 0),
    expiredQty: Number(dto.expiredQty || 0),
    actualQty: Number(dto.actualQty || 0),
    varianceQty: Number(dto.varianceQty || 0),
    defectiveReasonCode: dto.defectiveReasonCode || null,
    defectiveReasonDetail: dto.defectiveReasonDetail || null,
    nearExpiryAction:
      dto.nearExpiryAction === 'NEAR_EXPIRY_RETURN'
        ? 'RETURN_SUPPLIER'
        : dto.nearExpiryAction === 'NEAR_EXPIRY_MARKDOWN'
        ? 'DISCOUNT_SALE'
        : dto.nearExpiryAction || null,
    discountPercent: dto.discountPercent ?? null,
    returnedQty: returned,
    returnableQty: Math.max(0, eligible - returned),
    evidenceUrl: dto.evidenceUrl || null,
    note: dto.note || null,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapListItemDto = (dto: any): StocktakeListItem => ({
  id: dto.id,
  code: dto.code || dto.stocktakeCode || '',
  branchId: dto.branchId,
  branchCode: dto.branchCode || '',
  branchName: dto.branchName || '',
  scopeType: dto.scope || dto.scopeType || 'LOT',
  scopeReference: dto.scopeReference || null,
  status: dto.status || 'DRAFT',
  createdByName: dto.createdByName || 'Nhân viên',
  createdAt: dto.startedAt || dto.createdAt || new Date().toISOString(),
  submittedAt: dto.submittedAt || null,
  approvedByName: dto.reviewedByName || dto.approvedByName || null,
  approvedAt: dto.reviewedAt || dto.approvedAt || null,
  lineCount: Number(dto.totalLines ?? dto.lineCount ?? 0),
  abnormalLineCount: Number(dto.anomalyLines ?? dto.abnormalLineCount ?? 0),
  totalDefectiveQty: Number(dto.returnEligibleLines ?? dto.totalDefectiveQty ?? 0),
  totalDamagedAndExpiredQty: Number(dto.totalDamagedAndExpiredQty ?? 0),
  totalVarianceQty: Number(dto.totalVarianceQty ?? 0),
});

const toBackendScope = (scopeType: string): string => {
  if (scopeType === 'FULL_BRANCH') return 'ALL';
  if (scopeType === 'BY_CATEGORY') return 'CATEGORY';
  if (scopeType === 'SELECTED_ITEMS') return 'LOT';
  return 'ALL';
};

const toBackendNearExpiryAction = (action?: string | null): string | null => {
  if (!action) return null;
  if (action === 'RETURN_SUPPLIER' || action === 'NEAR_EXPIRY_RETURN') return 'NEAR_EXPIRY_RETURN';
  return 'NEAR_EXPIRY_MARKDOWN';
};

export const stocktakeApi = {
  async getList(filters: StocktakeFilterState): Promise<{
    items: StocktakeListItem[];
    totalCount: number;
    pageIndex: number;
    pageSize: number;
  }> {
    const params = new URLSearchParams();
    if (filters.keyword) params.append('keyword', filters.keyword);
    if (filters.branchId && filters.branchId !== 'ALL') params.append('branchId', filters.branchId);
    if (filters.status) params.append('status', filters.status);
    params.append('pageIndex', String(filters.pageIndex));
    params.append('pageSize', String(filters.pageSize));

    const res = await httpClient.get(`/stocktakes?${params.toString()}`);
    const paged = res.data?.data;
    const rawItems = paged?.items || [];
    return {
      items: rawItems.map(mapListItemDto),
      totalCount: paged?.totalItems ?? paged?.totalCount ?? rawItems.length,
      pageIndex: paged?.page ?? paged?.pageIndex ?? filters.pageIndex,
      pageSize: paged?.pageSize || filters.pageSize,
    };
  },

  async getById(id: string): Promise<StocktakeDetail> {
    const res = await httpClient.get(`/stocktakes/${id}`);
    const dto = res.data?.data;
    if (!dto) {
      throw new Error(res.data?.message || 'Không tìm thấy phiếu kiểm kê.');
    }

    const lines: StocktakeLine[] = (dto.lines || []).map(mapLineDto);
    const abnormalLineCount = lines.filter(
      (l) =>
        l.defectiveQty > 0 ||
        l.damagedQty > 0 ||
        l.nearExpiryQty > 0 ||
        l.expiredQty > 0 ||
        l.varianceQty !== 0
    ).length;
    const totalDefectiveQty = lines.reduce((s, l) => s + l.defectiveQty, 0);
    const totalDamagedAndExpiredQty = lines.reduce((s, l) => s + l.damagedQty + l.expiredQty, 0);
    const totalVarianceQty = lines.reduce((s, l) => s + l.varianceQty, 0);

    let linkedSupplierReturns: LinkedSupplierReturnSummary[] = [];
    try {
      const srRes = await httpClient.get(
        `/supplier-returns?keyword=${encodeURIComponent(dto.code || '')}&pageIndex=1&pageSize=20`
      );
      const srItems = srRes.data?.data?.items || [];
      linkedSupplierReturns = srItems
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((r: any) => r.stocktakeId === dto.id || r.stocktakeCode === dto.code)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => ({
          id: r.id,
          code: r.code,
          supplierName: r.supplierName,
          status: r.status,
          totalRequestedQty: Number(r.totalRequestedQty || 0),
          totalEstimatedAmount: Number(r.totalEstimatedAmount || 0),
          createdAt: r.createdAt,
        }));
    } catch {
      // ignore if supplier-returns lookup fails
    }

    return {
      ...mapListItemDto(dto),
      lineCount: lines.length,
      abnormalLineCount,
      totalDefectiveQty,
      totalDamagedAndExpiredQty,
      totalVarianceQty,
      note: dto.note || null,
      rejectionReason: dto.reviewNote || dto.rejectionReason || null,
      lines,
      linkedSupplierReturns,
    };
  },

  async create(payload: CreateStocktakePayload): Promise<StocktakeDetail> {
    const branchStockIds = payload.lines
      .map((l) => l.branchStockId)
      .filter((id): id is string => Boolean(id));

    const command = {
      branchId: payload.branchId,
      scope: toBackendScope(payload.scopeType),
      reasonType: 'PERIODIC',
      note: payload.note || null,
      branchStockIds: branchStockIds.length > 0 ? branchStockIds : null,
      lines: payload.lines.map((l) => ({
        id: null,
        productId: l.productId,
        branchStockId: l.branchStockId || null,
        goodQty: l.goodQty,
        defectiveQty: l.defectiveQty,
        damagedQty: l.damagedQty,
        nearExpiryQty: l.nearExpiryQty,
        expiredQty: l.expiredQty,
        defectiveReasonCode: l.defectiveReasonCode || null,
        nearExpiryAction: toBackendNearExpiryAction(l.nearExpiryAction),
        evidenceUrl: l.evidenceUrl || null,
        note: l.note || null,
      })),
      autoSubmit: payload.submitImmediately,
    };

    const res = await httpClient.post('/stocktakes', command);
    if (!res.data?.data) {
      throw new Error(res.data?.message || 'Không thể tạo phiếu kiểm kê.');
    }
    return this.getById(res.data.data.id);
  },

  async update(id: string, payload: CreateStocktakePayload): Promise<StocktakeDetail> {
    const command = {
      reasonType: 'PERIODIC',
      note: payload.note || null,
      lines: payload.lines.map((l) => ({
        id: null,
        productId: l.productId,
        branchStockId: l.branchStockId || null,
        goodQty: l.goodQty,
        defectiveQty: l.defectiveQty,
        damagedQty: l.damagedQty,
        nearExpiryQty: l.nearExpiryQty,
        expiredQty: l.expiredQty,
        defectiveReasonCode: l.defectiveReasonCode || null,
        nearExpiryAction: toBackendNearExpiryAction(l.nearExpiryAction),
        evidenceUrl: l.evidenceUrl || null,
        note: l.note || null,
      })),
      autoSubmit: payload.submitImmediately,
    };

    const res = await httpClient.put(`/stocktakes/${id}`, command);
    if (!res.data?.data) {
      throw new Error(res.data?.message || 'Không thể cập nhật phiếu kiểm kê.');
    }
    return this.getById(id);
  },

  async submit(id: string): Promise<StocktakeDetail> {
    const res = await httpClient.post(`/stocktakes/${id}/submit`);
    if (!res.data?.data) {
      throw new Error(res.data?.message || 'Không thể gửi duyệt phiếu kiểm kê.');
    }
    return this.getById(id);
  },

  async review(id: string, payload: ReviewStocktakePayload): Promise<StocktakeDetail> {
    const command = {
      decision: payload.action,
      reviewNote: payload.note || null,
    };
    const res = await httpClient.post(`/stocktakes/${id}/review`, command);
    if (!res.data?.data) {
      throw new Error(res.data?.message || 'Không thể duyệt phiếu kiểm kê.');
    }
    return this.getById(id);
  },

  async createReturnFromStocktake(
    id: string,
    payload: CreateReturnFromStocktakePayload
  ): Promise<string[]> {
    const command = {
      goodsReceiptId: payload.goodsReceiptId || '00000000-0000-0000-0000-000000000000',
      resolutionType: payload.resolutionType,
      reasonNotes: payload.note || null,
      attachmentUrl: null,
      lines: payload.lines.map((l) => ({
        stocktakeLineId: l.stocktakeLineId,
        goodsReceiptId: l.goodsReceiptId || null,
        goodsReceiptLineId: l.goodsReceiptLineId || null,
        requestedQty: l.requestedQty,
        notes: l.note || null,
      })),
      autoSubmit: payload.submitImmediately,
    };
    const res = await httpClient.post(`/stocktakes/${id}/create-return`, command);
    if (!res.data?.data) {
      throw new Error(res.data?.message || 'Không thể tạo phiếu trả hàng từ phiếu kiểm kê.');
    }
    const created = res.data.data;
    return Array.isArray(created) ? created : [created.id];
  },
};
