# Worklog: Giao Diện Gói Cước Mới (Thêm Thẻ Gói Dùng Thử Bên Trái Cạnh Gói Thường)

- **Ngày thực hiện**: 2026-11-08
- **Tác giả**: AI Assistant (Pair Programming)
- **Mã Task / Change**: FE-09 / `subscription-tier-quota-redesign`

---

## 1. Mục Đích (Why)
- Thêm một thẻ riêng biệt bên trái dành riêng cho gói Dùng thử (Trial) bên cạnh Gói Thường:
  1. **Gói Dùng Thử (Trải Nghiệm)**: Nằm bên trái ngoài cùng, giá 0 đ / 3 ngày, mở khóa sẵn quản lý nhân viên và các tính năng cốt lõi để khách hàng trải nghiệm.
  2. **Gói Thường (Cửa Hàng Độc Lập)**: 99.000 đ/tháng, nằm ở giữa.
  3. **Gói Pro (Chuỗi Cửa Hàng)**: 249.000 đ/tháng, nằm bên phải ngoài cùng (highlight).
- Bỏ các dòng phụ gây rối layout bên trong thẻ và hoàn thiện giao diện 3 thẻ cân đối, hiện đại.

---

## 2. Danh Sách File & Nội Dung Đã Thay Đổi (What)

1. `src/pages/store/storeData.ts`:
   - Chuẩn hóa `SUBSCRIPTION_PLANS` fallback thành 3 gói: `TRIAL` (0 đ), `STANDARD` (99.000 đ) và `PRO` (249.000 đ).
2. `src/pages/store/api/storeApi.ts`:
   - Bổ sung hàm `storeApi.activateTrial()` gọi `POST /api/tenant/subscriptions/trial`.
3. `src/pages/store/components/SubscriptionPricingCards.tsx`:
   - Cập nhật hàm `fetchPlans`: Lọc API response lấy 3 gói `TRIAL`, `STANDARD`, `PRO`, sắp xếp cố định theo thứ tự: TRIAL (trái) -> STANDARD (giữa) -> PRO (phải).
   - Cập nhật `mapBackendPlanToCardItem`: Chuẩn hóa nội dung và quyền lợi cho 3 thẻ riêng biệt.
   - Hiển thị giá `Miễn phí / 3 ngày` cho thẻ Dùng thử.
   - Nút bấm tự động đổi sang `Trải nghiệm dùng thử` hoặc `✓ Gói hiện tại đang dùng`.
   - Cập nhật skeleton loading từ 2 sang 3 thẻ.
4. `src/pages/store/components/SubscriptionCheckoutModal.tsx`:
   - Tự động nhận diện khi người dùng bấm vào thẻ Gói Dùng Thử để kích hoạt chế độ dùng thử 3 ngày miễn phí (0 đ).

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build` tại `project/MT_GRMS_FRONTEND`:
  - `tsc -b && vite build` -> Thành công 100% (0 errors, 2572 modules transformed, built in 1.47s).

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Trải nghiệm người dùng**: Giao diện hiển thị 3 thẻ rõ ràng, trực quan, hỗ trợ khách hàng đăng ký trải nghiệm ngay với 1 cú click.
