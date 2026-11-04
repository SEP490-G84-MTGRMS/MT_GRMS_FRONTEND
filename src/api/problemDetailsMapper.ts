/**
 * Ánh xạ lỗi chuẩn RFC 7807 (ProblemDetails / ApiResponse) từ Backend sang tiếng Việt thân thiện
 * Tuyệt đối không hiển thị lỗi tiếng Anh hoặc thông tin nhạy cảm của hệ thống.
 */

export interface BackendErrorPayload {
  success?: boolean;
  message?: string;
  errorCode?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

const ERROR_MESSAGE_MAP: Record<string, string> = {
  // Idempotency
  IDEMPOTENCY_KEY_REQUIRED: 'Yêu cầu mã giao dịch bảo vệ chống trùng lặp (Idempotency-Key). Vui lòng thử lại.',
  IDEMPOTENCY_PAYLOAD_MISMATCH: 'Xung đột giao dịch: Nội dung đã thay đổi so với lần gửi trước. Vui lòng bấm tạo giao dịch mới.',
  
  // Tài chính & Sổ quỹ
  INSUFFICIENT_FUNDS: 'Số dư trong két tiền mặt hiện tại không đủ để thực hiện phiếu chi này.',
  TILL_NOT_OPEN: 'Ca bán hàng hiện chưa được mở. Vui lòng mở ca tại quầy trước khi giao dịch tiền mặt.',
  TILL_ALREADY_OPEN: 'Ca bán hàng tại quầy này hiện đang mở. Không thể mở ca trùng lặp.',
  INVALID_ACCOUNT_TYPE: 'Loại tài khoản tài chính không hợp lệ.',
  
  // Xác thực & Quyền hạn
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác tài chính này.',
  INVALID_PIN: 'Mã PIN bảo mật không chính xác.',
  PIN_LOCKED_15_MIN: 'Mã PIN đã bị khóa 15 phút do nhập sai 5 lần liên tiếp. Vui lòng thử lại sau.',
  
  // Nghiệp vụ Thuế & Chi phí
  CANNOT_APPROVE_OWN_EXPENSE: 'Quy tắc phân tách trách nhiệm: Người lập phiếu không được phép tự duyệt phiếu chi của chính mình.',
  TAX_SNAPSHOT_ALREADY_FINALIZED: 'Kỳ thuế này đã được chốt ký số bất biến. Không thể chỉnh sửa hoặc tạo lại.',
  PERIOD_NOT_CLOSED: 'Kỳ kế toán chưa kết thúc, không thể thực hiện chốt sổ thuế.',
};

/**
 * Phân tích lỗi trả về từ Axios / HTTP Request và trả về chuỗi thông báo tiếng Việt
 */
export function mapProblemDetailsToVietnamese(error: unknown): string {
  if (!error) return 'Đã có lỗi không xác định xảy ra. Vui lòng thử lại.';

  // Kiểm tra nếu là Axios error
  const axiosError = error as {
    response?: {
      status?: number;
      data?: BackendErrorPayload;
    };
    code?: string;
    message?: string;
  };

  // 1. Kiểm tra timeout hoặc mất kết nối mạng
  if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
    return 'Yêu cầu xử lý quá thời gian quy định (Timeout). Nếu là giao dịch tiền, vui lòng kiểm tra lại số dư trước khi thao tác lại.';
  }

  if (axiosError.code === 'ERR_NETWORK') {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng Internet.';
  }

  const responseData = axiosError.response?.data;
  if (!responseData) {
    if (axiosError.response?.status === 404) return 'Dữ liệu hoặc tài nguyên yêu cầu không tồn tại.';
    if (axiosError.response?.status === 500) return 'Máy chủ gặp sự cố khi xử lý dữ liệu. Vui lòng liên hệ quản trị viên.';
    return 'Đã có lỗi xảy ra trong quá trình xử lý yêu cầu.';
  }

  // 2. Tra cứu mã lỗi đặc thù (errorCode)
  if (responseData.errorCode && ERROR_MESSAGE_MAP[responseData.errorCode]) {
    return ERROR_MESSAGE_MAP[responseData.errorCode];
  }

  // 3. Xử lý validation errors (400 Bad Request dạng Dictionary lỗi)
  if (responseData.errors && typeof responseData.errors === 'object') {
    const errorList: string[] = [];
    for (const [field, messages] of Object.entries(responseData.errors)) {
      if (Array.isArray(messages) && messages.length > 0) {
        errorList.push(`${field}: ${messages.join(', ')}`);
      }
    }
    if (errorList.length > 0) {
      return `Dữ liệu không hợp lệ: ${errorList.join('; ')}`;
    }
  }

  // 4. Nếu có message từ Backend tiếng Việt
  if (responseData.message && typeof responseData.message === 'string' && responseData.message.trim().length > 0) {
    return responseData.message;
  }

  // 5. Fallback theo HTTP Status Code
  switch (axiosError.response?.status) {
    case 400:
      return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại các trường dữ liệu.';
    case 401:
      return 'Tài khoản hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return 'Bạn không có quyền thực hiện hành động này.';
    case 404:
      return 'Không tìm thấy dữ liệu yêu cầu.';
    case 409:
      return 'Xung đột dữ liệu hoặc trùng lặp giao dịch trên hệ thống.';
    case 422:
      return 'Dữ liệu không thể xử lý do vi phạm ràng buộc nghiệp vụ.';
    default:
      return 'Hệ thống đang bận. Vui lòng thử lại sau ít phút.';
  }
}
