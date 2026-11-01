import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type {
  OrderMatrixProduct,
  MatrixCellMap,
  SplitPoPreview,
  GeneratedPO,
} from '../types/po.types';

export interface MatrixBackendResponse {
  branchId: string;
  branchName: string;
  supplierId?: string;
  viewFrom: string;
  durationDays: number;
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
    storeQty?: number;
    finalQty: number;
  }>;
  supplierConfigs?: Array<{
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    isActive: boolean;
    isAssignedToBranch: boolean;
    inactiveReason?: string;
    leadTimeDays: number;
    cutoffTime: string;
    activeDeliveryDays: number[];
    blackoutDates: string[];
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

export const purchaseOrderApi = {
  /**
   * Lấy dữ liệu lưới ma trận đặt hàng từ backend
   */
  async getOrderMatrix(
    branchId: string,
    supplierId: string | null | undefined,
    viewFrom: string,
    durationDays: number
  ): Promise<{
    products: OrderMatrixProduct[];
    cellMap: MatrixCellMap;
    supplierConfigs: import('../types/po.types').OrderMatrixSupplierDeliveryConfig[];
  }> {
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
          isRowDisabled: p.isRowDisabled ?? (!p.isProductActive || !p.isSupplierActive || !p.isSupplierProductActive || !p.isSupplierBranchActive || !p.isBranchProductActive),
          rowDisabledReason: p.rowDisabledReason,
        }));

        const cellMap: MatrixCellMap = {};
        d.cells.forEach((c) => {
          if (!cellMap[c.productId]) cellMap[c.productId] = {};
          const dKey = c.deliveryDate.slice(0, 10);
          cellMap[c.productId][dKey] = {
            employeeQty: c.employeeQty,
            storeQty: c.storeQty ?? null,
            finalQty: c.finalQty,
            isOwnerOverridden: c.storeQty !== null && c.storeQty !== undefined,
            modifiedBy: c.storeQty !== null && c.storeQty !== undefined ? 'store_owner' : 'employee',
          };
        });

        const supplierConfigs = (d.supplierConfigs || []).map((sc) => ({
          supplierId: sc.supplierId,
          supplierCode: sc.supplierCode,
          supplierName: sc.supplierName,
          isActive: sc.isActive,
          isAssignedToBranch: sc.isAssignedToBranch,
          inactiveReason: sc.inactiveReason,
          leadTimeDays: sc.leadTimeDays || 1,
          cutoffTime: sc.cutoffTime || '15:00',
          activeDeliveryDays: sc.activeDeliveryDays || [1, 2, 3, 4, 5, 6],
          blackoutDates: sc.blackoutDates || [],
        }));

        // Đồng bộ dữ liệu cellMap từ backend vào localStorage
        if (Object.keys(cellMap).length > 0) {
          try {
            const localKey = `matrix_draft_${branchId}_${supplierId || 'ALL'}`;
            localStorage.setItem(localKey, JSON.stringify(cellMap));
          } catch {
            // ignore
          }
        }

        return { products, cellMap, supplierConfigs };
      }
    } catch {
      // Fallback
    }

    // Backend offline hoặc mã Branch mock: Nạp bản thảo đã lưu từ localStorage
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

    return { products: [], cellMap: cachedMap, supplierConfigs: [] };
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
    // 1. Lưu ngay lập tức vào localStorage để đảm bảo dữ liệu không bao giờ bị mất
    const localKey = `matrix_draft_${branchId}_${supplierId || 'ALL'}`;
    try {
      localStorage.setItem(localKey, JSON.stringify(cellMap));
    } catch (e) {
      console.warn('Cannot save to localStorage', e);
    }

    // 2. Gửi đồng bộ lên Backend API
    try {
      const cells: Array<{
        productId: string;
        deliveryDate: string;
        employeeQty: number;
        storeQty?: number;
        finalQty: number;
      }> = [];

      Object.entries(cellMap).forEach(([productId, dayMap]) => {
        Object.entries(dayMap).forEach(([dateKey, cell]) => {
          if (cell.finalQty > 0 || cell.employeeQty > 0 || (cell.storeQty !== null && cell.storeQty > 0)) {
            cells.push({
              productId,
              deliveryDate: dateKey,
              employeeQty: cell.employeeQty,
              storeQty: cell.storeQty ?? undefined,
              finalQty: cell.finalQty,
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
    note?: string
  ): Promise<GeneratedPO[]> {
    try {
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
    } catch {
      // Offline fallback
    }

    return splitPos.map((sp) => ({
      id: sp.id,
      orderCode: sp.id,
      supplierId: sp.supplierId,
      branchId: sp.branchId,
      deliveryDate: sp.deliveryDate,
      totalQuantity: sp.totalQuantity,
      totalAmount: sp.totalAmount,
      status: 'PENDING_APPROVAL',
      itemCount: sp.items.length,
    }));
  },
};
