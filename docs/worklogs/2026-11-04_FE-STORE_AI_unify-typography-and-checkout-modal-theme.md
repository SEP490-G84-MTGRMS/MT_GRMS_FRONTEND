# Worklog: Đồng Bộ Typography, Font Chữ & Chuẩn Hóa Phong Cách Deep Teal Cho Modal Thanh Toán & Bảng Giá

- **Ngày thực hiện**: 2026-11-04
- **Tác giả**: AI Assistant (Pair Programming)
- **Mã Task**: FE-STORE (Typography & Visual Consistency Refinement)
- **Dự án**: `project/MT_GRMS_FRONTEND`

---

## 1. Mục Đích Thay Đổi (Why)
- **Vấn đề**:
  - Giao diện modal "Đăng ký & Nâng cấp gói" (`SubscriptionCheckoutModal`) và các thẻ bảng giá (`SubscriptionPricingCards`) trước đây bị lệch phong cách so với toàn bộ dự án:
    - Font chữ các con số tiền tệ hiển thị font Monospace (`JetBrains Mono`, Consolas) thô cứng, lệch phông so với toàn bộ giao diện đang dùng `Be Vietnam Pro` (`var(--font-sans)`).
    - Màu sắc bị phân mảnh: Nút bấm trên các gói Hỗ trợ/Cao cấp dùng màu cam chói (`#F97316`), viền chọn chu kỳ và phương thức thanh toán dùng màu xanh dương cũ (`#0066FF`), trong khi màu chủ đạo toàn hệ thống là Deep Teal (`#0F766E`).
- **Mục tiêu**:
  - Chuẩn hóa 100% typography sang `var(--font-sans)` (Be Vietnam Pro) kết hợp `fontVariantNumeric: 'tabular-nums'` để các con số thẳng hàng, thanh lịch, chuyên nghiệp.
  - Thống nhất bảng màu thương hiệu Deep Teal (`#0F766E`) kèm các nền dịu (`#F0FDFA`), viền tinh tế (`#99F6E4`) và hiệu ứng chuyển động mượt mà.

---

## 2. Danh Sách Tệp & Chi Tiết Thay Đổi (What)
- [`src/pages/store/components/SubscriptionCheckoutModal.tsx`](../../src/pages/store/components/SubscriptionCheckoutModal.tsx):
  - Đồng bộ `fontFamily: 'var(--font-sans)'` cho toàn bộ modal dialog, tiêu đề, nhãn chu kỳ, tiện ích và các dòng giá tiền.
  - Sử dụng `fontVariantNumeric: 'tabular-nums'` thay vì font-mono cho toàn bộ số tiền (`basePrice`, `branchAddonPrice`, `vatAmount`, `grandTotal`, số dư ví, số lượng stepper).
  - Chuẩn hóa Step 1 (Chu kỳ): Thẻ đang chọn hiển thị viền `2px solid var(--blue-primary)`, nền `#F0FDFA`, huy hiệu tặng tháng dạng pill bo tròn gọn gàng.
  - Chuẩn hóa Step 2 (Tiện ích mở rộng): Icon `Building2` và `Warehouse` đặt trong khung nền teal dịu `#F0FDFA`, nút stepper +/- bo tròn với hiệu ứng hover mượt.
  - Chuẩn hóa Step 3 (Phương thức thanh toán): Thẻ Ví gian hàng và Quét mã VietQR dùng icon box Deep Teal, viền chọn Deep Teal kèm cảnh báo số dư ví màu đỏ dịu `#FEF2F2`.
  - Khối tóm tắt hóa đơn: Nền `#F8FAFC`, đường kẻ phân cách tinh tế, tổng tiền thanh toán hiển thị to bản 21px màu `#0F766E`.
  - Nút xác nhận thanh toán: Bo tròn full pill, màu Deep Teal `#0F766E`, hover `#115E59`, bóng đổ nhẹ `0 4px 16px rgba(15, 118, 110, 0.32)`.
- [`src/pages/store/components/SubscriptionPricingCards.tsx`](../../src/pages/store/components/SubscriptionPricingCards.tsx):
  - Loại bỏ hoàn toàn mã màu cam `#EA580C` / `#F97316` ở các gói trả phí, đồng bộ theo tông Deep Teal `#0F766E`.
  - Chuyển số tiền gói sang `var(--font-sans)` với `fontVariantNumeric: 'tabular-nums'`.
  - Gói hiện tại đang dùng hiển thị nút dạng badge xanh lá dịu `#ECFDF5` (`✓ Gói hiện tại đang dùng`), các gói trả phí dùng nút "Nâng cấp ngay" Deep Teal.
- [`src/styles/store-hub.css`](../../src/styles/store-hub.css):
  - Thay thế màu `#0066FF` cũ bằng `var(--blue-primary)` (`#0F766E`) cho mục active trên sidebar và card được highlight.
  - Khai báo rõ `font-family: var(--font-sans)` cho `.store-modal-dialog`.

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build`: **PASS 100%** (2544 modules, 0 lỗi TypeScript).
- Dev server (`http://localhost:5173/`): Hot reload tự động, modal hiển thị đồng bộ phông chữ tiếng Việt, không bị nhảy font số, màu sắc trang nhã, hiện đại theo chuẩn KiotViet / SaaS hiện đại.

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- Rủi ro: Thấp (Low), tập trung vào trải nghiệm người dùng (UX/UI) và chuẩn hóa Design Tokens.

