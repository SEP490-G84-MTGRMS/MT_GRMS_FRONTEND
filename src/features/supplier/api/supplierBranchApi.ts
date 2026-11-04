import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  SupplierBranchAssignmentItem,
  SupplierBranchFilterState,
  AssignSupplierToBranchesInput,
  AssignSuppliersToBranchInput,
} from '../types/supplier.types';

export const supplierBranchApi = {
  /**
   * Lấy danh sách gán NCC với Chi nhánh theo bộ lọc & phân trang (REQ-SBA01, REQ-SBA02)
   */
  async getBranchAssignments(
    filter: SupplierBranchFilterState
  ): Promise<{ items: SupplierBranchAssignmentItem[]; total: number }> {
    try {
      const supplierCodes = filter.supplierCodes?.filter(Boolean) ?? [];
      const supplierNames = filter.supplierNames?.filter(Boolean) ?? [];
      const branchCodes = filter.branchCodes?.filter(Boolean) ?? [];
      const branchNames = filter.branchNames?.filter(Boolean) ?? [];

      const res = await httpClient.get<ApiResponse<PagedResult<any>>>(
        '/suppliers/branch-assignments',
        {
          params: {
            supplierCodes: supplierCodes.length ? supplierCodes : undefined,
            supplierNames: supplierNames.length ? supplierNames : undefined,
            branchCodes: branchCodes.length ? branchCodes : undefined,
            branchNames: branchNames.length ? branchNames : undefined,
            supplierId: filter.supplierId && filter.supplierId !== 'ALL' ? filter.supplierId : undefined,
            branchId: filter.branchId && filter.branchId !== 'ALL' ? filter.branchId : undefined,
            pageIndex: filter.pageIndex || 1,
            pageSize: filter.pageSize || 15,
            status: filter.status && filter.status !== 'ALL' ? filter.status : undefined,
          },
          paramsSerializer: (p) => {
            const search = new URLSearchParams();
            Object.entries(p).forEach(([key, value]) => {
              if (value === undefined || value === null || value === '') return;
              if (Array.isArray(value)) {
                value.forEach((item) => {
                  if (item !== undefined && item !== null && String(item).trim() !== '') {
                    search.append(key, String(item));
                  }
                });
                return;
              }
              search.append(key, String(value));
            });
            return search.toString();
          },
        }
      );

      if (res.data?.success && res.data.data) {
        const paged = res.data.data;
        const items: SupplierBranchAssignmentItem[] = (paged.items || []).map((item: any) => ({
          id: item.id,
          supplierId: item.supplierId,
          supplierCode: item.supplierCode || '',
          supplierName: item.supplierName || '',
          supplierType: (item.supplierType === 1 ? 'Goods' : item.supplierType === 2 ? 'Service' : item.supplierType || 'Goods') as any,
          branchId: item.branchId,
          branchCode: item.branchCode || '',
          branchName: item.branchName || '',
          branchAddress: item.branchAddress || '',
          assignedAt: item.assignedAt ? item.assignedAt.split('T')[0] : (item.createdAt ? item.createdAt.split('T')[0] : '—'),
          status: item.status === 'Active' || item.status === 1 ? 'Active' : 'Inactive',
          inactiveReason: item.inactiveReason || undefined,
        }));

        return { items, total: paged.totalItems };
      }

      return { items: [], total: 0 };
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể tải danh sách gán chi nhánh.');
    }
  },

  /**
   * Gán nhà cung cấp với một hoặc nhiều chi nhánh (REQ-SBA01)
   */
  async assignSupplierToBranches(input: AssignSupplierToBranchesInput): Promise<boolean> {
    try {
      const res = await httpClient.post<ApiResponse<any>>(
        '/suppliers/branch-assignments',
        input
      );
      if (res.data?.success) {
        return true;
      }
      throw new Error(res.data?.message || 'Không thể gán nhà cung cấp vào chi nhánh.');
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể gán nhà cung cấp vào chi nhánh.');
    }
  },

  /**
   * Gán nhiều nhà cung cấp cho một chi nhánh (Refactored flow - REQ-SBA01)
   */
  async assignSuppliersToBranch(input: AssignSuppliersToBranchInput): Promise<boolean> {
    try {
      const res = await httpClient.post<ApiResponse<any>>(
        '/suppliers/branch-assignments/batch-to-branch',
        input
      );
      if (res.data?.success) {
        return true;
      }
      throw new Error(res.data?.message || 'Không thể gán nhà cung cấp vào chi nhánh.');
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể gán nhà cung cấp vào chi nhánh.');
    }
  },

  /**
   * Hủy gán chi nhánh khỏi nhà cung cấp (REQ-SBA03)
   */
  async unassignBranch(supplierId: string, branchId: string): Promise<boolean> {
    try {
      const res = await httpClient.delete<ApiResponse<any>>(
        `/suppliers/${supplierId}/branches/${branchId}`
      );
      if (res.data?.success) {
        return true;
      }
      throw new Error(res.data?.message || 'Không thể hủy gán chi nhánh.');
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể hủy gán chi nhánh.');
    }
  },

  /**
   * Chuyển trạng thái Active / Inactive. Inactive bắt buộc có lý do.
   */
  async updateAssignmentStatus(
    supplierId: string,
    branchId: string,
    status: 'Active' | 'Inactive',
    reason?: string
  ): Promise<boolean> {
    try {
      const res = await httpClient.patch<ApiResponse<any>>(
        `/suppliers/${supplierId}/branches/${branchId}/status`,
        {
          status: status === 'Active' ? 1 : 2,
          reason,
        }
      );
      if (res.data?.success) {
        return true;
      }
      throw new Error(res.data?.message || 'Không thể cập nhật trạng thái phân bổ.');
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái phân bổ.');
    }
  },
};
