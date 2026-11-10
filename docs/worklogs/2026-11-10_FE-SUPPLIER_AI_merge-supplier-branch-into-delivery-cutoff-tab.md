# Worklog: Hợp Nhất Màn Hình "Cửa Hàng Với Nhà Cung Cấp" Vào Tab "Giao Hàng & Cutoff" Kết Hợp Dropdown Chi Nhánh Trên Header

**Ngày thực hiện**: 2026-11-10  
**Người thực hiện**: AI Coding Assistant  
**Mã Task/Feature**: FE-SUPPLIER (Merge Supplier-Branch Assignment into Delivery & Cutoff Tab)  
**Phạm vi**:  
- `project/MT_GRMS_FRONTEND/src/features/supplier/components/detail/SupplierDeliveryConfigTab.tsx`  
- `project/MT_GRMS_FRONTEND/src/features/supplier/pages/SupplierDetailPage.tsx`  
- `project/MT_GRMS_FRONTEND/src/features/supplier/pages/SupplierListPage.tsx`  
- `project/MT_GRMS_FRONTEND/src/features/product/pages/StoreProductManagementPage.tsx`  
- `project/MT_GRMS_FRONTEND/src/layouts/StoreOwnerLayout/AppTopNav.tsx`  
- `project/MT_GRMS_FRONTEND/src/app/router.tsx`  
- `project/MT_GRMS_FRONTEND/src/features/supplier/__tests__/SupplierListPage.test.tsx`  

---

## 1. Mục đích (Why)
- **Vấn đề**: Màn hình độc lập **"Cửa Hàng với nhà cung cấp"** (`/store-owner/suppliers/branches`) chứa cấu hình trạng thái cung ứng và ngày giao hàng theo thứ của nhà cung cấp cho từng chi nhánh, bị trùng lặp nghiệp vụ với tab **"Giao hàng & Cutoff"** bên trong màn hình Chi tiết Nhà cung cấp.
- **Giải pháp**:
  1. **Lược bỏ màn hình độc lập "Cửa Hàng với nhà cung cấp"**:
     - Xóa mục menu `"Cửa Hàng với nhà cung cấp"` trong menu `Nhập hàng` (`AppTopNav.tsx`).
     - Xóa nút `"Gán NCC với Cửa hàng"` trên thanh công cụ của `SupplierListPage.tsx` và `StoreProductManagementPage.tsx`.
     - Chuyển hướng các route `/store-owner/suppliers/branches` và `/store-owner/suppliers/:id/branches` về `/store-owner/suppliers` trong `router.tsx`.
  2. **Hợp nhất vào tab "Giao hàng & Cutoff" (`SupplierDeliveryConfigTab.tsx`) kết hợp với Dropdown Chi nhánh trên Header**:
     - Tự động lắng nghe sự kiện đổi chi nhánh từ Header Dropdown (`mtgrms:branch-changed`, `localStorage`).
     - Hiển thị badge chi nhánh đang chọn (`Toàn hệ thống` hoặc `Chi nhánh: <Tên chi nhánh>` kèm nút chuyển nhanh `(Xem toàn hệ thống)`).
     - Khi chọn một chi nhánh cụ thể trên Header:
       - Tải thông tin phân bổ của NCC tại chi nhánh đó qua `supplierBranchApi.getBranchAssignments`.
       - Hiển thị mục **"Trạng thái tại chi nhánh"** (Toggle `Mở` / `Đóng` kèm ô nhập lý do tạm ngưng khi Đóng) và nút **"Gán NCC vào chi nhánh này"** nếu chi nhánh chưa được phân bổ.
       - Cho phép cấu hình riêng **Các ngày giao hàng trong tuần**, **MOQ**, **Số ngày chốt đơn**, **Giờ Cutoff** và **Chính sách chỉnh sửa PO** cho từng chi nhánh mà không làm ảnh hưởng tới chi nhánh khác.
     - Khi đang ở **Chi nhánh tổng (`Toàn hệ thống`)** hoặc **Chi nhánh chính**:
       - Có nút **`Lưu Cấu Hình Giao Hàng & Cutoff`** (chỉ lưu cho chi nhánh hiện tại) và nút **`Lưu thay đổi trên các chi nhánh khác`** (đồng bộ ngày giao & cấu hình Cutoff sang tất cả các chi nhánh).

---

## 2. Chi tiết thay đổi (What)

### `src/features/supplier/components/detail/SupplierDeliveryConfigTab.tsx`
- Lắng nghe `mtgrms:branch-changed` và `storage` event để đồng bộ `activeBranch` với Header Dropdown.
- Tích hợp `supplierBranchApi.getBranchAssignments`, `assignSuppliersToBranch`, `updateAssignmentDeliveryDays`, `updateAssignmentStatus`.
- Bổ sung khối UI **Trạng thái tại chi nhánh** (`StatusToggle` + lý do tạm ngưng) khi đang chọn một chi nhánh trên Header.
- Hỗ trợ lưu tách biệt theo từng chi nhánh (`CURRENT_ONLY`) hoặc đồng bộ toàn chuỗi (`ALL_BRANCHES` từ chi nhánh tổng/chi nhánh chính).

### `src/layouts/StoreOwnerLayout/AppTopNav.tsx`, `src/features/supplier/pages/SupplierListPage.tsx`, `src/features/product/pages/StoreProductManagementPage.tsx`, `src/app/router.tsx`
- Gỡ bỏ hoàn toàn các liên kết điều hướng tới màn hình `/store-owner/suppliers/branches` cũ và redirect an toàn về `/store-owner/suppliers`.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **API tương tác**:
  - `GET /api/suppliers/branch-assignments`
  - `POST /api/suppliers/branch-assignments/batch-to-branch`
  - `PATCH /api/suppliers/{supplierId}/branches/{branchId}/delivery-days`
  - `PATCH /api/suppliers/{supplierId}/branches/{branchId}/status`
  - `PUT /api/suppliers/{supplierId}/delivery-config`
- **Breaking changes**: Không có. Các URL cũ tự động redirect về `/store-owner/suppliers`.

---

## 4. Kết quả kiểm thử (Verification)
- **Unit & Integration Tests**: 73/73 tests trong `src/features/supplier/` -> **PASSED**.
- **Build Verification**: `npm run build` (`tsc -b && vite build`) thành công 100%.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Files Manager cần lưu tâm**:
  - `src/features/supplier/components/detail/SupplierDeliveryConfigTab.tsx`
  - `src/layouts/StoreOwnerLayout/AppTopNav.tsx`
  - `src/app/router.tsx`
- **Các bước hậu merge**: Không cần migrate DB.

