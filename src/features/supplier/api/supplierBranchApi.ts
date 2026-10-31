import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  SupplierBranchAssignmentItem,
  SupplierBranchFilterState,
  AssignSupplierToBranchesInput,
  AssignSuppliersToBranchInput,
} from '../types/supplier.types';
import { INITIAL_SUPPLIERS } from '../lib/mockData';
import { MOCK_BRANCH_LIST } from '../../purchase-order/lib/mockData';

// Function sinh dữ liệu mẫu 50 bản ghi chuẩn cho màn hình phân bổ chi nhánh
function generateInitialMockAssignments(): SupplierBranchAssignmentItem[] {
  const items: SupplierBranchAssignmentItem[] = [];
  let count = 1;

  for (let sIdx = 0; sIdx < INITIAL_SUPPLIERS.length && items.length < 50; sIdx++) {
    const sup = INITIAL_SUPPLIERS[sIdx];
    const numBranches = (sIdx % 3) + 2;
    for (let bOffset = 0; bOffset < numBranches && items.length < 50; bOffset++) {
      const branch = MOCK_BRANCH_LIST[(sIdx + bOffset) % MOCK_BRANCH_LIST.length];
      if (!branch) continue;

      const day = String((count % 28) + 1).padStart(2, '0');
      const isInactive = count % 9 === 0;

      items.push({
        id: `asg-${String(count).padStart(3, '0')}`,
        supplierId: sup.id,
        supplierCode: sup.code,
        supplierName: sup.name,
        supplierType: sup.supplierType,
        branchId: branch.id,
        branchCode: branch.code,
        branchName: branch.name,
        branchAddress: branch.address,
        assignedAt: `2026-10-${day}`,
        status: isInactive ? 'Inactive' : 'Active',
        inactiveReason: isInactive ? 'Tạm dừng nhập hàng từ NCC này tại chi nhánh' : undefined,
      });
      count++;
    }
  }

  while (items.length < 50) {
    const idx = items.length;
    const sup = INITIAL_SUPPLIERS[idx % INITIAL_SUPPLIERS.length];
    const branch = MOCK_BRANCH_LIST[(idx * 2) % MOCK_BRANCH_LIST.length];
    const day = String((idx % 28) + 1).padStart(2, '0');
    items.push({
      id: `asg-${String(idx + 1).padStart(3, '0')}`,
      supplierId: sup?.id || `sup-${idx}`,
      supplierCode: sup?.code || `NCC-${1000 + idx}`,
      supplierName: sup?.name || `Nhà cung cấp đối tác ${idx + 1}`,
      supplierType: sup?.supplierType || 'Goods',
      branchId: branch?.id || `BR-${(idx % 4) + 1}`,
      branchCode: branch?.code || `BR-0${(idx % 4) + 1}`,
      branchName: branch?.name || `Chi nhánh ${idx + 1}`,
      branchAddress: branch?.address || 'TP. Hồ Chí Minh',
      assignedAt: `2026-10-${day}`,
      status: 'Active',
    });
  }

  return items;
}

let mockAssignments: SupplierBranchAssignmentItem[] = generateInitialMockAssignments();

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
            pageSize: filter.pageSize || 12,
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
    } catch {
      // Fallback to in-memory mock if backend API is not yet seeded
    }

    // In-memory filter & paging fallback
    let filtered = [...mockAssignments];

    if (filter.supplierId && filter.supplierId !== 'ALL') {
      filtered = filtered.filter((a) => a.supplierId === filter.supplierId);
    }

    if (filter.branchId && filter.branchId !== 'ALL') {
      filtered = filtered.filter((a) => a.branchId === filter.branchId || a.branchCode === filter.branchId);
    }

    if (filter.supplierCodes?.length) {
      const terms = filter.supplierCodes.map((t) => t.toLowerCase());
      filtered = filtered.filter((a) => terms.some((t) => a.supplierCode.toLowerCase().includes(t)));
    }

    if (filter.supplierNames?.length) {
      const terms = filter.supplierNames.map((t) => t.toLowerCase());
      filtered = filtered.filter((a) => terms.some((t) => a.supplierName.toLowerCase().includes(t)));
    }

    if (filter.branchCodes?.length) {
      const terms = filter.branchCodes.map((t) => t.toLowerCase());
      filtered = filtered.filter((a) => terms.some((t) => a.branchCode.toLowerCase().includes(t)));
    }

    if (filter.branchNames?.length) {
      const terms = filter.branchNames.map((t) => t.toLowerCase());
      filtered = filtered.filter((a) => terms.some((t) => a.branchName.toLowerCase().includes(t)));
    }

    if (filter.status && filter.status !== 'ALL') {
      filtered = filtered.filter((a) => a.status === filter.status);
    }

    const total = filtered.length;
    const pageIndex = filter.pageIndex || 1;
    const pageSize = filter.pageSize || 12;
    const startIndex = (pageIndex - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);

    return { items, total };
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
    } catch {
      // Fallback mock update
    }

    const supplier = INITIAL_SUPPLIERS.find((s) => s.id === input.supplierId);
    input.branchIds.forEach((branchId) => {
      const exists = mockAssignments.some(
        (a) => a.supplierId === input.supplierId && a.branchId === branchId
      );
      if (!exists) {
        const branch = MOCK_BRANCH_LIST.find((b) => b.id === branchId);
        mockAssignments.unshift({
          id: `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          supplierId: input.supplierId,
          supplierCode: supplier?.code || 'SUP-NEW',
          supplierName: supplier?.name || 'Nhà cung cấp mới',
          supplierType: supplier?.supplierType || 'Goods',
          branchId,
          branchCode: branch?.code || branchId,
          branchName: branch?.name || branchId,
          branchAddress: branch?.address || '—',
          assignedAt: new Date().toISOString().split('T')[0],
          status: 'Active',
        });
      }
    });

    return true;
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
    } catch (err: any) {
      // Nếu backend trả về lỗi nghiệp vụ 400 Bad Request kèm message
      const apiMessage = err.response?.data?.message;
      if (err.response?.status === 400 && apiMessage) {
        throw new Error(apiMessage);
      }
      // Khi gặp 404 (endpoint đang khởi động lại hoặc chưa nạp) hoặc lỗi mạng -> tự động fallback cập nhật state mượt mà
    }

    // Fallback in-memory mock update
    const branch = MOCK_BRANCH_LIST.find((b) => b.id === input.branchId || b.code === input.branchId);
    input.supplierIds.forEach((supplierId) => {
      const existsIndex = mockAssignments.findIndex(
        (a) => a.supplierId === supplierId && (a.branchId === input.branchId || a.branchCode === input.branchId)
      );
      if (existsIndex >= 0) {
        mockAssignments[existsIndex] = {
          ...mockAssignments[existsIndex],
          status: 'Active',
          inactiveReason: undefined,
        };
      } else {
        const supplier = INITIAL_SUPPLIERS.find((s) => s.id === supplierId);
        mockAssignments.unshift({
          id: `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          supplierId,
          supplierCode: supplier?.code || 'SUP-NEW',
          supplierName: supplier?.name || 'Nhà cung cấp đối tác',
          supplierType: supplier?.supplierType || 'Goods',
          branchId: input.branchId,
          branchCode: branch?.code || input.branchId,
          branchName: branch?.name || 'Chi nhánh phân bổ',
          branchAddress: branch?.address || 'Hệ thống siêu thị MT-Mart',
          assignedAt: new Date().toISOString().split('T')[0],
          status: 'Active',
        });
      }
    });

    return true;
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
    } catch {
      // Fallback mock update
    }

    mockAssignments = mockAssignments.filter(
      (a) => !(a.supplierId === supplierId && a.branchId === branchId)
    );

    return true;
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
      const apiMessage = err.response?.data?.message;
      if (apiMessage) {
        throw new Error(apiMessage);
      }
      if (err.message && !err.message.includes('Network')) {
        throw err;
      }
    }

    mockAssignments = mockAssignments.map((a) =>
      a.supplierId === supplierId && a.branchId === branchId
        ? {
            ...a,
            status,
            inactiveReason: status === 'Inactive' ? reason : undefined,
          }
        : a
    );

    return true;
  },
};
