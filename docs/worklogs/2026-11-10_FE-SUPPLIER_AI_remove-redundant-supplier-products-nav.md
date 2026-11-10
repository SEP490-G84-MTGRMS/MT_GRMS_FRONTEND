# Worklog: Lược bỏ màn hình / nút điều hướng dư thừa "Sản Phẩm Theo Nhà Cung Cấp"

- **Ngày thực hiện**: 2026-11-10
- **Mã Task**: FE-SUPPLIER
- **Tác giả**: AI Assistant
- **Dự án**: `project/MT_GRMS_FRONTEND`

---

## 1. Mục đích (Why)
Sau khi tab **"Sản phẩm cung cấp"** được tích hợp trực tiếp bên trong màn hình **Chi tiết Nhà Cung Cấp** (`SupplierDetailPage.tsx`), người dùng có thể tra cứu, quản lý bảng giá nhập, MOQ và gán sản phẩm trực tiếp cho từng nhà cung cấp.
Do đó, các nút bấm và menu điều hướng độc lập đến trang tổng hợp "Sản phẩm theo NCC" trước đây trở nên thừa thãi, gây phân mảnh trải nghiệm người dùng và làm rối thanh tác vụ.

Yêu cầu thực hiện:
- Lược bỏ nút liên kết "Sản phẩm theo NCC" trên thanh tác vụ của trang **Quản lý Nhà Cung Cấp** (`SupplierListPage.tsx`).
- Lược bỏ các nút liên kết tương ứng trên trang **Gán NCC với Cửa hàng** (`SupplierBranchManagementPage.tsx`) và **Sản phẩm theo Cửa hàng** (`StoreProductManagementPage.tsx`).
- Tinh gọn menu điều hướng `AppTopNav.tsx` và `StoreOwnerTopbar.tsx` (loại bỏ mục "Sản phẩm theo NCC").
- Cấu hình điều hướng chuyển tiếp (Navigate redirect) an toàn trên Router (`router.tsx`) từ `/store-owner/suppliers/products` về `/store-owner/suppliers`.

---

## 2. Danh sách file & Nội dung đã sửa (What)

1. **`src/features/supplier/pages/SupplierListPage.tsx`**:
   - Loại bỏ nút `<Link to="/store-owner/suppliers/products">` ("Sản phẩm theo NCC") khỏi thanh `so-list-header-actions`.
   - Dọn dẹp import `Package` không còn sử dụng.
2. **`src/features/supplier/pages/SupplierBranchManagementPage.tsx`**:
   - Loại bỏ nút `<Link to="/store-owner/suppliers/products">` khỏi thanh hành động.
   - Dọn dẹp import `Package`.
3. **`src/features/product/pages/StoreProductManagementPage.tsx`**:
   - Loại bỏ nút `<Link to="/store-owner/suppliers/products">` khỏi thanh thao tác.
4. **`src/layouts/StoreOwnerLayout/AppTopNav.tsx`**:
   - Lược bỏ mục `Sản phẩm theo NCC` và `Thiết lập bảng giá` khỏi nhóm menu "Danh mục & Mặt hàng" của Cổng quản trị.
5. **`src/layouts/StoreOwnerLayout/StoreOwnerTopbar.tsx`**:
   - Loại bỏ `NavLink` "Sản phẩm NCC" và dọn dẹp import `PackageIcon`.
6. **`src/app/router.tsx`**:
   - Đổi route `suppliers/products` và `suppliers/:id/products` thành `<Navigate to="/store-owner/suppliers" replace />` để chuyển tiếp người dùng mượt mà về trang quản lý NCC.
   - Dọn dẹp import `SupplierProductManagementPage`.
7. **`src/features/supplier/__tests__/SupplierListPage.test.tsx`**:
   - Cập nhật test case TC-01 để kiểm tra nút "Sản phẩm theo NCC" đã được gỡ bỏ khỏi header.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **Tối ưu UX**: Giữ giao diện tập trung, đưa luồng thao tác sản phẩm về đúng ngữ cảnh của từng nhà cung cấp.
- **An toàn định tuyến**: Không gây lỗi 404 cho bất kỳ liên kết cũ hay lịch sử duyệt web nào thông qua `Navigate replace`.
- **Breaking Changes**: Không có.

---

## 4. Kết quả kiểm thử (Verification)
- `npm run build`: Compile TypeScript và đóng gói Vite thành công (`0 errors`).
- `npm test -- --run src/features/supplier`: **6/6 test suites passed, 73/73 tests passed**.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: **Low** (Chỉ tinh gọn UI navigation, không thay đổi core logic hay API contract).
- **Files cần lưu tâm**:
  - `src/features/supplier/pages/SupplierListPage.tsx`
  - `src/layouts/StoreOwnerLayout/AppTopNav.tsx`
  - `src/app/router.tsx`
- **Các bước hậu merge**: Không cần thao tác gì thêm.
