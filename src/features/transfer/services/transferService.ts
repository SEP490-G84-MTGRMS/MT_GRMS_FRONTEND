import { httpClient } from '../../../api/httpClient';
import type { TransferOrder, TransferItem } from '../types';
import { formatDateTimeVN, isBatchExpired } from '../utils/transferDate';

type ApiEnvelope<T> = { data?: T; Data?: T };
type ApiPage<T> = { items?: T[]; Items?: T[] };
export type TransferDemandItem = { productId: string; quantity: number; unit: string };
export type TransferAvailableProduct = {
  productId: string;
  productCode: string;
  productName: string;
  baseUnit: string;
  totalAvailableQuantity: number;
};
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

const generateIdempotencyKey = (idempotencyKey?: string): string => {
  if (idempotencyKey?.trim()) return idempotencyKey.trim();
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const idempotencyConfig = (idempotencyKey?: string) => ({
  headers: { 'Idempotency-Key': generateIdempotencyKey(idempotencyKey) },
});

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
    return error instanceof Error ? error.message : 'Không thể xử lý yêu cầu điều chuyển.';
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

  return error instanceof Error ? error.message : 'Không thể xử lý yêu cầu điều chuyển.';
};

export const mapTransfer = (dto: ApiTransfer): TransferOrder => ({
  id: dto.id,
  transferCode: dto.transferCode,
  fromBranchId: dto.fromBranchId,
  fromBranchName: dto.fromBranchName,
  toBranchId: dto.toBranchId,
  toBranchName: dto.toBranchName,
  createdBy: dto.createdBy,
  transferDate: formatDateTimeVN(dto.createdAt, dto.createdAt),
  dispatchedAt: dto.dispatchedAt,
  receiveDate: dto.completionResult === 'Returned'
    ? undefined
    : dto.receivedAt
      ? formatDateTimeVN(dto.receivedAt)
      : undefined,
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
        const price = Number(product.landedCostPerUnit ?? product.costPrice ?? product.retailPrice ?? product.unitPrice ?? product.price ?? 0);
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
          batches: batches.map((batch, index) => {
            const expiryDate = String(batch.expiryDate ?? '');
            return {
              id: String(batch.id ?? index),
              batchNumber: String(batch.batchCode ?? batch.batchNumber ?? ''),
              expiryDate,
              onHand: Number(batch.availableQuantity ?? batch.quantityOnHand ?? 0),
              isExpired: isBatchExpired(expiryDate),
            };
          }),
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
    return list.map((batch, index) => {
      const expiryDate = batch.expiryDate ?? '';
      return {
        id: `${batch.productId}-${index}`,
        productId: batch.productId,
        batchNumber: batch.batchCode ?? '',
        expiryDate,
        onHand: batch.availableQuantity,
        isExpired: isBatchExpired(expiryDate),
      };
    });
  },

  async stockBatches(branchId: string) {
    return this.batches(branchId);
  },

  async availableUrgentProducts(toBranchId?: string): Promise<TransferAvailableProduct[]> {
    const response = await httpClient.get<ApiEnvelope<TransferAvailableProduct[]>>('/transfer-requests/available-products', {
      params: toBranchId ? { toBranchId } : undefined,
    });
    const data = unwrap(response.data);
    const list = Array.isArray(data)
      ? data
      : (data as ApiPage<TransferAvailableProduct>)?.items ??
        (data as ApiPage<TransferAvailableProduct>)?.Items ??
        [];
    return list;
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

  async create(
    input: {
      fromBranchId: string;
      toBranchId: string;
      note?: string;
      origin?: 'OwnerAllocation' | 'StaffUrgentRequest';
      priority?: 'Normal' | 'Urgent';
      relatedOrderId?: string;
      submitImmediately?: boolean;
      items: TransferItem[];
    },
    idempotencyKey?: string
  ) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(
      '/transfers',
      {
        ...input,
        dispatchNow: false,
        submitImmediately: Boolean(input.submitImmediately),
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
      },
      idempotencyConfig(idempotencyKey)
    );
    return mapTransfer(unwrap(response.data));
  },

  async submit(id: string, idempotencyKey?: string) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(
      `/transfers/${id}/submit`,
      undefined,
      idempotencyConfig(idempotencyKey)
    );
    return mapTransfer(unwrap(response.data));
  },

  async dispatch(id: string, idempotencyKey?: string) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(
      `/transfers/${id}/dispatch`,
      undefined,
      idempotencyConfig(idempotencyKey)
    );
    return mapTransfer(unwrap(response.data));
  },

  async receive(id: string, items: TransferItem[], note?: string, idempotencyKey?: string) {
    const response = await httpClient.put<ApiEnvelope<ApiTransfer>>(
      `/transfers/${id}/receive`,
      {
        note,
        items: items.map((item) => ({
          detailId: item.id,
          receivedQuantity: item.receivedQty ?? item.sentQty,
          damagedQuantity: item.damagedQty ?? 0,
          discrepancyReason: item.note?.trim() || ((item.damagedQty ?? 0) > 0 || (item.receivedQty ?? item.sentQty) < item.sentQty ? note?.trim() : undefined),
        })),
      },
      idempotencyConfig(idempotencyKey)
    );
    return mapTransfer(unwrap(response.data));
  },

  async cancel(id: string, reason: string, idempotencyKey?: string) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(
      `/transfers/${id}/cancel`,
      { reason },
      idempotencyConfig(idempotencyKey)
    );
    return mapTransfer(unwrap(response.data));
  },

  async returnToSource(id: string, reason: string, idempotencyKey?: string) {
    const response = await httpClient.post<ApiEnvelope<ApiTransfer>>(
      `/transfers/${id}/return`,
      { reason },
      idempotencyConfig(idempotencyKey)
    );
    return mapTransfer(unwrap(response.data));
  },

  async previewUrgentAllocation(input: { toBranchId: string; requiredAt?: string; relatedOrderId?: string; relatedOrderCode?: string; note?: string; items: TransferDemandItem[] }) {
    const response = await httpClient.post<ApiEnvelope<TransferAllocationPreview>>('/transfer-requests/allocation-preview', input);
    return unwrap(response.data);
  },

  async createUrgentRequest(
    input: { toBranchId: string; requiredAt?: string; relatedOrderId?: string; relatedOrderCode?: string; note?: string; items: TransferDemandItem[] },
    idempotencyKey?: string
  ) {
    const response = await httpClient.post<ApiEnvelope<{ id: string; requestCode: string; transfers: ApiTransfer[] }>>(
      '/transfer-requests',
      input,
      idempotencyConfig(idempotencyKey)
    );
    return unwrap(response.data);
  },
};
