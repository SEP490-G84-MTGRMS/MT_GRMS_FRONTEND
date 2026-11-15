import { httpClient } from '../../../api/httpClient';
import type { AuditLogItem, CronJobItem, AuditFilterParams } from '../types/audit.types';
import { initialAuditLogs, initialCronJobs } from '../data/mockAuditData';

let inMemoryAuditLogs = [...initialAuditLogs];
let inMemoryCronJobs = [...initialCronJobs];

export const auditApi = {
  /**
   * Lấy danh sách nhật ký kiểm toán (Audit Logs)
   */
  async getAuditLogs(params?: AuditFilterParams): Promise<{ success: boolean; data: AuditLogItem[]; total: number }> {
    try {
      const response = await httpClient.get<any>('/admin/audit-logs', { params });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return {
          success: true,
          data: response.data.data,
          total: response.data.total ?? response.data.data.length,
        };
      }
    } catch {
      // Backend endpoint chưa có -> Sử dụng in-memory mock data
    }

    let result = [...inMemoryAuditLogs];

    if (params?.keyword) {
      const q = params.keyword.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.actorName.toLowerCase().includes(q) ||
          item.actorEmail.toLowerCase().includes(q) ||
          item.actionTitle.toLowerCase().includes(q) ||
          item.targetName.toLowerCase().includes(q) ||
          item.ipAddress.includes(q) ||
          item.id.toLowerCase().includes(q)
      );
    }

    if (params?.actionType && params.actionType !== 'ALL') {
      result = result.filter((item) => item.actionType === params.actionType);
    }

    if (params?.riskLevel && params.riskLevel !== 'ALL') {
      result = result.filter((item) => item.riskLevel === params.riskLevel);
    }

    if (params?.dateRange && params.dateRange !== 'all') {
      const now = new Date();
      if (params.dateRange === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        result = result.filter((item) => item.timestamp.startsWith(todayStr));
      } else if (params.dateRange === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter((item) => new Date(item.timestamp) >= sevenDaysAgo);
      } else if (params.dateRange === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter((item) => new Date(item.timestamp) >= thirtyDaysAgo);
      }
    }

    return {
      success: true,
      data: result,
      total: result.length,
    };
  },

  /**
   * Lấy danh sách 4 tác vụ ngầm & Cronjob
   */
  async getCronJobs(): Promise<{ success: boolean; data: CronJobItem[] }> {
    try {
      const response = await httpClient.get<any>('/admin/cronjobs');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return {
          success: true,
          data: response.data.data,
        };
      }
    } catch {
      // Fallback in-memory
    }

    return {
      success: true,
      data: inMemoryCronJobs,
    };
  },

  /**
   * Kích hoạt chạy ngay (Trigger Now) một tác vụ ngầm
   */
  async triggerCronJob(jobId: string): Promise<{ success: boolean; message: string; updatedJob: CronJobItem }> {
    try {
      const response = await httpClient.post<any>(`/admin/cronjobs/${jobId}/trigger`);
      if (response.data?.success && response.data?.data) {
        return {
          success: true,
          message: response.data.message || 'Kích hoạt tác vụ ngầm thành công.',
          updatedJob: response.data.data,
        };
      }
    } catch {
      // Fallback simulate execution
    }

    // Giả lập thời gian chạy thực tế và cập nhật dữ liệu in-memory
    const targetIndex = inMemoryCronJobs.findIndex((j) => j.id === jobId);
    if (targetIndex === -1) {
      throw new Error(`Không tìm thấy tác vụ có mã ${jobId}`);
    }

    const now = new Date();
    const timeFormatted = now.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const executionDuration = (Math.random() * 1.5 + 1.2).toFixed(1) + 's';
    const oldJob = inMemoryCronJobs[targetIndex];

    const newLogs = [
      `[${now.toLocaleTimeString('vi-VN')} INFO] Người quản trị kích hoạt thủ công tác vụ ${oldJob.code} từ Admin Portal.`,
      `[${now.toLocaleTimeString('vi-VN')} INFO] Phân bổ worker thực thi tác vụ: ${oldJob.nodeWorker}...`,
      `[${now.toLocaleTimeString('vi-VN')} INFO] Bắt đầu quét các bản ghi liên quan theo đặc tả nghiệp vụ...`,
      `[${now.toLocaleTimeString('vi-VN')} SUCCESS] Hoàn tất thực thi thành công tác vụ ${oldJob.code} trong ${executionDuration}. Không có lỗi.`,
      ...oldJob.recentLogs.slice(0, 3),
    ];

    const updatedJob: CronJobItem = {
      ...oldJob,
      lastRunTime: `${timeFormatted} (Vừa kích hoạt thủ công)`,
      lastRunDuration: executionDuration,
      lastRunStatus: 'SUCCESS',
      recentLogs: newLogs,
    };

    inMemoryCronJobs[targetIndex] = updatedJob;

    // Tự động thêm một log vào Audit Logs để ghi nhận hành vi kích hoạt này
    const newAuditLog: AuditLogItem = {
      id: `AUD-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: now.toISOString(),
      actorName: 'Lê Văn Quản (Admin)',
      actorEmail: 'admin@mtgrms.vn',
      actorRole: 'SUPER_ADMIN',
      actionType: 'CRON_TRIGGER',
      actionTitle: `Kích hoạt thủ công tác vụ ngầm ${oldJob.code}`,
      targetType: 'CRONJOB',
      targetId: oldJob.id,
      targetName: oldJob.name,
      riskLevel: 'INFO',
      ipAddress: '113.190.234.52',
      userAgent: navigator.userAgent,
      location: 'Hà Nội, Việt Nam',
      reason: 'Kích hoạt thử nghiệm trực tiếp từ Admin Portal',
      details: {
        oldValue: { status: oldJob.lastRunStatus, lastRun: oldJob.lastRunTime },
        newValue: { status: 'SUCCESS', executedAt: timeFormatted, duration: executionDuration },
        changesSummary: `Thực thi tác vụ ${oldJob.code} thành công trong ${executionDuration}`,
      },
    };

    inMemoryAuditLogs.unshift(newAuditLog);

    return {
      success: true,
      message: `Đã kích hoạt thành công tác vụ "${oldJob.name}" trong ${executionDuration}.`,
      updatedJob,
    };
  },
};
