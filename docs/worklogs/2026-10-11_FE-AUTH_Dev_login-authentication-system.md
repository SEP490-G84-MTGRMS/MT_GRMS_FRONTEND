# WORKLOG: [FE-AUTH] - login-authentication-system

- **Ngày thực hiện**: 2026-10-11
- **Người thực hiện**: Dev
- **Nhánh Git (Branch)**: `add/login-screen`
- **Mã tính năng liên kết**: [FE-AUTH](../../../DOCS_MT_GRMS/specs/FE-AUTH/spec.md)
- **Loại thay đổi**: Feature / Authentication / UI-UX

---

### 1. Mục Đích Thay Đổi (Why)
- Xây dựng hoàn chỉnh phân hệ Xác thực người dùng (Authentication & Authorization) cho MT-GRMS:
  - Trang Đăng nhập (`LoginPage`): Tinh giản giao diện Phone-First trực diện, loại bỏ tab chuyển đổi và trường mã chuỗi gian hàng (tenant code), chỉ giữ Số điện thoại và Mật khẩu.
  - Tối ưu Xác thực SĐT: Hỗ trợ tìm kiếm và khớp tài khoản demo bằng cả Số điện thoại hoặc Email trong `authService.ts`.
  - Trang Đăng ký cửa hàng (`RegisterPage`): Đăng ký chuỗi bán lẻ mới với xác thực form.
  - Trang Quên mật khẩu (`ForgotPasswordPage`): Khôi phục tài khoản với mã OTP.
  - Tối ưu Đăng ký Phone-First: Loại bỏ trường Email đăng ký phù hợp thói quen tiểu thương tạp hóa Việt Nam.
  - Tối ưu tỷ lệ Zero-Scroll: Căn chỉnh padding, gap và bố cục 2 cột mật khẩu để form vừa vặn 100% trong khung nhìn không cần cuộn chuột.
  - Hoàn thiện UI/UX: Chuẩn hóa nhãn Mật khẩu (≥ 8 ký tự), đồng bộ placeholder và chống gãy dòng tên thương hiệu MT-GRMS.
  - Quản lý trạng thái phiên đăng nhập (`useAuthStore`): Lưu trữ token, profile, role-based navigation.
  - Xử lý API & Interceptor (`authService`, `httpClient`): Cơ chế refresh token tự động và fallback demo accounts.
  - Bảo vệ điều hướng (`ProtectedRoute`): Kiểm soát quyền truy cập theo phân quyền.
  - Đăng xuất (`AdminTopbar`): Nút đăng xuất an toàn xóa phiên và chuyển hướng về đăng nhập.

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/features/auth/`:
  - `authTypes.ts`: DTO và interface cho UserProfile, LoginCredentials, RegisterPayload.
  - `authService.ts`: Triển khai API đăng nhập, đăng ký, quên mật khẩu, logout và danh sách tài khoản demo.
  - `index.ts`: Export tập trung.
- `src/components/auth/`:
  - `ProtectedRoute.tsx`: Thành phần bọc bảo vệ route theo vai trò người dùng.
- `src/pages/auth/`:
  - `LoginPage.tsx`: Giao diện đăng nhập chuẩn KiotViet phong cách hiện đại.
  - `RegisterPage.tsx`: Giao diện đăng ký cửa hàng.
  - `ForgotPasswordPage.tsx`: Giao diện khôi phục mật khẩu.
  - `index.ts`: Re-export các trang auth.
- `src/layouts/`:
  - `AuthLayout.tsx`: Khung giao diện auth chuẩn mực.
  - `AdminLayout/AdminTopbar.tsx`: Tích hợp nút Đăng xuất.
- `src/stores/useAuthStore.ts`: Zustand store quản lý phiên đăng nhập.
- `src/styles/auth.css`: Styling đồng bộ hệ thống KiotViet Blue Palette.
- `src/app/router.tsx`: Khai báo các đường dẫn `/auth/login`, `/auth/register`, `/auth/forgot-password`.

### 3. Chi Tiết UI/UX & API Integration
- **Đường dẫn Route (URL)**:
  - `/auth/login`: Màn hình đăng nhập chính.
  - `/auth/register`: Màn hình đăng ký.
  - `/auth/forgot-password`: Màn hình quên mật khẩu.
- **Phong cách thiết kế**:
  - Tuân thủ nghiêm ngặt `RULE_UI_DESIGN_SYSTEM.md`: Màu sắc `#0066FF`, bo góc Full Pill 9999px và Rounded Card 24px, 100% SVG đơn sắc, không có animation rung lắc.

### 4. Kiểm Thử & Xác Nhận (Verification)
- [x] Đã chạy `npm run build`: Thành công không có lỗi TypeScript hay Vite build.
- [x] Đã kiểm tra luồng đăng nhập tài khoản demo trên trình duyệt: Chuyển hướng chính xác theo vai trò Super Admin / Cashier.
- [x] Đã kiểm tra tính năng Đăng xuất: Xóa sạch `access_token` và `auth_user`, điều hướng về `/auth/login`.

---

### 5. Chỉ Dẫn Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro (Risk Level)**: Thấp (Low).
- **File cần Manager review kỹ nhất**:
  - `src/features/auth/authService.ts`
  - `src/stores/useAuthStore.ts`
  - `src/pages/auth/LoginPage.tsx`
- **Hướng dẫn test nhanh**:
  - Truy cập URL `http://localhost:5173/auth/login`.
  - Bấm nút "Đăng nhập" với tài khoản demo điền sẵn, kiểm tra chuyển hướng vào `/admin/dashboard`.
  - Bấm nút "Đăng xuất" ở góc trên bên phải thanh Topbar để xác nhận đăng xuất.
