# WORKLOG: FE-07 - Tái cấu trúc & Hoàn thiện Giao diện Quản lý Chi phí Dịch vụ (FE-07)

- **Ngày thực hiện**: 2026-10-13
- **Người thực hiện**: Nguyễn Trường An (AnNT - HE186612)
- **Nhánh Git (Branch)**: `add/design_ui_FE07`
- **Mã tính năng liên kết**: FE-07 (Service Expenses Management)
- **Loại thay đổi**: UI Refactor / Design System Alignment / Feature Enhancement

---

### 1. Mục Đích Thay Đổi (Why)
- **Chuẩn hóa Design System**: Tái cấu trúc toàn bộ giao diện màn hình Chi phí dịch vụ (FE-07) từ Tailwind utility classes sang BEM Vanilla CSS cục bộ (`service-expenses.css`), kế thừa biến CSS Design System toàn cục (Deep Teal `#0F766E`, bo góc `--radius-lg: 24px`, `--radius-pill: 9999px`) khớp với layout chuẩn `StoreOwnerLayout` và `AppTopNav` sau đợt pull PR #7.
- **Giải quyết xung đột Git**: Khắc phục triệt để các merge conflict (`router.tsx`, `MasterLayout.tsx`) và bổ sung router path chính thức `/store-owner/expenses` (kèm alias redirect từ `/dashboard/expenses`).
- **Nâng cao trải nghiệm người dùng (UX)**:
  - Hỗ trợ tải tệp chứng từ (Drag-and-Drop & File Picker) đọc trực tiếp định dạng ảnh/PDF dung lượng tối đa 10MB kèm ảnh xem trước (thumbnail preview) song song với việc dán link URL.
  - Tích hợp bộ lọc kỳ kế toán linh hoạt (Tháng này, Tháng trước, Quý này, Năm nay, Month Picker chọn tháng bất kỳ, Date Range Picker).
  - Tự động đồng bộ và tính toán lại 4 thẻ KPI Summary (Tổng chi phí, Chờ thanh toán, Đã hoàn tất thanh toán, Khoản chi quá hạn) theo kỳ được chọn.

---

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/layouts/StoreOwnerLayout/AppTopNav.tsx`: Bổ sung nhóm menu **Tài chính** -> **Chi phí vận hành (FE-07)**.
- `src/app/router.tsx`: Resolve conflict, khai báo route `/store-owner/expenses` và redirect alias.
- `src/features/admin/components/common/AdminIcons.tsx`: Bổ sung icon `CloseIcon`, `EyeIcon`, `UploadIcon`.
- `src/features/service-expenses/service-expenses.css`: Bộ stylesheet chuyên biệt theo chuẩn BEM và Deep Teal palette.
- `src/features/service-expenses/utils/datePeriodUtils.ts`: Tiện ích tính toán khoảng ngày theo kỳ (Tháng này, tháng trước, quý, năm, tùy chọn).
- `src/features/service-expenses/types/expense.types.ts`: Cập nhật schema Zod `createExpenseSchema` hỗ trợ cả URL và Base64 Data URL.
- `src/features/service-expenses/api/expenseApi.ts`: Cập nhật `filterMockList` và `getExpenseSummary` hỗ trợ lọc theo khoảng ngày (`fromDate`, `toDate`).
- `src/features/service-expenses/hooks/useServiceExpenses.ts`: Nâng cấp query key và hook `useExpenseSummary` đồng bộ theo kỳ lọc.
- `src/features/service-expenses/components/ExpenseKpiCards.tsx`: Hiển thị tiêu đề KPI động theo nhãn kỳ (`periodLabel`).
- `src/features/service-expenses/components/ExpenseFilterBar.tsx`: Tích hợp bộ chọn kỳ thời gian nhanh, Month Picker và Date Range inputs.
- `src/features/service-expenses/components/CreateExpenseModal.tsx`: Tích hợp 2 chế độ đính kèm chứng từ (Upload file có preview & Nhập link URL).
- `src/features/service-expenses/components/PayExpenseModal.tsx`: Chuẩn hóa modal thanh toán và hạch toán Sổ quỹ.
- `src/features/service-expenses/components/BillPreviewModal.tsx`: Chuẩn hóa modal phóng to xem hóa đơn.
- `src/features/service-expenses/components/ExpenseTable.tsx`: Chuẩn hóa bảng dữ liệu, badge trạng thái và phân trang.
- `src/features/service-expenses/pages/ServiceExpensesPage.tsx`: Trang chủ điều phối state, tích hợp `AdminToast`.

---

### 3. Kết Nối API Backend
- **Endpoint kết nối**:
  - `GET /service-expenses`: Lấy danh sách chi phí phân trang kèm bộ lọc (`branchId`, `category`, `status`, `fromDate`, `toDate`, `keyword`).
  - `GET /service-expenses/summary`: Lấy 4 chỉ số KPI tổng hợp theo chi nhánh và kỳ kế toán.
  - `POST /service-expenses`: Ghi nhận khoản chi mới.
  - `POST /service-expenses/{id}/pay`: Thanh toán và đồng bộ Sổ quỹ tiền mặt (FE-17).
  - `POST /service-expenses/{id}/cancel`: Hủy bỏ khoản chi phí.
- **Xử lý trạng thái Loading & Error**: Tích hợp Skeleton loading shimmer, `AdminToast` chuẩn và resilient mock fallback.

---

### 4. Kiểm Thử Giao Diện (Verification)
- [x] Đã chạy `npm run build`: Thành công (0 lỗi TS, 0 lỗi CSS).
- [x] Đã kiểm thử trình duyệt thực tế qua Chrome/Playwright:
  - Header & TopNav điều hướng chính xác.
  - Bảng dữ liệu, 4 thẻ KPI, bộ lọc thời gian hoạt động mượt mà.
  - Modal ghi nhận hỗ trợ tải file ảnh và xem trước chuẩn xác.
  - Modal thanh toán và xem chứng từ mở trơn tru.

---

### 5. Ghi Chú Cho Backend (MT_GRMS_BACKEND)
- Entity `ServiceExpense` trong C# .NET cần hỗ trợ các trường: `ExpenseId`, `BranchId`, `Category`, `Amount`, `Status`, `ExpenseDate`, `DueDate`, `VendorName`, `CashBookId`, `AttachedBillUrl`, `Note`.
- API endpoint `GET /service-expenses/summary` hỗ trợ query parameters `fromDate` và `toDate` để tính toán số liệu theo kỳ kế toán.
