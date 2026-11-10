# Worklog: Cô Lập Trạng Thái & Giá Sản Phẩm Khi Chỉnh Sửa Tại Từng Chi Nhánh Riêng Biệt

**Ngày thực hiện**: 2026-11-10  
**Người thực hiện**: AI Coding Assistant  
**Mã Task/Feature**: FE-SUPPLIER (Branch-Isolated Product Edit & Status Toggle)  
**Phạm vi**:  
- `project/MT_GRMS_FRONTEND/src/features/supplier/components/products/EditSupplierProductModal.tsx`  
- `project/MT_GRMS_FRONTEND/src/features/supplier/components/detail/SupplierProductsTab.tsx`  

---

## 1. Mục đích (Why)
- **Vấn đề**: Khi người dùng đang chọn một chi nhánh cụ thể (ví dụ: "Siêu Thị Mini MT-Grocery (Cầu Giấy)") trên Topbar Dropdown và mở modal "Chỉnh sửa điều khoản cung ứng" (`EditSupplierProductModal`), thao tác gạt switch Enable/Disable hoặc sửa giá trong modal trước đây lại gọi `supplierProductApi.updateProduct` và `supplierProductApi.toggleStatus`. Điều này vô tình làm thay đổi giá nhập sỉ và trạng thái cung ứng của toàn bộ chuỗi hệ thống (Toàn hệ thống và tất cả các chi nhánh khác đều bị ảnh hưởng).
- **Giải pháp**:
  - Nhận diện ngữ cảnh chi nhánh đang chọn (`branchContext`).
  - Khi đang lọc theo một chi nhánh cụ thể (`activeBranch.id !== 'ALL'`):
    - Modal tự động chuyển sang chế độ **"Chỉnh sửa sản phẩm tại chi nhánh"** có badge xanh tên chi nhánh rõ ràng.
    - Switch trạng thái thể hiện và cập nhật riêng cho chi nhánh đó (`BranchProduct.Status` qua `storeProductApi.toggleStatus`).
    - Ô nhập giá cho phép sửa **Giá bán lẻ tại chi nhánh** (`retailPrice` qua `storeProductApi.updateProduct`) và hiển thị giá sỉ NCC làm thông tin tham khảo (readonly).
    - Hoàn toàn **KHÔNG gọi `supplierProductApi`**, bảo đảm chi nhánh tổng và các chi nhánh khác giữ nguyên 100%.
  - Khi chọn "Toàn hệ thống" (`activeBranch.id === 'ALL'`): Giữ nguyên cơ chế cập nhật điều khoản cung ứng NCC cấp toàn chuỗi.
  - Cập nhật hiển thị cột Trạng thái trên bảng theo trạng thái riêng của chi nhánh (`branchInfo.status`) thay vì trạng thái cấp chuỗi.

---

## 2. Chi tiết thay đổi (What)

### `src/features/supplier/components/products/EditSupplierProductModal.tsx`
- Bổ sung props `branchContext?: BranchContextInfo | null` và callback `onSaveBranchProduct`.
- Trong `EditSupplierProductForm`:
  - Khởi tạo `isActive` theo `branchInfo.status === 'Active'` khi ở chế độ chi nhánh.
  - Khởi tạo `branchRetailPrice` theo `branchInfo.retailPrice` của chi nhánh.
  - Thay đổi giao diện:
    - Header hiển thị icon `Store` kèm badge `Chi nhánh: {branchName}` và dòng chú thích rõ: "Chỉ cập nhật giá bán & trạng thái tại {branchName}, không ảnh hưởng các chi nhánh khác".
    - Nhãn trạng thái đổi thành "Trạng thái tại CN" kèm ghi chú giải thích.
    - Bố trí ô "Giá bán (CN)" cho phép chỉnh sửa giá niêm yết riêng tại chi nhánh.
    - Hiển thị ô "Giá sỉ từ NCC", "Quy cách NCC (MOQ & thiếu cho phép)" ở dạng readonly tham chiếu.
  - Khi submit: gọi `onSaveBranchProduct(branchId, productId, { retailPrice, status })`.

### `src/features/supplier/components/detail/SupplierProductsTab.tsx`
- Bổ sung handler `handleSaveBranchProduct`:
  - Gọi `storeProductApi.updateProduct(branchId, productId, { retailPrice, status })`.
  - Gọi `storeProductApi.toggleStatus(branchId, productId, status)`.
  - Thông báo toast thành công và refresh `branchProductMap` (`fetchBranchProducts`).
- Bảng danh mục sản phẩm:
  - Cột Giá: đổi tiêu đề thành `GIÁ BÁN (CN) / SỈ` khi đang lọc chi nhánh; hiển thị giá bán lẻ tại chi nhánh nổi bật và dòng giá sỉ NCC nhỏ ở dưới.
  - Cột Trạng thái: hiển thị badge theo `branchInfo.status` của chi nhánh khi đang chọn chi nhánh.
  - Modal: truyền đầy đủ `branchContext` và `onSaveBranchProduct` vào `EditSupplierProductModal`.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **API tương tác**:
  - `PUT /api/branches/{id}/products/{productId}`: Cập nhật giá bán lẻ tại chi nhánh.
  - `PATCH /api/branches/{id}/products/{productId}/status`: Cập nhật trạng thái kinh doanh tại chi nhánh.
- **Breaking changes**: Không có. Chế độ xem toàn hệ thống vẫn hoạt động như cũ.

---

## 4. Kết quả kiểm thử (Verification)
- **Unit & Integration Tests**: 73/73 tests trong `src/features/supplier/` -> **PASSED**.
- **Build Verification**: `npm run build` thành công không lỗi (`tsc -b && vite build`).

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Files Manager cần lưu tâm**:
  - `src/features/supplier/components/products/EditSupplierProductModal.tsx`
  - `src/features/supplier/components/detail/SupplierProductsTab.tsx`
- **Các bước hậu merge**: Không cần migrate DB.
