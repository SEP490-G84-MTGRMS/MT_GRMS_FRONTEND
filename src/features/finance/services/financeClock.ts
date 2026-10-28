/**
 * Service providing a mockable/controllable clock for financial operations and demo consistency.
 * Standard Demo Date: 2026-10-27.
 */

let mockCurrentDate: Date | null = new Date('2026-10-27T08:00:00Z');

/**
 * Returns the current financial operation date (or the mocked demo date).
 */
export function getFinancialNow(): Date {
  return mockCurrentDate ? new Date(mockCurrentDate.getTime()) : new Date();
}

/**
 * Overrides the current clock for testing or specific scenario demonstrations.
 */
export function setFinancialNow(date: Date | string | null): void {
  if (date === null) {
    mockCurrentDate = null;
  } else {
    mockCurrentDate = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  }
}

/**
 * Calculates dynamic days overdue relative to the current financial clock.
 * Negative or zero means not overdue. Positive integer represents days overdue.
 */
export function calculateDaysOverdue(dueDate: string | Date): number {
  const now = getFinancialNow();
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  
  // Set both to start of day in UTC for exact day difference
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDue = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  
  const diffTime = utcNow - utcDue;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Returns human-readable label for overdue status.
 */
export function getOverdueLabel(dueDate: string | Date): { isOverdue: boolean; days: number; text: string } {
  const days = calculateDaysOverdue(dueDate);
  return {
    isOverdue: days > 0,
    days,
    text: days > 0 ? `Trễ ${days} ngày` : 'Trong hạn',
  };
}
