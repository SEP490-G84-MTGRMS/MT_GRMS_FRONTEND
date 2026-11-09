import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  OrderMatrixProduct,
  MatrixCellMap,
  SplitPoPreview,
  GeneratedPO,
  OrderMatrixDayStatus,
  OrderMatrixSupplierDeliveryConfig,
} from '../types/po.types';
import type { PurchaseOrderListItem, PurchaseOrderStatus } from '../types/po-list.types';

export interface MatrixBackendResponse {
  branchId: string;
  branchName: string;
  branchIsActive?: boolean;
  supplierId?: string;
  viewFrom: string;
  durationDays: number;
  serverNow?: string;
  products: Array<{
    id: string;
    supplierId: string;
    supplierName: string;
    category: string;
    name: string;
    sku: string;
    barcode: string;
    unit: string;
    price: number;
    moq: number;
    orderMultiple?: number;
    soh: number;
    salesPerDay: number;
    safetyStock: number;
    isProductActive?: boolean;
    productInactiveReason?: string;
    isSupplierActive?: boolean;
    supplierInactiveReason?: string;
    isSupplierProductActive?: boolean;
    supplierProductInactiveReason?: string;
    isSupplierBranchActive?: boolean;
    supplierBranchInactiveReason?: string;
    isBranchProductActive?: boolean;
    branchProductInactiveReason?: string;
    isRowDisabled?: boolean;
    rowDisabledReason?: string;
  }>;
  cells: Array<{
    productId: string;
    deliveryDate: string;
    employeeQty: number;
    storeQty?: number | null;
    isOwnerAdjusted?: boolean;
    finalQty: number;
  }>;
  supplierConfigs?: Array<{
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    isActive: boolean;
    isAssignedToBranch: boolean;
    inactiveReason?: string;
    cutoffTime: string;
    cutoffDayOffset?: number;
    activeDeliveryDays: number[];
    blackoutDates: string[];
  }>;
  dayStatuses?: Array<{
    supplierId: string;
    deliveryDate: string;
    deliveryDateStatus: string;
    cutoffDateTime?: string;
    primaryReasonCode?: string;
    poCode?: string;
    poId?: string;
  }>;
  draftPoId?: string;
  status: string;
}

export interface SplitPoGroupRequest {
  supplierId: string;
  deliveryDate: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    unit: string;
  }>;
}

export interface OrderMatrixApiResult {
  products: OrderMatrixProduct[];
  cellMap: MatrixCellMap;
  supplierConfigs: OrderMatrixSupplierDeliveryConfig[];
  dayStatuses: OrderMatrixDayStatus[];
  branchIsActive: boolean;
  serverNow: string;
  draftPoId?: string;
  status: string;
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

export interface PurchaseOrderListApiItem {
  id: string;
  code: string;
  branchId: string;
  branchName: string;
  branchCode?: string;
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  deliveryDate?: string;
  status: string;
  revisionNumber?: number;
  lastAmendedAtUtc?: string;
  totalQty: number;
  totalAmount: number;
  note?: string;
  createdAt: string;
  details: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    unit: string;
    orderedQty: number;
    unitPrice: number;
    lineAmount: number;
  }>;
}

export interface PurchaseOrderPagedResult {
  items: PurchaseOrderListApiItem[];
  page: number;
  pageSize: number;
  totalItems: number;
}

export const purchaseOrderApi = {
  /**
   * Danh sách PO đã chốt (không gồm DRAFT) — phân trang + lọc.
   */
  async getPagedPurchaseOrders(params: {
    branchId?: string;
    supplierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<PurchaseOrderPagedResult> {
    const res = await httpClient.get<ApiResponse<PurchaseOrderPagedResult>>('/purchase-orders', {
      params: {
        BranchId: params.branchId && params.branchId !== 'all' ? params.branchId : undefined,
        SupplierId: params.supplierId && params.supplierId !== 'all' ? params.supplierId : undefined,
        Status: params.status && params.status !== 'all' ? params.status : undefined,
        DateFrom: params.dateFrom || undefined,
        DateTo: params.dateTo || undefined,
        PageIndex: params.pageIndex ?? 1,
        PageSize: params.pageSize ?? 10,
      },
    });

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }

    throw new Error(res.data?.message || 'Không tải được danh sách đơn mua hàng.');
  },

  /**
   * Lấy dữ liệu lưới ma trận đặt hàng từ backend
   */
  async getOrderMatrix(
    branchId: string,
    supplierId: string | null | undefined,
    viewFrom: string,
    durationDays: number
  ): Promise<OrderMatrixApiResult> {
    try {
      const res = await httpClient.get<ApiResponse<MatrixBackendResponse>>('/purchase-orders/matrix', {
        params: {
          BranchId: branchId,
          SupplierId: supplierId && supplierId !== 'ALL' ? supplierId : undefined,
          ViewFrom: viewFrom,
          DurationDays: durationDays,
        },
      });

      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        const products: OrderMatrixProduct[] = d.products.map((p) => ({
          id: p.id,
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          category: p.category,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          price: p.price,
          moq: p.moq,
          orderMultiple: p.orderMultiple ?? 1,
          soh: p.soh,
          sales: p.salesPerDay,
          safetyStock: p.safetyStock,
          isProductActive: p.isProductActive ?? true,
          productInactiveReason: p.productInactiveReason,
          isSupplierActive: p.isSupplierActive ?? true,
          supplierInactiveReason: p.supplierInactiveReason,
          isSupplierProductActive: p.isSupplierProductActive ?? true,
          supplierProductInactiveReason: p.supplierProductInactiveReason,
          isSupplierBranchActive: p.isSupplierBranchActive ?? true,
          supplierBranchInactiveReason: p.supplierBranchInactiveReason,
          isBranchProductActive: p.isBranchProductActive ?? true,
          branchProductInactiveReason: p.branchProductInactiveReason,
          isRowDisabled:
            p.isRowDisabled ??
            (!p.isProductActive ||
              !p.isSupplierActive ||
              !p.isSupplierProductActive ||
              !p.isSupplierBranchActive ||
              !p.isBranchProductActive),
          rowDisabledReason: p.rowDisabledReason,
        }));

        const cellMap: MatrixCellMap = {};
        d.cells.forEach((c) => {
          if (!cellMap[c.productId]) cellMap[c.productId] = {};
          const dKey = toDateKey(c.deliveryDate);
          const isOwnerAdjusted = Boolean(c.isOwnerAdjusted || (c.storeQty !== null && c.storeQty !== undefined));
          cellMap[c.productId][dKey] = {
            employeeQty: c.employeeQty,
            storeQty: c.storeQty ?? null,
            finalQty: c.finalQty,
            isOwnerAdjusted,
            isOwnerOverridden: isOwnerAdjusted,
            modifiedBy: isOwnerAdjusted ? 'store_owner' : 'employee',
          };
        });

        const supplierConfigs = (d.supplierConfigs || []).map((sc) => ({
          supplierId: sc.supplierId,
          supplierCode: sc.supplierCode,
          supplierName: sc.supplierName,
          isActive: sc.isActive,
          isAssignedToBranch: sc.isAssignedToBranch,
          inactiveReason: sc.inactiveReason,
          cutoffTime: sc.cutoffTime || '15:00',
          cutoffDayOffset:
            typeof sc.cutoffDayOffset === 'number' && sc.cutoffDayOffset >= 0
              ? sc.cutoffDayOffset
              : 1,
          activeDeliveryDays: sc.activeDeliveryDays || [1, 2, 3, 4, 5, 6],
          blackoutDates: sc.blackoutDates || [],
        }));

        const dayStatuses: OrderMatrixDayStatus[] = (d.dayStatuses || []).map((ds) => ({
          supplierId: ds.supplierId,
          deliveryDate: toDateKey(ds.deliveryDate),
          deliveryDateStatus: ds.deliveryDateStatus,
          cutoffDateTime: ds.cutoffDateTime,
          primaryReasonCode: ds.primaryReasonCode,
          poCode: ds.poCode,
          poId: ds.poId,
        }));

        if (Object.keys(cellMap).length > 0) {
          try {
            const localKey = `matrix_draft_${branchId}_${supplierId || 'ALL'}`;
            localStorage.setItem(localKey, JSON.stringify(cellMap));
          } catch {
            // ignore
          }
        }

        return {
          products,
          cellMap,
          supplierConfigs,
          dayStatuses,
          branchIsActive: d.branchIsActive ?? true,
          serverNow: d.serverNow || new Date().toISOString(),
          draftPoId: d.draftPoId,
          status: d.status || 'DRAFT',
        };
      }
    } catch {
      // Fallback
    }

    const localKey = `matrix_draft_${branchId}_${supplierId || 'ALL'}`;
    let cachedMap: MatrixCellMap = {};
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        cachedMap = JSON.parse(raw);
      }
    } catch {
      // ignore
    }

    return {
      products: [],
      cellMap: cachedMap,
      supplierConfigs: [],
      dayStatuses: [],
      branchIsActive: true,
      serverNow: new Date().toISOString(),
      status: 'DRAFT',
    };
  },

  /**
   * Lưu bản thảo ma trận đặt hàng (Save Draft)
   */
  async saveMatrixDraft(
    branchId: string,
    supplierId: string | null,
    viewFrom: string,
    viewTo: string,
    cellMap: MatrixCellMap,
    note?: string
  ): Promise<void> {
    const localKey = `matrix_draft_${branchId}_${supplierId || 'ALL'}`;
    try {
      localStorage.setItem(localKey, JSON.stringify(cellMap));
    } catch (e) {
      console.warn('Cannot save to localStorage', e);
    }

    try {
      const cells: Array<{
        productId: string;
        deliveryDate: string;
        employeeQty: number;
        storeQty?: number | null;
        isOwnerAdjusted: boolean;
        finalQty: number;
      }> = [];

      Object.entries(cellMap).forEach(([productId, dayMap]) => {
        Object.entries(dayMap).forEach(([dateKey, cell]) => {
          const isOwnerAdjusted = Boolean(
            cell.isOwnerAdjusted || cell.isOwnerOverridden || (cell.storeQty !== null && cell.storeQty !== undefined)
          );
          if (
            cell.finalQty > 0 ||
            cell.employeeQty > 0 ||
            cell.storeQty !== null ||
            isOwnerAdjusted ||
            cell.modifiedBy === 'store_owner'
          ) {
            cells.push({
              productId,
              deliveryDate: dateKey,
              employeeQty: cell.employeeQty ?? 0,
              storeQty: cell.storeQty ?? null,
              isOwnerAdjusted,
              finalQty: cell.finalQty ?? 0,
            });
          }
        });
      });

      await httpClient.post('/purchase-orders/matrix/draft', {
        branchId,
        supplierId: supplierId && supplierId !== 'ALL' ? supplierId : undefined,
        viewFrom,
        viewTo,
        note,
        cells,
      });
    } catch (err) {
      console.error('Lỗi khi lưu bản thảo ma trận lên backend:', err);
      throw err;
    }
  },

  /**
   * Chốt ma trận và tự động tách thành các đơn PO độc lập
   */
  async splitMatrixPo(
    branchId: string,
    splitPos: SplitPoPreview[],
    note?: string,
    parentDraftId?: string
  ): Promise<GeneratedPO[]> {
    const groups: SplitPoGroupRequest[] = splitPos.map((sp) => ({
      supplierId: sp.supplierId,
      deliveryDate: sp.deliveryDate,
      items: sp.items.map((i) => ({
        productId: i.productId,
        quantity: i.finalQty,
        unitPrice: i.price,
        unit: i.unit,
      })),
    }));

    const res = await httpClient.post<ApiResponse<any[]>>('/purchase-orders/matrix/split', {
      branchId,
      parentDraftId,
      note,
      groups,
    });

    if (res.data?.success && res.data.data) {
      return res.data.data.map((po: any) => ({
        id: po.id,
        orderCode: po.code,
        supplierId: po.supplierId,
        branchId: po.branchId,
        deliveryDate: po.deliveryDate?.slice(0, 10) || '',
        totalQuantity: po.totalQty,
        totalAmount: po.totalAmount,
        status: po.status,
        itemCount: po.details?.length || 0,
      }));
    }

    throw new Error(res.data?.message || 'Không thể chốt PO từ ma trận.');
  },

  /**
   * Lấy danh sách đơn đặt hàng PO từ Backend CSDL với bộ lọc & phân trang
   */
  async getPurchaseOrders(params?: {
    branchId?: string;
    supplierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<{ items: PurchaseOrderListItem[]; totalCount: number }> {
    try {
      const q = new URLSearchParams();
      if (params?.branchId && params.branchId !== 'all' && params.branchId !== 'ALL') q.append('BranchId', params.branchId);
      if (params?.supplierId && params.supplierId !== 'all' && params.supplierId !== 'ALL') q.append('SupplierId', params.supplierId);
      if (params?.status && params.status !== 'all') q.append('Status', params.status);
      if (params?.dateFrom) q.append('DateFrom', params.dateFrom);
      if (params?.dateTo) q.append('DateTo', params.dateTo);
      if (params?.pageIndex) q.append('PageIndex', String(params.pageIndex));
      if (params?.pageSize) q.append('PageSize', String(params.pageSize));

      const res = await httpClient.get<ApiResponse<PagedResult<any>>>(`/purchase-orders?${q.toString()}`);
      const rawList = res.data?.data?.items || [];
      const totalCount = res.data?.data?.totalItems ?? (res.data?.data as any)?.totalCount ?? rawList.length;

      const items: PurchaseOrderListItem[] = rawList.map((po: any) => ({
        id: po.id,
        poCode: po.code,
        storeRefCode: po.branchCode || po.branchName || 'STR-01',
        supplierId: po.supplierId,
        supplierCode: po.supplierCode || 'SUP',
        supplierName: po.supplierName || 'Nhà cung cấp',
        branchId: po.branchId,
        branchCode: po.branchCode || 'BR',
        branchName: po.branchName || 'Chi nhánh',
        createdSource: po.createdByRole === 'EMPLOYEE' ? 'NV Chi nhánh đề xuất' : 'Chủ cửa hàng (PO Matrix)',
        lastUpdated: po.createdAt ? new Date(po.createdAt).toLocaleString('vi-VN') : '',
        expectedDelivery: po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('vi-VN') : '',
        itemCount: po.details?.length || 0,
        totalAmount: Number(po.totalAmount || 0),
        status: (po.status as PurchaseOrderStatus) || 'PENDING_APPROVAL',
        note: po.note || '',
        items: (po.details || []).map((d: any) => ({
          id: d.id,
          name: d.productName,
          sku: d.sku,
          unit: d.unit,
          orderedQty: Number(d.orderedQty || d.finalQty || 0),
          receivedQty: Number(d.receivedQty || 0),
          price: Number(d.unitPrice || 0),
          total: Number(d.lineAmount || 0),
        })),
      }));

      return { items, totalCount };
    } catch (err) {
      if (import.meta.env.MODE === 'test') {
        const { MOCK_PURCHASE_ORDERS } = await import('../lib/mockPoListData');
        return { items: MOCK_PURCHASE_ORDERS, totalCount: MOCK_PURCHASE_ORDERS.length };
      }
      console.warn('Lỗi tải danh sách PO từ backend:', err);
      return { items: [], totalCount: 0 };
    }
  },

  /**
   * Lấy chi tiết một đơn PO theo ID từ Backend
   */
  async getPurchaseOrderById(id: string): Promise<PurchaseOrderListItem | null> {
    try {
      const res = await httpClient.get<ApiResponse<any>>(`/purchase-orders/${id}`);
      const po = res.data?.data;
      if (!po) return null;
      return {
        id: po.id,
        poCode: po.code,
        storeRefCode: po.branchCode || po.branchName || 'STR-01',
        supplierId: po.supplierId,
        supplierCode: po.supplierCode || 'SUP',
        supplierName: po.supplierName || 'Nhà cung cấp',
        branchId: po.branchId,
        branchCode: po.branchCode || 'BR',
        branchName: po.branchName || 'Chi nhánh',
        createdSource: po.createdByRole === 'EMPLOYEE' ? 'NV Chi nhánh đề xuất' : 'Chủ cửa hàng (PO Matrix)',
        lastUpdated: po.createdAt ? new Date(po.createdAt).toLocaleString('vi-VN') : '',
        expectedDelivery: po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('vi-VN') : '',
        itemCount: po.details?.length || 0,
        totalAmount: Number(po.totalAmount || 0),
        status: (po.status as PurchaseOrderStatus) || 'PENDING_APPROVAL',
        note: po.note || '',
        items: (po.details || []).map((d: any) => ({
          id: d.id,
          name: d.productName,
          sku: d.sku,
          unit: d.unit,
          orderedQty: Number(d.orderedQty || d.finalQty || 0),
          receivedQty: Number(d.receivedQty || 0),
          price: Number(d.unitPrice || 0),
          total: Number(d.lineAmount || 0),
        })),
      };
    } catch {
      return null;
    }
  },

  /**
   * Cập nhật trạng thái đơn đặt hàng PO (APPROVED, DISPATCHED, CONFIRMED, CANCELLED)
   */
  async updatePurchaseOrderStatus(id: string, status: string, reason?: string): Promise<boolean> {
    const q = new URLSearchParams({ status });
    if (reason) q.append('reason', reason);
    const res = await httpClient.patch(`/purchase-orders/${id}/status?${q.toString()}`, { status, reason });
    return Boolean(res.data?.success ?? true);
  },
};
