import type { FC } from 'react';
import { ShieldAlert, Cpu } from 'lucide-react';

export type AuditTabType = 'logs' | 'cronjobs';

interface AuditTabNavigationProps {
  activeTab: AuditTabType;
  onTabChange: (tab: AuditTabType) => void;
  logsCount: number;
  cronJobsCount: number;
}

export const AuditTabNavigation: FC<AuditTabNavigationProps> = ({
  activeTab,
  onTabChange,
  logsCount,
  cronJobsCount,
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px',
        background: '#FFFFFF',
        border: '1px solid #E2EAF0',
        borderRadius: '9999px',
        marginBottom: '16px',
      }}
    >
      <button
        type="button"
        onClick={() => onTabChange('logs')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'inherit',
          transition: 'all 0.15s ease',
          background: activeTab === 'logs' ? 'var(--blue-primary, #0066FF)' : 'transparent',
          color: activeTab === 'logs' ? '#FFFFFF' : '#64748B',
        }}
      >
        <ShieldAlert size={16} strokeWidth={2} />
        <span>Nhật ký kiểm toán (Audit Logs)</span>
        <span
          style={{
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '2px 8px',
            borderRadius: '9999px',
            background: activeTab === 'logs' ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
            color: activeTab === 'logs' ? '#FFFFFF' : '#64748B',
          }}
        >
          {logsCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('cronjobs')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'inherit',
          transition: 'all 0.15s ease',
          background: activeTab === 'cronjobs' ? 'var(--blue-primary, #0066FF)' : 'transparent',
          color: activeTab === 'cronjobs' ? '#FFFFFF' : '#64748B',
        }}
      >
        <Cpu size={16} strokeWidth={2} />
        <span>Giám sát Cronjob & Tác vụ ngầm (Cronjobs Health)</span>
        <span
          style={{
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '2px 8px',
            borderRadius: '9999px',
            background: activeTab === 'cronjobs' ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
            color: activeTab === 'cronjobs' ? '#FFFFFF' : '#64748B',
          }}
        >
          {cronJobsCount}
        </span>
      </button>
    </div>
  );
};
