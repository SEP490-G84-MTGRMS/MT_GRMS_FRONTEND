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

  async createBranch(payload: CreateBranchPayload): Promise<ApiResponse<BranchItemResponse>> {
    const res = await httpClient.post<ApiResponse<BranchItemResponse>>('/branches', payload);
    return res.data;
  },

  async updateBranch(id: string, payload: UpdateBranchPayload): Promise<ApiResponse<BranchItemResponse>> {
    const res = await httpClient.put<ApiResponse<BranchItemResponse>>(`/branches/${id}`, payload);
    return res.data;
  },

  async toggleStatus(id: string, isActive: boolean): Promise<ApiResponse<BranchItemResponse>> {
    const res = await httpClient.patch<ApiResponse<BranchItemResponse>>(`/branches/${id}/status`, { isActive });
    return res.data;
  },
};

