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
  ExchangePurchaseOrderSummary,
} from '../types/supplierReturn.types';

function extractApiError(err: unknown, fallback: string): Error {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return new Error(e.response?.data?.message || e.message || fallback);
}

export const supplierReturnApi = {
  async getList(filters: SupplierReturnFilterState): Promise<{
    items: SupplierReturnListItem[];
    totalCount: number;
    pageIndex: number;
    pageSize: number;
  }> {
    const params = new URLSearchParams();
    if (filters.keyword) params.append('keyword', filters.keyword);
    filters.returnCodes?.filter(Boolean).forEach((v) => params.append('returnCodes', v));
    filters.grnCodes?.filter(Boolean).forEach((v) => params.append('grnCodes', v));
    filters.supplierCodes?.filter(Boolean).forEach((v) => params.append('supplierCodes', v));
    filters.supplierNames?.filter(Boolean).forEach((v) => params.append('supplierNames', v));
    filters.branchNames?.filter(Boolean).forEach((v) => params.append('branchNames', v));
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.supplierId) params.append('supplierId', filters.supplierId);
    if (filters.status) params.append('status', filters.status);
    params.append('pageIndex', String(filters.pageIndex));
    params.append('pageSize', String(filters.pageSize));

    try {
      const res = await httpClient.get(`/supplier-returns?${params.toString()}`);
      const paged = res.data?.data;
      if (!paged) {
        throw new Error(res.data?.message || 'Không thể tải danh sách phiếu trả hàng.');
      }
      const items = paged.items || [];
      return {
        items,
        totalCount: paged.totalItems ?? paged.totalCount ?? items.length,
        pageIndex: paged.page ?? paged.pageIndex ?? filters.pageIndex,
        pageSize: paged.pageSize || filters.pageSize,
      };
    } catch (err: unknown) {
      throw extractApiError(err, 'Không thể tải danh sách phiếu trả hàng.');
    }
  },

  async getById(id: string): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.get(`/supplier-returns/${id}`);
      if (res.data?.data) {
        return res.data.data;
      }
      throw new Error(res.data?.message || `Không tìm thấy phiếu trả hàng #${id}`);
    } catch (err: unknown) {
      throw extractApiError(err, `Không thể tải chi tiết phiếu trả hàng #${id}.`);
    }
  },

  async getEligibleGrns(branchId?: string, supplierId?: string): Promise<EligibleGrnLookup[]> {
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      if (supplierId) params.append('supplierId', supplierId);
      const res = await httpClient.get(`/supplier-returns/eligible-grns?${params.toString()}`);
      return res.data?.data || [];
    } catch (err: unknown) {
      throw extractApiError(err, 'Không thể tải danh sách phiếu nhập kho đủ điều kiện trả hàng.');
    }
  },

  async getGrnReturnableLines(grnId: string): Promise<GrnReturnableLine[]> {
    try {
      const res = await httpClient.get(`/supplier-returns/grn-lines/${grnId}`);
      return res.data?.data || [];
    } catch (err: unknown) {
      throw extractApiError(err, 'Không thể tải danh sách sản phẩm có thể trả từ phiếu nhập kho.');
    }
  },

  async create(
    payload: CreateSupplierReturnPayload,
    _opts?: { allowMock?: boolean }
  ): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post('/supplier-returns', {
        ...payload,
        autoSubmit: payload.autoSubmit ?? payload.submitImmediately ?? false,
      });
      if (res.data?.data) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Không tạo được phiếu trả hàng.');
    } catch (err: unknown) {
      throw extractApiError(err, 'Không tạo được phiếu trả hàng.');
    }
  },

  async submit(id: string, notes?: string): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post(`/supplier-returns/${id}/submit`, { notes });
      if (res.data?.data) return res.data.data;
      throw new Error(res.data?.message || 'Không gửi được yêu cầu trả hàng.');
    } catch (err: unknown) {
      throw extractApiError(err, 'Không gửi được yêu cầu trả hàng.');
    }
  },

  async recordResponse(id: string, payload: RecordSupplierResponsePayload): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post(`/supplier-returns/${id}/supplier-response`, payload);
      if (res.data?.data) return res.data.data;
      throw new Error(res.data?.message || 'Không ghi nhận được phản hồi của nhà cung cấp.');
    } catch (err: unknown) {
      throw extractApiError(err, 'Không ghi nhận được phản hồi của nhà cung cấp.');
    }
  },

  async completeHandover(id: string, payload: CompleteHandoverPayload): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post(`/supplier-returns/${id}/complete-handover`, payload);
      if (res.data?.data) return res.data.data;
      throw new Error(res.data?.message || 'Không hoàn tất được bàn giao hàng.');
    } catch (err: unknown) {
      throw extractApiError(err, 'Không hoàn tất được bàn giao hàng.');
    }
  },

  async cancel(id: string, payload: CancelSupplierReturnPayload): Promise<SupplierReturnDetail> {
    try {
      const res = await httpClient.post(`/supplier-returns/${id}/cancel`, payload);
      if (res.data?.data) return res.data.data;
      throw new Error(res.data?.message || 'Không hủy được phiếu trả hàng.');
    } catch (err: unknown) {
      throw extractApiError(err, 'Không hủy được phiếu trả hàng.');
    }
  },

  async createExchangePurchaseOrders(id: string): Promise<ExchangePurchaseOrderSummary[]> {
    const res = await httpClient.post(`/supplier-returns/${id}/exchange-purchase-orders`);
    const data = res.data?.data;
    if (!data) throw new Error(res.data?.message || 'Không tạo được PO đổi hàng.');
    return Array.isArray(data) ? data : [data];
  },

  async getRelatedPurchaseOrders(id: string): Promise<ExchangePurchaseOrderSummary[]> {
    const res = await httpClient.get(`/supplier-returns/${id}/purchase-orders`);
    return res.data?.data || [];
  },

  async recordCostSharePayment(
    id: string,
    payload: { amount: number; note?: string }
  ): Promise<SupplierReturnDetail> {
    const res = await httpClient.post(`/supplier-returns/${id}/cost-share-payments`, payload);
    if (!res.data?.data) throw new Error(res.data?.message || 'Không ghi nhận được thanh toán.');
    return res.data.data;
  },
};
