import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type { BranchListItem, MatrixCellMap } from '../types/po.types';
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

/** Đếm số sản phẩm (SKU) đang có qty > 0 trong draft Order Matrix của chi nhánh. */
export const countMatrixProductsForBranch = (branchId: string): number => {
  if (!branchId || typeof localStorage === 'undefined') return 0;

  const productIds = new Set<string>();
  const prefix = `matrix_draft_${branchId}_`;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const cellMap = JSON.parse(raw) as MatrixCellMap;
      for (const [productId, days] of Object.entries(cellMap || {})) {
        if (!days) continue;
        const hasQty = Object.values(days).some((cell) => {
          const finalQty = Number(cell?.finalQty ?? 0);
          const employeeQty = Number(cell?.employeeQty ?? 0);
          const storeQty = cell?.storeQty == null ? 0 : Number(cell.storeQty);
          return finalQty > 0 || employeeQty > 0 || storeQty > 0;
        });
        if (hasQty) productIds.add(productId);
      }
    }
  } catch {
    return 0;
  }

  return productIds.size;
};

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
    matrixProductCount: countMatrixProductsForBranch(item.id),
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
      const statusRaw = (filter.status || '').trim();
      const backendStatus =
        !statusRaw || statusRaw.toLowerCase() === 'all'
          ? undefined
          : statusRaw.toLowerCase() === 'active'
            ? 'Active'
            : statusRaw.toLowerCase() === 'inactive'
              ? 'Inactive'
              : statusRaw;

      const branchCodes = (filter.branchCodes ?? []).map((x) => x.trim()).filter(Boolean);
      const branchNames = (filter.branchNames ?? []).map((x) => x.trim()).filter(Boolean);
      const addresses = (filter.addresses ?? []).map((x) => x.trim()).filter(Boolean);
      const phones = (filter.phones ?? []).map((x) => x.trim()).filter(Boolean);

      const res = await httpClient.get<ApiResponse<PagedResult<BranchBackendDto>>>('/branches', {
        params: {
          Keyword: filter.keyword?.trim() || undefined,
          BranchCode:
            branchCodes.length === 0 && filter.branchCode && filter.branchCode !== 'all'
              ? filter.branchCode
              : undefined,
          BranchCodes: branchCodes.length ? branchCodes : undefined,
          BranchNames: branchNames.length ? branchNames : undefined,
          Addresses: addresses.length ? addresses : undefined,
          Phones: phones.length ? phones : undefined,
          Status: backendStatus,
          PageIndex: filter.pageIndex || 1,
          PageSize: filter.pageSize || 10,
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
