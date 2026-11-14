# Worklog: Cập Nhật Nhận Diện Thương Hiệu THViet Cho Toàn Bộ Giao Diện Frontend

- **Ngày thực hiện**: 2026-11-13
- **Mã Task/FE**: FE-BRAND
- **Tác giả**: AI Assistant
- **Mức độ rủi ro**: Low (Chỉ thay đổi hiển thị logo và tiêu đề trang theo thương hiệu mới)

---

## 1. Mục đích (Why)
- Thay đổi nhận diện thương hiệu hiển thị từ **MT-GRMS** sang thương hiệu chính thức: **THViet - QUẢN LÝ TẠP HÓA VIỆT** theo đúng Brand Guidelines (bảng màu `#0F766E`, `#14B8A6`, `#0F172A`, `#DC2626`).
- Tích hợp bộ logo chính thức đã được bổ sung vào thư mục `public/logo/` (`logo1.png`, `logo2png.png`, `logo3.png`, `logo4.png`).

---

## 2. Chi Tiết Tệp Đã Sửa (What)

### 1. `index.html`
- Cập nhật favicon sang `/logo/logo2png.png` (icon vuông 1:1 chuẩn ứng dụng).
- Đổi tiêu đề trang `<title>` thành `THViet - Phần Mềm Quản Lý Tiệm Tạp Hóa Bán Lẻ Dễ Dùng Nhất`.

### 2. `src/pages/HomePage/components/Navbar.tsx` & `src/styles/landing.css`
- Sử dụng logo cắt sát lề `public/logo/thviet_logo_horizontal.png` loại bỏ khoảng trống thừa để tăng độ lớn và độ sắc nét.
- Thiết lập `.brand-logo-img` với chiều cao 52px trên desktop (42px mobile) giúp logo nổi bật và dễ đọc slogan "QUẢN LÝ TẠP HÓA VIỆT".

### 3. `src/pages/HomePage/components/Footer.tsx`
- Tăng kích thước logo Footer lên `height: 68px` (chiều rộng tương ứng ~220px) cho tỷ lệ cân xứng với cột thương hiệu.
- Xóa ký tự thừa rác `x` dưới mục "Câu hỏi thường gặp".
- Cập nhật bản quyền: `© 2026 THViet (SEP490-G84). Trường Đại học FPT Hà Nội.`
- Cập nhật đoạn mô tả: *"Hệ thống quản lý tạp hóa bán lẻ đa chi nhánh THViet chuyên biệt 100% cho tiệm tạp hóa gia đình và siêu thị mini."*

### 4. `src/layouts/StoreOwnerLayout/AppTopNav.tsx`
- Sử dụng `public/logo/logo3.png` (logo phiên bản nền xanh/nền tối) hiển thị sắc nét trên thanh điều hướng chính `topnav-primary`.
- Cập nhật thông báo hỗ trợ CSKH: *"Tổng đài hỗ trợ THViet: 1900 6522"*.
- Dọn dẹp thành phần `BrandLogo` SVG không còn dùng.

### 5. `src/layouts/MasterLayout.tsx` & `src/layouts/AdminLayout/AdminSidebar.tsx`
- Cập nhật tên thương hiệu `THViet` (kết hợp màu `#0F766E` và `#14B8A6`) cùng subtitle `Quản lý Tạp Hóa Việt`.

---

## 3. Kết Quả Kiểm Thử (Verification)
- Chạy lệnh build: `npm run build` $\rightarrow$ **Thành công (✓ built in 1.32s)**, 0 lỗi TypeScript.

---

## 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- Rủi ro: Thấp.
- File cần review: Các file layout và header/footer đã chỉnh sửa.

