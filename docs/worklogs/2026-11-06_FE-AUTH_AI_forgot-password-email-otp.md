# Worklog: Khắc Phục UI Stepper & Tích Hợp Xác Thực OTP Khôi Phục Mật Khẩu

- **Mã Task/Tính năng**: `FE-AUTH` (Forgot Password Email OTP Flow & Stepper UI)
- **Người thực hiện**: AI Coding Agent & @Ortus24
- **Ngày thực hiện**: 2026-11-06
- **Trạng thái**: Hoàn thành (Verification Pass 100%)

---

## 1. Mục Đích (Why)
- Sửa lỗi giao diện thanh tiến trình (Stepper) 3 bước (`1. Nhập Email` -> `2. Mã OTP` -> `3. Mật khẩu mới`) trên màn hình `ForgotPasswordPage.tsx` bị vỡ layout, hiển thị dọc và ngắt quãng bằng các đường kẻ ngang tràn khung.
- Chuẩn hóa layout thanh tiến trình ngang, căn giữa hoàn hảo với đường line nối tâm giữa các vòng tròn số bước theo chuẩn nhận diện Deep Teal (`#0F766E`) của MT-GRMS.
- Bổ sung icon `Check` khi hoàn thành từng bước xác thực và đồng bộ API endpoint `/api/auth/...`.

---

## 2. Danh Sách File & Nội Dung Đã Sửa (What)

### `src/pages/auth/ForgotPasswordPage.tsx`
- Import icon `Check` từ `lucide-react`.
- Thay thế các khối divider inline style tạm bợ bằng class `.auth-step-divider` tái sử dụng.
- Cập nhật hiển thị vòng tròn số bước: hiển thị icon tick xanh `Check` khi bước đã hoàn thành (`currentStep > 1`, `currentStep > 2`) và số thứ tự khi đang ở bước hiện tại.

### `src/styles/auth.css`
- Thêm và hoàn thiện toàn bộ bộ CSS classes cho thanh tiến trình xác thực:
  - `.auth-steps-progress`: `display: flex !important`, `flex-direction: row !important`, `align-items: flex-start !important`, `justify-content: space-between !important`.
  - `.auth-step-item`: `display: flex !important`, `flex-direction: column !important`, `align-items: center !important`, `min-width: 68px !important`.
  - `.auth-step-circle`: Vòng tròn kích thước 32x32px bo tròn 50%, font đậm 700, hỗ trợ trạng thái `active` (viền tỏa sáng Deep Teal `#0F766E`) và `completed`.
  - `.auth-step-label`: Label chữ 12px xám/chủ đạo đặt dưới vòng tròn số.
  - `.auth-step-divider`: Đường line dày 2px với `margin-top: 15px !important` căn chuẩn xác ngang tâm vòng tròn 32px.

---

## 3. Chi Tiết Kỹ Thuật (Technical Highlights)
- **Độ chính xác layout**: Do vòng tròn cao 32px (tâm ở 16px), đường line divider có độ dày 2px được đặt `margin-top: 15px`, giúp nối chính xác tuyệt đối từ tâm vòng tròn này sang tâm vòng tròn kia mà không bị lệch xuống dưới label chữ.
- **Tính phản hồi (Responsiveness)**: Container hỗ trợ `width: 100%`, divider có `flex: 1` co giãn linh hoạt theo chiều rộng của khung card đăng nhập/quên mật khẩu.

---

## 4. Kết Quả Kiểm Thử (Verification)
- **Frontend Build (`npm run build`)**: Thành công 100% (2548 modules transformed, 0 lỗi TypeScript, 0 lỗi CSS).
- **Backend Unit Tests (`dotnet test`)**: 18/18 tests trong `UserAuthenticationTests` đạt PASS 100%.

---

## 5. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low) — Chỉ tác động đến CSS layout của Stepper và render component `ForgotPasswordPage.tsx`.
- **Thao tác hậu merge**: Không cần chạy thêm script hay migration database.

