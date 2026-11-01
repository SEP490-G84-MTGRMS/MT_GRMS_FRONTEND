import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type {
  OrderMatrixProduct,
  MatrixCellMap,
  SplitPoPreview,
  GeneratedPO,
} from '../types/po.types';
import {
  MOCK_MATRIX_PRODUCTS,
} from '../lib/mockData';

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
  }>;
  cells: Array<{
    productId: string;
    deliveryDate: string;
    employeeQty: number;
    storeQty?: number;
    finalQty: number;
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
    supplierId: string | null,
    viewFrom: string,
    durationDays: number
  ): Promise<{ products: OrderMatrixProduct[]; cellMap: MatrixCellMap }> {
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

        return { products, cellMap };
      }
    } catch {
      // Fallback
    }

    // Default mock data
    const relevantProducts =
      !supplierId || supplierId === 'ALL'
        ? MOCK_MATRIX_PRODUCTS
        : MOCK_MATRIX_PRODUCTS.filter((p) => p.supplierId === supplierId);

    return { products: relevantProducts, cellMap: {} };
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
    } catch {
      // Offline fallback
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
