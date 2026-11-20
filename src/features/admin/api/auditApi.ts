import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type { AuditLogItem, AuditFilterParams } from '../types/audit.types';

export interface AuditLogPageData {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  actionTypes: string[];
}

export const auditApi = {
  async getAuditLogs(params: AuditFilterParams, signal?: AbortSignal): Promise<AuditLogPageData> {
    const response = await httpClient.get<ApiResponse<AuditLogPageData>>('/admin/audit-logs', { params, signal });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Không tải được nhật ký kiểm toán.');
    }
    return response.data.data;
  },
};
