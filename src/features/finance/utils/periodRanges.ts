import type { FinancePeriodPreset } from '../types/financeOverview.types';

function localYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolvePresetRange(preset: FinancePeriodPreset, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(end);
  if (preset === 'LAST_7_DAYS') start.setDate(end.getDate() - 6);
  if (preset === 'THIS_MONTH') start = new Date(end.getFullYear(), end.getMonth(), 1);
  if (preset === 'LAST_MONTH') {
    start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 0);
    return { startDate: localYmd(start), endDate: localYmd(last) };
  }
  if (preset === 'THIS_QUARTER') {
    start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
  }
  if (preset === 'THIS_YEAR') start = new Date(end.getFullYear(), 0, 1);
  return { startDate: localYmd(start), endDate: localYmd(end) };
}
