import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  SupplierSummary,
  SupplierFilterState,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierStatus,
  SupplierType,
  APLedgerEntry,
} from '../types/supplier.types';
import { INITIAL_SUPPLIERS } from '../lib/mockData';

// Map enums between Frontend and Backend
const typeMapFrontendToBackend = (type?: string): number | undefined => {
  if (!type) return undefined;
  if (type === 'Goods') return 1;
  if (type === 'Service') return 2;
  if (type === 'Both') return 3;
  return undefined;
};

const typeMapBackendToFrontend = (type: any): SupplierType => {
  if (type === 1 || type === '1' || type === 'Goods') return 'Goods';
  if (type === 2 || type === '2' || type === 'Service') return 'Service';
  if (type === 3 || type === '3' || type === 'Both') return 'Both';
  return 'Goods';
};

const statusMapFrontendToBackend = (status?: string): number | undefined => {
  if (!status) return undefined;
  if (status === 'Active') return 1;
  if (status === 'Inactive') return 2;
  return undefined;
};

const statusMapBackendToFrontend = (status: any): SupplierStatus => {
  if (status === 1 || status === '1' || status === 'Active') return 'Active';
  if (status === 2 || status === '2' || status === 'Inactive') return 'Inactive';
  return 'Active';
};

export const mapBackendSupplierToFrontend = (item: any): SupplierSummary => ({
  id: item.id || '',
  code: item.code || '',
  name: item.name || '',
  tradeName: item.tradeName || item.name || '',
  supplierType: typeMapBackendToFrontend(item.supplierType),
  category: item.categoryCode || item.categoryName || 'FRESH',
  contactPerson: item.contactPerson || '',
  phone: item.phone || '',
  email: item.email || undefined,
  address: item.address || undefined,
  paymentTermDays: item.paymentTermDays ?? 30,
  creditLimit: item.creditLimit ?? 0,
  currentDebt: item.currentDebt ?? 0,
  overdueDebt: item.overdueDebt ?? 0,
  rating: item.rating ?? 5.0,
  status: statusMapBackendToFrontend(item.status),
  linkedCustomerId: item.linkedCustomerId || undefined,
  taxCode: item.taxCode || undefined,
  companyName: item.companyName || undefined,
  invoiceAddress: item.invoiceAddress || undefined,
  bankName: item.bankName || undefined,
  bankAccount: item.bankAccount || item.bankAccountNumber || undefined,
  accountHolder: item.accountHolder || item.bankAccountHolder || undefined,
  note: item.note || item.notes || undefined,
  createdAt: item.createdAt || new Date().toISOString(),
});

export const supplierApi = {
  /**
   * Lấy danh sách nhà cung cấp từ backend
   */
  async getSuppliers(filter?: Partial<SupplierFilterState>): Promise<{
    items: SupplierSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const params: Record<string, any> = {
        searchTerm: filter?.searchTerm || undefined,
        supplierType: typeMapFrontendToBackend(filter?.supplierType),
        status: statusMapFrontendToBackend(filter?.status),
        pageIndex: filter?.pageIndex || 1,
        pageSize: filter?.pageSize || 10,
      };

      const res = await httpClient.get<ApiResponse<PagedResult<any>>>('/suppliers', { params });
      if (res.data?.success && res.data.data) {
        const paged = res.data.data;
        const items = (paged.items || []).map(mapBackendSupplierToFrontend);
        return {
          items,
          total: paged.totalItems || items.length,
          page: paged.page || 1,
          pageSize: paged.pageSize || 10,
        };
      }
    } catch (err) {
      console.warn('Backend API /suppliers unavailable, falling back to local dataset:', err);
    }

    // Fallback nếu backend đang rỗng hoặc chưa kết nối
    return {
      items: INITIAL_SUPPLIERS,
      total: INITIAL_SUPPLIERS.length,
      page: 1,
      pageSize: 10,
    };
  },

  /**
   * Lấy chi tiết nhà cung cấp theo ID
   */
  async getSupplierById(id: string): Promise<SupplierSummary | null> {
    try {
      const res = await httpClient.get<ApiResponse<any>>(`/suppliers/${id}`);
      if (res.data?.success && res.data.data) {
        return mapBackendSupplierToFrontend(res.data.data);
      }
    } catch (err) {
      console.warn(`Backend API /suppliers/${id} failed, using local match:`, err);
    }
    return INITIAL_SUPPLIERS.find((s) => s.id === id) || null;
  },

  /**
   * Tạo mới nhà cung cấp
   */
  async createSupplier(input: CreateSupplierInput): Promise<SupplierSummary> {
    const payload = {
      code: input.code || undefined,
      name: input.name,
      supplierType: typeMapFrontendToBackend(input.supplierType) || 1,
      phone: input.phone,
      email: input.email || undefined,
      taxCode: input.taxCode || undefined,
      address: input.address || undefined,
      contactPerson: input.contactPerson || input.name,
      paymentTermDays: input.paymentTermDays ?? 30,
      creditLimit: input.creditLimit ?? 0,
      bankName: input.bankName || undefined,
      bankAccountNumber: input.bankAccount || undefined,
      bankAccountHolder: input.accountHolder || undefined,
      notes: input.note || undefined,
      linkedCustomerId: input.linkedCustomerId || undefined,
    };

    const res = await httpClient.post<ApiResponse<any>>('/suppliers', payload);
    if (res.data?.success && res.data.data) {
      return mapBackendSupplierToFrontend(res.data.data);
    }
    throw new Error(res.data?.message || 'Không thể tạo mới nhà cung cấp.');
  },

  /**
   * Cập nhật nhà cung cấp
   */
  async updateSupplier(id: string, input: UpdateSupplierInput): Promise<SupplierSummary> {
    const payload = {
      name: input.name,
      supplierType: typeMapFrontendToBackend(input.supplierType) || 1,
      phone: input.phone,
      email: input.email || undefined,
      taxCode: input.taxCode || undefined,
      address: input.address || undefined,
      contactPerson: input.contactPerson || input.name,
      paymentTermDays: input.paymentTermDays ?? 30,
      creditLimit: input.creditLimit ?? 0,
      bankName: input.bankName || undefined,
      bankAccountNumber: input.bankAccount || undefined,
      bankAccountHolder: input.accountHolder || undefined,
      notes: input.note || undefined,
      linkedCustomerId: input.linkedCustomerId || undefined,
    };

    const res = await httpClient.put<ApiResponse<any>>(`/suppliers/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return mapBackendSupplierToFrontend(res.data.data);
    }
    throw new Error(res.data?.message || 'Không thể cập nhật nhà cung cấp.');
  },

  /**
   * Chuyển trạng thái hoạt động Active / Inactive
   */
  async updateSupplierStatus(id: string, status: SupplierStatus, reason?: string): Promise<SupplierSummary> {
    const res = await httpClient.patch<ApiResponse<any>>(`/suppliers/${id}/status`, {
      status: statusMapFrontendToBackend(status),
      reason,
    });
    if (res.data?.success && res.data.data) {
      return mapBackendSupplierToFrontend(res.data.data);
    }
    throw new Error(res.data?.message || 'Không thể cập nhật trạng thái nhà cung cấp.');
  },

  /**
   * Xóa mềm nhà cung cấp
   */
  async deleteSupplier(id: string): Promise<boolean> {
    const res = await httpClient.delete<ApiResponse<boolean>>(`/suppliers/${id}`);
    if (res.data?.success) {
      return true;
    }
    throw new Error(res.data?.message || 'Không thể xóa nhà cung cấp.');
  },

  /**
   * Lấy sổ cái công nợ AP của nhà cung cấp
   */
  async getAPLedger(
    id: string,
    params?: { fromDate?: string; toDate?: string; pageIndex?: number; pageSize?: number }
  ): Promise<PagedResult<APLedgerEntry>> {
    try {
      const res = await httpClient.get<ApiResponse<PagedResult<APLedgerEntry>>>(`/suppliers/${id}/ap/ledger`, {
        params,
      });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn(`Backend API /suppliers/${id}/ap/ledger failed:`, err);
    }

    return {
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
    };
  },

  /**
   * Ghi nhận giao dịch công nợ AP
   */
  async recordAPTransaction(id: string, command: any): Promise<any> {
    const res = await httpClient.post<ApiResponse<any>>(`/suppliers/${id}/ap/transactions`, command);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể ghi nhận giao dịch công nợ.');
  },

  /**
   * Lấy cấu hình giao hàng & ngày nghỉ lễ
   */
  async getDeliveryConfig(id: string): Promise<any> {
    const res = await httpClient.get<ApiResponse<any>>(`/suppliers/${id}/delivery-config`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return null;
  },

  /**
   * Cập nhật cấu hình giao hàng & ngày nghỉ lễ
   */
  async updateDeliveryConfig(id: string, config: any): Promise<any> {
    const res = await httpClient.put<ApiResponse<any>>(`/suppliers/${id}/delivery-config`, config);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể lưu cấu hình giao hàng.');
  },

  /**
   * Liên kết hồ sơ khách hàng đối tác kép
   */
  async linkCustomer(supplierId: string, customerId: string): Promise<any> {
    const res = await httpClient.post<ApiResponse<any>>(`/suppliers/${supplierId}/link-customer`, {
      customerId,
    });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể liên kết khách hàng.');
  },
};
