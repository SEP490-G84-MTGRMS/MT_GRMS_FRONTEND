import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import { storeProductApi } from '../../product/api/storeProductApi';
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
  /** Số SP đã gán bán tại CN (BranchProducts) — nếu BE có trả. */
  productCount?: number;
  catalogProductCount?: number;
  totalProducts?: number;
}

export const mapBackendBranchToListItem = (
  item: BranchBackendDto,
  catalogProductCount = 0
): BranchListItem => {
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

  const fromDto =
    item.catalogProductCount ?? item.productCount ?? item.totalProducts;
  const productCount =
    typeof fromDto === 'number' && fromDto >= 0 ? fromDto : catalogProductCount;

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    address: item.address,
    managerName: item.managerName || '—',
    managerPhone: item.phone || '—',
    stockQty: 0,
    orderQty: 0,
    // Field giữ tên cũ để khỏi đụng type — giá trị = số SP đã gán cửa hàng (BranchProducts)
    matrixProductCount: productCount,
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
        // Đồng bộ với màn /stores/products: đếm BranchProducts qua /branches/summaries
        let countById = new Map<string, number>();
        try {
          const summaries = await storeProductApi.getStoreSummaries();
          countById = new Map(
            (summaries || [])
              .filter((s) => s?.id)
              .map((s) => [String(s.id).toLowerCase(), Number(s.totalProducts || 0)])
          );
        } catch {
          countById = new Map();
        }

        const items = paged.items.map((item) =>
          mapBackendBranchToListItem(
            item,
            countById.get(String(item.id).toLowerCase()) ?? 0
          )
        );
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
        let catalogCount = 0;
        try {
          const summaries = await storeProductApi.getStoreSummaries();
          const hit = (summaries || []).find(
            (s) => String(s.id).toLowerCase() === String(id).toLowerCase()
          );
          catalogCount = Number(hit?.totalProducts || 0);
        } catch {
          catalogCount = 0;
        }
        return mapBackendBranchToListItem(res.data.data, catalogCount);
      }
      return null;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể tải chi tiết chi nhánh.');
    }
  },
};
