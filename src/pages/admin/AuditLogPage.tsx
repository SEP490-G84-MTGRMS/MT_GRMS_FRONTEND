import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import {
  AuditKpiCards,
  AuditTabNavigation,
  AuditLogToolbar,
  AuditLogTable,
  AuditLogDetailModal,
  CronJobTable,
  CronJobRunModal,
  AdminToast,
  type ToastState,
  type AuditTabType,
} from '../../features/admin/components';
import type {
  AuditLogItem,
  CronJobItem,
  AuditActionType,
  AuditRiskLevel,
} from '../../features/admin/types/audit.types';
import { auditApi } from '../../features/admin/api/auditApi';
import { Loader2 } from 'lucide-react';
import './adminPlans.css';
import './auditLog.css';

export const AuditLogPage: FC = () => {
  const [activeTab, setActiveTab] = useState<AuditTabType>('logs');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for Audit Logs
  const [keyword, setKeyword] = useState('');
  const [actionType, setActionType] = useState<AuditActionType>('ALL');
  const [riskLevel, setRiskLevel] = useState<'ALL' | AuditRiskLevel>('ALL');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d'>('all');

  // Modals & Trigger state
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [selectedCronJob, setSelectedCronJob] = useState<CronJobItem | null>(null);
  const [triggeringJobId, setTriggeringJobId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Fetch Audit Logs
  const loadLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await auditApi.getAuditLogs({
        keyword,
        actionType,
        riskLevel,
        dateRange,
      });
      if (res.success) {
        setLogs(res.data);
      }
    } catch {
      showToast('Không thể tải nhật ký kiểm toán từ máy chủ', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [keyword, actionType, riskLevel, dateRange]);

  // Fetch Cron Jobs
  const loadCronJobs = useCallback(async () => {
    try {
      const res = await auditApi.getCronJobs();
      if (res.success) {
        setCronJobs(res.data);
      }
    } catch {
      showToast('Không thể tải danh sách tác vụ ngầm', 'warning');
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadCronJobs();
  }, [loadCronJobs]);

  // Handler: Trigger Cronjob immediately
  const handleTriggerNow = async (job: CronJobItem) => {
    try {
      setTriggeringJobId(job.id);
      showToast(`Đang khởi chạy tác vụ ngầm "${job.name}"...`, 'info');

      // Giả lập thời gian kích hoạt thực tế 1.2s
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const res = await auditApi.triggerCronJob(job.id);
      if (res.success) {
        setCronJobs((prev) => prev.map((j) => (j.id === job.id ? res.updatedJob : j)));
        showToast(res.message, 'success');
        // Tải lại logs vì vừa có hành vi kích hoạt mới
        loadLogs();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kích hoạt tác vụ thất bại';
      showToast(msg, 'warning');
    } finally {
      setTriggeringJobId(null);
    }
  };

  // Handler: Export CSV with UTF-8 BOM
  const handleExport = () => {
    if (logs.length === 0) {
      showToast('Không có dữ liệu để xuất.', 'warning');
      return;
    }

    const headers = [
      'Mã log',
      'Thời gian',
      'Người thực hiện',
      'Email',
      'Vai trò',
      'Loại hành động',
      'Tiêu đề hành động',
      'Đối tượng tác động',
      'Mã đối tượng',
      'Mức độ rủi ro',
      'Địa chỉ IP',
      'Vị trí',
      'Lý do',
      'Tóm tắt biến động',
    ];

    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString('vi-VN')}"`,
      `"${l.actorName.replace(/"/g, '""')}"`,
      `"${l.actorEmail}"`,
      `"${l.actorRole}"`,
      `"${l.actionType}"`,
      `"${l.actionTitle.replace(/"/g, '""')}"`,
      `"${l.targetName.replace(/"/g, '""')}"`,
      `"${l.targetId}"`,
      `"${l.riskLevel}"`,
      `"${l.ipAddress}"`,
      `"${l.location}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      `"${(l.details?.changesSummary || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MT_GRMS_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã xuất thành công ${logs.length} bản ghi nhật ký kiểm toán (.csv).`);
  };

  return (
    <div className="admin-plans admin-audit-logs">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Hero Header */}
      <div className="plans-hero" style={{ marginBottom: 18 }}>
        <div>
          <p className="plans-eyebrow">GIÁM SÁT HỆ THỐNG & AN TOÀN VẬN HÀNH</p>
          <h1>Nhật ký Vận hành & Giám sát Tác vụ</h1>
          <p>
            Đối soát kiểm toán hành vi quản trị (FE-22) và kiểm soát 4 tác vụ ngầm tự động (FE-26)
          </p>
        </div>

        <div className="plans-toolbar-actions">
          {activeTab === 'logs' ? (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleExport}
            >
              <span>Xuất báo cáo kiểm toán</span>
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => {
                const fefo = cronJobs.find((j) => j.id === 'cron-fefo-batch');
                if (fefo) handleTriggerNow(fefo);
              }}
              disabled={Boolean(triggeringJobId)}
            >
              <span>Chạy nhanh quét FEFO</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <AuditKpiCards logs={logs} cronJobs={cronJobs} />

      {/* Tab Navigation */}
      <AuditTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        logsCount={logs.length}
        cronJobsCount={cronJobs.length}
      />

      {/* Tab 1: Audit Logs */}
      {activeTab === 'logs' && (
        <>
          <AuditLogToolbar
            keyword={keyword}
            onKeywordChange={setKeyword}
            actionType={actionType}
            onActionTypeChange={setActionType}
            riskLevel={riskLevel}
            onRiskLevelChange={setRiskLevel}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            totalFiltered={logs.length}
            totalAll={logs.length}
            onExport={handleExport}
          />

          {isLoading ? (
            <div
              style={{
                background: '#ffffff',
                padding: '48px',
                borderRadius: '18px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color, #e2eaf0)',
              }}
            >
              <Loader2 className="animate-spin" size={32} color="var(--blue-primary, #0066ff)" />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Đang nạp nhật ký kiểm toán...</span>
            </div>
          ) : (
            <AuditLogTable logs={logs} onSelectLog={setSelectedLog} />
          )}
        </>
      )}

      {/* Tab 2: Cron Jobs Monitoring */}
      {activeTab === 'cronjobs' && (
        <CronJobTable
          cronJobs={cronJobs}
          triggeringJobId={triggeringJobId}
          onTriggerNow={handleTriggerNow}
          onViewLogs={setSelectedCronJob}
        />
      )}

      {/* Detail Modals */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
      />

      <CronJobRunModal
        job={selectedCronJob}
        isOpen={Boolean(selectedCronJob)}
        onClose={() => setSelectedCronJob(null)}
      />
    </div>
  );
};
