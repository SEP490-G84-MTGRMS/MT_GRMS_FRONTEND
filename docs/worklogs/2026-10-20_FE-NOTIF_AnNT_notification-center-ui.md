# WORKLOG: FE-NOTIF - Xây Dựng Trung Tâm Thông Báo (Notification Center UI)

- **Ngày thực hiện**: 2026-10-20
- **Người thực hiện**: Nguyễn Trường An (@Gia-Kat-An)
- **Nhánh Git (Branch)**: `add/Notification_UI`
- **Mã tính năng liên kết**: `FE-NOTIF` (Tích hợp cùng FE-02, FE-07, FE-08, FE-17, FE-19)
- **Loại thay đổi**: Feature / UI Component

---

### 1. Mục Đích Thay Đổi (Why)
- Thay thế nút chuông tĩnh trước đây trên thanh điều hướng `AppTopNav` bằng hệ thống Trung tâm thông báo tương tác toàn diện.
- Giúp chủ tiệm tạp hóa (Store Owner) và Quản lý nắm bắt tức thì 5 nhóm cảnh báo vận hành khẩn cấp: Hàng cận date FEFO (FE-02), Lệch két tiền kiểm kê ca (FE-17), Khách hàng nợ vượt hạn mức trần (FE-08), Hóa đơn dịch vụ đến hạn (FE-07), và Hạn nộp tờ khai thuế Quý (FE-19).
- Giải quyết xung đột merge với nhánh `dev` (giữ nguyên các tính năng mới: nút Hỗ trợ, Góp ý, Settings, Profile menu).

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/features/notifications/types/notification.ts`: Định nghĩa Type, Severity (Critical, Warning, Info, Success) và Category.
- `src/features/notifications/data/mockNotifications.ts`: Tạo mock data đại diện cho 5 phân hệ cốt lõi MT-GRMS.
- `src/features/notifications/stores/useNotificationStore.ts`: Quản lý state với Zustand, persistent cache lưu trong `localStorage`.
- `src/features/notifications/components/NotificationBadge.tsx`: Nút chuông đếm số unread động, animation pulse.
- `src/features/notifications/components/NotificationCard.tsx`: Thẻ thông báo kèm icon phân loại, thời gian tương đối tiếng Việt, nút Quick Action và Deep Link.
- `src/features/notifications/components/NotificationPopover.tsx`: Popover menu thả xuống với 2 tab "Chưa đọc" và "Tất cả", nút "Đánh dấu tất cả đã đọc".
- `src/features/notifications/components/NotificationDrawer.tsx`: Slide Drawer trượt phải toàn màn hình hỗ trợ tìm kiếm, lọc theo mức độ cảnh báo, xóa thông báo.
- `src/features/notifications/notifications.css`: Stylesheet đồng bộ design system, responsive.
- `src/features/notifications/__tests__/notificationStore.test.ts`: Bộ 7 unit test kiểm thử logic store (100% PASS).
- `src/layouts/StoreOwnerLayout/AppTopNav.tsx`: Tích hợp Popover, Badge và Drawer vào layout TopNav chính.

### 3. Kết Nối API Backend & State
- **Giai đoạn hiện tại (Iteration 2-3 Frontend)**: State quản lý qua Zustand store `useNotificationStore` với persistent cache client-side qua `localStorage` (`mt_grms_notifications_v1`).
- **Sẵn sàng tích hợp Backend**: Cấu trúc interface `AppNotification` chuẩn hóa, sẵn sàng kết nối SignalR Hub / REST API `/api/v1/notifications` khi backend hoàn thiện.

### 4. Kiểm Thử Giao Diện (Verification)
- [x] Đã chạy `npm run build`: Thành công (0 lỗi, build trong 1.52s).
- [x] Đã chạy `npx vitest`: 7/7 unit tests passed.
- [x] Đã kiểm tra Responsive (Desktop / Tablet / Mobile).
- [x] Đã giải quyết triệt để merge conflict với nhánh `dev`.

### 5. Ghi Chú Cho PM & Backend
- Backend khi phát triển SignalR hub có thể mapping trực tiếp theo schema `NotificationSeverity` và `NotificationCategory` đã chuẩn hóa tại `src/features/notifications/types/notification.ts`.
