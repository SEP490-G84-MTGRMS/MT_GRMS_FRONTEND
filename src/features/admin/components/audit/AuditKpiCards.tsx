import type { FC } from 'react';
import { ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import type { AuditLogItem, CronJobItem } from '../../types/audit.types';

interface AuditKpiCardsProps {
  logs: AuditLogItem[];
  cronJobs: CronJobItem[];
}

export const AuditKpiCards: FC<AuditKpiCardsProps> = ({ logs, cronJobs }) => {
  const totalLogs = logs.length;
  const sensitiveLogs = logs.filter((l) => l.riskLevel === 'DANGER' || l.riskLevel === 'WARNING').length;
  const totalCrons = cronJobs.length;
  const healthyCrons = cronJobs.filter((c) => c.lastRunStatus === 'SUCCESS').length;

  return (
    <div className="plans-kpis audit-kpis" style={{ marginBottom: 18 }}>
      <div className="plans-kpi">
        <span>Tổng hành vi ghi nhận</span>
        <strong>{totalLogs}</strong>
        <div className="plans-kpi-icon" style={{ color: '#0066FF', background: '#F0F6FF' }}>
          <ShieldCheck size={20} strokeWidth={2} />
        </div>
      </div>

      <div className="plans-kpi">
        <span>Hành vi nhạy cảm / Cảnh báo</span>
        <strong style={{ color: sensitiveLogs > 0 ? '#FF9500' : '#14253E' }}>{sensitiveLogs}</strong>
        <div className="plans-kpi-icon" style={{ color: '#FF9500', background: '#FFF8EB' }}>
          <AlertTriangle size={20} strokeWidth={2} />
        </div>
      </div>

      <div className="plans-kpi">
        <span>Tác vụ ngầm định kỳ</span>
        <strong>{totalCrons} tác vụ</strong>
        <div className="plans-kpi-icon" style={{ color: '#0F766E', background: '#EAF6F4' }}>
          <Clock size={20} strokeWidth={2} />
        </div>
      </div>

      <div className="plans-kpi">
        <span>Tình trạng tác vụ hệ thống</span>
        <strong style={{ color: '#00C853' }}>{healthyCrons}/{totalCrons} Ổn định</strong>
        <div className="plans-kpi-icon" style={{ color: '#00C853', background: '#E8F9EE' }}>
          <CheckCircle2 size={20} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};
