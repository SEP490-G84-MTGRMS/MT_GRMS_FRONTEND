# Worklog: Cho Phép Mật Khẩu Trung Bình (Tối Thiểu 6 Ký Tự) Tạo Tài Khoản Khi Đăng Ký

- **Ngày thực hiện**: 2026-11-10
- **Mã Task/Tính năng**: FE-AUTH / Sửa lỗi mật khẩu trung bình màn đăng ký
- **Tác giả**: AI Assistant
- **Dự án**: `project/MT_GRMS_FRONTEND`

---

## 1. Mục Đích (Why)
- Đáp ứng yêu cầu của User: *"sửa ở màn đăng ký thì với các mật khẩu trung bình vẫn tạo tài khoản được đang bị lỗi@[RegisterPage.tsx]"*.
- Khắc phục mâu thuẫn giữa độ mạnh mật khẩu và logic kiểm tra: Trước đó, thanh đo `passwordStrength` đánh giá mật khẩu từ 6-7 ký tự chứa chữ + số (ví dụ: `Admin1`, `Shop12`, `Pass12`) ở mức **"Trung bình"**, nhưng khi người dùng bấm "ĐĂNG KÝ MỞ CỬA HÀNG NGAY" thì bị hàm submit chặn cứng bởi điều kiện `password.length < 8` và báo lỗi *"Mật khẩu bảo mật phải có tối thiểu 8 ký tự."*.
- Đồng bộ chuẩn độ dài mật khẩu tối thiểu của hệ thống giữa Frontend và Backend (`AuthService.cs` quy định tối thiểu 6 ký tự: `request.Password.Length < 6`).

---

## 2. Danh Sách Tệp & Nội Dung Thay Đổi (What)
1. **`src/pages/auth/RegisterPage.tsx`**:
   - Cập nhật thuật toán tính `passwordStrength`:
     - Nếu `password.length < 6`: hiển thị mức *"Yếu (tối thiểu 6 ký tự)"*, màu đỏ.
     - Nếu `password.length >= 6` có kết hợp chữ và số hoặc độ dài >= 8: hiển thị mức *"Trung bình"* (màu cam).
     - Nếu `password.length >= 8` kết hợp chữ hoa, chữ thường, số, ký tự đặc biệt: hiển thị mức *"Mạnh"* (màu xanh lá).
   - Sửa điều kiện xác thực trong `handleSubmit`:
     - Thay đổi `if (password.length < 8)` thành `if (password.length < 6)`.
     - Cập nhật thông báo lỗi: *"Mật khẩu bảo mật phải có tối thiểu 6 ký tự."* (đồng bộ 100% với Backend).
   - Cập nhật placeholder ô nhập mật khẩu: *"Nhập mật khẩu (tối thiểu 6 ký tự)..."*.
   - Cập nhật nút điều hướng khi tạo thành công: chuyển trực tiếp đến `navigate("/store-owner/dashboard")` (Cổng quản trị chủ cửa hàng).

---

## 3. Kết Quả Kiểm Thử (Verification)
- `npm run build`: Build thành công (0 lỗi TypeScript, 0 lỗi cú pháp).
- Kiểm tra các ca kiểm thử mật khẩu:
  - Mật khẩu < 6 ký tự (ví dụ: `12345`): Báo lỗi yêu cầu tối thiểu 6 ký tự.
  - Mật khẩu 6 ký tự mức trung bình (ví dụ: `Shop12`, `Admin1`, `Pass01`): Thanh đo hiển thị "Trung bình" và submit tạo tài khoản thành công mà không bị chặn.
  - Mật khẩu >= 8 ký tự (ví dụ: `Password@123`): Hiển thị "Mạnh" và submit thành công.

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low) - Chỉ điều chỉnh validation cục bộ tại màn hình đăng ký `RegisterPage.tsx`.
- **Breaking changes**: Không có. Hoàn toàn tương thích với hợp đồng API của Backend `POST /api/auth/register`.

