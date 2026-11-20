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
  tenantId?: string | null;
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  actionType: string;
  actionTitle: string;
  targetType: string;
  targetId: string;
  targetName: string;
  riskLevel?: AuditRiskLevel;
  ipAddress: string;
  userAgent: string;
  location: string;
  reason: string;
  details?: {
    oldValue?: unknown;
    newValue?: unknown;
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
  page?: number;
  pageSize?: number;
  keyword?: string;
  actionType?: string;
  riskLevel?: 'ALL' | AuditRiskLevel;
  dateRange?: 'today' | '7d' | '30d' | 'all';
}
