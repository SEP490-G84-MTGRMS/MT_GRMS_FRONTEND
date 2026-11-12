# Worklog: Chuyển Đổi Xác Thực Sang HttpOnly Cookie, Silent Refresh Request Queue & Xử Lý Hết Hạn Phiên

- **Ngày thực hiện**: 2026-11-09
- **Tác giả**: AI Assistant (Antigravity)
- **Mã Task/FE**: FE-AUTH / REQ-AUTH-04..07
- **Project**: MT_GRMS_FRONTEND

---

## 1. Mục đích (Why)
- Loại bỏ hoàn toàn việc lưu trữ token (`access_token`, `refresh_token`) trong `localStorage` nhằm triệt tiêu nguy cơ bị đánh cắp token qua lỗ hổng XSS (Cross-Site Scripting).
- Chuyển đổi toàn diện sang cơ chế **HttpOnly Cookie** do trình duyệt quản lý tự động.
- Triển khai cơ chế **Silent Refresh với Axios Request Queue** trong `httpClient.ts`: khi Access Token hết hạn, tự động chặn mã HTTP 401, xếp hàng các request đồng thời, gọi ngầm API `/api/auth/refresh` và retry các request trong hàng đợi mượt mà không làm gián đoạn trải nghiệm người dùng.
- Triển khai **Graceful Session Expiry**: khi Refresh Token hết hạn, tự động dọn dẹp state, hiển thị cảnh báo hết hạn phiên, lưu đường dẫn hiện tại vào query parameter `redirect` và điều hướng về trang đăng nhập; sau khi đăng nhập lại, tự động đưa người dùng trở lại đúng màn hình đang làm việc dở.
- Tự động đồng bộ (hydrate) trạng thái đăng nhập khi người dùng F5 hoặc mở tab mới qua API `GET /api/auth/me`.

---

## 2. Danh Sách Tệp & Nội Dung Đã Thay Đổi (What)

### `src/api/httpClient.ts`
- Bật `withCredentials: true` trên Axios instance để tự động gửi/nhận HttpOnly Cookies giữa Frontend (`localhost:5173`) và Backend (`localhost:5232`).
- Loại bỏ 100% logic lấy `access_token` từ `localStorage` và header `Authorization: Bearer`.
- Thêm cờ `isRefreshing` và hàng đợi `failedQueue: FailedQueueItem[]`.
- Xử lý Response Interceptor chặn HTTP 401:
  - Nếu là API auth (`/login`, `/refresh`, `/logout`), không loop mà ném lỗi ra ngoài.
  - Xếp hàng các request đồng thời phát sinh lỗi 401.
  - Gọi ngầm `POST /api/auth/refresh` (trình duyệt tự đính kèm cookie `refresh_token`).
  - Khi refresh thành công: giải phóng hàng đợi và retry lại request ban đầu.
  - Khi refresh thất bại: dọn dẹp `auth_user`, phát sự kiện `session-expired`, điều hướng về `/auth/login?redirect={encodeURIComponent(currentPath)}`.

### `src/stores/useAuthStore.ts`
- Bỏ trường `token` khỏi state (giữ kiểu `string | null` với giá trị runtime luôn là `null` để tương thích test).
- Khi khởi tạo hoặc `setAuth`: tự động dọn sạch tàn dư `access_token` trong `localStorage`.
- Bổ sung hàm `checkAuth()`: gọi `authService.getMe()`, cập nhật `user`, `isAuthenticated: true` khi F5 hoặc mở tab mới.
- Cập nhật hàm `logout()`: gọi `authService.logout()`, dọn dẹp store và Storage an toàn.

### `src/features/auth/authService.ts` & `authTypes.ts`
- `authTypes.ts`: chuyển `accessToken?: string` thành trường tùy chọn trong `AuthResponse`.
- `unwrapLogin`: linh hoạt bóc tách cả payload dạng `ApiResponse<UserInfo>` và `ApiResponse<LoginResponse>`, không phụ thuộc vào `accessToken` trong body.
- `authService.login`: tương thích với phản hồi từ Backend không chứa token body.
- `authService.getMe`: gọi `GET /api/auth/me` để lấy thông tin tài khoản người dùng từ Cookie.
- `authService.logout`: gọi `POST /api/auth/logout` và dọn dẹp `localStorage`.

### `src/pages/auth/LoginPage.tsx`
- Đọc query param `redirect` qua hook `useSearchParams()`.
- Hiển thị banner cảnh báo màu vàng hổ phách: *"Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục."* nếu có `redirectUrl`.
- Khi đăng nhập thành công: ưu tiên điều hướng về đúng trang người dùng đang làm việc dở (`redirectUrl`), nếu không thì điều hướng thông minh theo vai trò (`/pos`, `/admin/dashboard`, `/store-owner/dashboard`).

### `src/components/auth/ProtectedRoute.tsx`
- Khi chưa đăng nhập, tự động đính kèm tham số `redirect` vào URL: `/auth/login?redirect={encodeURIComponent(currentPath)}`.

### `src/App.tsx`
- Tích hợp `useAuthStore.getState().checkAuth()` trong `useEffect` khi ứng dụng khởi chạy để tự động khôi phục phiên từ Cookie.

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build`: **0 Errors, bundle Vite thành công 100%**.
- Kiểm tra tính toàn vẹn: Không còn bất kỳ mã token nào được ghi hoặc đọc từ `localStorage`.

---

## 4. Lưu Ý Cho Quản Lý Khi Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Thao tác**: Không cần thay đổi biến môi trường. Vite dev proxy `/api` chuyển tiếp cookie minh bạch sang Kestrel Backend.

