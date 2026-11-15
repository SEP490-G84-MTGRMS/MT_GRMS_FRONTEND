export type AuditRiskLevel = 'INFO' | 'WARNING' | 'DANGER';

export type AuditActionType =
  | 'ALL'
  | 'TENANT_LOCK'
  | 'TENANT_UNLOCK'
  | 'PLAN_PRICE_CHANGE'
  | 'SUBSCRIPTION_EXTEND'
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'SYSTEM_CONFIG'
  | 'CRON_TRIGGER'
  | 'DB_BACKUP_MANUAL';

export type AuditTargetType = 'TENANT' | 'PLAN' | 'SUBSCRIPTION' | 'SYSTEM' | 'CRONJOB' | 'USER';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  actionType: AuditActionType;
  actionTitle: string;
  targetType: AuditTargetType;
  targetId: string;
  targetName: string;
  riskLevel: AuditRiskLevel;
  ipAddress: string;
  userAgent: string;
  location: string;
  reason: string;
  details?: {
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    changesSummary?: string;
  };
}

export type CronJobStatus = 'SUCCESS' | 'RUNNING' | 'FAILED' | 'IDLE';

export interface CronJobItem {
  id: string;
  name: string;
  code: string;
  description: string;
  schedule: string;
  scheduleHuman: string;
  category: 'TENANT' | 'DEBT' | 'FEFO' | 'BACKUP';
  lastRunTime: string;
  lastRunDuration: string;
  lastRunStatus: CronJobStatus;
  nextRunTime: string;
  itemsProcessedLastRun: number;
  nodeWorker: string;
  recentLogs: string[];
}

export interface AuditFilterParams {
  keyword?: string;
  actionType?: AuditActionType;
  riskLevel?: 'ALL' | AuditRiskLevel;
  dateRange?: 'today' | '7d' | '30d' | 'all';
}
