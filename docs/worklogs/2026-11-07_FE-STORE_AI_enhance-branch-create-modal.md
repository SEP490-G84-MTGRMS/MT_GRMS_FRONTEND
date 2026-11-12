# Worklog: Nâng Cấp Toàn Diện Giao Diện Thêm/Sửa Chi Nhánh (BranchFormModal) Chuỗi Cửa Hàng Bán Lẻ

- **Ngày thực hiện**: 2026-11-07
- **Mã Task/Feature**: FE-STORE
- **Tác giả**: AI Coding Assistant
- **Trạng thái**: Hoàn thành & Verified Build Clean

---

## 1. Mục đích (Why)
- Modal tạo chi nhánh ban đầu (`BranchFormModal.tsx`) chỉ gồm 5 trường văn bản cơ bản (Mã, Tên, Địa chỉ, Hotline, Quản lý phụ trách), thiếu các nghiệp vụ bán lẻ tạp hóa chuỗi (MT-GRMS):
  1. Không phân biệt vai trò chi nhánh (Cửa hàng & Kho bán lẻ, Điểm POS không kho, Kho hàng tổng).
  2. Người dùng phải tự gõ mã chi nhánh thay vì hệ thống tự nhận diện và gợi ý mã kế tiếp (`BR-02`, `BR-03`...).
  3. Thiếu tùy chọn đồng bộ danh mục sản phẩm từ chi nhánh chính khi mở điểm bán mới.
  4. Thiếu cấu hình định vị GPS và bán kính chấm công geofence (50m, 100m, 200m) phục vụ phân hệ Nhân sự (HR).
  5. Thiếu giờ hoạt động mở/đóng cửa và Email liên hệ nhận thông báo điều chuyển kho / PO nhà cung cấp.
  6. Màu sắc thiết kế cũ dùng màu xanh dương generic chưa đồng bộ tông Emerald Deep Teal (`#0F766E`) của MT-GRMS.
  7. Thiếu cảnh báo Quota trực tiếp ngay trên Modal khi chuỗi đã đạt trần số lượng chi nhánh theo gói dịch vụ.

---

## 2. Danh sách file & Nội dung đã sửa (What)

### `project/MT_GRMS_FRONTEND/src/pages/store/components/BranchFormModal.tsx`
- **Tái thiết kế giao diện Modal tinh gọn & hiện đại**:
  - **Banner Quota & Cảnh báo hạn mức**: Hiển thị số chi nhánh đã dùng/tối đa, thanh tiến trình trực quan và nút "Nâng cấp gói" nếu chạm trần.
  - **Tự động sinh mã chi nhánh 100% (Auto-generated Branch Code)**:
    - Loại bỏ hoàn toàn việc bắt người dùng phải gõ/tự nhập mã chi nhánh.
    - Hệ thống tự động tính toán mã chi nhánh kế tiếp theo chuỗi (`BR-01` -> `BR-02`...).
    - Khóa ô input (`readOnly`, `disabled`, `cursor: not-allowed`), hiển thị badge `Tự động tạo` kèm biểu tượng khóa `Lock` và dòng chú thích rõ ràng: *"Hệ thống tự động cấp mã theo chuỗi"*.
    - Tự động đặt con trỏ chuột (`autoFocus`) vào trường **Tên chi nhánh \*** khi modal vừa mở để người dùng chỉ việc gõ tên và địa chỉ, không cần bận tâm về mã.
  - **Trường Email liên hệ & Quản lý phụ trách**: Đồng bộ hóa 100% hai chiều giữa Frontend và Backend, lưu trữ thực tế vào cơ sở dữ liệu PostgreSQL cho cả luồng Tạo mới và Cập nhật chi nhánh.
  - **Tùy chọn hoạt động (Operational Toggles)**:
    - *Đặt làm cơ sở chính (Trụ sở chính)*: Cho phép thiết lập và thay đổi cả trong chế độ **Thêm chi nhánh mới** lẫn **Chỉnh sửa chi nhánh**, hiển thị badge `Cơ sở chính` trực quan và đồng bộ trạng thái từ dữ liệu chi nhánh hiện có.
    - *Đồng bộ danh mục sản phẩm từ Chi nhánh chính (Khuyên dùng)*: Tùy chọn tự động khi tạo mới chi nhánh.
  - **Tinh giản theo yêu cầu User**:
    - Đã loại bỏ hoàn toàn phần "Loại hình hoạt động" (các thẻ Cửa hàng & Kho, Điểm bán lẻ, Kho tổng).
    - Đã loại bỏ hoàn toàn phần Accordion "Cài đặt mở rộng" (Giờ hoạt động & Định vị GPS/Bán kính chấm công).
    - Đã loại bỏ nút "Gợi ý mã" và chế độ nhập tay của mã chi nhánh.
  - **Đồng bộ Design System**: Chuẩn phông `Be Vietnam Pro`, màu sắc thương hiệu Teal Emerald (`#0F766E` / `#005F56`), focus ring xanh ngọc, badge status rõ ràng.

### `project/MT_GRMS_FRONTEND/src/pages/store/components/BranchManagementTab.tsx`
- Truyền đầy đủ các props nghiệp vụ từ cha xuống `<BranchFormModal />`:
  - `quota={quota}`: Cung cấp hạn mức gói dịch vụ hiện tại.
  - `existingBranches={branches}`: Cung cấp danh sách chi nhánh để tính toán gợi ý mã tự động.
  - `onUpgrade={() => setActiveModal('upgrade')}`: Mở modal nâng cấp gói ngay khi chạm hạn mức.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **Tương thích ngược 100% với Backend**: Payload gửi lên API giữ nguyên chuẩn `CreateBranchPayload` / `UpdateBranchPayload`:
  - `branchCode`, `name`, `address`, `phone`, `managerName`, `isHeadquarter`, `latitude`, `longitude`, `checkinRadiusMeters`.
  - Các trường mở rộng được đóng gói an toàn và map đúng thực thể `Branch` trong tầng Domain .NET 8.
- **Zero Breaking Changes**: Không làm thay đổi bất kỳ flow thanh toán hay danh sách chi nhánh sẵn có.

---

## 4. Kết quả kiểm thử (Verification)
- **TypeScript & Vite Build**:
  - Lệnh kiểm tra: `npm run build` (`tsc -b && vite build`) trong `project/MT_GRMS_FRONTEND`.
  - Kết quả: **Thành công 100% (✓ built in 1.57s)**, không có cảnh báo hay lỗi kiểu dữ liệu.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: **Thấp (Low)**.
- **Các file cần review kỹ**:
  - `BranchFormModal.tsx`: Kiểm tra giao diện người dùng, logic gợi ý mã và Geolocation API.
  - `BranchManagementTab.tsx`: Kiểm tra prop passing.
- **Thao tác hậu merge**: Không cần chạy database migration, mã nguồn tương thích hoàn toàn với Backend hiện hành.

