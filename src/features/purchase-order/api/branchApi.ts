import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type { BranchListItem } from '../types/po.types';
import type { BranchFilterParams } from '../types/branch.types';
import { MOCK_BRANCH_LIST } from '../lib/mockData';

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

const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === '—') return null;
  const parts = dateStr.trim().split(' ');
  if (!parts[0]) return null;
  const dmy = parts[0].split('/');
  if (dmy.length !== 3) return null;
  const day = parseInt(dmy[0], 10);
  const month = parseInt(dmy[1], 10) - 1;
  const year = parseInt(dmy[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
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
    } catch {
      // Backend offline hoặc lỗi -> Fallback an toàn sang in-memory mock data
    }

    // In-memory Fallback
    const filtered = MOCK_BRANCH_LIST.filter((b) => {
      if (filter.keyword?.trim()) {
        const kw = filter.keyword.trim().toLowerCase();
        const match =
          b.code.toLowerCase().includes(kw) ||
          b.name.toLowerCase().includes(kw) ||
          b.address.toLowerCase().includes(kw) ||
          b.managerName.toLowerCase().includes(kw) ||
          b.managerPhone.toLowerCase().includes(kw);
        if (!match) return false;
      }

      if (filter.branchCode && filter.branchCode !== 'all' && b.code !== filter.branchCode) {
        return false;
      }

      if (filter.status && filter.status !== 'all' && b.status !== filter.status) {
        return false;
      }

      if (filter.dateFrom) {
        const from = new Date(filter.dateFrom);
        from.setHours(0, 0, 0, 0);
        const itemDate = parseDateString(b.lastUpdated);
        if (!itemDate || itemDate < from) return false;
      }

      if (filter.dateTo) {
        const to = new Date(filter.dateTo);
        to.setHours(23, 59, 59, 999);
        const itemDate = parseDateString(b.lastUpdated);
        if (!itemDate || itemDate > to) return false;
      }

      return true;
    });

    const page = filter.pageIndex || 1;
    const size = filter.pageSize || 10;
    const start = (page - 1) * size;
    const pagedItems = filtered.slice(start, start + size);

    return { items: pagedItems, total: filtered.length };
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
    } catch {
      // Fallback
    }

    const found = MOCK_BRANCH_LIST.find((b) => b.id === id);
    return found || null;
  },
};
