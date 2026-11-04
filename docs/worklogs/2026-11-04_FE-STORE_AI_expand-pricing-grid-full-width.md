# Worklog: Sửa Giao Diện Gói Dịch Vụ Mở Rộng Toàn Chiều Ngang & Khử Khoảng Trắng Thừa

- **Ngày thực hiện**: 2026-11-04
- **Tác giả**: AI Assistant (Pair Programming)
- **Mã Task**: FE-STORE (Subscription Pricing Grid UI Enhancement & Full-Width Layout)
- **Dự án**: `project/MT_GRMS_FRONTEND`

---

## 1. Mục Đích Thay Đổi (Why)
- **Vấn đề**: Trên màn hình Quản lý gian hàng (`/store-owner/subscriptions?tab=subscriptions`), phần hiển thị các gói dịch vụ bị giới hạn chiều rộng (`max-width: 1040px`), khiến các thẻ gói cước bị dồn về bên trái và tạo ra một khoảng trắng lớn trống trơn ở bên phải màn hình.
- **Giải pháp**:
  - Loại bỏ giới hạn `max-width: 1040px` trên `.pricing-cards-grid`, chuyển sang layout `width: 100%` với CSS Grid `repeat(auto-fit, minmax(270px, 1fr))` và `align-items: stretch` để các thẻ tự động trải đều 100% chiều ngang giao diện, vừa khít với thanh trạng thái phía trên.
  - Kích hoạt lại `Gói Doanh Nghiệp (Toàn Năng)` (`plan_pro` - gói mà gian hàng hiện tại đang sở hữu) trong database PostgreSQL (`IsActive = true`) để danh sách hiển thị đầy đủ 4 gói cước chuẩn mực.
  - Bổ sung trường `eligibleForVatReduction` vào `ProductItem` interface nhằm đảm bảo tính toàn vẹn kiểu dữ liệu khi build TypeScript.

---

## 2. Danh Sách Tệp & Chi Tiết Thay Đổi (What)
- [`src/styles/store-hub.css`](../../src/styles/store-hub.css):
  - Bỏ `max-width: 1040px`, cập nhật `.pricing-cards-grid` thành `width: 100%`, `max-width: 100%`, `grid-template-columns: repeat(auto-fit, minmax(270px, 1fr))`, `gap: 22px`.
  - Thiết lập `align-items: stretch` và `height: 100%` để các card trong cùng hàng luôn có chiều cao bằng nhau.
- [`src/pages/store/StoreSettingsHubPage.tsx`](../../src/pages/store/StoreSettingsHubPage.tsx):
  - Thêm `style={{ width: '100%' }}` cho container tab `subscriptions`.
- [`src/pages/store/components/SubscriptionPricingCards.tsx`](../../src/pages/store/components/SubscriptionPricingCards.tsx):
  - Tăng số lượng thẻ skeleton khi đang tải từ `[1, 2]` lên `[1, 2, 3, 4]` để khớp với layout 4 gói cước.
- [`src/features/product/types/index.ts`](../../src/features/product/types/index.ts):
  - Bổ sung trường tùy chọn `eligibleForVatReduction?: boolean;` vào `ProductItem`.

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build`:
  ```text
  > tsc -b && vite build
  ✓ 2544 modules transformed.
  ✓ built in 1.72s (0 errors)
  ```
- Backend API `/api/v1/tenant/pricing-plans` trả về đủ 4 gói cước:
  1. `FREE`: Gói Cơ Bản (Miễn Phí) 01 (0 đ)
  2. `SUPPORT`: Gói Hỗ Trợ (270.000 đ)
  3. `VIP`: Gói Cao Cấp (490.000 đ)
  4. `PRO`: Gói Doanh Nghiệp (Toàn Năng) (999.000 đ - Đang dùng)
- Giao diện trải rộng đều 100%, không còn khoảng trắng thừa bên phải.

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- Rủi ro: Thấp (Low), thuần túy CSS layout responsive và bổ sung trường type.

