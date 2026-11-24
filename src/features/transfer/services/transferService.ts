import { httpClient } from '../../../api/httpClient';
import type { TransferOrder, TransferItem } from '../types';

type ApiEnvelope<T> = { data?: T; Data?: T };
type ApiPage<T> = { items?: T[]; Items?: T[] };
export type TransferDemandItem = { productId: string; quantity: number; unit: string };
export type TransferAllocationPreview = {
  toBranchId: string;
  isFullyAllocated: boolean;
  totals: Array<{ productId: string; productCode: string; productName: string; requestedQuantity: number; allocatedQuantity: number; shortageQuantity: number; unit: string }>;
  sources: Array<{ fromBranchId: string; fromBranchName: string; items: Array<{ productId: string; productCode: string; productName: string; requestedQuantity: number; allocatedQuantity: number; shortageQuantity: number; unit: string }> }>;
};
export type ApiTransfer = {
  id: string;
  transferCode: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  createdBy: string;
  createdAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
  expectedDeliveryDate?: string;
  status: string;
  completionResult?: string;
  origin?: string;
  priority?: string;
  submittedAt?: string;
  hasDiscrepancy?: boolean;
  totalAmount: number;
  note?: string;
  discrepancyNote?: string;
  cancelReason?: string;
  items: Array<{
    id: string;
    productId: string;
    productCode: string;
    productName: string;
    unit: string;
    sentQuantity: number;
    receivedQuantity: number;
    damagedQuantity: number;
    batchCode?: string;
    expiryDate?: string;
    unitPrice: number;
    amount: number;
    discrepancyReason?: string;
  }>;
  history?: Array<{ id: string; fromStatus?: string; toStatus: string; action: string; actorUserId: string; actorBranchId?: string; actorRole: string; reason?: string; createdAt: string }>;
};

const unwrap = <T,>(response: ApiEnvelope<T>): T => (response?.data ?? response?.Data ?? response) as T;

export const toIsoDate = (value?: string): string | undefined => {
  if (!value || !value.trim()) return undefined;
  const trimmed = value.trim();
  const vietnameseDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vietnameseDate) {
    const day = vietnameseDate[1].padStart(2, '0');
    const month = vietnameseDate[2].padStart(2, '0');
    const year = vietnameseDate[3];
    return `${year}-${month}-${day}T00:00:00Z`;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const getTransferErrorMessage = (error: unknown): string => {
  if (typeof error !== 'object' || error === null) {
    return error instanceof Error ? error.message : 'Không thể tạo phiếu chuyển.';
  }

  const response = (error as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (typeof data === 'object' && data !== null) {
    const body = data as Record<string, unknown>;
    for (const key of ['message', 'Message', 'detail', 'Detail', 'title', 'Title']) {
      const message = body[key];
      if (typeof message === 'string' && message.trim()) return message;
    }

    const errors = body.errors ?? body.Errors;
    if (typeof errors === 'object' && errors !== null) {
      const firstError = Object.values(errors as Record<string, unknown>)
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .find((value): value is string => typeof value === 'string' && Boolean(value.trim()));
      if (firstError) return firstError;
    }
  }

  return error instanceof Error ? error.message : 'Không thể tạo phiếu chuyển.';
};

export const mapTransfer = (dto: ApiTransfer): TransferOrder => ({
  id: dto.id,
  transferCode: dto.transferCode,
  fromBranchId: dto.fromBranchId,
  fromBranchName: dto.fromBranchName,
  toBranchId: dto.toBranchId,
  toBranchName: dto.toBranchName,
  createdBy: dto.createdBy,
  transferDate: new Date(dto.createdAt).toLocaleString('vi-VN'),
  dispatchedAt: dto.dispatchedAt,
  receiveDate: dto.receivedAt ? new Date(dto.receivedAt).toLocaleString('vi-VN') : undefined,
  expectedDeliveryDate: dto.expectedDeliveryDate,
  status: dto.status as TransferOrder['status'],
  completionResult: dto.completionResult as TransferOrder['completionResult'],
  origin: (dto.origin ?? 'OwnerAllocation') as TransferOrder['origin'],
  priority: (dto.priority ?? 'Normal') as TransferOrder['priority'],
  submittedAt: dto.submittedAt,
  hasDiscrepancy: dto.hasDiscrepancy ?? false,
  totalAmount: dto.totalAmount,
  note: dto.note,
  discrepancyNote: dto.discrepancyNote,
  cancelReason: dto.cancelReason,
  items: (dto.items ?? []).map((line): TransferItem => ({
    id: line.id,
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    unitName: line.unit,
    onHandSender: 0,
    onHandReceiver: 0,
    sentQty: line.sentQuantity,
    receivedQty: line.receivedQuantity,
    damagedQty: line.damagedQuantity,
    unitPrice: line.unitPrice,
    amount: line.amount,
    batchNumber: line.batchCode,
    expiryDate: line.expiryDate,
    note: line.discrepancyReason,
  })),
  history: dto.history ?? [],
});

export const transferService = {
  async branches() {
    const response = await httpClient.get<ApiEnvelope<ApiPage<{ id: string; branchCode?: string; code?: string; name: string; address?: string; phone?: string; status?: string }>>>('/branches', {
      params: { pageIndex: 1, pageSize: 100, status: 'Active' },
    });
    const page = unwrap(response.data);
    const list = Array.isArray(page) ? page : (page?.items ?? page?.Items ?? []);
    return list.map((branch) => ({
      id: branch.id,
      code: branch.branchCode ?? branch.code ?? '',
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    }));
  },

  async products(branchId: string) {
    const response = await httpClient.get<ApiEnvelope<ApiPage<Record<string, unknown>>>>(`/branches/${branchId}/products`, {
      params: { PageIndex: 1, PageSize: 500, Status: 'Active' },
    });
    const page = unwrap(response.data);
    const list = Array.isArray(page) ? page : (page?.items ?? page?.Items ?? []);
    return list
      .map((product) => {
      const id = String(product.productId ?? product.id ?? '');
        const stock = Number(product.currentStock ?? product.quantityOnHand ?? 0);
        const code = String(product.sku ?? product.productCode ?? product.code ?? '');
        const name = String(product.name ?? product.productName ?? '');
        const unit = String(product.unit ?? product.baseUnit ?? product.unitName ?? 'Cái');
        const price = Number(product.retailPrice ?? product.unitPrice ?? product.price ?? 0);
        const batches = Array.isArray(product.batches) ? (product.batches as Array<Record<string, unknown>>) : [];
        return {
          id,
          productId: id,
          productCode: code,
          productName: name,
          unitName: unit,
          onHandSender: stock,
          onHandReceiver: 0,
          sentQty: 1,
          unitPrice: price,
          amount: price,
          hasBatchManagement: Boolean(product.hasBatches ?? (batches.length > 0)),
          batches: batches.map((batch, index) => ({
            id: String(batch.id ?? index),
            batchNumber: String(batch.batchCode ?? batch.batchNumber ?? ''),
            expiryDate: String(batch.expiryDate ?? ''),
            onHand: Number(batch.availableQuantity ?? batch.quantityOnHand ?? 0),
          })),
        } satisfies TransferItem;
      })
      .filter((product) => product.productId);
  },

  async batches(branchId: string) {
    const response = await httpClient.get<ApiEnvelope<Array<{ productId: string; batchCode?: string; expiryDate?: string; availableQuantity: number }>>>('/transfers/stock-batches', {
      params: { branchId },
    });
    const data = unwrap(response.data);
    const list = Array.isArray(data)
      ? data
      : (data as ApiPage<{ productId: string; batchCode?: string; expiryDate?: string; availableQuantity: number }>)?.items ??
        (data as ApiPage<{ productId: string; batchCode?: string; expiryDate?: string; availableQuantity: number }>)?.Items ??
        [];
    return list.map((batch, index) => ({
      id: `${batch.productId}-${index}`,
      productId: batch.productId,
      batchNumber: batch.batchCode ?? '',
      expiryDate: batch.expiryDate ?? '',
      onHand: batch.availableQuantity,
    }));
  },

  async stockBatches(branchId: string) {
    return this.batches(branchId);
  },

  async list(params: Record<string, unknown> = {}) {
    const queryParams = { ...params };
    if (typeof queryParams.fromDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(queryParams.fromDate)) {
      queryParams.fromDate = `${queryParams.fromDate}T00:00:00`;
    }
    if (typeof queryParams.toDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(queryParams.toDate)) {
      queryParams.toDate = `${queryParams.toDate}T00:00:00`;
    }
    const response = await httpClient.get<ApiEnvelope<ApiPage<ApiTransfer>>>('/transfers', {
      params: queryParams,
    });
    const page = unwrap(response.data);
    const data = (page ?? {}) as ApiPage<ApiTransfer> & { totalItems?: number; TotalItems?: number; totalCount?: number; TotalCount?: number };
    const items = (data.items ?? data.Items ?? (Array.isArray(page) ? page : [])).map(mapTransfer);
    return {
      items,
      totalItems: data.totalItems ?? data.TotalItems ?? data.totalCount ?? data.TotalCount ?? items.length,
    };
  },

  async get(id: string) {
    const response = await httpClient.get<ApiEnvelope<ApiTransfer>>(`/transfers/${id}`);
    return mapTransfer(unwrap(response.data));
  },

  async getById(id: string) {
    return this.get(id);
  },

  async create(input: { fromBranchId: string; toBranchId: string; note?: string; origin?: 'OwnerAllocation' | 'StaffUrgentRequest'; priority?: 'Normal' | 'Urgent'; relatedOrderId?: string; items: TransferItem[] }) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>('/transfers', {
      ...input,
      dispatchNow: false,
      origin: input.origin ?? 'OwnerAllocation',
      priority: input.priority ?? 'Normal',
      items: input.items.map((item) => ({
        productId: item.productId,
        quantity: item.sentQty,
        unit: item.unitName?.trim() || 'Cái',
        batchCode: item.batchNumber?.trim() || undefined,
        expiryDate: toIsoDate(item.expiryDate),
        unitPrice: item.unitPrice,
      })),
    });
    return mapTransfer(unwrap(response.data));
  },

  async submit(id: string) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(`/transfers/${id}/submit`);
    return mapTransfer(unwrap(response.data));
  },

  async dispatch(id: string) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(`/transfers/${id}/dispatch`);
    return mapTransfer(unwrap(response.data));
  },

  async receive(id: string, items: TransferItem[], note?: string) {
    const response = await httpClient.put<ApiEnvelope<ApiTransfer>>(`/transfers/${id}/receive`, {
      note,
      items: items.map((item) => ({
        detailId: item.id,
        receivedQuantity: item.receivedQty ?? item.sentQty,
        damagedQuantity: item.damagedQty ?? 0,
        discrepancyReason: item.note?.trim() || ((item.damagedQty ?? 0) > 0 || (item.receivedQty ?? item.sentQty) < item.sentQty ? note?.trim() : undefined),
      })),
    });
    return mapTransfer(unwrap(response.data));
  },

  async cancel(id: string, reason: string) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(`/transfers/${id}/cancel`, { reason });
    return mapTransfer(unwrap(response.data));
  },

  async returnToSource(id: string, reason: string) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(`/transfers/${id}/return`, { reason });
    return mapTransfer(unwrap(response.data));
  },

  async previewUrgentAllocation(input: { toBranchId: string; requiredAt?: string; relatedOrderId?: string; note?: string; items: TransferDemandItem[] }) {
    const response = await httpClient.post<ApiEnvelope<TransferAllocationPreview>>('/transfer-requests/allocation-preview', input);
    return unwrap(response.data);
  },

  async createUrgentRequest(input: { toBranchId: string; requiredAt?: string; relatedOrderId?: string; note?: string; items: TransferDemandItem[] }) {
    const response = await httpClient.post<ApiEnvelope<{ id: string; requestCode: string; transfers: ApiTransfer[] }>>('/transfer-requests', input);
    return unwrap(response.data);
  },
};
