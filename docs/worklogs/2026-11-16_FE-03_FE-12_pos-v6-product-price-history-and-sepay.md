# WORKLOG: FE-03, FE-12 - POS Payment Config, Invoice Management, Product Price History & TypeScript Build Resolution

- **Ngày thực hiện**: 2026-11-16
- **Người thực hiện**: Son Nguyen Ba (@sonnguyenn10 - HE186062)
- **Nhánh Git (Branch)**: `add/ui-pos-v6`
- **Mã tính năng liên kết**: [FE-03 - Quản lý hàng hóa & Lịch sử giá](../../../DOCS_MT_GRMS/specs/FE-03/spec.md), [FE-12 - POS Checkout & SePay VietQR](../../../DOCS_MT_GRMS/specs/FE-12/spec.md)
- **Loại thay đổi**: Feature & Refactor & Bugfix

---

### 1. Mục Đích Thay Đổi (Why)
- **Xem lịch sử biến động giá (FE-03)**: Bổ sung `PriceHistoryModal` để xem toàn bộ lịch sử thay đổi giá bán và giá vốn của sản phẩm trực tiếp từ form cập nhật hàng hóa, hỗ trợ tra cứu lý do điều chỉnh và người thực hiện.
- **Giá bán theo chi nhánh & Đơn vị quy đổi (FE-03)**: Hỗ trợ gán và chỉnh sửa giá bán riêng cho sản phẩm ở từng chi nhánh qua `EditStoreProductModal`, xử lý xóa/cập nhật đơn vị quy đổi chính xác trong `ProductFormModal`.
- **Cấu hình thanh toán SePay & Quản lý hóa đơn POS (FE-12)**: Thêm tiện ích `sePayWebhookUrl.ts` tự động sinh đường dẫn webhook chuẩn cho SePay ở cả môi trường local và production (`thviet.store`); nâng cấp trang `InvoiceManagementPage` quản lý hóa đơn và lọc theo chi nhánh.
- **Khắc phục lỗi biên dịch TypeScript dự án**: Xử lý triệt để các lỗi `tsc -b` tồn đọng trên nhánh `dev` từ các module Purchase Order, Stocktake và Employee/HR, đảm bảo lệnh `npm run build` chạy thành công 100%.

---

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/features/pos/utils/sePayWebhookUrl.ts`: Tiện ích tự động nhận diện domain/host để trả về đường dẫn Webhook SePay chính xác.
- `src/features/pos/components/modals/PaymentConfigModal.tsx`: Giao diện cấu hình SePay VietQR theo chi nhánh và hướng dẫn dán webhook.
- `src/features/pos/pages/StorePaymentConfigPage.tsx`: Trang quản lý tài khoản thanh toán SePay của cửa hàng.
- `src/features/pos/pages/InvoiceManagementPage.tsx`: Cải tiến giao diện quản lý danh sách hóa đơn POS và đơn đặt trước.
- `src/features/product/components/PriceHistoryModal.tsx`: Modal hiển thị bảng và dòng thời gian lịch sử giá sản phẩm.
- `src/features/product/components/ProductFormModal.tsx`: Nút mở lịch sử giá, quản lý đơn vị quy đổi và validate.
- `src/features/product/components/EditStoreProductModal.tsx`: Cập nhật giá bán riêng và trạng thái kinh doanh của sản phẩm tại chi nhánh.
- `src/features/product/api/productApi.ts` & `src/features/product/types/index.ts`: Bổ sung API endpoints và interfaces cho lịch sử giá.
- `src/features/product/__tests__/ProductFormModal.test.tsx` & `storeProductMasterAudit.test.tsx`: Bổ sung test kiểm thử lịch sử giá.
- `src/features/purchase-order/pages/StoreOwnerPurchaseOrderListPage.tsx`: Sửa lỗi gọi hàm `setSelectedOrder` chưa khai báo.
- `src/features/stocktake/pages/StocktakeFormPage.tsx`: Đồng bộ hàm báo lỗi sang `showToast(..., 'error')`.
- `src/features/employee/pages/AttendancePage.tsx`: Cập nhật hàm bóc tách giờ làm chấp nhận `string | undefined | null`.
- `src/features/employee/components/employee-list/EmployeeDetailModal.tsx`: Dọn dẹp các state/hàm unused của tab cũ.
- `src/features/employee/components/attendance/AttendanceDetailModal.tsx`: Loại bỏ tham số unused `onRequestIncident`.
- `src/features/employee/components/payslip-management/PayslipDetailModal.tsx`: Loại bỏ `setIsActionLoading` unused.
- `src/features/employee/components/shift-config/AttendanceConfigModal.tsx`: Loại bỏ `isCustomized` unused.
- `src/features/employee/pages/PayslipManagementPage.tsx`: Loại bỏ import `Check` unused.

---

### 3. Kiểm Thử & Xác Nhận (Verification)
- [x] Đã tạo file worklog markdown trong thư mục `docs/worklogs/`.
- [x] Chạy biên dịch toàn bộ `npm run build`: Thành công 100% (`tsc -b && vite build` exit code 0).
- [x] Đã pull nhánh `dev` mới nhất và giải quyết toàn bộ xung đột (0 conflict).
