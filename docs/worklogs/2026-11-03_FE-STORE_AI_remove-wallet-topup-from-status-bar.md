# Worklog: 2026-11-03 — FE-STORE — Bỏ phần Nạp ví & Thêm Dropdown chọn Chi nhánh trên Header

- **Author**: Antigravity AI Assistant
- **Task/Feature**: FE-STORE (`branch-selector-dropdown-and-store-nav-cleanup`)
- **Dự án**: `project/MT_GRMS_FRONTEND`
- **Mức độ rủi ro (Risk Level)**: Low (Chỉnh sửa UI thanh điều hướng và thanh trạng thái gian hàng)

---

## 1. Mục đích (Why)
- Thêm menu thả xuống (Dropdown) để người dùng chọn chi nhánh làm việc trực tiếp ngay trên thanh header trên cùng (`AppTopNav`), hỗ trợ chọn từng chi nhánh cụ thể hoặc xem "Toàn hệ thống".
- Tự động đồng bộ danh sách chi nhánh từ Backend API `/branches`, lưu chi nhánh đang chọn vào `localStorage` và phát sự kiện `mtgrms:branch-changed`.
- Tinh gọn dropdown: loại bỏ toàn bộ icon và mã chi nhánh (`code`), chỉ giữ lại tên chi nhánh và địa chỉ để văn bản hiển thị đầy đủ, thoáng và không bị cắt chữ (`...`).
- Tinh gọn mục "Cửa hàng" trên menu topbar thành liên kết trực tiếp, không còn menu thả xuống che khuất.
- Loại bỏ hoàn toàn phần nạp ví và popup VietQR khỏi `StoreTopStatusBar`.

---

## 2. Danh sách file & Nội dung đã sửa (What)
- [`src/layouts/StoreOwnerLayout/BranchSelectorDropdown.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/layouts/StoreOwnerLayout/BranchSelectorDropdown.tsx):
  - Tạo mới component Dropdown chọn chi nhánh phong cách KiotViet:
    - Nút hiển thị pill bán trong suốt với tên chi nhánh đang chọn và mũi tên `ChevronDown` (đã bỏ icon `Building2` và mã cửa hàng).
    - Menu xổ xuống hiển thị danh sách chi nhánh: tên chi nhánh in đậm, địa chỉ chi tiết bên dưới, dấu check xanh ở bên phải khi đang được chọn.
    - Đã bỏ các icon vuông (`Building2`, `Layers`, icon header) và bỏ mã chi nhánh (`BR-HCM-01`, `BR-HN-01`) giúp giao diện tối giản, tối ưu không gian hiển thị tên chi nhánh dài.
    - Hỗ trợ tùy chọn "Toàn hệ thống (Tất cả chi nhánh)".
    - Chân menu có nút bấm nhanh "Thiết lập & Thêm chi nhánh" chuyển hướng đến trang Quản lý chi nhánh.
- [`src/layouts/StoreOwnerLayout/AppTopNav.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/layouts/StoreOwnerLayout/AppTopNav.tsx):
  - Tích hợp `<BranchSelectorDropdown />` vào khu vực tác vụ bên phải của header (trước nút "Hỗ trợ").
  - Chuyển mục `store` ("Cửa hàng") từ menu phân nhóm sang liên kết trực tiếp `to: "/store-owner/subscriptions"`.
- [`src/pages/store/components/StoreTopStatusBar.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/components/StoreTopStatusBar.tsx):
  - Bỏ cột hiển thị `Ví gian hàng` và nút `Nạp ví` (`.store-status-wallet`).
  - Bỏ prop `onOpenTopupModal`.
- [`src/pages/store/StoreSettingsHubPage.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/StoreSettingsHubPage.tsx):
  - Xóa truyền prop `onOpenTopupModal` tại `<StoreTopStatusBar>`.
- [`src/styles/store-hub.css`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/styles/store-hub.css):
  - Điều chỉnh `.store-top-status-bar` thành `grid-template-columns: repeat(4, 1fr);`.

---

## 3. Chi tiết Kỹ thuật (Technical Highlights)
- Dropdown hoạt động mượt mà với tính năng click-outside và phím Escape để tự động đóng.
- Tự động khôi phục chi nhánh đã chọn từ `localStorage`.
- Phản hồi nhanh và đồng bộ thời gian thực qua CustomEvent `mtgrms:branch-changed`.

---

## 4. Kết quả Kiểm thử (Verification)
- `npm run build`: **Build succeeded** (0 errors).
- Trình duyệt tự động hot-reload cập nhật UI ngay lập tức.

---

## 5. Ghi chú cho Manager khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Low.
- **File cần review**: `BranchSelectorDropdown.tsx`, `AppTopNav.tsx`, `StoreTopStatusBar.tsx`.
