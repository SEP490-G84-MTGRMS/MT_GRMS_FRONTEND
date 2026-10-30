import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  SupplierBranchAssignmentItem,
  SupplierBranchFilterState,
  AssignSupplierToBranchesInput,
} from '../types/supplier.types';
import { INITIAL_SUPPLIERS } from '../lib/mockData';
import { MOCK_BRANCH_LIST } from '../../purchase-order/lib/mockData';

// Mock initial data if backend database is empty or offline
let mockAssignments: SupplierBranchAssignmentItem[] = [
  {
    id: 'asg-001',
    supplierId: 'sup-001',
    supplierCode: 'NCC-0001',
    supplierName: 'Công ty CP Sữa Việt Nam (Vinamilk)',
    supplierType: 'Goods',
    branchId: 'BR-01',
    branchCode: 'BR-01',
    branchName: 'BR-01 CH Nguyễn Trãi',
    branchAddress: '184 Nguyễn Trãi, P. Bến Thành, Quận 1, TP.HCM',
    assignedAt: '2026-10-15',
    status: 'Active',
  },
  {
    id: 'asg-002',
    supplierId: 'sup-001',
    supplierCode: 'NCC-0001',
    supplierName: 'Công ty CP Sữa Việt Nam (Vinamilk)',
    supplierType: 'Goods',
    branchId: 'BR-02',
    branchCode: 'BR-02',
    branchName: 'BR-02 Kho Thủ Đức',
    branchAddress: '45 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
    assignedAt: '2026-10-15',
    status: 'Active',
  },
  {
    id: 'asg-003',
    supplierId: 'sup-001',
    supplierCode: 'NCC-0001',
    supplierName: 'Công ty CP Sữa Việt Nam (Vinamilk)',
    supplierType: 'Goods',
    branchId: 'DC1',
    branchCode: 'DC1',
    branchName: 'Kho tổng DC1',
    branchAddress: 'Lô 12 KCN Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP.HCM',
    assignedAt: '2026-10-12',
    status: 'Active',
  },
  {
    id: 'asg-004',
    supplierId: 'sup-002',
    supplierCode: 'NCC-0002',
    supplierName: 'Công ty TNHH Nước Giải Khát Coca-Cola Việt Nam',
    supplierType: 'Goods',
    branchId: 'BR-01',
    branchCode: 'BR-01',
    branchName: 'BR-01 CH Nguyễn Trãi',
    branchAddress: '184 Nguyễn Trãi, P. Bến Thành, Quận 1, TP.HCM',
    assignedAt: '2026-10-18',
    status: 'Active',
  },
  {
    id: 'asg-005',
    supplierId: 'sup-002',
    supplierCode: 'NCC-0002',
    supplierName: 'Công ty TNHH Nước Giải Khát Coca-Cola Việt Nam',
    supplierType: 'Goods',
    branchId: 'BR-03',
    branchCode: 'BR-03',
    branchName: 'BR-03 CH Quận 7',
    branchAddress: '520 Huỳnh Tấn Phát, P. Bình Thuận, Q.7, TP.HCM',
    assignedAt: '2026-10-18',
    status: 'Active',
  },
  {
    id: 'asg-006',
    supplierId: 'sup-003',
    supplierCode: 'NCC-0003',
    supplierName: 'HTX Nông Nghiệp Rau Sạch Đà Lạt Farm',
    supplierType: 'Goods',
    branchId: 'BR-01',
    branchCode: 'BR-01',
    branchName: 'BR-01 CH Nguyễn Trãi',
    branchAddress: '184 Nguyễn Trãi, P. Bến Thành, Quận 1, TP.HCM',
    assignedAt: '2026-10-20',
    status: 'Active',
  },
  {
    id: 'asg-007',
    supplierId: 'sup-003',
    supplierCode: 'NCC-0003',
    supplierName: 'HTX Nông Nghiệp Rau Sạch Đà Lạt Farm',
    supplierType: 'Goods',
    branchId: 'BR-04',
    branchCode: 'BR-04',
    branchName: 'BR-04 CH Gò Vấp',
    branchAddress: '312 Quang Trung, P.10, Q. Gò Vấp, TP.HCM',
    assignedAt: '2026-10-20',
    status: 'Active',
  },
  {
    id: 'asg-008',
    supplierId: 'sup-004',
    supplierCode: 'NCC-0004',
    supplierName: 'Công ty CP Thực Phẩm CP Việt Nam',
    supplierType: 'Goods',
    branchId: 'DC1',
    branchCode: 'DC1',
    branchName: 'Kho tổng DC1',
    branchAddress: 'Lô 12 KCN Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP.HCM',
    assignedAt: '2026-10-22',
    status: 'Active',
  },
];

export const supplierBranchApi = {
  /**
   * Lấy danh sách gán NCC với Chi nhánh theo bộ lọc & phân trang (REQ-SBA01, REQ-SBA02)
   */
  async getBranchAssignments(
    filter: SupplierBranchFilterState
  ): Promise<{ items: SupplierBranchAssignmentItem[]; total: number }> {
    try {
      const res = await httpClient.get<ApiResponse<PagedResult<any>>>(
        '/suppliers/branch-assignments',
        {
          params: {
            supplierSearch: filter.supplierSearch || undefined,
            branchSearch: filter.branchSearch || undefined,
            supplierId: filter.supplierId && filter.supplierId !== 'ALL' ? filter.supplierId : undefined,
            branchId: filter.branchId && filter.branchId !== 'ALL' ? filter.branchId : undefined,
            pageIndex: filter.pageIndex || 1,
            pageSize: filter.pageSize || 10,
          },
        }
      );

      if (res.data?.success && res.data.data) {
        const paged = res.data.data;
        if (paged.items && paged.items.length > 0) {
          const items: SupplierBranchAssignmentItem[] = paged.items.map((item: any) => ({
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
          }));

          return { items, total: paged.totalItems };
        }
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

    if (filter.supplierSearch?.trim()) {
      const term = filter.supplierSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.supplierCode.toLowerCase().includes(term) ||
          a.supplierName.toLowerCase().includes(term)
      );
    }

    if (filter.branchSearch?.trim()) {
      const term = filter.branchSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.branchCode.toLowerCase().includes(term) ||
          a.branchName.toLowerCase().includes(term) ||
          a.branchAddress.toLowerCase().includes(term)
      );
    }

    if (filter.status && filter.status !== 'ALL') {
      filtered = filtered.filter((a) => a.status === filter.status);
    }

    const total = filtered.length;
    const pageIndex = filter.pageIndex || 1;
    const pageSize = filter.pageSize || 10;
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
};
