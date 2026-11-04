# Worklog: Giải quyết xung đột Merge nhánh feature/store-owner-confige-management vào dev

- **Ngày thực hiện**: 2026-11-03
- **Tác giả**: AI Assistant (Pair Programming)
- **Mã Task / Tính năng**: MERGE-DEV (Store Owner Configuration & Admin Hub Integration)
- **Dự án**: `project/MT_GRMS_FRONTEND`

---

## 1. Mục Đích Thay Đổi (Why)
- Hợp nhất an toàn nhánh tính năng `feature/store-owner-confige-management` vào nhánh `dev` của Frontend.
- Giải quyết 6 tệp tin bị xung đột (`src/api/httpClient.ts`, `src/features/auth/authService.ts`, `src/features/reports-pnl/services/reportsPnlService.ts`, `src/layouts/StoreOwnerLayout/AppTopNav.tsx`, `src/pages/HomePage/components/Navbar.tsx`, `src/pages/auth/LoginPage.tsx`).
- Sửa lỗi thiếu package `xlsx` trong `node_modules` và tối ưu hóa xử lý lỗi/điều hướng sau đăng nhập theo vai trò (`ADMIN` -> `/admin/dashboard`, `CASHIER` -> `/pos`, `STORE_OWNER` -> `/store-owner/dashboard`).
- Đảm bảo toàn bộ dự án build thành công (`npm run build` không lỗi TypeScript / Vite).

---

## 2. Danh Sách Tệp & Chi Tiết Thay Đổi (What)
- [`src/api/httpClient.ts`](../../src/api/httpClient.ts):
  - Phân biệt rõ request đăng nhập (`isAuthCall`) để không redirect lặp vô tận khi user nhập sai credentials.
  - Xóa sạch `access_token` và `auth_user` trong localStorage khi gặp lỗi 401 ngoài trang auth.
- [`src/features/auth/authService.ts`](../../src/features/auth/authService.ts):
  - Hợp nhất import `ApiResponse` và `ApiError`.
  - Giữ lại cơ chế trích xuất lỗi chuẩn và mapping tài khoản demo/seed linh hoạt.
  - Export hàm `unwrapLogin` để tránh lỗi TS6133 unused variable.
- [`src/features/reports-pnl/services/reportsPnlService.ts`](../../src/features/reports-pnl/services/reportsPnlService.ts):
  - Giữ tiêu đề chuẩn `'Chi phí dịch vụ vận hành ngoài'` và bảo toàn API query backend.
- [`src/layouts/StoreOwnerLayout/AppTopNav.tsx`](../../src/layouts/StoreOwnerLayout/AppTopNav.tsx):
  - Tích hợp cả cụm thông báo (`NotificationBadge`, `NotificationPopover`, `NotificationDrawer`) từ HEAD và `BranchSelectorDropdown` từ feature branch.
- [`src/pages/HomePage/components/Navbar.tsx`](../../src/pages/HomePage/components/Navbar.tsx):
  - Giữ liên kết tiện ích `👑 Demo Admin` đến `/admin/dashboard` trên thanh điều hướng.
- [`src/pages/auth/LoginPage.tsx`](../../src/pages/auth/LoginPage.tsx):
  - Hợp nhất logic điều hướng sau khi login: `ADMIN` -> `/admin/dashboard`, `CASHIER` -> `/pos`, còn lại -> `/store-owner/dashboard`.
  - Sử dụng giao diện thông báo lỗi chuẩn ngay trên nút CTA chính.
- [`package-lock.json`](../../package-lock.json):
  - Đồng bộ cài đặt thư viện `xlsx` (đã khai báo trong package.json) vào `node_modules`.

---

## 3. Chi Tiết Kỹ Thuật (Technical Highlights)
- **Role-based Navigation**:
  - `res.user.isAdmin || res.user.role === 'ADMIN'` => điều hướng tới `/admin/dashboard`.
  - `res.user.role === 'CASHIER'` => điều hướng tới `/pos`.
  - Mặc định => điều hướng tới `/store-owner/dashboard`.
- **Thư viện bên thứ ba**:
  - Đã chạy `npm install` hoàn tất cài đặt package `xlsx` cho module xuất Excel nhà cung cấp.

---

## 4. Kết Quả Kiểm Thử (Verification)
- `npm run build`:
  ```text
  > tsc -b && vite build
  ✓ 2545 modules transformed.
  dist/index.html                     1.14 kB │ gzip:   0.67 kB
  dist/assets/index-rNy7csWk.css    307.65 kB │ gzip:  47.97 kB
  dist/assets/index-D7x4krEq.js   3,361.44 kB │ gzip: 819.97 kB
  ✓ built in 1.48s
  ```
- Toàn bộ 0 lỗi TypeScript, 0 conflict markers.

---

## 5. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low). Toàn bộ conflict được phân tích và merge chuẩn xác theo cả nghiệp vụ Store Owner và Admin.
- **Hành động sau merge**: Chạy `npm install` một lần nếu môi trường dev khác chưa có package `xlsx`.

