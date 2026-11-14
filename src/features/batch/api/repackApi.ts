import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';

export interface PackageDto {
  id: string;
  branchStockId: string;
  productId: string;
  branchId: string;
  internalCode: string;
  barcode?: string | null;
  netWeight: number;
  sellingPrice: number;
  expiryDate?: string | null;
  repackType: string;
  status: string;
  repackOrderId?: string | null;
  createdAt: string;
}

export interface BranchStockPackageSummary {
  branchStockId: string;
  productId: string;
  productName: string;
  batchCode: string;
  unit: string;
  isWeightProduct: boolean;
  allowRepack: boolean;
  quantityOnHand: number;
  quantityReserved: number;
  quantityQuarantined: number;
  packagedQty: number;
  packageCount: number;
  rawSellableQty: number;
  expiryDate?: string | null;
  landedCostPerUnit: number;
  suggestPricePerKg?: number | null;
  packages: PackageDto[];
}

export interface PackageLineInput {
  netWeight: number;
  sellingPrice: number;
  expiryDate?: string | null;
  barcode?: string | null;
}

export interface CreateRepackOrderInput {
  branchStockId: string;
  repackType: 'PORTIONING' | 'PROCESSING';
  inputWeight: number;
  packages: PackageLineInput[];
  wasteWeight?: number;
  wasteReason?: string | null;
  wasteNote?: string | null;
  defaultUnitPricePerKg?: number | null;
}

export interface RepackOrderDto {
  id: string;
  code: string;
  branchStockId: string;
  repackType: string;
  inputWeight: number;
  wasteWeight: number;
  wasteCostAmount: number;
  packages: PackageDto[];
}

const unwrap = <T,>(res: { data?: ApiResponse<T> }, fallback: string): T => {
  if (!res.data?.success || res.data.data === undefined || res.data.data === null) {
    throw new Error(res.data?.message || fallback);
  }
  return res.data.data;
};

export const repackApi = {
  getBranchStockPackages: async (branchStockId: string): Promise<BranchStockPackageSummary> => {
    const res = await httpClient.get<ApiResponse<BranchStockPackageSummary>>(
      `/branch-stocks/${branchStockId}/packages`
    );
    return unwrap(res, 'Không tải được khay của lô.');
  },

  createRepackOrder: async (body: CreateRepackOrderInput): Promise<RepackOrderDto> => {
    const res = await httpClient.post<ApiResponse<RepackOrderDto>>('/repack-orders', body);
    return unwrap(res, 'Chế biến thất bại.');
  },

  updatePackagePrice: async (id: string, sellingPrice: number): Promise<PackageDto> => {
    const res = await httpClient.patch<ApiResponse<PackageDto>>(`/packages/${id}/price`, {
      sellingPrice,
    });
    return unwrap(res, 'Cập nhật giá thất bại.');
  },

  quarantinePackage: async (id: string): Promise<PackageDto> => {
    const res = await httpClient.post<ApiResponse<PackageDto>>(`/packages/${id}/quarantine`);
    return unwrap(res, 'Cách ly thất bại.');
  },

  releasePackage: async (id: string): Promise<PackageDto> => {
    const res = await httpClient.post<ApiResponse<PackageDto>>(`/packages/${id}/release`);
    return unwrap(res, 'Bỏ cách ly thất bại.');
  },

  voidPackage: async (
    id: string,
    mode: 'UNPACK_TO_RAW' | 'WRITE_OFF',
    reason?: string
  ): Promise<PackageDto> => {
    const res = await httpClient.post<ApiResponse<PackageDto>>(`/packages/${id}/void`, {
      mode,
      reason,
    });
    return unwrap(res, 'Hủy khay thất bại.');
  },
};
