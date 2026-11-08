# Worklog: Giao Diện Gói Cước Mới & Tối Giản Modal Thanh Toán

- **Ngày thực hiện**: 2026-11-08
- **Tác giả**: AI Assistant (Pair Programming)
- **Mã Task / Change**: FE-09 / `subscription-tier-quota-redesign`

---

## 1. Mục Đích (Why)
- Thêm một thẻ riêng biệt bên trái dành riêng cho gói Dùng thử (Trial) bên cạnh Gói Thường:
  1. **Gói Dùng Thử (Trải Nghiệm)**: Nằm bên trái ngoài cùng, giá 0 đ / 3 ngày, mở khóa sẵn quản lý nhân viên và các tính năng cốt lõi để khách hàng trải nghiệm.
  2. **Gói Thường (Cửa Hàng Độc Lập)**: 99.000 đ/tháng, nằm ở giữa.
  3. **Gói Pro (Chuỗi Cửa Hàng)**: 249.000 đ/tháng, nằm bên phải ngoài cùng (highlight).
- **Tối giản hóa giao diện Modal Đăng ký & Gia hạn gói (`SubscriptionCheckoutModal`)**:
  - Giao diện cũ có quá nhiều chi tiết rối mắt (banner quảng cáo dùng thử lặp lại bên trong modal gói Pro, mã QR VietQR phức tạp, các chu kỳ quá dài lên tới 24 tháng).
  - Tinh gọn chu kỳ gia hạn chỉ còn: **3 Tháng** (Linh hoạt), **6 Tháng** (Phổ biến), và **1 Năm** (12 tháng + tặng 1 tháng). Bỏ chu kỳ 24 tháng.
  - Bỏ hình thức quét mã VietQR trong modal mua gói, chuyển hoàn toàn sang **thanh toán trừ tiền trực tiếp vào Ví gian hàng** (Store Wallet).
  - Hiển thị trực quan số dư ví, trạng thái đủ/thiếu tiền và cảnh báo số tiền cần nạp thêm nếu chưa đủ số dư.

---

## 2. Danh Sách File & Nội Dung Đã Thay Đổi (What)

1. `src/pages/store/storeData.ts`:
   - Chuẩn hóa `SUBSCRIPTION_PLANS` fallback thành 3 gói: `TRIAL` (0 đ), `STANDARD` (99.000 đ) và `PRO` (249.000 đ).
2. `src/pages/store/api/storeApi.ts`:
   - Bổ sung hàm `storeApi.activateTrial()` gọi `POST /api/tenant/subscriptions/trial`.
3. `src/pages/store/components/SubscriptionPricingCards.tsx`:
   - Cập nhật hàm `fetchPlans`: Lọc API response lấy 3 gói `TRIAL`, `STANDARD`, `PRO`, sắp xếp cố định theo thứ tự: TRIAL (trái) -> STANDARD (giữa) -> PRO (phải).
   - Cập nhật `mapBackendPlanToCardItem`: Chuẩn hóa nội dung và quyền lợi cho 3 thẻ riêng biệt.
   - Hiển thị giá `Miễn phí / 3 ngày` cho thẻ Dùng thử.
   - Nút bấm tự động đổi sang `Trải nghiệm dùng thử` hoặc `✓ Gói hiện tại đang dùng`.
   - Cập nhật skeleton loading từ 2 sang 3 thẻ.
4. `src/pages/store/components/SubscriptionCheckoutModal.tsx`:
   - Bỏ toàn bộ box quảng cáo khuyến mãi dùng thử lồng ghép bên trong modal Gói Pro.
   - Sửa lỗi tiêu đề modal dài bị rớt chữ ("Lập)") xuống dòng: chuẩn hóa tiêu đề thành "Đăng ký & Nâng cấp gói dịch vụ" gọn gàng, tinh tế.
   - Chuyển đổi layout Modal thành dạng **Split 2 Cột (2-Column Modal Layout)** với chiều rộng mở rộng 880px:
     - **Cột Trái (Left Column)**: Hiển thị badge gói cước, giá tháng, mô tả quy mô chi nhánh và **toàn bộ danh sách tính năng / quyền lợi nổi bật của gói cước** với icon tích xanh trực quan.
     - **Cột Phải (Right Column)**: Cấu hình chu kỳ (3 tháng / 6 tháng / 1 năm), tiện ích mở rộng (Addon), phương thức thanh toán ví gian hàng (số dư, trạng thái đủ/thiếu) và chi tiết hóa đơn thanh toán (sửa lỗi lặp chữ "Gói Gói").
   - Cập nhật 3 nút chu kỳ rõ ràng, gọn gàng: `3m` (3 Tháng), `6m` (6 Tháng), `12m` (1 Năm + 1 tháng tặng). Bỏ chu kỳ `24m`.
   - Bỏ hình thức quét mã VietQR; cố định phương thức `Wallet` (Trừ tiền trực tiếp vào Ví gian hàng).
5. `src/styles/store-hub.css`:
   - Bổ sung class `.checkout-modal-split` hỗ trợ Grid 2 cột (330px - 1fr) và tự động co dãn 1 cột trên màn hình nhỏ/tablet (max-width: 820px).
6. `src/pages/store/components/StoreWalletTopupModal.tsx`:
   - **Phóng to mã VietQR**: Nâng kích thước ảnh QR từ 110x110 lên 160x160 (hộp viền 200x200), mở rộng modal lên 630px, đảm bảo camera ứng dụng ngân hàng quét cực kỳ nhanh và chuẩn xác.
   - **Chuẩn hóa các nút bội số**: Thay đổi mệnh giá thành 4 nút `50.000 đ`, `100.000 đ`, `200.000 đ` và `Khác`.
   - **Đồng bộ 2 chiều Nút bấm & Ô nhập tiền**: Khi chọn 50k / 100k / 200k, ô input bên dưới tự động cập nhật đúng giá trị tương ứng (50.000 / 100.000 / 200.000); khi chọn `Khác` sẽ tự động focus và bôi đen ô input để người dùng nhập số tiền tùy ý.

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build` tại `project/MT_GRMS_FRONTEND`:
  - `tsc -b && vite build` -> Thành công 100% (0 errors, 2572 modules transformed, built in 1.72s).

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Trải nghiệm người dùng**: Giao diện hiển thị 3 thẻ rõ ràng, trực quan. Modal thanh toán gọn nhẹ, chỉ tập trung vào chu kỳ thực tế (3m, 6m, 1y) và thanh toán qua ví, giảm thiểu thao tác thừa cho chủ cửa hàng.
