# WORKLOG: FE-TENANT-MODAL - Tái thiết kế Modal Tạo cửa hàng mới (CreateTenantModal) theo dạng rộng ngang 2 cột

- **Ngày thực hiện**: 2026-11-15
- **Người thực hiện**: AI Assistant
- **Nhánh Git (Branch)**: `dev`
- **Mã tính năng liên kết**: [FE-TENANT-MODAL] Horizontal 2-Column Split Modal for Create Tenant
- **Loại thay đổi**: UI/UX Enhancement & Layout Optimization

---

### 1. Mục Đích Thay Đổi (Why)
- **Vấn đề của Modal cũ**:
  - Giao diện modal cũ hẹp (`max-width: 720px` nhưng phần lớn input xếp dọc 1 cột), làm form kéo dài ngoằng xuống tận đáy màn hình.
  - Người dùng phải cuộn chuột nhiều để điền từ Thông tin cửa hàng xuống Tài khoản chủ sở hữu và Mật khẩu ban đầu.
  - Giao diện thiếu tính trực quan, gây cảm giác nặng nề khi tạo mới tenant.
- **Yêu cầu người dùng**:
  - *"sửa lại cái này thành thiết kế rộng theo chiều ngang không trải dài nữa"*.
- **Giải pháp**:
  - Mở rộng chiều ngang modal lên `980px` (`max-width: 980px`).
  - Chia bố cục thành **2 cột song song (Split 2-Column Grid)** cân đối:
    - **Cột Trái**: `1. Thông tin cửa hàng` (Tên chuỗi/cửa hàng, Subdomain với đuôi `.thviet.vn`, Mã số thuế & Tỉnh/thành phố, Địa chỉ kinh doanh).
    - **Cột Phải**: `2. Tài khoản chủ cửa hàng` (Họ và tên, Số điện thoại đăng nhập, Email liên hệ, Mật khẩu ban đầu có nút ẩn/hiện, Box kích hoạt gói dịch vụ).
  - Chiều cao modal giảm gần một nửa (vừa vặn khung nhìn laptop 768px - 1080px không cần cuộn dọc).
  - Tự động co về 1 cột linh hoạt trên màn hình điện thoại/tablet nhỏ (`< 820px`).

---

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/features/admin/components/tenants/CreateTenantModal.tsx`:
  - Cấu trúc lại toàn bộ form body thành `<div className="create-tenant-columns">` chứa 2 cột `<fieldset className="create-tenant-column">`.
  - Bổ sung header phân bước trực quan với icon `<Store>` và `<UserCheck>`.
  - Tích hợp hậu tố `.thviet.vn` cho ô nhập subdomain.
  - Gom các trường bổ trợ vào `create-tenant-subgrid` (Mã số thuế + Tỉnh/TP; Họ tên + SĐT).
  - Giữ nguyên 100% logic validate, form submission và xử lý API.
- `src/features/admin/components/tenants/createTenantModal.css`:
  - Tăng `max-width` lên `980px`.
  - Áp dụng `display: grid; grid-template-columns: 1fr 1fr; gap: 24px;` cho 2 cột.
  - Tinh chỉnh padding, border-radius (`18px`), nền thẻ `#fafcfd` và viền `#e8eef3`.
  - Hỗ trợ responsive cho màn hình nhỏ (`< 820px` và `< 560px`).

---

### 3. Kiểm Thử & Xác Nhận (Verification)
- [x] Chạy `npm run build`: Thành công 100% trong 1.72s (0 lỗi TypeScript, 0 lỗi CSS).
- [x] Kiểm tra responsive: 2 cột trên Desktop, 1 cột trên Mobile/Tablet.
- [x] Tuân thủ quy định: Giữ nguyên toàn bộ mã nguồn trên working tree, **không tự ý commit git**.

---

### 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Rất thấp (Low Risk). Chỉ thay đổi layout CSS và thẻ HTML của Modal `CreateTenantModal`, không đổi payload API hay logic backend.
- **Tệp cần lưu tâm**:
  - `src/features/admin/components/tenants/CreateTenantModal.tsx`
  - `src/features/admin/components/tenants/createTenantModal.css`
- **Hậu merge**: Không cần thao tác CSDL.
