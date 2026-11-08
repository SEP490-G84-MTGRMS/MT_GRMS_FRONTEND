# Worklog: Giao Diện Gói Cước Mới (Gói Thường 99k & Gói Pro 249k)

- **Ngày thực hiện**: 2026-11-08
- **Tác giả**: AI Assistant (Pair Programming)
- **Mã Task / Change**: FE-09 / `subscription-tier-quota-redesign`

---

## 1. Mục Đích (Why)
- Bỏ gói Free 0đ và loại bỏ hoàn toàn ô nhập "Kho phụ (+150k)" vì mỗi chi nhánh vật lý kiêm luôn kho hàng tại chỗ.
- Cập nhật bảng giá thành 2 gói chuẩn:
  - **Gói Thường (Cửa Hàng Độc Lập)**: 99.000 đ/tháng.
  - **Gói Pro (Chuỗi Cửa Hàng)**: 249.000 đ/tháng.
- Nâng cấp Modal thanh toán tự động thích ứng:
  - Gói Thường: Checkbox mua thêm tính năng Quản lý & Phân quyền nhân viên (+30.000 đ/tháng).
  - Gói Pro: Badge full tính năng nhân viên + Stepper mua thêm chi nhánh (+80.000 đ/tháng/chi nhánh).

---

## 2. Danh Sách File & Nội Dung Đã Thay Đổi (What)

1. `src/pages/store/storeData.ts`:
   - Chuẩn hóa `SUBSCRIPTION_PLANS` fallback thành 2 gói `STANDARD` (99.000 đ) và `PRO` (249.000 đ), bỏ gói cũ `SUPPORT`, `PREMIUM`.
2. `src/pages/store/api/storeApi.ts`:
   - Bổ sung trường `hasStaffManagementAddon?: boolean` trong payload `PurchaseSubscriptionPayload`.
3. `src/pages/store/components/SubscriptionPricingCards.tsx`:
   - Cập nhật hàm `fetchPlans`: Lọc nghiêm ngặt API response chỉ nhận gói `STANDARD` và `PRO`, sắp xếp Gói Thường trước, Gói Pro sau. Bổ sung cơ chế fallback an toàn sang `SUBSCRIPTION_PLANS` nếu máy chủ chưa nạp dữ liệu.
   - Cập nhật hàm `mapBackendPlanToCardItem`: Chuẩn hóa tiêu đề và quyền lợi cho 2 thẻ: Gói Thường (99k) và Gói Pro (249k).
   - Tối ưu skeleton loading từ 4 thẻ thành 2 thẻ tương ứng.
4. `src/pages/store/components/SubscriptionCheckoutModal.tsx`:
   - Bỏ hoàn toàn trường "Kho phụ".
   - Tự động hiển thị Option nhân viên cho Gói Thường và Stepper thêm chi nhánh cho Gói Pro.
   - Cập nhật công thức tính tiền tổng cộng và bảng kê chi tiết hóa đơn (kèm VAT 10%).

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build` tại `project/MT_GRMS_FRONTEND`:
  - `tsc -b && vite build` -> Thành công 100% (0 errors, 2572 modules transformed, built in 2.91s).

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Trải nghiệm người dùng**: Giao diện gọn gàng, rõ ràng và tính tiền minh bạch theo đúng chuẩn SaaS.

