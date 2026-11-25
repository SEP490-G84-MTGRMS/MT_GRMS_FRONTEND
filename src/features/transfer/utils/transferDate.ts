const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

const ISO_NO_OFFSET_REGEX = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VN_DATE_ONLY_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Parses a backend date string as UTC when an ISO timestamp omits a timezone offset.
 */
export const parseUtcDate = (raw?: string | Date | null): Date | null => {
  if (!raw) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const vnMatch = trimmed.match(VN_DATE_ONLY_REGEX);
  if (vnMatch) {
    const day = vnMatch[1].padStart(2, '0');
    const month = vnMatch[2].padStart(2, '0');
    const year = vnMatch[3];
    const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (ISO_DATE_ONLY_REGEX.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (ISO_NO_OFFSET_REGEX.test(trimmed)) {
    const normalized = `${trimmed.replace(' ', 'T')}Z`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Formats a date/timestamp in Vietnam timezone (Asia/Ho_Chi_Minh) as dd/MM/yyyy HH:mm.
 */
export const formatDateTimeVN = (raw?: string | Date | null, fallback = '—'): string => {
  const date = parseUtcDate(raw);
  if (!date) return fallback;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: VN_TIMEZONE,
  }).format(date);
};

/**
 * Formats a date in Vietnam timezone as dd/MM/yyyy without day-shift errors.
 */
export const formatDateVN = (raw?: string | Date | null, fallback = '—'): string => {
  if (!raw) return fallback;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
    }
    const vnMatch = trimmed.match(VN_DATE_ONLY_REGEX);
    if (vnMatch) {
      return `${vnMatch[1].padStart(2, '0')}/${vnMatch[2].padStart(2, '0')}/${vnMatch[3]}`;
    }
  }

  const date = parseUtcDate(raw);
  if (!date) return typeof raw === 'string' ? raw.slice(0, 10) : fallback;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: VN_TIMEZONE,
  }).format(date);
};

const toVnCalendarYmd = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: VN_TIMEZONE,
  }).format(date);

/**
 * Returns true if the given expiry date is strictly before today in Vietnam timezone.
 */
export const isBatchExpired = (expiryDate?: string | null): boolean => {
  if (!expiryDate || !expiryDate.trim()) return false;
  const trimmed = expiryDate.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  const todayYmd = toVnCalendarYmd(new Date());
  if (dateOnlyMatch) {
    return dateOnlyMatch[1] < todayYmd;
  }

  const parsed = parseUtcDate(trimmed);
  if (!parsed) return false;
  return toVnCalendarYmd(parsed) < todayYmd;
};
