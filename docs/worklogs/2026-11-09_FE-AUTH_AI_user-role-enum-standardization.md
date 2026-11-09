# Worklog: Chuẩn Hóa Enum UserRole (Admin, StoreOwner, Staff) Cho Frontend

- **Ngày thực hiện**: 2026-11-09
- **Mã Task/Tính năng**: FE-AUTH / Role Enum Standardization
- **Tác giả**: AI Assistant (Pair Programming với User)
- **Dự án**: `project/MT_GRMS_FRONTEND`

---

## 1. Mục Đích (Why)
- Đồng bộ hệ thống phân quyền với Backend theo yêu cầu của User: *"cái role thì hãy thêm enum là admin, store_onwer, staff và cho role của người dùng"*.
- Chuẩn hóa 3 vai trò phân quyền người dùng: `ADMIN`, `STORE_OWNER`, `STAFF` (tương thích TypeScript `erasableSyntaxOnly` với `as const`).
- Đổi tên key lưu trạng thái mở/đóng sidebar trong `AdminLayout.tsx` từ `admin_sidebar_open` thành `ui_sidebar_open` để tránh gây hiểu nhầm là lưu quyền admin ở `localStorage`.

---

## 2. Danh Sách Tệp & Nội Dung Thay Đổi (What)
1. **`src/features/auth/authTypes.ts`**:
   - Thêm `UserRoleEnum = { ADMIN: 'ADMIN', STORE_OWNER: 'STORE_OWNER', STAFF: 'STAFF' } as const`.
   - Cập nhật kiểu `UserRole` và `UserRoleType`.
   - Cập nhật interface `UserProfile`: bổ sung `role: UserRole` và `userRole?: UserRoleType`.
2. **`src/features/auth/authService.ts`**:
   - Cập nhật hàm `mapRole()` để ánh xạ chuẩn hóa về 3 giá trị `ADMIN`, `STORE_OWNER`, `STAFF`.
   - Cập nhật `mapLoginUser()` để gán đồng thời `role` và `userRole`.
3. **`src/pages/auth/LoginPage.tsx`**:
   - Điều hướng thông minh: `ADMIN` -> `/admin/dashboard`, `STAFF`/`CASHIER`/`EMPLOYEE` -> `/pos`, `STORE_OWNER` -> `/store-owner/dashboard`.
4. **`src/layouts/AdminLayout/AdminLayout.tsx`**:
   - Đổi key `localStorage.getItem('admin_sidebar_open')` thành `ui_sidebar_open` (tự động dọn dẹp key cũ `admin_sidebar_open`).
5. **`src/api/financeHttpClient.ts`**:
   - Bổ sung `withCredentials: true` và loại bỏ đọc `localStorage.getItem('access_token')` để đồng bộ với cơ chế xác thực HttpOnly Cookie, tránh lỗi `401 Unauthorized` trên các API tài chính.

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build`: **Build thành công 100% trong 1.51s, 0 lỗi TypeScript**.

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- Không ảnh hưởng các route hay layout khác, tương thích ngược toàn diện với các màn hình kiểm tra role cũ.

