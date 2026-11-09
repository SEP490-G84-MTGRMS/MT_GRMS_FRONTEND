# Worklog: Fix Register API Response Unwrapping and TenantId Undefined Error

- **Task/Feature**: FE-AUTH
- **Author**: AI Coding Assistant
- **Date**: 2026-11-05
- **Branch**: `feature/login-screen`

---

## 1. Mục đích (Why)
- **Vấn đề**: Khi người dùng đăng ký mở cửa hàng thành công trên màn hình Frontend, Backend API (`POST /api/v1/auth/register`) trả về HTTP 200 OK với cấu trúc bọc `ApiResponse<LoginResponse>`: `{ success: true, data: { accessToken, user } }`.
- Tuy nhiên trong `authService.ts`, hàm `register()` thực hiện `return response.data` (trả về toàn bộ object ApiResponse thay vì trích xuất `.data`).
- Khi `RegisterPage.tsx` gọi `setAuth(res.user, res.accessToken)`, `res.user` bị `undefined`. Trong `useAuthStore.ts`, dòng lệnh kiểm tra `if (user.tenantId)` quăng lỗi JavaScript runtime:
  `TypeError: Cannot read properties of undefined (reading 'tenantId')`.

---

## 2. Chi tiết thay đổi (What & Where)

### A. Chuẩn hóa trích xuất Response (`src/features/auth/authService.ts`)
- Tích hợp hàm `unwrapLogin(response.data)` và fallback trích xuất `response.data?.data || response.data` cho hàm `register()`.
- Ánh xạ chính xác `user` từ Backend về kiểu `UserProfile` tương thích toàn bộ hệ thống Frontend.
- Lưu trữ `tenant_id` vào `localStorage`.
- Bắt lỗi chính xác từ Backend (nếu trùng số điện thoại/email hoặc lỗi validation 400 Bad Request) để hiển thị thông báo thân thiện từ server thay vì lỗi kỹ thuật.

### B. Phòng thủ an toàn dữ liệu Auth Store (`src/stores/useAuthStore.ts`)
- Thêm kiểm tra an toàn `if (user)` trước khi truy cập `user.tenantId`.
- Đảm bảo `setAuth` không bao giờ sập ứng dụng kể cả khi tham số truyền vào bị null/undefined.

---

## 3. Kết quả kiểm thử (Verification)
- `npm run build`: Succeeded (TypeScript compilation pass, Vite bundle pass in 1.63s).
- Kiểm tra kiểu dữ liệu và luồng đăng nhập tự động sau khi đăng ký: Khớp 100% với DTO trả về từ Backend.

---

## 4. Ghi chú cho Manager khi Review & Merge
- **Mức độ rủi ro**: Rất thấp (Low).
- **Phạm vi tác động**: Chỉ sửa đổi hàm giải nén response đăng ký tại `authService.ts` và bảo vệ null-safety tại `useAuthStore.ts`.

