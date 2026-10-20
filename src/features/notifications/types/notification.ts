/**
 * Notification severity level indicating urgency and visual styling
 */
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

/**
 * Functional categories matching MT-GRMS core business domains
 */
export type NotificationCategory =
  | 'inventory_fefo'    // FE-02: Batches near expiry & stock balance
  | 'cashbook_shift'    // FE-17: Cash drawer discrepancy & shift handover
  | 'customer_credit'   // FE-08: Customer credit limit exceeded
  | 'service_expense'   // FE-07: Periodic bills (electricity, rent) due
  | 'tax_compliance'    // FE-19: Quarterly tax declaration deadline
  | 'hr_attendance';    // FE-18: Shift swap & employee attendance

/**
 * Quick action configuration for an inline notification button
 */
export interface NotificationAction {
  label: string;
  url: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * Main application notification object
 */
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  isRead: boolean;
  createdAt: string; // ISO 8601 string
  action?: NotificationAction;
  metadata?: Record<string, unknown>;
}

/**
 * Notification tab filter mode
 */
export type NotificationTab = 'unread' | 'all';

/**
 * Severity filter option for the extended drawer
 */
export type NotificationFilterType = 'all' | NotificationSeverity;
