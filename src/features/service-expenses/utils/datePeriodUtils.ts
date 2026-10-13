/**
 * Date range period definition
 */
export type PeriodType =
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'this-year'
  | 'by-month'
  | 'custom'
  | 'all';

export interface DateRangeResult {
  fromDate?: string;
  toDate?: string;
  label: string;
}

/**
 * Format Date to YYYY-MM-DD
 */
export const formatDateToIso = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Calculate date range by period type
 * @param period Selected period key
 * @param customMonth YYYY-MM string for by-month option
 * @param customFrom YYYY-MM-DD for custom range
 * @param customTo YYYY-MM-DD for custom range
 * @param baseDate Reference date (defaults to current date)
 */
export const calculatePeriodRange = (
  period: PeriodType,
  customMonth?: string,
  customFrom?: string,
  customTo?: string,
  baseDate: Date = new Date()
): DateRangeResult => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth(); // 0-indexed

  switch (period) {
    case 'this-month': {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        fromDate: formatDateToIso(firstDay),
        toDate: formatDateToIso(lastDay),
        label: `Tháng ${String(month + 1).padStart(2, '0')}/${year}`,
      };
    }

    case 'last-month': {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const targetMonth = firstDay.getMonth() + 1;
      const targetYear = firstDay.getFullYear();
      return {
        fromDate: formatDateToIso(firstDay),
        toDate: formatDateToIso(lastDay),
        label: `Tháng ${String(targetMonth).padStart(2, '0')}/${targetYear}`,
      };
    }

    case 'this-quarter': {
      const quarter = Math.floor(month / 3);
      const firstDay = new Date(year, quarter * 3, 1);
      const lastDay = new Date(year, (quarter + 1) * 3, 0);
      return {
        fromDate: formatDateToIso(firstDay),
        toDate: formatDateToIso(lastDay),
        label: `Quý ${quarter + 1}/${year}`,
      };
    }

    case 'this-year': {
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      return {
        fromDate: formatDateToIso(firstDay),
        toDate: formatDateToIso(lastDay),
        label: `Năm ${year}`,
      };
    }

    case 'by-month': {
      if (customMonth) {
        const [yStr, mStr] = customMonth.split('-');
        const y = Number(yStr);
        const m = Number(mStr) - 1;
        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);
        return {
          fromDate: formatDateToIso(firstDay),
          toDate: formatDateToIso(lastDay),
          label: `Tháng ${mStr}/${y}`,
        };
      }
      return calculatePeriodRange('this-month', undefined, undefined, undefined, baseDate);
    }

    case 'custom': {
      let label = 'Tùy chỉnh ngày';
      if (customFrom && customTo) {
        label = `${customFrom} đến ${customTo}`;
      } else if (customFrom) {
        label = `Từ ${customFrom}`;
      } else if (customTo) {
        label = `Đến ${customTo}`;
      }
      return {
        fromDate: customFrom,
        toDate: customTo,
        label,
      };
    }

    case 'all':
    default:
      return {
        fromDate: undefined,
        toDate: undefined,
        label: 'Toàn bộ thời gian',
      };
  }
};
