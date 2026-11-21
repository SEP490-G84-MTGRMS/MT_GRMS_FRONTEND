import type { NotificationItem } from '../types';

const LEGACY_URL_MAP: Record<string, string> = {
  '/hr/approval-requests': '/store-owner/employees/approval-requests',
  '/employee/my-schedule': '/employee/attendance',
  '/employee/my-payslips': '/employee/payroll',
};

const NOTIFICATION_TYPE_URL_MAP: Record<string, string> = {
  REQUEST_SUBMITTED: '/store-owner/employees/approval-requests',
  REQUEST_REVIEWED: '/employee/attendance',
  SCHEDULE_PUBLISHED: '/employee/attendance',
  PAYSLIP_GENERATED: '/employee/payroll',
  PAYSLIP_PAID: '/employee/payroll',
};

/**
 * Resolve the target route when a user clicks a notification item.
 * Normalizes legacy backend URLs and falls back to the notification event type.
 */
export function resolveNotificationItemUrl(item: NotificationItem): string | null {
  const rawUrl = item.actionUrl?.trim();
  if (rawUrl?.startsWith('/') && !rawUrl.startsWith('//') && !/[\\\u0000-\u001f]/.test(rawUrl)) {
    return LEGACY_URL_MAP[rawUrl] ?? rawUrl;
  }

  return NOTIFICATION_TYPE_URL_MAP[item.type] ?? null;
}
