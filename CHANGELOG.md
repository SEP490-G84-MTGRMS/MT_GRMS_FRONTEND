# CHANGELOG - MT_GRMS_FRONTEND

Toàn bộ các thay đổi của repository Frontend React SPA được tổng hợp tại đây theo từng phiên bản. Chi tiết từng commit xem tại [`docs/worklogs/`](./docs/worklogs/).

---

## [Unreleased] - 2026-10-11
### Added
- Xây dựng hoàn chỉnh hệ thống Xác thực người dùng (Login, Register, Forgot Password) [FE-AUTH].
- Zustand store quản lý phiên đăng nhập và Axios interceptor tự động refresh token.
- Thành phần bảo vệ route `ProtectedRoute` và nút Đăng xuất trên `AdminTopbar`.
- Giao diện chuẩn KiotViet Blue Palette, bo tròn Full Pill 9999px và 100% SVG đơn sắc.

## [0.1.0] - 2026-09-30
### Added
- Khởi tạo cấu trúc repository React 19 / Vite / TypeScript.
- Cấu hình thư mục quản lý worklog nội bộ: `docs/worklogs/`.
- Cấu hình template Pull Request: `.github/pull_request_template.md`.
