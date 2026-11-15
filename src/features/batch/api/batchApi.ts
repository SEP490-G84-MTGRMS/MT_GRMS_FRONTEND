import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type {
  BatchItem,
  BatchFilterState,
  BatchKpiSummary,
  BatchStatus,
} from '../types/batch.types';

interface BatchListItemDto {
  id: string;
  batchCode: string;
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  branchId: string;
  branchName: string;
  supplierId?: string | null;
  supplierName: string;
  mfgDate: string;
  expiryDate: string;
  daysLeft: number;
  qtyInitial: number;
  qtyCurrent: number;
  qtyReserved?: number;
  qtyQuarantined?: number;
  qtyAvailable?: number;
  unit: string;
  stockUnit?: string;
  purchaseToStockRate?: number;
  costPrice: number;
  totalValuation: number;
  status: string;
  zoneArea?: string | null;
  shelfLocation?: string | null;
  originalGrnNo?: string | null;
  originalGrnId?: string | null;
  fefoDiscountPercent?: number;
  isFefoDiscountActive?: boolean;
  isWeightProduct?: boolean;
  allowRepack?: boolean;
  packagedQty?: number;
  packageCount?: number;
  rawSellableQty?: number;
}

interface BatchPagedResultDto {
  items: BatchListItemDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  kpiSummary: {
    totalBatches: number;
    expiredCount: number;
    criticalCount: number;
    warningCount: number;
    normalCount: number;
    expiredValue: number;
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatViDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1 || d.getFullYear() >= 9999) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const toRawDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1 || d.getFullYear() >= 9999) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const normalizeStatus = (status: string): BatchStatus => {
  if (status === 'Expired' || status === 'Critical' || status === 'Warning' || status === 'Normal') {
    return status;
  }
  return 'Normal';
};

export const mapBatchDtoToItem = (dto: BatchListItemDto): BatchItem => ({
  id: dto.id,
  batchCode: dto.batchCode || '—',
  productId: dto.productId,
  sku: dto.sku || '',
  productName: dto.productName || 'Sản phẩm',
  categoryName: dto.categoryName || 'Chung',
  branchId: dto.branchId,
  branchName: dto.branchName || 'Chi nhánh',
  supplierId: dto.supplierId || '',
  supplierName: dto.supplierName || '—',
  mfgDate: formatViDate(dto.mfgDate),
  expiryDate: formatViDate(dto.expiryDate),
  rawExpiryDate: toRawDate(dto.expiryDate),
  daysLeft: dto.daysLeft,
  qtyInitial: Number(dto.qtyInitial) || 0,
  qtyCurrent: Number(dto.qtyCurrent) || 0,
  qtyReserved: Number(dto.qtyReserved) || 0,
  qtyQuarantined: Number(dto.qtyQuarantined) || 0,
  qtyAvailable:
    dto.qtyAvailable !== undefined
      ? Number(dto.qtyAvailable) || 0
      : Math.max(
          0,
          (Number(dto.qtyCurrent) || 0) -
            (Number(dto.qtyReserved) || 0) -
            (Number(dto.qtyQuarantined) || 0)
        ),
  unit: dto.unit || 'Cái',
  stockUnit: dto.stockUnit || dto.unit || 'Cái',
  purchaseToStockRate: Number(dto.purchaseToStockRate) > 0 ? Number(dto.purchaseToStockRate) : 1,
  costPrice: Number(dto.costPrice) || 0,
  totalValuation: Number(dto.totalValuation) || 0,
  status: normalizeStatus(dto.status),
  zoneArea: dto.zoneArea || '—',
  shelfLocation: dto.shelfLocation || '—',
  originalGrnNo: dto.originalGrnNo || '',
  originalGrnId: dto.originalGrnId || undefined,
  discountPercent: dto.isFefoDiscountActive ? Number(dto.fefoDiscountPercent) || 0 : 0,
  movements: [],
  isWeightProduct: Boolean(dto.isWeightProduct) || String(dto.unit || '').trim().toLowerCase() === 'kg',
  allowRepack: Boolean(dto.allowRepack),
  packagedQty: Number(dto.packagedQty) || 0,
  packageCount: Number(dto.packageCount) || 0,
  rawSellableQty:
    dto.rawSellableQty !== undefined
      ? Number(dto.rawSellableQty) || 0
      : dto.qtyAvailable !== undefined
        ? Number(dto.qtyAvailable) || 0
        : Math.max(
            0,
            (Number(dto.qtyCurrent) || 0) -
              (Number(dto.qtyReserved) || 0) -
              (Number(dto.qtyQuarantined) || 0)
          ),
});

const buildKeyword = (filters: BatchFilterState): string | undefined => {
  const parts = [
    filters.keyword,
    filters.productName,
    filters.sku,
    filters.batchCode,
    filters.supplierName,
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  // BE tách token theo khoảng trắng, mỗi token khớp bất kỳ field nào (AND giữa các token)
  return parts.join(' ');
};

export const batchApi = {
  async getBatches(filters: BatchFilterState): Promise<{
    items: BatchItem[];
    totalCount: number;
    kpiSummary: BatchKpiSummary;
  }> {
    const params: Record<string, string | number | undefined> = {
      Keyword: buildKeyword(filters),
      Status: filters.status !== 'ALL' ? filters.status : undefined,
      PageIndex: filters.pageIndex,
      PageSize: filters.pageSize,
    };

    if (filters.branchId && filters.branchId !== 'ALL') {
      params.BranchId = filters.branchId;
    }

    const res = await httpClient.get<ApiResponse<BatchPagedResultDto>>('/batches', { params });
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không thể tải danh sách lô hàng.');
    }

    const data = res.data.data;
    const kpi = data.kpiSummary;
    return {
      items: (data.items || []).map(mapBatchDtoToItem),
      totalCount: data.totalCount ?? 0,
      kpiSummary: {
        totalBatches: kpi?.totalBatches ?? 0,
        expiredCount: kpi?.expiredCount ?? 0,
        criticalCount: kpi?.criticalCount ?? 0,
        warningCount: kpi?.warningCount ?? 0,
        normalCount: kpi?.normalCount ?? 0,
        expiredValue: kpi?.expiredValue ?? 0,
        criticalValue: 0,
        warningValue: 0,
      },
    };
  },

  async getBatchById(id: string): Promise<BatchItem | null> {
    const res = await httpClient.get<ApiResponse<BatchListItemDto>>(`/batches/${id}`);
    if (!res.data?.success || !res.data.data) return null;
    return mapBatchDtoToItem(res.data.data);
  },

  async applyFefoDiscount(id: string, discountPercent: number) {
    const res = await httpClient.patch<ApiResponse<{ batchId: string; discountPercent: number; isActive: boolean }>>(
      `/batches/${id}/fefo-discount`,
      { discountPercent, isActive: discountPercent > 0 }
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || 'Không thể lưu giảm giá FEFO.');
    }
    return res.data.data;
  },
};
