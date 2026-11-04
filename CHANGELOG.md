# CHANGELOG - MT_GRMS_FRONTEND

Toàn bộ các thay đổi của repository Frontend React SPA được tổng hợp tại đây theo từng phiên bản. Chi tiết từng commit xem tại [`docs/worklogs/`](./docs/worklogs/).

---

## [Unreleased] - 2026-11-03
### Added
- Thêm component Dropdown **Chọn chi nhánh** (`BranchSelectorDropdown`) trên thanh header chính (`AppTopNav`), hỗ trợ chọn từng chi nhánh hoặc xem toàn hệ thống [worklog: docs/worklogs/2026-11-03_FE-STORE_AI_remove-wallet-topup-from-status-bar.md].

### Changed
- Đồng bộ hóa 100% typography (Be Vietnam Pro, tabular-nums) và bảng màu thương hiệu Deep Teal (#0F766E) cho modal Đăng ký gói (SubscriptionCheckoutModal) và bảng giá (SubscriptionPricingCards) [FE-STORE] [worklog: docs/worklogs/2026-11-04_FE-STORE_AI_unify-typography-and-checkout-modal-theme.md].
- Sửa layout bảng gói cước dịch vụ (pricing-cards-grid) mở rộng 100% toàn chiều ngang, loại bỏ max-width 1040px và khoảng trắng thừa bên phải màn hình [FE-STORE] [worklog: docs/worklogs/2026-11-04_FE-STORE_AI_expand-pricing-grid-full-width.md].
- Hợp nhất an toàn nhánh feature/store-owner-confige-management vào dev, giải quyết xung đột httpClient, authService, LoginPage, AppTopNav, Navbar và hoàn thiện build [worklog: docs/worklogs/2026-11-03_MERGE-DEV_AI_resolve-store-owner-config-merge.md].
- Loại bỏ hoàn toàn mục và tab **"Bản xác nhận dịch vụ"** khỏi thanh điều hướng bên trái và trang Hub Cài đặt gian hàng (`StoreSettingsHubPage`) [worklog: docs/worklogs/2026-11-03_FE-STORE_AI_remove-service-confirmation-tab.md].
- Tinh gọn Dropdown chọn chi nhánh: bỏ các icon và mã cửa hàng (`BR-xxx`), hiển thị đầy đủ tên chi nhánh và địa chỉ rõ ràng, không bị co kéo hoặc cắt chữ.
- Loại bỏ hoàn toàn mục "Ví gian hàng" & nút "Nạp ví" cùng popup VietQR khỏi thanh trạng thái tổng quan `StoreTopStatusBar`.
- Loại bỏ menu thả xuống (dropdown / mega-menu) của mục **"Cửa hàng"** trên `AppTopNav`, chuyển thành liên kết trực tiếp vào trang `/store-owner/subscriptions`.

## [0.1.1] - 2026-10-13
### Added
- Đồng bộ nhánh `dev` vào nhánh `add/login-screen` (module Nhà Cung Cấp, Chi phí vận hành, StoreOwnerLayout).
- Nâng cấp `AppTopNav`: Mega Menu 3 cột cho mục "Nhập hàng" theo chuẩn KiotViet SaaS (Nhà cung cấp, Mua hàng, Mua dịch vụ).
- Hỗ trợ hover tự động hạ menu, debounce grace period 180ms và active highlight chính xác theo URL query string.
- Xây dựng hoàn chỉnh hệ thống Xác thực người dùng (Login, Register, Forgot Password) [FE-AUTH].
- Zustand store quản lý phiên đăng nhập và Axios interceptor tự động refresh token.
- Thành phần bảo vệ route `ProtectedRoute` và nút Đăng xuất trên `AdminTopbar`.
- Giao diện chuẩn KiotViet Blue Palette, bo tròn Full Pill 9999px và 100% SVG đơn sắc.

## [0.1.0] - 2026-09-30
### Added
- Khởi tạo cấu trúc repository React 19 / Vite / TypeScript.
- Cấu hình thư mục quản lý worklog nội bộ: `docs/worklogs/`.
- Cấu hình template Pull Request: `.github/pull_request_template.md`.
