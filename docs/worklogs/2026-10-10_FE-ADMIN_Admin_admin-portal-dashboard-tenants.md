# WORKLOG: [FE-ADMIN] - admin-portal-dashboard-tenants

- **Ngày thực hiện**: 2026-10-10
- **Người thực hiện**: Admin
- **Nhánh Git (Branch)**: `dev`
- **Mã tính năng liên kết**: [FE-ADMIN](../../../DOCS_MT_GRMS/specs/FE-ADMIN/spec.md)
- **Loại thay đổi**: Feature / UI-UX / Refactor

---

### 1. Mục Đích Thay Đổi (Why)
- Xây dựng phân hệ Cổng Quản Trị Nền Tảng (Master Admin SaaS) bao gồm:
  - Trang Tổng quan (Dashboard) với biểu đồ phân tích doanh thu định kỳ (MRR/ARR), cơ cấu doanh thu theo gói và giao dịch POS toàn sàn.
  - Trang Quản lý khách hàng thuê (Tenants) với bộ lọc trạng thái, tìm kiếm và các modal nghiệp vụ (Gia hạn ân hạn, Khóa chuỗi).
  - Khắc phục các vấn đề điều hướng: Giữ cố định thanh Navbar (Topbar) khi cuộn trang, thu nhỏ Sidebar thành cột icon 72px mượt mà với 1 nút bấm thống nhất ở mép viền.

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/layouts/AdminLayout/`:
  - `AdminLayout.tsx`: Quản lý trạng thái thu gọn sidebar, App Shell 100vh cố định.
  - `AdminSidebar.tsx`: Hỗ trợ chế độ thu nhỏ 72px, nút gập/mở mép viền duy nhất.
  - `AdminTopbar.tsx`: Ghim cố định ở đỉnh (sticky), bỏ nút 3 gạch thừa, tối ưu thanh tìm kiếm.
- `src/features/admin/components/`:
  - `dashboard/DashboardAnalyticsChart.tsx`: Biểu đồ Chart.js sắc nét với devicePixelRatio HiDPI, 3 chế độ xem (Tổng hợp, Cơ cấu gói, POS & ARPU), co giãn mượt mà 60fps không giật.
  - `dashboard/KpiCard.tsx`, `UrgentAlertTable.tsx`, `PlanDistributionCard.tsx`, `CronjobMonitorCard.tsx`: Các thẻ KPI và cảnh báo khẩn cấp.
  - `tenants/TenantDataTable.tsx`, `TenantFilterTabs.tsx`, `TenantSearchToolbar.tsx`: Bảng quản trị chuỗi cửa hàng.
  - `modals/`: TenantDetailModal, ExtendGraceModal, ApplyLockModal.
  - `common/AdminIcons.tsx`: Hệ thống icon SVG đơn sắc thanh mảnh chuẩn KiotViet.
- `src/styles/admin.css`: Bảng màu Electric Blue `#0066FF`, bo tròn toàn diện (Pill & 24px), chống giật khi resize và chia tỉ lệ lưới 1fr 1fr cân bằng.
- `src/app/router.tsx`: Khai báo route `/admin`, `/admin/dashboard`, `/admin/tenants`.

### 3. Chi Tiết UI/UX & API Integration
- **Đường dẫn Route (URL)**:
  - `/admin/dashboard`: Bảng điều khiển tổng quan và biểu đồ tài chính.
  - `/admin/tenants`: Quản lý danh sách khách hàng thuê.
- **Breaking Changes**: Không có.

### 4. Kiểm Thử & Xác Nhận (Verification)
- [x] Đã chạy `npx tsc --noEmit`: Thành công (0 lỗi TypeScript).
- [x] Đã kiểm tra trực tiếp giao diện trên trình duyệt tại `http://localhost:5173/admin`:
  - Biểu đồ co giãn mượt mà, không bị cắt cột T10 hay chữ khi thu nhỏ/mở rộng sidebar.
  - Thanh Navbar ghim cố định vững chãi khi cuộn chuột xuống dưới.
  - Nút đóng mở mép viền sidebar hoạt động chuẩn xác ở cả 2 trạng thái.

---

### 5. Chỉ Dẫn Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro (Risk Level)**: Thấp (Low) - Module Admin độc lập, không ảnh hưởng POS hoặc WebStore.
- **File cần Manager review kỹ nhất**:
  - `src/features/admin/components/dashboard/DashboardAnalyticsChart.tsx`
  - `src/layouts/AdminLayout/AdminSidebar.tsx`
  - `src/styles/admin.css`
- **Hướng dẫn Manager test nhanh UI**:
  - Truy cập URL: `http://localhost:5173/admin/dashboard`
  - Thao tác kiểm tra:
    1. Bấm nút mũi tên `<` / `>` ở mép viền Sidebar để kiểm tra hiệu ứng co giãn 72px và 260px.
    2. Cuộn chuột xuống dưới để kiểm tra Topbar ghim cố định.
    3. Chuyển đổi giữa 3 tab trên biểu đồ để xem phân bổ doanh thu.
