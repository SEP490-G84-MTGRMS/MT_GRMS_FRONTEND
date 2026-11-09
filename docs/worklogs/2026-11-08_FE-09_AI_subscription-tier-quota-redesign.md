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
   - Bổ sung class `.topup-modal-split` hỗ trợ bố cục 2 cột (290px - 1fr) cho modal nạp ví.
6. `src/pages/store/components/StoreWalletTopupModal.tsx`:
   - **Tái cấu trúc bố cục 2 cột Split View**:
     - **Cột Trái**: Mã QR VietQR Napas247 siêu lớn (ảnh 230x230, khung chứa 250x250) trải dài toàn bộ chiều cao từ ngang tầm nút chọn mệnh giá ở trên xuống tới đáy của khung thanh toán ở dưới.
     - **Cột Phải**: Chứa khu vực chọn mệnh giá nhanh (50k, 100k, 200k, Khác), ô nhập số tiền đồng bộ 2 chiều, bảng thông tin chuyển khoản (MB Bank, STK, nội dung WAL) và card tổng số tiền thanh toán.
   - **Mở rộng chiều ngang Modal**: Nâng `maxWidth` lên 780px giúp cả 2 cột rộng rãi, dễ nhìn và quét mã tức thì.
   - **Đồng bộ 2 chiều Nút bấm & Ô nhập tiền**: Bấm 50k / 100k / 200k tự động điền input tương ứng; bấm `Khác` tự động focus vào input để người dùng gõ số tiền tùy ý.
7. `src/pages/store/components/BranchQuotaBar.tsx` & `src/pages/store/components/BranchManagementTab.tsx`:
   - Cập nhật QuotaBar hiển thị cảnh báo đỏ khi số chi nhánh thực tế vượt quá hạn mức gói (`Đã sử dụng {used}/{max} chi nhánh (Vượt quá hạn mức {diff} chi nhánh)`).
   - Xử lý bắt lỗi ngoại lệ `QUOTA_EXCEEDED` tại `handleToggleStatus`: hiển thị thông báo alert rõ ràng khi cố bật lại chi nhánh vượt quá hạn mức gói.

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build` tại `project/MT_GRMS_FRONTEND`:
  - `tsc -b && vite build` -> Thành công 100% (0 errors, 2572 modules transformed, built in 1.72s).

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Trải nghiệm người dùng**: Giao diện hiển thị 3 thẻ rõ ràng, trực quan. Modal thanh toán gọn nhẹ, chỉ tập trung vào chu kỳ thực tế (3m, 6m, 1y) và thanh toán qua ví, giảm thiểu thao tác thừa cho chủ cửa hàng.

---

### Bổ sung: Nút Xóa Chi Nhánh (Delete Branch Action) trong Quản lý Chi nhánh
1. **Mục đích**:
   - Cho phép người dùng trực tiếp xóa các chi nhánh thừa (soft delete) khỏi danh sách để giảm số lượng chi nhánh về hạn mức tối đa của gói cước.
   - Bảo vệ chi nhánh chính (Trụ sở chính) bằng cách vô hiệu hóa nút xóa và hiển thị tooltip cảnh báo rõ ràng.

2. **Chi tiết tệp thay đổi**:
   - `src/pages/store/api/branchManagementApi.ts`: Thêm hàm `deleteBranch(id: string)` gọi `DELETE /branches/{id}`.
   - `src/pages/store/components/BranchManagementTab.tsx`:
     - Bổ sung hàm `handleDeleteBranch` với hộp thoại xác nhận chi tiết, cảnh báo giải phóng hạn mức quota chi nhánh, tự động re-fetch quota và danh sách chi nhánh sau khi xóa.
     - Bổ sung nút bấm `Trash2` ở cột "Thao tác" với màu đỏ nhạt/đỏ nổi bật, disable nếu là chi nhánh chính (`isHeadquarter`).

3. **Kiểm thử**:
   - Chạy `npx vite build` -> Thành công không có lỗi (built in 1.75s).

---

### Bổ sung: Modal Xem Chi Tiết & Thông Số Tổng Quát Chi Nhánh (Branch Detail Modal)
1. **Mục đích**:
   - Cho phép người dùng bấm vào hàng chi nhánh hoặc nút icon "Con mắt" (Eye) để xem modal chi tiết:
     - Phần trên: Toàn bộ thông tin cơ bản của chi nhánh (Mã, Tên, Trụ sở chính, Địa chỉ, Hotline, Email, Quản lý phụ trách, Ngày tạo).
     - Phần dưới: Các thông số tổng quát hoạt động (Tổng số lượng SKU sản phẩm kinh doanh, tổng tồn kho thực tế SOH, cảnh báo thiếu hàng, tổng nhân sự chi nhánh, số nhân viên active, đơn hàng chờ).
     - Kèm bảng chuyển tab xem nhanh danh sách sản phẩm và danh sách nhân sự trực thuộc chi nhánh.

2. **Chi tiết tệp thay đổi**:
   - `src/pages/store/api/branchManagementApi.ts`: Khai báo `BranchDetailResponse`, `BranchEmployeeSummaryItem`, `BranchProductSummaryItem` và hàm `getBranchDetail(id)`.
   - `src/pages/store/components/BranchDetailModal.tsx`: Tạo mới component modal chi tiết chuẩn giao diện MT-GRMS với bố cục chia 2 phần (thông tin cơ bản ở trên, KPI cards và tabs danh sách ở dưới).
   - `src/pages/store/components/BranchManagementTab.tsx`:
     - Bổ sung sự kiện click vào hàng chi nhánh (`cursor: pointer`, hover feedback).
     - Bổ sung nút icon `Eye` trong cột "Thao tác" (ngăn nổi bọt sự kiện `e.stopPropagation()`).
     - Tích hợp `BranchDetailModal` và điều hướng sửa nhanh chi nhánh từ modal.

3. **Kiểm thử**:
   - Chạy `npx vite build` -> Thành công không có lỗi (built in 1.92s).

---

### Bổ sung (2026-11-09): Tích hợp Input chỉnh sửa trực tiếp và nút Lưu trong Modal Chi tiết Chi nhánh
1. **Mục đích**:
   - Chuyển đổi toàn bộ thông tin cơ bản ở phần trên thành các ô input nhập liệu trực tiếp (Tên chi nhánh, Địa chỉ hoạt động, Hotline, Email liên hệ, Quản lý phụ trách, Tùy chọn đặt làm Trụ sở chính, Mã chi nhánh khóa cố định).
   - Bổ sung nút **"Lưu thay đổi"** ngay tại footer của modal, loại bỏ hoàn toàn việc phải mở popup chỉnh sửa riêng biệt, mang lại trải nghiệm chỉnh sửa liền mạch và tiện lợi cho người dùng.

2. **Chi tiết tệp thay đổi**:
   - `src/pages/store/components/BranchDetailModal.tsx`:
     - Chuyển đổi static text thành các input fields có icon đại diện (`Store`, `MapPin`, `Phone`, `Mail`, `User`, `Lock`, `ShieldCheck`).
     - Bổ sung state `isSaving`, `saveSuccess`, `errorMessage` và hàm `handleSave`.
     - Footer: Thay thế nút mở popup chỉnh sửa cũ bằng nút primary *"Lưu thay đổi"* (Save icon, spinner loading state, visual feedback banner) và nút *"Đóng"*.
   - `src/pages/store/components/BranchManagementTab.tsx`:
     - Tích hợp nút Sửa (Edit2) trên danh sách chi nhánh mở trực tiếp modal chi tiết & chỉnh sửa này.
     - Truyền callback `onSuccess={loadData}` để tự động đồng bộ lại danh sách và hạn mức sau khi lưu.

3. **Kiểm thử**:
   - Chạy `npx vite build` -> Thành công 0 Lỗi (built in 2.20s).



