# WORKLOG: [FE-MERGE] - Merge Dev into add/login-screen & Store Owner Navigation Updates

- **Ngày thực hiện**: 2026-10-13
- **Người thực hiện**: AI Agent / Developer
- **Nhánh Git (Branch)**: `add/login-screen`
- **Mã tính năng liên kết**: [FE-MERGE-DEV](../../../DOCS_MT_GRMS/specs/FE-01/spec.md)
- **Loại thay đổi**: Feature / UI-UX / Merge

---

### 1. Mục Đích Thay Đổi (Why)
- Đồng bộ nhánh `dev` vào nhánh `add/login-screen` bao gồm module Quản lý Nhà Cung Cấp (`features/supplier`), Chi phí vận hành (`features/service-expenses`), và layout Quản lý tiệm (`StoreOwnerLayout`).
- Hoàn thiện thanh điều hướng `AppTopNav` theo chuẩn KiotViet:
  - Menu tự động hạ xuống khi hover (`onMouseEnter`/`onMouseOver`) và tự đóng khi rời chuột.
  - Phân tách chính xác mục **Hàng hóa** và **Nhập hàng**, tránh bị bôi màu đồng thời.
  - Mở rộng menu **Nhập hàng** thành **Mega Menu 3 cột** rộng rãi (Nhà cung cấp, Mua hàng, Mua dịch vụ) với badge đỏ "Mới" chuẩn UI SaaS KiotViet.

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/layouts/StoreOwnerLayout/AppTopNav.tsx`: Cập nhật cấu trúc menu 3 cột `NavSection`, xử lý hover dropdown bridge và kiểm tra trạng thái active theo query string URL.
- `src/styles/admin.css`: Bổ sung CSS hover rules cho `.topnav-group:hover .topnav-dropdown-bridge` và `.topnav-group-btn.is-open`.
- `src/features/supplier/*`: Đồng bộ module Quản lý Nhà Cung Cấp, danh sách sản phẩm NCC.
- `src/features/service-expenses/*`: Đồng bộ module Chi phí dịch vụ & vận hành.
- `src/app/router.tsx`: Định tuyến các trang `/store-owner/suppliers`, `/store-owner/expenses`.

### 3. Chi Tiết UI/UX & API Integration
- **Đường dẫn Route (URL)**:
  - `/store-owner/suppliers`: Quản lý Nhà cung cấp
  - `/store-owner/suppliers/products`: Quản lý Sản phẩm theo NCC
  - `/store-owner/expenses`: Quản lý Chi phí vận hành & dịch vụ
- **Breaking Changes**: Không có.

### 4. Kiểm Thử & Xác Nhận (Verification)
- [x] Đã chạy `npx tsc --noEmit`: Thành công 100% (0 lỗi TypeScript).
- [x] Đã kiểm thử trực tiếp trên trình duyệt bằng Playwright/Browser Subagent:
  - Hover hiển thị Mega Menu 3 cột mượt mà, không giật lag.
  - Active đúng từng trang riêng biệt (`/suppliers` vs `/products`).
  - Tự động đóng lại khi di chuột ra ngoài.

---

### 5. Chỉ Dẫn Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro (Risk Level)**: Thấp (Low).
- **File cần Manager review kỹ nhất**: `src/layouts/StoreOwnerLayout/AppTopNav.tsx`.
- **Hướng dẫn Manager test nhanh UI**:
  - Truy cập: `http://localhost:5173/store-owner/suppliers`
  - Rê chuột vào tab **Nhập hàng** trên thanh điều hướng để kiểm tra Mega Menu 3 cột và đóng mở mượt mà.
