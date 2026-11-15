# Worklog: Xây Dựng Màn Hình Quản Trị Giao Dịch & Hóa Đơn Thuê Bao SaaS (/admin/billing)

> **Mã công việc**: `FE-ADMIN-BILLING`  
> **Người thực hiện**: AI Coding Agent (Antigravity)  
> **Ngày thực hiện**: 2026-11-15  
> **Dự án**: `project/MT_GRMS_FRONTEND` (THViet - Multi-Tenant Grocery Retail Management System)  
> **Áp dụng quy tắc**: `RULE_WORKLOG_AND_COMMIT.md` & `RULE_STRICT_SCOPE_BOUNDARY.md`

---

## 1. Mục Đích & Bối Cảnh (Why)
- **Vấn đề**: Trước đây, cổng quản trị SaaS Admin (`/admin`) chỉ có 3 màn hình: Tổng quan (`/admin/dashboard`), Khách hàng thuê (`/admin/tenants`), và Gói dịch vụ (`/admin/subscriptions`). Trong khi đó, Backend đã có đầy đủ logic về nạp ví qua VietQR/SePay, thanh toán gói dịch vụ (`WalletTransaction`, `WalletTopupOrder`), mua thêm chi nhánh (`TenantBranchAddonController`) và mua thêm dung lượng lưu trữ (`TenantStorageController`). Admin chưa có giao diện trực quan để theo dõi dòng tiền nạp/thuê bao, tra cứu hóa đơn điện tử VAT, hoặc đối soát thủ công các giao dịch chuyển khoản ngân hàng bị chậm webhook.
- **Mục tiêu**: Xây dựng hoàn chỉnh màn hình chức năng **Giao dịch & Hóa đơn SaaS (`/admin/billing`)** đồng bộ với phong cách thiết kế hiện hữu của Admin Portal (tông màu xanh ngọc `#0F766E`, font số `JetBrains Mono`, thẻ KPI 4 chỉ số, thanh lọc segmented tabs, modal xem hóa đơn điện tử có hỗ trợ in ấn `window.print()` và quy trình duyệt đối soát khớp tiền thủ công).

---

## 2. Danh Sách Tệp Đã Thêm Mới & Chỉnh Sửa (What)

### A. Tệp Mới:
1. `src/features/admin/types/billing.types.ts`:
   - Định nghĩa các interface: `BillingTransaction`, `BillingKpiSummary`, `BillingFilterParams`, các enum trạng thái (`SUCCESS`, `PENDING`, `FAILED`, `CANCELLED`), loại nghiệp vụ (`PURCHASE_PLAN`, `TOPUP`, `PURCHASE_ADDON`, `REFUND`), và kênh thanh toán (`VietQR`, `WALLET`, `BANK_TRANSFER`).
2. `src/features/admin/data/mockBillingData.ts`:
   - Bộ dữ liệu mẫu 12 giao dịch phong phú, kết nối chặt chẽ với các chuỗi tạp hóa thực tế trong hệ thống ("Chuỗi Siêu Thị An Lạc", "Bách Hóa Việt", "Tiệm Tạp Hóa Dung Thu", "Siêu Thị Mini Lan Anh", "Cửa Hàng Thực Phẩm Sạch An Nhiên"...).
   - Bao gồm các giao dịch gói năm, gia hạn gói, nạp ví VietQR, mua chi nhánh mở rộng, mua dung lượng và giao dịch PENDING chờ đối soát.
3. `src/features/admin/api/billingApi.ts`:
   - Service gọi API backend `/api/admin/billing/*` với cơ chế fallback in-memory store thông minh (tự động tính toán lại KPI và cập nhật trạng thái khi Admin duyệt đối soát).
4. `src/features/admin/components/billing/BillingKpiBanner.tsx`:
   - 4 thẻ KPI chuẩn: Tổng doanh thu SaaS (Lũy kế), Doanh thu tháng này (T11/2026), Tỷ lệ khớp tiền tự động (%), Số giao dịch cần đối soát / Chờ duyệt (kèm số tiền đang chờ).
5. `src/features/admin/components/billing/BillingFilterToolbar.tsx`:
   - Thanh công cụ lọc: Bộ tabs trạng thái (Tất cả, Thành công, Chờ đối soát, Thất bại) kèm số đếm động; ô tìm kiếm theo mã GD/hóa đơn/tên chuỗi/subdomain; dropdown lọc loại nghiệp vụ và khoảng thời gian; nút "Xuất Excel" và "Làm mới".
6. `src/features/admin/components/billing/BillingDataTable.tsx`:
   - Bảng hiển thị giao dịch tối ưu: Cột mã GD & thời gian (kèm nút sao chép nhanh), Cột thông tin chuỗi (tên chuỗi, badge subdomain `.thviet.vn`, chủ sở hữu), Cột nghiệp vụ & diễn giải, Cột số tiền định dạng `JetBrains Mono`, Cột kênh thanh toán (VietQR/SePay kèm mã tham chiếu ngân hàng), Cột trạng thái, Cột thao tác (Xem hóa đơn điện tử, Duyệt đối soát cho giao dịch PENDING).
7. `src/features/admin/components/billing/InvoiceDetailModal.tsx`:
   - Modal xem chi tiết Hóa đơn điện tử VAT dịch vụ SaaS THViet:
     - Header thương hiệu THViet SaaS, thông tin bên bán (MST 0108999999, địa chỉ Hòa Lạc, hotline 1900 6522).
     - Thông tin bên mua (Tên tiệm, MST hộ kinh doanh, đại diện, email nhận hóa đơn, subdomain).
     - Bảng kê chi tiết dịch vụ, đơn giá, thuế suất VAT, tổng tiền bằng số và bằng chữ.
     - Khối chứng thực chữ ký số Viettel CA điện tử.
     - Nút "In hóa đơn" tích hợp `@media print` giúp in trực tiếp ra khổ giấy A4 sạch đẹp không bị lẹm thanh điều hướng.
8. `src/features/admin/components/billing/ReconcileModal.tsx`:
   - Modal xác nhận duyệt tiền đối soát thủ công: hiển thị tóm tắt giao dịch, nhập ghi chú sao kê/số chuẩn chi ngân hàng, cảnh báo an toàn trước khi khớp tiền.
9. `src/features/admin/components/billing/index.ts`:
   - Export tập trung toàn bộ components phục vụ Billing.
10. `src/pages/admin/AdminBillingPage.tsx`:
    - Trang chủ phân hệ Billing & Invoices kết nối state, API, filters, modals, xuất báo cáo CSV có UTF-8 BOM tiếng Việt và toast thông báo.
11. `src/pages/admin/adminBilling.css`:
    - Định kiểu chuyên biệt cho in hóa đơn (`@media print`) và bố cục trang.
12. `src/pages/admin/__tests__/AdminBillingPage.test.tsx`:
    - Bộ 5 unit tests toàn diện: kiểm thử render tiêu đề trang, render 4 KPI cards, lọc tìm kiếm từ khóa, mở modal hóa đơn điện tử, và quy trình duyệt đối soát giao dịch pending.

### B. Tệp Chỉnh Sửa:
1. `src/layouts/AdminLayout/AdminSidebar.tsx`:
   - Bổ sung mục menu điều hướng **"Giao dịch & Hóa đơn"** (`/admin/billing`) với icon `<Receipt>` dưới nhóm "Quản trị Nền tảng".
2. `src/app/router.tsx`:
   - Khai báo route `/admin/billing` trỏ vào `AdminBillingPage`.
   - Bổ sung route alias `/admin/invoices` tự động chuyển hướng (`<Navigate replace />`) sang `/admin/billing`.
3. `src/CHANGELOG.md`:
   - Bổ sung 1 mục ghi chú tóm tắt tính năng mới vào mục `[Unreleased]`.

---

## 3. Điểm Nhấn Kỹ Thuật (Technical Highlights)
- **Thiết kế chuẩn hóa (Design System Compliance)**: Kế thừa triệt để biến CSS `--blue-primary: #0F766E`, `--blue-light: #EAF6F4`, cấu trúc `.plans-hero`, `.plans-kpis`, `.plans-toolbar` và `.plans-table-card` từ `adminPlans.css` và `adminDashboard.css`.
- **Hỗ trợ In Hóa Đơn Trực Tiếp (`window.print()`)**: File CSS `adminBilling.css` khai báo cấu hình `@media print` ẩn toàn bộ body và thanh sidebar, chỉ hiện `#printableInvoice` giúp in phiếu thu/hóa đơn dịch vụ sắc nét.
- **Xuất Báo Cáo Excel Đầy Đủ Dấu Tiếng Việt**: Hàm `handleExportExcel` thêm tiền tố `\uFEFF` (UTF-8 BOM) giúp Microsoft Excel tự động nhận diện tiếng Việt có dấu mà không bị lỗi font (mojibake).
- **Quy trình Đối soát Thủ công (Manual Reconciliation Flow)**: Cho phép Admin giải quyết các trường hợp khách hàng chuyển khoản qua VietQR nhưng ghi sai nội dung memo hoặc SePay webhook gặp sự cố mạng, bấm "Duyệt" là giao dịch chuyển sang `SUCCESS` ngay trong session.

---

## 4. Kết Quả Kiểm Thử & Biên Dịch (Verification)
- **Unit Test (Vitest)**:
  - Chạy `npm test -- AdminBillingPage.test.tsx --run`: **5/5 tests PASS** (100%).
  - Chạy toàn bộ Admin Tests (`npm test -- src/pages/admin --run`): **11/11 tests PASS** (3 test suites: `AdminDashboardPage`, `AuditLogPage`, `AdminBillingPage`).
- **Production Build (Vite)**:
  - Chạy `npm run build`: Hoàn tất thành công trong 1.76 giây, tạo gói bundle `dist/assets/page-admin-*.js` không có bất kỳ lỗi cú pháp hay cảnh báo TypeScript nào.

---

## 5. Ghi Chú Dành Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: `Low` (Thêm mới trang chức năng và route `/admin/billing`, không làm ảnh hưởng đến các màn hình POS hay Store Owner hiện có).
- **Tệp cần lưu tâm kiểm tra**:
  - `src/pages/admin/AdminBillingPage.tsx`
  - `src/features/admin/components/billing/InvoiceDetailModal.tsx`
  - `src/app/router.tsx` & `src/layouts/AdminLayout/AdminSidebar.tsx`
- **Hành động sau khi merge**: Không yêu cầu migration cơ sở dữ liệu bổ sung vì các bảng `WalletTransactions` và `WalletTopupOrders` đã có sẵn trong schema.
