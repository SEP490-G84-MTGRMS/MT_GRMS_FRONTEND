import { httpClient } from '../../../api/httpClient';
import { supplierReturnApi } from '../../supplier-return/api/supplierReturnApi';
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

const LOCAL_STORAGE_KEY = 'mt_grms_stocktakes_v1';

const SEED_STOCKTAKES: StocktakeDetail[] = [
  {
    id: 'stk-seed-001',
    code: 'KK-20261110-001',
    branchId: 'BR-01',
    branchCode: 'BR-01',
    branchName: 'BR-01 Main Store',
    scopeType: 'SELECTED_ITEMS',
    scopeReference: 'Kiểm kê lô sữa tươi & sữa chua Kho mát',
    status: 'PENDING_APPROVAL',
    createdByName: 'Nguyễn Văn Kho (Nhân viên)',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    submittedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    approvedByName: null,
    approvedAt: null,
    lineCount: 2,
    abnormalLineCount: 2,
    totalDefectiveQty: 8,
    totalDamagedAndExpiredQty: 2,
    totalVarianceQty: 0,
    note: 'Phát hiện 8 lốc sữa bị phồng hộp từ lô nhập GRN và 2 hộp rách vỏ tại kệ trưng bày.',
    rejectionReason: null,
    linkedSupplierReturns: [],
    lines: [
      {
        id: 'stkl-seed-001',
        branchStockId: 'bat-01',
        productId: 'prod-sua-01',
        sku: 'DY-SUA-01',
        productName: 'Sữa tươi tiệt trùng Vinamilk 100% Có đường (Lốc 4x180ml)',
        unit: 'Lốc',
        batchCode: 'BAT-202610-01',
        expiryDate: '2026-12-25T00:00:00.000Z',
        shelfLocation: 'C-B-01',
        supplierId: 'sup-vinamilk',
        supplierName: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
        goodsReceiptId: 'grn-001',
        goodsReceiptNo: 'GRN-20261008-01',
        goodsReceiptLineId: 'grnl-001',
        unitCost: 26500,
        systemQty: 80,
        goodQty: 70,
        defectiveQty: 8,
        damagedQty: 2,
        nearExpiryQty: 0,
        expiredQty: 0,
        actualQty: 80,
        varianceQty: 0,
        defectiveReasonCode: 'PACKAGING_DEFECT',
        defectiveReasonDetail: 'Hộp bị phồng / hở mép hàn từ thùng nguyên đai của NCC',
        nearExpiryAction: null,
        discountPercent: null,
        returnedQty: 0,
        returnableQty: 8,
        evidenceUrl: null,
        note: 'Đã tách riêng 8 lốc lỗi vào khu cách ly chờ duyệt trả NCC',
      },
      {
        id: 'stkl-seed-002',
        branchStockId: 'bat-02',
        productId: 'prod-sc-02',
        sku: 'DY-SC-02',
        productName: 'Sữa chua ăn Vinamilk Nha Đam (Lốc 4x100g)',
        unit: 'Lốc',
        batchCode: 'BAT-202610-05',
        expiryDate: '2026-11-18T00:00:00.000Z',
        shelfLocation: 'C-B-02',
        supplierId: 'sup-vinamilk',
        supplierName: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
        goodsReceiptId: 'grn-001',
        goodsReceiptNo: 'GRN-20261008-01',
        goodsReceiptLineId: 'grnl-002',
        unitCost: 21000,
        systemQty: 45,
        goodQty: 35,
        defectiveQty: 0,
        damagedQty: 0,
        nearExpiryQty: 10,
        expiredQty: 0,
        actualQty: 45,
        varianceQty: 0,
        defectiveReasonCode: null,
        defectiveReasonDetail: null,
        nearExpiryAction: 'DISCOUNT_SALE',
        discountPercent: 25,
        returnedQty: 0,
        returnableQty: 0,
        evidenceUrl: null,
        note: 'Còn 7 ngày HSD, đề xuất giảm giá 25% bán nhanh FEFO',
      },
    ],
  },
];

const loadLocalStocktakes = (): StocktakeDetail[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_STOCKTAKES));
      return [...SEED_STOCKTAKES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...SEED_STOCKTAKES];
  } catch {
    return [...SEED_STOCKTAKES];
  }
};

const saveLocalStocktakes = (list: StocktakeDetail[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
};

const is404OrNetworkError = (err: unknown): boolean => {
  const e = err as { response?: { status?: number }; code?: string };
  if (!e.response) return true;
  return e.response.status === 404;
};

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

    try {
      const res = await httpClient.get(`/stocktakes?${params.toString()}`);
      const paged = res.data?.data;
      const rawItems = paged?.items || [];
      return {
        items: rawItems.map(mapListItemDto),
        totalCount: paged?.totalItems ?? paged?.totalCount ?? rawItems.length,
        pageIndex: paged?.page ?? paged?.pageIndex ?? filters.pageIndex,
        pageSize: paged?.pageSize || filters.pageSize,
      };
    } catch (err: unknown) {
      if (!is404OrNetworkError(err)) {
        throw err;
      }
      let local = loadLocalStocktakes();
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        local = local.filter(
          (s) =>
            s.code.toLowerCase().includes(kw) ||
            (s.createdByName || '').toLowerCase().includes(kw) ||
            (s.branchName || '').toLowerCase().includes(kw)
        );
      }
      if (filters.branchId && filters.branchId !== 'ALL') {
        local = local.filter((s) => s.branchId === filters.branchId);
      }
      if (filters.status) {
        local = local.filter((s) => s.status === filters.status);
      }
      const start = (filters.pageIndex - 1) * filters.pageSize;
      return {
        items: local.slice(start, start + filters.pageSize),
        totalCount: local.length,
        pageIndex: filters.pageIndex,
        pageSize: filters.pageSize,
      };
    }
  },

  async getById(id: string): Promise<StocktakeDetail> {
    try {
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
    } catch (err: unknown) {
      if (!is404OrNetworkError(err)) {
        throw err;
      }
      const local = loadLocalStocktakes();
      const found = local.find((s) => s.id === id);
      if (!found) {
        throw new Error(`Không tìm thấy phiếu kiểm kê #${id}`);
      }
      return found;
    }
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

    try {
      const res = await httpClient.post('/stocktakes', command);
      if (!res.data?.data) {
        throw new Error(res.data?.message || 'Không thể tạo phiếu kiểm kê.');
      }
      return this.getById(res.data.data.id);
    } catch (err: unknown) {
      if (!is404OrNetworkError(err)) {
        throw err;
      }
      const local = loadLocalStocktakes();
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const code = `KK-${today}-${String(local.length + 1).padStart(3, '0')}`;
      const lines: StocktakeLine[] = payload.lines.map((l, idx) => {
        const actualQty =
          l.goodQty + l.defectiveQty + l.damagedQty + l.nearExpiryQty + l.expiredQty;
        const varianceQty = actualQty - l.systemQty;
        const returnableQty =
          l.defectiveQty + (l.nearExpiryAction === 'RETURN_SUPPLIER' ? l.nearExpiryQty : 0);
        return {
          id: `stkl-${Date.now()}-${idx}`,
          branchStockId: l.branchStockId || null,
          productId: l.productId,
          sku: l.sku,
          productName: l.productName,
          unit: l.unit,
          batchCode: l.batchCode || null,
          expiryDate: l.expiryDate || null,
          shelfLocation: l.shelfLocation || null,
          supplierId: l.supplierId || null,
          supplierName: l.supplierName || null,
          goodsReceiptId: l.goodsReceiptId || null,
          goodsReceiptNo: l.goodsReceiptNo || null,
          goodsReceiptLineId: l.goodsReceiptLineId || null,
          unitCost: l.unitCost,
          systemQty: l.systemQty,
          goodQty: l.goodQty,
          defectiveQty: l.defectiveQty,
          damagedQty: l.damagedQty,
          nearExpiryQty: l.nearExpiryQty,
          expiredQty: l.expiredQty,
          actualQty,
          varianceQty,
          defectiveReasonCode: l.defectiveReasonCode || null,
          defectiveReasonDetail: l.defectiveReasonDetail || null,
          nearExpiryAction: l.nearExpiryAction || null,
          discountPercent: l.discountPercent || null,
          returnedQty: 0,
          returnableQty,
          evidenceUrl: l.evidenceUrl || null,
          note: l.note || null,
        };
      });

      const newDetail: StocktakeDetail = {
        id: `stk-${Date.now()}`,
        code,
        branchId: payload.branchId,
        branchCode: payload.branchId,
        branchName: 'Chi nhánh kiểm kê',
        scopeType: payload.scopeType,
        scopeReference: payload.scopeReference || null,
        status: payload.submitImmediately ? 'PENDING_APPROVAL' : 'DRAFT',
        createdByName: 'Nhân viên kiểm kê',
        createdAt: new Date().toISOString(),
        submittedAt: payload.submitImmediately ? new Date().toISOString() : null,
        approvedByName: null,
        approvedAt: null,
        lineCount: lines.length,
        abnormalLineCount: lines.filter(
          (l) =>
            l.defectiveQty > 0 ||
            l.damagedQty > 0 ||
            l.nearExpiryQty > 0 ||
            l.expiredQty > 0 ||
            l.varianceQty !== 0
        ).length,
        totalDefectiveQty: lines.reduce((s, l) => s + l.defectiveQty, 0),
        totalDamagedAndExpiredQty: lines.reduce((s, l) => s + l.damagedQty + l.expiredQty, 0),
        totalVarianceQty: lines.reduce((s, l) => s + l.varianceQty, 0),
        note: payload.note || null,
        rejectionReason: null,
        lines,
        linkedSupplierReturns: [],
      };

      local.unshift(newDetail);
      saveLocalStocktakes(local);
      return newDetail;
    }
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

    try {
      const res = await httpClient.put(`/stocktakes/${id}`, command);
      if (!res.data?.data) {
        throw new Error(res.data?.message || 'Không thể cập nhật phiếu kiểm kê.');
      }
      return this.getById(id);
    } catch (err: unknown) {
      if (!is404OrNetworkError(err)) {
        throw err;
      }
      const local = loadLocalStocktakes();
      const idx = local.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Không tìm thấy phiếu kiểm kê.');
      const existing = local[idx];
      const lines: StocktakeLine[] = payload.lines.map((l, i) => {
        const actualQty =
          l.goodQty + l.defectiveQty + l.damagedQty + l.nearExpiryQty + l.expiredQty;
        const varianceQty = actualQty - l.systemQty;
        const returnableQty =
          l.defectiveQty + (l.nearExpiryAction === 'RETURN_SUPPLIER' ? l.nearExpiryQty : 0);
        return {
          id: existing.lines[i]?.id || `stkl-${Date.now()}-${i}`,
          branchStockId: l.branchStockId || null,
          productId: l.productId,
          sku: l.sku,
          productName: l.productName,
          unit: l.unit,
          batchCode: l.batchCode || null,
          expiryDate: l.expiryDate || null,
          shelfLocation: l.shelfLocation || null,
          supplierId: l.supplierId || null,
          supplierName: l.supplierName || null,
          goodsReceiptId: l.goodsReceiptId || null,
          goodsReceiptNo: l.goodsReceiptNo || null,
          goodsReceiptLineId: l.goodsReceiptLineId || null,
          unitCost: l.unitCost,
          systemQty: l.systemQty,
          goodQty: l.goodQty,
          defectiveQty: l.defectiveQty,
          damagedQty: l.damagedQty,
          nearExpiryQty: l.nearExpiryQty,
          expiredQty: l.expiredQty,
          actualQty,
          varianceQty,
          defectiveReasonCode: l.defectiveReasonCode || null,
          defectiveReasonDetail: l.defectiveReasonDetail || null,
          nearExpiryAction: l.nearExpiryAction || null,
          discountPercent: l.discountPercent || null,
          returnedQty: 0,
          returnableQty,
          evidenceUrl: l.evidenceUrl || null,
          note: l.note || null,
        };
      });

      const updated: StocktakeDetail = {
        ...existing,
        scopeType: payload.scopeType,
        scopeReference: payload.scopeReference || null,
        note: payload.note || null,
        status: payload.submitImmediately ? 'PENDING_APPROVAL' : existing.status,
        submittedAt: payload.submitImmediately ? new Date().toISOString() : existing.submittedAt,
        lineCount: lines.length,
        abnormalLineCount: lines.filter(
          (l) =>
            l.defectiveQty > 0 ||
            l.damagedQty > 0 ||
            l.nearExpiryQty > 0 ||
            l.expiredQty > 0 ||
            l.varianceQty !== 0
        ).length,
        totalDefectiveQty: lines.reduce((s, l) => s + l.defectiveQty, 0),
        totalDamagedAndExpiredQty: lines.reduce((s, l) => s + l.damagedQty + l.expiredQty, 0),
        totalVarianceQty: lines.reduce((s, l) => s + l.varianceQty, 0),
        lines,
      };
      local[idx] = updated;
      saveLocalStocktakes(local);
      return updated;
    }
  },

  async submit(id: string): Promise<StocktakeDetail> {
    try {
      const res = await httpClient.post(`/stocktakes/${id}/submit`);
      if (!res.data?.data) {
        throw new Error(res.data?.message || 'Không thể gửi duyệt phiếu kiểm kê.');
      }
      return this.getById(id);
    } catch (err: unknown) {
      if (!is404OrNetworkError(err)) {
        throw err;
      }
      const local = loadLocalStocktakes();
      const found = local.find((s) => s.id === id);
      if (!found) throw new Error('Không tìm thấy phiếu kiểm kê.');
      found.status = 'PENDING_APPROVAL';
      found.submittedAt = new Date().toISOString();
      saveLocalStocktakes(local);
      return found;
    }
  },

  async review(id: string, payload: ReviewStocktakePayload): Promise<StocktakeDetail> {
    const command = {
      decision: payload.action,
      reviewNote: payload.note || null,
    };
    try {
      const res = await httpClient.post(`/stocktakes/${id}/review`, command);
      if (!res.data?.data) {
        throw new Error(res.data?.message || 'Không thể duyệt phiếu kiểm kê.');
      }
      return this.getById(id);
    } catch (err: unknown) {
      if (!is404OrNetworkError(err)) {
        throw err;
      }
      const local = loadLocalStocktakes();
      const found = local.find((s) => s.id === id);
      if (!found) throw new Error('Không tìm thấy phiếu kiểm kê.');
      found.status =
        payload.action === 'APPROVE'
          ? 'APPROVED'
          : payload.action === 'NEEDS_RECOUNT'
          ? 'NEEDS_RECOUNT'
          : 'REJECTED';
      found.approvedByName = 'Chủ cửa hàng (Store Owner)';
      found.approvedAt = new Date().toISOString();
      found.rejectionReason = payload.note || null;
      saveLocalStocktakes(local);
      return found;
    }
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
    try {
      const res = await httpClient.post(`/stocktakes/${id}/create-return`, command);
      if (!res.data?.data) {
        throw new Error(res.data?.message || 'Không thể tạo phiếu trả hàng từ phiếu kiểm kê.');
      }
      const created = res.data.data;
      return Array.isArray(created) ? created : [created.id];
    } catch (err: unknown) {
      if (!is404OrNetworkError(err)) {
        throw err;
      }
      const local = loadLocalStocktakes();
      const found = local.find((s) => s.id === id);
      if (!found) throw new Error('Không tìm thấy phiếu kiểm kê.');

      const firstLine = found.lines[0];
      const createdReturn = await supplierReturnApi.create({
        goodsReceiptId: payload.goodsReceiptId || firstLine?.goodsReceiptId || 'grn-001',
        supplierId: firstLine?.supplierId || 'sup-vinamilk',
        branchId: found.branchId,
        reason: 'Hàng hư hỏng, lỗi chất lượng',
        reasonNotes: payload.note || `Khởi tạo từ Phiếu kiểm kê ${found.code}`,
        submitImmediately: payload.submitImmediately,
        lines: payload.lines.map((pl) => {
          const stLine = found.lines.find((l) => l.id === pl.stocktakeLineId);
          if (stLine) {
            stLine.returnedQty += pl.requestedQty;
            stLine.returnableQty = Math.max(0, stLine.returnableQty - pl.requestedQty);
          }
          return {
            productId: stLine?.productId || 'prod-01',
            goodsReceiptLineId: pl.goodsReceiptLineId || stLine?.goodsReceiptLineId || undefined,
            batchCode: stLine?.batchCode || undefined,
            expiryDate: stLine?.expiryDate || undefined,
            requestedQty: pl.requestedQty,
            unitCost: stLine?.unitCost || 0,
            notes: `Từ phiếu kiểm kê ${found.code}`,
          };
        }),
      });

      found.linkedSupplierReturns.push({
        id: createdReturn.id,
        code: createdReturn.code,
        supplierName: createdReturn.supplierName,
        status: createdReturn.status,
        totalRequestedQty: createdReturn.totalRequestedQty,
        totalEstimatedAmount: createdReturn.totalEstimatedAmount,
        createdAt: createdReturn.createdAt,
      });
      saveLocalStocktakes(local);
      return [createdReturn.id];
    }
  },
};
