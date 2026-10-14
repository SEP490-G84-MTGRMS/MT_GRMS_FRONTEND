# CHANGELOG - MT_GRMS_FRONTEND

Toàn bộ các thay đổi của repository Frontend React SPA được tổng hợp tại đây theo từng phiên bản. Chi tiết từng commit xem tại [`docs/worklogs/`](./docs/worklogs/).

---

## [Unreleased] - 2026-10-13
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
