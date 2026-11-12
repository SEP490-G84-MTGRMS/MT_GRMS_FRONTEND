// src/pages/store/api/branchManagementApi.ts
import { httpClient } from '../../../api/httpClient';

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  errorCode?: string | null;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface BranchQuotaResponse {
  usedBranches: number;
  maxBranches: number;
  canAddMore: boolean;
  currentPlanCode: string;
  currentPlanName: string;
}

export interface BranchItemResponse {
  id: string;
  code: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isHeadquarter?: boolean;
  status: 'Active' | 'Inactive' | string;
  pendingOrdersCount: number;
  lastOrderDate?: string;
  createdAt: string;
}

export interface BranchEmployeeSummaryItem {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  status: string;
  startDate?: string;
}

export interface BranchProductSummaryItem {
  productId: string;
  sku: string;
  barcode?: string;
  productName: string;
  unit: string;
  sellingPrice: number;
  status: string;
}

export interface BranchDetailResponse {
  id: string;
  code: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isHeadquarter: boolean;
  status: string;
  createdAt: string;
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  totalEmployees: number;
  activeEmployees: number;
  pendingOrdersCount: number;
  lastOrderDate?: string;
  recentEmployees: BranchEmployeeSummaryItem[];
  recentProducts: BranchProductSummaryItem[];
}

export interface CreateBranchPayload {
  branchCode: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isHeadquarter?: boolean;
}

export interface UpdateBranchPayload {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isHeadquarter?: boolean;
}

export interface UpdateBranchStatusPayload {
  isActive: boolean;
}

export interface BranchQueryParams {
  keyword?: string;
  branchCode?: string;
  status?: string;
  pageIndex?: number;
  pageSize?: number;
}

export const BRANCHES_UPDATED_EVENT = 'mtgrms:branches-updated';

export interface BranchesUpdatedEventDetail {
  action: 'create' | 'update' | 'status' | 'delete';
  branch?: BranchItemResponse;
  branchId?: string;
  selectCreated?: boolean;
}

export const emitBranchesUpdated = (detail: BranchesUpdatedEventDetail): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BRANCHES_UPDATED_EVENT, { detail }));
  }
};

export const branchManagementApi = {
  async getQuota(): Promise<ApiResponse<BranchQuotaResponse>> {
    const res = await httpClient.get<ApiResponse<BranchQuotaResponse>>('/branches/quota');
    return res.data;
  },

  async getBranches(params?: BranchQueryParams): Promise<ApiResponse<PagedResult<BranchItemResponse>>> {
    const res = await httpClient.get<ApiResponse<PagedResult<BranchItemResponse>>>('/branches', { params });
    return res.data;
  },

  async getBranchById(id: string): Promise<ApiResponse<BranchItemResponse>> {
    const res = await httpClient.get<ApiResponse<BranchItemResponse>>(`/branches/${id}`);
    return res.data;
  },

  async getBranchDetail(id: string): Promise<ApiResponse<BranchDetailResponse>> {
    const res = await httpClient.get<ApiResponse<BranchDetailResponse>>(`/branches/${id}/detail`);
    return res.data;
  },

  async createBranch(payload: CreateBranchPayload): Promise<ApiResponse<BranchItemResponse>> {
    const res = await httpClient.post<ApiResponse<BranchItemResponse>>('/branches', payload);
    if (res.data?.success && res.data.data) {
      emitBranchesUpdated({
        action: 'create',
        branch: res.data.data,
        selectCreated: true,
      });
    }
    return res.data;
  },

  async updateBranch(id: string, payload: UpdateBranchPayload): Promise<ApiResponse<BranchItemResponse>> {
    const res = await httpClient.put<ApiResponse<BranchItemResponse>>(`/branches/${id}`, payload);
    if (res.data?.success && res.data.data) {
      emitBranchesUpdated({
        action: 'update',
        branch: res.data.data,
        branchId: id,
      });
    }
    return res.data;
  },

  async toggleStatus(id: string, isActive: boolean): Promise<ApiResponse<BranchItemResponse>> {
    const res = await httpClient.patch<ApiResponse<BranchItemResponse>>(`/branches/${id}/status`, { isActive });
    if (res.data?.success) {
      emitBranchesUpdated({
        action: 'status',
        branch: res.data.data,
        branchId: id,
      });
    }
    return res.data;
  },

  async deleteBranch(id: string): Promise<ApiResponse<boolean>> {
    const res = await httpClient.delete<ApiResponse<boolean>>(`/branches/${id}`);
    if (res.data?.success) {
      emitBranchesUpdated({
        action: 'delete',
        branchId: id,
      });
    }
    return res.data;
  },
};

