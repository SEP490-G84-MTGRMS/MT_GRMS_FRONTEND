import { httpClient } from '../../../api/httpClient';
import type {
  SupplierReturnListItem,
  SupplierReturnDetail,
  EligibleGrnLookup,
  GrnReturnableLine,
  SupplierReturnFilterState,
  CreateSupplierReturnPayload,
  RecordSupplierResponsePayload,
  CompleteHandoverPayload,
  CancelSupplierReturnPayload,
} from '../types/supplierReturn.types';
import {
  MOCK_SUPPLIER_RETURNS,
  MOCK_ELIGIBLE_GRNS,
  MOCK_GRN_RETURNABLE_LINES,
} from '../lib/mockSupplierReturnData';

// Local cache for mutations when offline or fallback
let localReturns: SupplierReturnDetail[] = [...MOCK_SUPPLIER_RETURNS];

export const supplierReturnApi = {
  async getList(filters: SupplierReturnFilterState): Promise<{
    items: SupplierReturnListItem[];
    totalCount: number;
    pageIndex: number;
    pageSize: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters.keyword) params.append('keyword', filters.keyword);
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.supplierId) params.append('supplierId', filters.supplierId);
      if (filters.status) params.append('status', filters.status);
      params.append('pageIndex', String(filters.pageIndex));
      params.append('pageSize', String(filters.pageSize));

      const res = await httpClient.get(`/supplier-returns?${params.toString()}`);
      if (res.data?.data) {
        return {
          items: res.data.data.items || [],
          totalCount: res.data.data.totalCount || 0,
          pageIndex: res.data.data.pageIndex || filters.pageIndex,
          pageSize: res.data.data.pageSize || filters.pageSize,
        };
      }
    } catch {
      // Fallback to local
    }

    let filtered = [...localReturns];
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.code.toLowerCase().includes(kw) ||
          r.goodsReceiptCode.toLowerCase().includes(kw) ||
          r.supplierName.toLowerCase().includes(kw)
      );
    }
    if (filters.branchId) {
      filtered = filtered.filter((r) => r.branchId === filters.branchId);
    }
    if (filters.supplierId) {
      filtered = filtered.filter((r) => r.supplierId === filters.supplierId);
    }
    if (filters.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    const start = (filters.pageIndex - 1) * filters.pageSize;
    const paged = filtered.slice(start, start + filters.pageSize);

    return {
      items: paged,
      totalCount: filtered.length,
      pageIndex: filters.pageIndex,
      pageSize: filters.pageSize,
    };
  },

  async getById(id: string): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.get(`/supplier-returns/${id}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }

    const found = localReturns.find((r) => r.id === id);
    if (!found) {
      throw new Error(`Không tìm thấy phiếu trả hàng #${id}`);
    }
    return found;
  },

  async getEligibleGrns(branchId?: string, supplierId?: string): Promise<EligibleGrnLookup[]> {
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      if (supplierId) params.append('supplierId', supplierId);
      const res = await httpClient.get(`/supplier-returns/eligible-grns?${params.toString()}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }

    let list = [...MOCK_ELIGIBLE_GRNS];
    if (branchId) list = list.filter((g) => g.branchId === branchId);
    if (supplierId) list = list.filter((g) => g.supplierId === supplierId);
    return list;
  },

  async getGrnReturnableLines(grnId: string): Promise<GrnReturnableLine[]> {
    try {
      const res = await httpClient.get(`/supplier-returns/grn-lines/${grnId}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }

    return MOCK_GRN_RETURNABLE_LINES[grnId] || [];
  },

  async create(payload: CreateSupplierReturnPayload): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post('/supplier-returns', payload);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }

    const grn = MOCK_ELIGIBLE_GRNS.find((g) => g.id === payload.goodsReceiptId);
    const code = `RTV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(localReturns.length + 1).padStart(3, '0')}`;
    const totalRequestedQty = payload.lines.reduce((sum, l) => sum + l.requestedQty, 0);
    const totalEstimatedAmount = payload.lines.reduce((sum, l) => sum + l.requestedQty * l.unitCost, 0);

    const newReturn: SupplierReturnDetail = {
      id: `rtv-${Date.now()}`,
      code,
      goodsReceiptId: payload.goodsReceiptId,
      goodsReceiptCode: grn?.code || 'GRN-MOCK',
      supplierId: payload.supplierId || grn?.supplierId || '',
      supplierCode: 'SUP-CODE',
      supplierName: grn?.supplierName || 'Nhà cung cấp',
      branchId: payload.branchId || grn?.branchId || '',
      branchCode: payload.branchId || grn?.branchId || '',
      branchName: grn?.branchName || 'Chi nhánh',
      status: payload.submitImmediately ? 'PENDING_SUPPLIER' : 'DRAFT',
      reason: payload.reason,
      reasonNotes: payload.reasonNotes,
      attachmentUrl: payload.attachmentUrl,
      totalRequestedQty,
      totalApprovedQty: 0,
      totalHandedOverQty: 0,
      totalEstimatedAmount,
      createdAt: new Date().toISOString(),
      submittedAt: payload.submitImmediately ? new Date().toISOString() : undefined,
      lines: payload.lines.map((l, idx) => ({
        id: `rtvl-${Date.now()}-${idx}`,
        productId: l.productId,
        sku: 'SKU-' + (idx + 1),
        productName: 'Sản phẩm ' + (idx + 1),
        unit: 'Cái',
        goodsReceiptLineId: l.goodsReceiptLineId,
        batchCode: l.batchCode,
        expiryDate: l.expiryDate,
        receivedQty: l.requestedQty + 10,
        returnedQty: 0,
        pendingReturnQty: l.requestedQty,
        availableReturnQty: 10,
        requestedQty: l.requestedQty,
        approvedQty: 0,
        rejectedQty: 0,
        handedOverQty: 0,
        unitCost: l.unitCost,
        lineTotal: l.requestedQty * l.unitCost,
        notes: l.notes,
      })),
    };

    localReturns.unshift(newReturn);
    return newReturn;
  },

  async submit(id: string, notes?: string): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post(`/supplier-returns/${id}/submit`, { notes });
      if (res.data?.data) return res.data.data;
    } catch {
      // Fallback
    }

    const ret = localReturns.find((r) => r.id === id);
    if (!ret) throw new Error('Không tìm thấy phiếu trả');
    ret.status = 'PENDING_SUPPLIER';
    ret.submittedAt = new Date().toISOString();
    if (notes) ret.reasonNotes = (ret.reasonNotes ? ret.reasonNotes + ' | ' : '') + notes;
    return ret;
  },

  async recordResponse(id: string, payload: RecordSupplierResponsePayload): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post(`/supplier-returns/${id}/supplier-response`, payload);
      if (res.data?.data) return res.data.data;
    } catch {
      // Fallback
    }

    const ret = localReturns.find((r) => r.id === id);
    if (!ret) throw new Error('Không tìm thấy phiếu trả');
    ret.supplierResponseNote = payload.supplierResponseNote;
    ret.respondedAt = new Date().toISOString();

    if (payload.resultType === 'REJECTED') {
      ret.status = 'REJECTED';
      ret.totalApprovedQty = 0;
      ret.lines.forEach((l) => {
        l.approvedQty = 0;
        l.rejectedQty = l.requestedQty;
      });
    } else {
      ret.status = 'APPROVED';
      let totalApproved = 0;
      ret.lines.forEach((l) => {
        const item = payload.lines.find((pl) => pl.lineId === l.id);
        if (item) {
          l.approvedQty = item.approvedQty;
          l.rejectedQty = Math.max(0, l.requestedQty - item.approvedQty);
          l.rejectionReason = item.rejectionReason;
        } else if (payload.resultType === 'APPROVED_FULL') {
          l.approvedQty = l.requestedQty;
          l.rejectedQty = 0;
        }
        totalApproved += l.approvedQty;
      });
      ret.totalApprovedQty = totalApproved;
    }
    return ret;
  },

  async completeHandover(id: string, payload: CompleteHandoverPayload): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post(`/supplier-returns/${id}/complete-handover`, payload);
      if (res.data?.data) return res.data.data;
    } catch {
      // Fallback
    }

    const ret = localReturns.find((r) => r.id === id);
    if (!ret) throw new Error('Không tìm thấy phiếu trả');
    ret.status = 'COMPLETED';
    ret.handedOverAt = new Date().toISOString();
    ret.handedOverBy = payload.handedOverBy;

    let totalHanded = 0;
    ret.lines.forEach((l) => {
      const item = payload.lines.find((pl) => pl.lineId === l.id);
      if (item) {
        l.handedOverQty = item.handedOverQty;
      } else {
        l.handedOverQty = l.approvedQty;
      }
      totalHanded += l.handedOverQty;
    });
    ret.totalHandedOverQty = totalHanded;
    return ret;
  },

  async cancel(id: string, payload: CancelSupplierReturnPayload): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post(`/supplier-returns/${id}/cancel`, payload);
      if (res.data?.data) return res.data.data;
    } catch {
      // Fallback
    }

    const ret = localReturns.find((r) => r.id === id);
    if (!ret) throw new Error('Không tìm thấy phiếu trả');
    ret.status = 'CANCELLED';
    ret.cancellationReason = payload.reason;
    return ret;
  },
};
