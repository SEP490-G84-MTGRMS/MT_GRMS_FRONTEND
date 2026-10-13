# WORKLOG: [FE-UI] - admin-dashboard-kiotviet-buttons-and-megamenu

- **Ngày thực hiện**: 2026-10-13
- **Người thực hiện**: Dev
- **Nhánh Git (Branch)**: `add/login-screen`
- **Mã tính năng liên kết**: [FE-UI](../../../DOCS_MT_GRMS/specs/FE-UI/spec.md)
- **Loại thay đổi**: UI-UX / Refactor

---

### 1. Mục Đích Thay Đổi (Why)
- Chuẩn hóa toàn bộ hệ thống nút bấm thanh công cụ (Toolbar Buttons) theo chuẩn KiotViet: bo góc 6px, chiều cao 34px, Electric Blue / Deep Teal và viền xám mờ tinh tế.
- Tinh chỉnh Mega Menu 3 cột trên Topbar cho toàn bộ các mục Hàng hóa, Nhập hàng, Tài chính với debounce 180ms.
- Chuyển nền toàn hệ thống sang màu trắng thuần (#ffffff), tinh giản bảng dữ liệu và bỏ màu mè sặc sỡ.

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/styles/admin.css`: Chuẩn hóa .admin-btn, .admin-table-btn, .admin-page-btn theo bo góc 6px.
- `src/features/supplier/supplier.css`: Chuẩn hóa các nút trong phân hệ quản lý nhà cung cấp.
- `src/features/service-expenses/service-expenses.css`: Chuẩn hóa nút chi phí và loại bỏ hiệu ứng nhún nhảy translateY.
- `src/layouts/StoreOwnerLayout/AppTopNav.tsx`: Nâng cấp Mega Menu 3 cột cho các phân hệ.
- `src/layouts/StoreOwnerLayout/StoreOwnerLayout.tsx`: Đổi nền trang sang trắng thuần.
- `src/pages/admin/AdminDashboardPage.tsx`: Cập nhật select box và header actions.
- `src/features/admin/components/dashboard/UrgentAlertTable.tsx`: Tinh gọn bảng cảnh báo khẩn cấp.
- `src/features/admin/components/tenants/TenantDataTable.tsx`: Tinh gọn bảng khách hàng thuê.

### 3. Chi Tiết UI/UX & API Integration
- **Đường dẫn Route (URL)**: `/admin/dashboard`, `/admin/tenants`, `/store-owner/suppliers`
- **Breaking Changes**: Không có.

### 4. Kiểm Thử & Xác Nhận (Verification)
- [x] Đã chạy `npm run build`: Thành công (0 lỗi TypeScript).
- [x] Đã kiểm tra trực tiếp giao diện trên trình duyệt (Responsive & UX mượt mà, đúng chuẩn KiotViet).

---

### 5. Chỉ Dẫn Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro (Risk Level)**: Thấp (Low) - Thuần CSS & UI Layout.
- **File cần Manager review kỹ nhất**: `src/styles/admin.css` và `src/layouts/StoreOwnerLayout/AppTopNav.tsx`.
- **Hướng dẫn Manager test nhanh UI**:
  - Truy cập URL: `http://localhost:5173/admin/dashboard`
  - Kiểm tra các nút đầu trang và nút tác vụ trong bảng hiển thị đúng hình chữ nhật bo góc 6px.
