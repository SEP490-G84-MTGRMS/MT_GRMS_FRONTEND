import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type { BranchListItem } from '../types/po.types';
import type { BranchFilterParams } from '../types/branch.types';

export interface BranchBackendDto {
  id: string;
  code: string;
  name: string;
  address: string;
  phone?: string;
  managerName?: string;
  status: string;
  pendingOrdersCount: number;
  lastOrderDate?: string;
  createdAt: string;
}

export const mapBackendBranchToListItem = (item: BranchBackendDto): BranchListItem => {
  const isInactive = item.status?.toLowerCase() === 'inactive';
  let formattedDate = '—';
  if (item.lastOrderDate) {
    const d = new Date(item.lastOrderDate);
    formattedDate = !isNaN(d.getTime())
      ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : '—';
  } else if (item.createdAt) {
    const d = new Date(item.createdAt);
    formattedDate = !isNaN(d.getTime())
      ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      : '—';
  }

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    address: item.address,
    managerName: item.managerName || '—',
    managerPhone: item.phone || '—',
    stockQty: 0,
    orderQty: 0,
    orderSummary: `${item.pendingOrdersCount || 0} đơn chờ xử lý`,
    draftCount: 0,
    pendingCount: item.pendingOrdersCount || 0,
    status: isInactive ? 'inactive' : 'active',
    lastUpdated: formattedDate,
  };
};

export const branchApi = {
  /**
   * Truy vấn danh sách chi nhánh có phân trang và bộ lọc (REQ-BR-01, REQ-BR-03)
   */
  async getBranches(
    filter: BranchFilterParams
  ): Promise<{ items: BranchListItem[]; total: number }> {
    try {
      const backendStatus =
        filter.status === 'active'
          ? 'Active'
          : filter.status === 'inactive'
          ? 'Inactive'
          : undefined;

      const res = await httpClient.get<ApiResponse<PagedResult<BranchBackendDto>>>('/branches', {
        params: {
          Keyword: filter.keyword?.trim() || undefined,
          BranchCode: filter.branchCode && filter.branchCode !== 'all' ? filter.branchCode : undefined,
          Status: backendStatus,
          PageIndex: filter.pageIndex || 1,
          PageSize: filter.pageSize || 10,
        },
      });

      if (res.data?.success && res.data.data) {
        const paged = res.data.data;
        const items = paged.items.map(mapBackendBranchToListItem);
        return { items, total: paged.totalItems };
      }

      return { items: [], total: 0 };
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể tải danh sách chi nhánh.');
    }
  },

  /**
   * Lấy chi tiết chi nhánh theo ID (REQ-BR-02)
   */
  async getBranchById(id: string): Promise<BranchListItem | null> {
    try {
      const res = await httpClient.get<ApiResponse<BranchBackendDto>>(`/branches/${id}`);
      if (res.data?.success && res.data.data) {
        return mapBackendBranchToListItem(res.data.data);
      }
      return null;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể tải chi tiết chi nhánh.');
    }
  },
};
