/**
 * Tiện ích chuẩn hóa thời gian theo múi giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh)
 * và chuẩn hóa chuỗi tiếng Việt để so sánh không phân biệt dấu / hoa-thường.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Lấy đối tượng Date đại diện cho thời điểm hiện tại theo đúng múi giờ Việt Nam (UTC+7).
 * Các phương thức .getFullYear(), .getMonth(), .getDate(), .getHours() trên đối tượng trả về
 * sẽ luôn phản ánh đúng giờ Việt Nam bất kể máy client đang đặt ở múi giờ nào.
 */
export const getVietnamNow = (): Date => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + VN_OFFSET_MS);
};

/**
 * Lấy ngày hiện tại (00:00:00) theo múi giờ Việt Nam (UTC+7).
 */
export const getVietnamToday = (): Date => {
  const vnNow = getVietnamNow();
  return new Date(vnNow.getFullYear(), vnNow.getMonth(), vnNow.getDate());
};

/**
 * Định dạng đối tượng Date (local components) thành chuỗi ISO YYYY-MM-DD,
 * KHÔNG dùng .toISOString() để tránh bị lùi ngày do lệch UTC+0.
 */
export const formatLocalDateIso = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Lấy chuỗi ngày hiện tại (YYYY-MM-DD) theo múi giờ Việt Nam (UTC+7).
 */
export const getVietnamTodayIso = (): string => {
  return formatLocalDateIso(getVietnamToday());
};

/**
 * Lấy chuỗi tháng hiện tại (YYYY-MM) theo múi giờ Việt Nam (UTC+7).
 */
export const getVietnamCurrentMonthIso = (): string => {
  const vnNow = getVietnamNow();
  const yyyy = vnNow.getFullYear();
  const mm = String(vnNow.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
};

/**
 * Chuẩn hóa chuỗi tiếng Việt để so sánh trùng tên:
 * - Cắt khoảng trắng đầu/cuối và gộp khoảng trắng thừa ở giữa
 * - Bỏ toàn bộ dấu thanh & dấu mũ tiếng Việt (NFD + xóa combining marks + đ/Đ -> d)
 * - Chuyển về chữ thường (lowercase)
 * Ví dụ: "  Phụ Cấp Ăn Trưa " === "phu cap an trua" === "PHU CAP AN TRUA"
 */
export const normalizeVietnameseComparison = (input?: string | null): string => {
  if (!input) return '';
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
};

const normalizeCaseAndSpace = (input?: string | null): string => {
  if (!input) return '';
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .toLowerCase();
};

/**
 * Kiểm tra trường văn bản có chứa từ khóa tìm kiếm hay không:
 * - Nếu từ khóa CÓ dấu tiếng Việt (VD: "án", "đạt"): khớp đúng dấu, không phân biệt hoa - thường.
 * - Nếu từ khóa KHÔNG dấu (VD: "an", "nguyen"): khớp cả văn bản có dấu và không dấu, không phân biệt hoa - thường.
 */
export const matchesVietnameseSearch = (
  text?: string | null,
  query?: string | null
): boolean => {
  const normalizedQueryNoAccent = normalizeVietnameseComparison(query);
  if (!normalizedQueryNoAccent) return true;
  if (!text) return false;

  const normalizedQueryWithAccent = normalizeCaseAndSpace(query);
  if (normalizedQueryWithAccent !== normalizedQueryNoAccent) {
    return normalizeCaseAndSpace(text).includes(normalizedQueryWithAccent);
  }

  return normalizeVietnameseComparison(text).includes(normalizedQueryNoAccent);
};

/**
 * Kiểm tra ít nhất một trường trong danh sách khớp với từ khóa tìm kiếm.
 */
export const matchesAnyVietnameseSearch = (
  fields: Array<string | null | undefined>,
  query?: string | null
): boolean => {
  if (!normalizeVietnameseComparison(query)) return true;
  return fields.some((field) => matchesVietnameseSearch(field, query));
};

