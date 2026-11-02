# WORKLOG: [FE-AUTH] - auth-login-integration

- **Ngày thực hiện**: 2026-10-13
- **Người thực hiện**: Dev
- **Nhánh Git (Branch)**: `add/login-screen`
- **Mã tính năng liên kết**: [FE-AUTH](../../../DOCS_MT_GRMS/specs/FE-AUTH/spec.md)
- **Loại thay đổi**: Feature & Integration

---

### 1. Mục Đích Thay Đổi (Why)
- Hoàn thiện tích hợp xác thực đăng nhập giữa Frontend React 19 và Backend API (.NET 8 Web API).
- Cấu hình Axios HTTP Client tự động gắn JWT Bearer Token vào Authorization header và xử lý base URL.
- Đồng bộ giao diện trang Đăng nhập theo phong cách KiotViet Brand Blue Palette, hỗ trợ tài khoản quản trị hệ thống và nhân sự.

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/api/httpClient.ts`: Cấu hình base URL (`http://localhost:5232/api/v1`), timeout và interceptor token.
- `src/features/auth/authService.ts`: Triển khai API call đăng nhập `/auth/login`, lưu token vào local storage.
- `src/features/auth/authTypes.ts`: Định nghĩa interface `LoginCredentials`, `AuthResponse`, `AuthUser`.
- `src/pages/auth/LoginPage.tsx`: Giao diện đăng nhập chuẩn KiotViet, xử lý đăng nhập thật và điều hướng.
- `vite.config.ts`: Cấu hình proxy API backend chuyển tiếp cuộc gọi sang port 5232.

### 3. Chi Tiết UI/UX & API Integration
- **Đường dẫn Route (URL)**: `/login`, `/auth/login`
- **API Endpoint Backend tương ứng**: `POST /api/v1/auth/login`
- **Breaking Changes**: Không có.

### 4. Kiểm Thử & Xác Nhận (Verification)
- [x] Đã chạy `npm run build`: Thành công (0 lỗi TypeScript, 0 lỗi cú pháp).
- [x] Đã kiểm tra trực tiếp giao diện trên trình duyệt (Đăng nhập thành công với tài khoản quản trị `admin` / `Admin@123`).

---

### 5. Chỉ Dẫn Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro (Risk Level)**: Thấp (Low)
- **File cần Manager review kỹ nhất**: `src/api/httpClient.ts` và `src/features/auth/authService.ts`.
- **Hướng dẫn Manager test nhanh UI**:
  - Truy cập URL: `http://localhost:5173/login`
  - Nhập tài khoản: `admin`, mật khẩu: `Admin@123`
  - Nhấn Đăng nhập -> Hệ thống điều hướng thành công vào Master Admin Dashboard `/admin/dashboard`.
