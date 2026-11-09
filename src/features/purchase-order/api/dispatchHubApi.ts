import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type {
  SupplierDispatchGroup,
  CutoffUrgency,
  SplitPoPreview,
  DispatchScope,
  SplitMatrixBatchResult,
  DispatchSupplierDetail,
  DispatchEmailOptions,
  SupplierDispatchPackage,
} from '../types/po.types';
import { purchaseOrderApi } from './purchaseOrderApi';

export interface DispatchHubCounts {
  all: number;
  critical: number;
  today: number;
  later: number;
  completed: number;
}

export interface DispatchSupplierHubResult {
  serverNow: string;
  viewFrom: string;
  durationDays: number;
  suppliers: SupplierDispatchGroup[];
  counts: DispatchHubCounts;
}

export interface DispatchHubResult {
  branchId: string;
  branchName: string;
  serverNow: string;
  viewFrom: string;
  durationDays: number;
  draftPoId?: string;
  scope?: DispatchScope;
  weekStartDate?: string;
  weekEndDate?: string;
  expectedPoCount?: number;
  totalDraftAmount?: number;
  totalDraftLines?: number;
  suppliers: SupplierDispatchGroup[];
  counts: DispatchHubCounts;
}

interface BackendDispatchHub {
  branchId: string;
  branchName: string;
  serverNow: string;
  viewFrom: string;
  durationDays: number;
  draftPoId?: string;
  scope?: DispatchScope;
  weekStartDate?: string;
  weekEndDate?: string;
  expectedPoCount?: number;
  totalDraftAmount?: number;
  totalDraftLines?: number;
  suppliers: Array<{
    supplierId: string;
    code: string;
    name: string;
    categoryTags: string[];
    cutoffTimeStr: string;
    countdownDisplay: string;
    remainingMinutes?: number;
    urgency: string;
    expectedDelivery: string;
    minOrderValue: number;
    items: Array<{
      id: string;
      productId: string;
      name: string;
      sku: string;
      unit: string;
      price: number;
      qty: number;
      deliveryDate: string;
      cutoffSchedule: string;
    }>;
    note: string;
    status: string;
    poCode?: string;
    canAmend?: boolean;
    dispatchedAt?: string;
    draftPoId?: string;
  }>;
  counts: {
    all: number;
    critical: number;
    today: number;
    later: number;
    completed: number;
  };
}

function mapUrgency(u: string): CutoffUrgency {
  if (u === 'critical' || u === 'today' || u === 'later') return u;
  return 'later';
}

function toDateKey(value: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const dispatchHubApi = {
  /** Hub theo NCC (multi-branch) — dùng cho trang list dispatch-hub. */
  async getSupplierHub(params?: {
    keyword?: string;
    urgency?: string;
    durationDays?: number;
  }): Promise<DispatchSupplierHubResult> {
    const res = await httpClient.get<ApiResponse<{
      serverNow: string;
      viewFrom: string;
      durationDays: number;
      suppliers: Array<{
        supplierId: string;
        code: string;
        name: string;
        cutoffTimeStr: string;
        countdownDisplay: string;
        remainingMinutes?: number;
        urgency: string;
        expectedDelivery: string;
        status: string;
        poCode?: string;
        canAmend?: boolean;
        hasPendingChanges?: boolean;
        pendingChangeLineCount?: number;
        pendingChanges?: Array<{
          productId: string;
          productName: string;
          sku: string;
          unit: string;
          deliveryDate: string;
          draftQty: number;
          committedQty: number;
          poCode?: string;
          branchId?: string;
          branchCode?: string;
          branchName?: string;
          updateStatus?: string;
        }>;
        linkedBranchCount: number;
        branchesWithQty: number;
        skuCount: number;
        totalQty: number;
        totalAmount: number;
        branches: Array<{
          branchId: string;
          branchCode: string;
          branchName: string;
          skuCount: number;
          totalQty: number;
          totalAmount: number;
          status: string;
          hasPendingChanges?: boolean;
        }>;
      }>;
      counts: DispatchHubCounts;
    }>>('/purchase-orders/dispatch-hub/suppliers', {
      params: {
        Keyword: params?.keyword || undefined,
        Urgency: params?.urgency && params.urgency !== 'all' ? params.urgency : undefined,
        DurationDays: params?.durationDays ?? 14,
      },
    });

    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không tải được hub chốt đơn.');
    }

    const d = res.data.data;
    return {
      serverNow: d.serverNow,
      viewFrom: d.viewFrom,
      durationDays: d.durationDays,
      counts: {
        all: d.counts?.all ?? 0,
        critical: d.counts?.critical ?? 0,
        today: d.counts?.today ?? 0,
        later: d.counts?.later ?? 0,
        completed: d.counts?.completed ?? 0,
      },
      suppliers: (d.suppliers || []).map((s) => ({
        id: s.supplierId,
        code: s.code,
        name: s.name,
        categoryTags: [],
        cutoffTimeStr: s.cutoffTimeStr,
        countdownDisplay: s.countdownDisplay,
        remainingMinutes: s.remainingMinutes,
        urgency: mapUrgency(s.urgency),
        expectedDelivery: s.expectedDelivery,
        minOrderValue: 0,
        items: [],
        note: '',
        status: s.status === 'dispatched' ? 'dispatched' : 'draft',
        poCode: s.poCode,
        canAmend: Boolean(s.canAmend || (s.poCode && s.status !== 'dispatched')),
        hasPendingChanges: Boolean(s.hasPendingChanges),
        pendingChangeLineCount: s.pendingChangeLineCount ?? 0,
        pendingChanges: (s.pendingChanges || []).map((line) => ({
          productId: line.productId,
          productName: line.productName || '',
          sku: line.sku || '',
          unit: line.unit || '',
          deliveryDate: toDateKey(line.deliveryDate),
          draftQty: Number(line.draftQty) || 0,
          committedQty: Number(line.committedQty) || 0,
          poCode: line.poCode,
          branchId: line.branchId,
          branchCode: line.branchCode,
          branchName: line.branchName,
          updateStatus:
            line.updateStatus === 'LOCKED_CUTOFF' ? ('LOCKED_CUTOFF' as const) : ('EDITABLE' as const),
        })),
        linkedBranchCount: s.linkedBranchCount ?? 0,
        branchesWithQty: s.branchesWithQty ?? 0,
        skuCount: s.skuCount ?? 0,
        totalQty: s.totalQty ?? 0,
        totalAmount: s.totalAmount ?? 0,
        branches: (s.branches || []).map((b) => ({
          branchId: b.branchId,
          branchCode: b.branchCode,
          branchName: b.branchName,
          skuCount: b.skuCount ?? 0,
          totalQty: b.totalQty ?? 0,
          totalAmount: b.totalAmount ?? 0,
          status: b.status,
          hasPendingChanges: Boolean(b.hasPendingChanges),
        })),
      })),
    };
  },

  /** Chi tiết 1 NCC — sản phẩm nhóm theo cửa hàng. */
  async getSupplierDetail(supplierId: string, durationDays = 14): Promise<DispatchSupplierDetail> {
    const res = await httpClient.get<ApiResponse<{
      supplierId: string;
      code: string;
      name: string;
      email?: string;
      serverNow: string;
      viewFrom: string;
      durationDays: number;
      cutoffTimeStr: string;
      countdownDisplay: string;
      remainingMinutes?: number;
      urgency: string;
      status: string;
      branches: Array<{
        branchId: string;
        branchCode: string;
        branchName: string;
        status: string;
        items: Array<{
          id: string;
          productId: string;
          name: string;
          sku: string;
          unit: string;
          price: number;
          qty: number;
          committedQty?: number;
          deliveryDate: string;
          cutoffSchedule: string;
          dayStatus: string;
        }>;
      }>;
    }>>(`/purchase-orders/dispatch-hub/suppliers/${supplierId}`, {
      params: { DurationDays: durationDays },
    });

    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không tải được chi tiết NCC.');
    }

    const d = res.data.data;
    return {
      supplierId: d.supplierId,
      code: d.code,
      name: d.name,
      email: d.email,
      serverNow: d.serverNow,
      viewFrom: d.viewFrom,
      durationDays: d.durationDays,
      cutoffTimeStr: d.cutoffTimeStr,
      countdownDisplay: d.countdownDisplay,
      remainingMinutes: d.remainingMinutes,
      urgency: mapUrgency(d.urgency),
      status: d.status,
      branches: (d.branches || []).map((b) => ({
        branchId: b.branchId,
        branchCode: b.branchCode,
        branchName: b.branchName,
        status: b.status,
        items: (b.items || []).map((it) => ({
          id: it.id,
          productId: it.productId,
          name: it.name,
          sku: it.sku,
          unit: it.unit,
          price: it.price,
          qty: Number(it.qty) || 0,
          committedQty: Number(it.committedQty) || 0,
          deliveryDate: toDateKey(it.deliveryDate),
          cutoffSchedule: it.cutoffSchedule,
          dayStatus: it.dayStatus,
        })),
      })),
    };
  },

  /** Preview chốt 1 NCC trên mọi cửa hàng liên kết. */
  async previewSupplierSplit(
    supplierId: string,
    scope: DispatchScope,
    weekStartDate?: string,
    note?: string
  ): Promise<SplitMatrixBatchResult> {
    const res = await httpClient.post<ApiResponse<SplitMatrixBatchResult>>(
      '/purchase-orders/matrix/split/preview',
      {
        branchId: '00000000-0000-0000-0000-000000000000',
        supplierId,
        scope,
        weekStartDate,
        note,
      }
    );

    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không thể xem trước dữ liệu chốt PO.');
    }

    return res.data.data;
  },

  /** Chốt 1 NCC trên mọi cửa hàng liên kết theo Scope (+ email options). */
  async dispatchSupplierByScope(
    supplierId: string,
    scope: DispatchScope,
    weekStartDate?: string,
    note?: string,
    emailOptions?: DispatchEmailOptions
  ): Promise<SplitMatrixBatchResult> {
    try {
      const res = await httpClient.post<ApiResponse<SplitMatrixBatchResult>>(
        '/purchase-orders/matrix/split',
        {
          branchId: '00000000-0000-0000-0000-000000000000',
          supplierId,
          scope,
          weekStartDate,
          note,
          emailSendMode: emailOptions?.emailSendMode ?? 'SEND_NOW',
          scheduledSendAt: emailOptions?.scheduledSendAt,
          ccEmails: emailOptions?.ccEmails ?? [],
        }
      );

      if (!res.data?.success || !res.data.data) {
        throw new Error(res.data?.message || 'Không thể chốt đơn mua hàng.');
      }

      return res.data.data;
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === 'string' ? err.response.data : null);
      throw new Error(apiMsg || err?.message || 'Không thể chốt đơn mua hàng.');
    }
  },

  async getDispatchPackage(packageId: string): Promise<SupplierDispatchPackage> {
    const res = await httpClient.get<ApiResponse<SupplierDispatchPackage>>(
      `/purchase-orders/dispatch-packages/${packageId}`
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không tải được trạng thái package.');
    }
    return res.data.data;
  },

  async downloadDispatchPackage(packageId: string): Promise<Blob> {
    const res = await httpClient.get(`/purchase-orders/dispatch-packages/${packageId}/download`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  async cancelPackageSchedule(packageId: string): Promise<SupplierDispatchPackage> {
    const res = await httpClient.post<ApiResponse<SupplierDispatchPackage>>(
      `/purchase-orders/dispatch-packages/${packageId}/cancel-schedule`
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không hủy được lịch gửi.');
    }
    return res.data.data;
  },

  async retryPackageEmail(packageId: string): Promise<SupplierDispatchPackage> {
    const res = await httpClient.post<ApiResponse<SupplierDispatchPackage>>(
      `/purchase-orders/dispatch-packages/${packageId}/retry-email`
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không gửi lại email được.');
    }
    return res.data.data;
  },


  async getHub(params: {
    branchId: string;
    viewFrom?: string;
    durationDays?: number;
    keyword?: string;
    urgency?: string;
    scope?: DispatchScope;
    weekStartDate?: string;
  }): Promise<DispatchHubResult> {
    const res = await httpClient.get<ApiResponse<BackendDispatchHub>>('/purchase-orders/dispatch-hub', {
      params: {
        BranchId: params.branchId,
        ViewFrom: params.viewFrom,
        DurationDays: params.durationDays ?? 14,
        Keyword: params.keyword || undefined,
        Urgency: params.urgency && params.urgency !== 'all' ? params.urgency : undefined,
        Scope: params.scope,
        WeekStartDate: params.weekStartDate,
      },
    });

    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không tải được hub chốt đơn.');
    }

    const d = res.data.data;
    return {
      branchId: d.branchId,
      branchName: d.branchName,
      serverNow: d.serverNow,
      viewFrom: d.viewFrom,
      durationDays: d.durationDays,
      draftPoId: d.draftPoId,
      scope: d.scope,
      weekStartDate: d.weekStartDate,
      weekEndDate: d.weekEndDate,
      expectedPoCount: d.expectedPoCount,
      totalDraftAmount: d.totalDraftAmount,
      totalDraftLines: d.totalDraftLines,
      counts: {
        all: d.counts?.all ?? 0,
        critical: d.counts?.critical ?? 0,
        today: d.counts?.today ?? 0,
        later: d.counts?.later ?? 0,
        completed: d.counts?.completed ?? 0,
      },
      suppliers: (d.suppliers || []).map((s) => ({
        id: s.supplierId,
        code: s.code,
        name: s.name,
        categoryTags: s.categoryTags || [],
        cutoffTimeStr: s.cutoffTimeStr,
        countdownDisplay: s.countdownDisplay,
        remainingMinutes: s.remainingMinutes,
        urgency: mapUrgency(s.urgency),
        expectedDelivery: s.expectedDelivery,
        minOrderValue: s.minOrderValue || 0,
        items: (s.items || []).map((it) => ({
          id: it.id,
          productId: it.productId,
          deliveryDate: toDateKey(it.deliveryDate),
          name: it.name,
          sku: it.sku,
          unit: it.unit,
          price: it.price,
          qty: it.qty,
          cutoffSchedule: it.cutoffSchedule,
        })),
        note: s.note || '',
        status: s.status === 'dispatched' ? 'dispatched' : 'draft',
        poCode: s.poCode,
        canAmend: Boolean(s.canAmend || (s.poCode && s.status !== 'dispatched')),
        dispatchedAt: s.dispatchedAt,
      })),
    };
  },

  /**
   * Tính toán trước (Dry Run) kết quả chốt PO theo phạm vi NEAREST hoặc WEEK.
   * Không lưu vào cơ sở dữ liệu.
   */
  async previewSplit(
    branchId: string,
    scope: DispatchScope,
    weekStartDate?: string,
    note?: string
  ): Promise<SplitMatrixBatchResult> {
    const res = await httpClient.post<ApiResponse<SplitMatrixBatchResult>>(
      '/purchase-orders/matrix/split/preview',
      {
        branchId,
        scope,
        weekStartDate,
        note,
      }
    );

    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không thể xem trước dữ liệu chốt PO.');
    }

    return res.data.data;
  },

  /**
   * Chốt PO tự động từ Draft DB theo Scope (NEAREST hoặc WEEK).
   * Partial success: Xử lý độc lập từng group (NCC, Ngày giao).
   */
  async dispatchByScope(
    branchId: string,
    scope: DispatchScope,
    weekStartDate?: string,
    note?: string
  ): Promise<SplitMatrixBatchResult> {
    const res = await httpClient.post<ApiResponse<SplitMatrixBatchResult>>(
      '/purchase-orders/matrix/split',
      {
        branchId,
        scope,
        weekStartDate,
        note,
      }
    );

    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không thể chốt đơn mua hàng.');
    }

    return res.data.data;
  },

  /**
   * Chốt PO cho các nhóm NCC đã chọn (Legacy fallback từ items UI) — tách theo (supplierId, deliveryDate).
   */
  async dispatchSuppliers(
    branchId: string,
    suppliers: SupplierDispatchGroup[],
    draftPoId?: string,
    note?: string
  ) {
    const groupsByKey = new Map<string, SplitPoPreview>();

    for (const s of suppliers) {
      if (s.status === 'dispatched') continue;

      for (const it of s.items) {
        if (it.qty <= 0 || !it.productId || !it.deliveryDate) continue;
        const key = `${s.id}|${it.deliveryDate}`;
        let group = groupsByKey.get(key);
        if (!group) {
          group = {
            id: `PO-${it.deliveryDate}-${s.id.slice(0, 8)}`,
            supplierId: s.id,
            supplierName: s.name,
            branchId,
            branchName: '',
            deliveryDate: it.deliveryDate,
            dowName: '',
            dateShort: it.deliveryDate.slice(5).replace('-', '/'),
            cutoffStatus: 'OPEN',
            isCutoffDue: false,
            items: [],
            totalQuantity: 0,
            totalAmount: 0,
            status: 'DRAFT',
          };
          groupsByKey.set(key, group);
        }

        group.items.push({
          productId: it.productId,
          productName: it.name,
          sku: it.sku,
          category: '',
          unit: it.unit,
          price: it.price,
          moq: 0,
          employeeQty: 0,
          storeQty: it.qty,
          finalQty: it.qty,
          lineTotal: it.qty * it.price,
        });
        group.totalQuantity += it.qty;
        group.totalAmount += it.qty * it.price;
      }
    }

    const splitPos = Array.from(groupsByKey.values());
    if (splitPos.length === 0) {
      throw new Error('Không có dòng số lượng > 0 để chốt PO.');
    }

    return purchaseOrderApi.splitMatrixPo(branchId, splitPos, note, draftPoId);
  },
};
