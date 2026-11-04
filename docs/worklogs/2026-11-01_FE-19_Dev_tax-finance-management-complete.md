# WORKLOG: [FE-19] - tax-finance-management-complete

- **Ngày thực hiện**: 2026-11-01
- **Người thực hiện**: Antigravity AI Agent & Frontend Team
- **Nhánh Git (Branch)**: `feature/FE19-tax-finance-polish`
- **Mã tính năng liên kết**: [FE-19](../../../DOCS_MT_GRMS/specs/FE-19/spec.md)
- **Loại thay đổi**: Feature / UI / Refactor / Legal Compliance

---

### 1. Mục Đích Thay Đổi (Why)
- Chuẩn hóa toàn diện phân hệ Thuế & Tài chính Hộ Kinh Doanh (HKD) theo khung pháp lý mới nhất áp dụng từ năm 2026:
  - Bãi bỏ hoàn toàn Thông tư 88/2021/TT-BTC, cập nhật chuẩn xác sang **Thông tư 152/2025/TT-BTC** (Chế độ kế toán Hộ kinh doanh).
  - Cập nhật quy định nâng ngưỡng miễn thuế từ 500 triệu lên 1 tỷ đồng theo **Nghị định 141/2026/NĐ-CP** và **Nghị định 68/2026/NĐ-CP**.
  - Tích hợp chính sách giảm 20% thuế GTGT mặt hàng tiêu dùng nhanh FMCG theo **Nghị quyết 204/2025/QH15**.
  - Khắc phục các lỗi hiển thị, khớp nối dữ liệu thực tế giữa Backend API và Frontend UI, hỗ trợ kiểm thử đối soát Quý 4/2026 với kịch bản vượt ngưỡng 1 tỷ đồng giữa năm.

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/features/tax-snapshot/`:
  - `pages/TaxSnapshotPage.tsx`: Tối ưu giao diện trang chính, tích hợp 4 tab nghiệp vụ (Tờ khai, Sổ kế toán, Lịch sử, Phân tích), đồng bộ state bộ lọc và làm mới dữ liệu.
  - `components/AccountingBooksView.tsx`: Chuẩn hóa hệ thống mẫu sổ Thông tư 152 (`S1a-HKD`, `S2a-HKD`, `S2c-HKD`, `S2d-HKD`, `S2e-HKD`, `S3a - Thuế Khác`), kết nối API dữ liệu thực tế từ POS và Phiếu chi.
  - `components/TaxKPICards.tsx` & `TaxDeclarationFormView.tsx`: Hiển thị chỉ số doanh thu phát sinh, lũy kế YTD, chiết khấu, hàng trả lại, phân loại 2 phương pháp tính thuế (Tỷ lệ % vs Kê khai 15%).
  - `components/TaxAnalyticsSection.tsx`: Biểu đồ phân tích tiến độ 4 Quý và 12 Tháng, phản ánh chính xác trạng thái chốt kỳ và tổng thuế năm.
  - `components/CreateTaxSnapshotModal.tsx`: Modal xác nhận chốt số với mã PIN, kiểm tra điều kiện tiên quyết và niêm phong mật mã.
  - `components/TaxSnapshotDetailDrawer.tsx`: Drawer xem chi tiết snapshot đã chốt, kiểm tra chữ ký HMAC-SHA256 Audit Seal và đối chiếu số liệu.
  - `components/TaxExportModal.tsx`: Hỗ trợ xuất bảng tính Excel 4 sheet phẳng phục vụ thanh tra thuế.
  - `api/taxSnapshotApi.ts`: Đồng bộ tên tham số `calculationMethod` và `method`, xử lý chuyển đổi linh hoạt phương pháp tính thuế.
  - `types/taxSnapshot.ts`: Bổ sung định nghĩa các trường dữ liệu theo Thông tư 152/2025/TT-BTC.
- `src/components/common/ThresholdRuler.tsx`: Thước đo trực quan 3 vùng màu (Xanh, Vàng, Đỏ) cảnh báo ngưỡng 1 tỷ và 3 tỷ đồng.
- `src/features/tax-snapshot/__tests__/stageCAndMockSecurity.test.ts`: Cập nhật 87 test case Vitest chuẩn hóa theo Thông tư 152.

### 3. Kết Nối API Backend
- **Endpoint kết nối**:
  - `[GET] /api/tax/household/summary`: Lấy thông tin tờ khai, phân nhóm, số thuế tạm tính theo bộ lọc (Quý/Tháng/Năm, Phương pháp).
  - `[GET] /api/tax/household/accounting-book`: Lấy chi tiết các dòng sổ kế toán S1a, S2a, S2c, S2d, S2e, S3a theo kỳ.
  - `[GET] /api/tax/household/snapshots`: Lấy danh sách lịch sử các kỳ đã chốt và niêm phong.
  - `[POST] /api/tax/household/snapshot`: Thực hiện chốt kỳ tính thuế kèm mã PIN và tạo HMAC-SHA256 seal.
  - `[GET] /api/tax/household/export-excel`: Tải file Excel đối soát thuế và sổ sách kế toán.
- **Xử lý trạng thái Loading & Error**: Tích hợp Toast notification thông báo kết quả chốt kỳ, hiển thị Banner cảnh báo vượt ngưỡng giữa năm trực quan.

### 4. Kiểm Thử Giao Diện & Hệ Thống (Verification)
- [x] Đã chạy `npm run test:run`: **87 / 87 tests PASSED (100%)**.
- [x] Đã chạy `npm run build`: Thành công trong 1.15s (0 lỗi TypeScript).
- [x] Đã nạp dữ liệu thực tế Quý 4/2026 vào CSDL Neon PostgreSQL và kiểm thử End-to-End bằng Chrome DevTools:
  - Doanh thu thuần Q4: 763.970.000đ, Lũy kế YTD: 1.150.000.000đ (Vượt 1 tỷ).
  - Thuế TNCN Q4 (0.5% phần vượt): 750.000đ.
  - Thuế GTGT Q4 (YTD thận trọng): 11.500.000đ.
  - Chốt kỳ Quý 4 thành công, niêm phong HMAC-SHA256 hợp lệ, hoàn tất 4/4 Quý năm 2026.

### 5. Ghi Chú Cho PM & Backend
- Backend `HouseholdTaxController.cs` đã được đồng bộ để nhận linh hoạt cả `method` lẫn `calculationMethod`.
- Hệ thống đã sẵn sàng cho buổi nghiệm thu đồ án tốt nghiệp với hội đồng đánh giá.

