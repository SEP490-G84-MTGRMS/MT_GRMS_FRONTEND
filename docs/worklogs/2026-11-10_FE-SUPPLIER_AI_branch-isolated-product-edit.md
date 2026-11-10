# Worklog: Cô Lập Chỉnh Sửa Điều Khoản Cung Ứng Theo Chi Nhánh & Tùy Chọn Lưu Trên Chi Nhánh Tổng

**Ngày thực hiện**: 2026-11-10  
**Người thực hiện**: AI Coding Assistant  
**Mã Task/Feature**: FE-SUPPLIER (Branch-Isolated Supplier Product Terms & Main Branch Dual Save Options)  
**Phạm vi**:  
- `project/MT_GRMS_FRONTEND/src/features/supplier/components/products/EditSupplierProductModal.tsx`  
- `project/MT_GRMS_FRONTEND/src/features/supplier/components/detail/SupplierProductsTab.tsx`  

---

## 1. Mục đích (Why)
- **Vấn đề**:
  1. Khi chỉnh sửa điều khoản cung ứng (Trạng thái Mở/Đóng, Giá nhập, MOQ, Thiếu cho phép) tại một chi nhánh cụ thể, thao tác lưu trước đó làm thay đổi trên toàn bộ hệ thống và các chi nhánh khác.
  2. Khi đang ở **Chi nhánh tổng (`Toàn hệ thống`)** hoặc **Chi nhánh chính**, người dùng cần có 2 tùy chọn lưu rõ ràng:
     - **Lưu Thay Đổi**: Chỉ lưu trên thông tin chi nhánh chính / chi nhánh tổng đang xem, giữ nguyên điều khoản của các chi nhánh khác.
     - **Lưu thay đổi trên các chi nhánh khác**: Lưu thông tin trên chi nhánh chính và đồng bộ áp dụng sang tất cả các chi nhánh khác trong chuỗi.

---

## 2. Chi tiết thay đổi (What)

### `src/features/supplier/components/products/EditSupplierProductModal.tsx`
- Định nghĩa kiểu `SaveSupplierProductScope = "CURRENT_ONLY" | "ALL_BRANCHES"`.
- Giữ nguyên bộ trường chuẩn của Modal "Chỉnh sửa điều khoản cung ứng" (`Nhà cung cấp`, `Sản phẩm`, `SKU`, `Barcode`, `Đơn vị tính`, `Trạng thái` Mở/Đóng, `Giá nhập`, `MOQ`, `Thiếu cho phép`) trên mọi ngữ cảnh.
- Nhận diện ngữ cảnh `isMainOrTotalBranch` (`branchId === "ALL"`, `isHeadquarter === true`, hoặc tên chi nhánh chứa `"chi nhánh chính"`):
  - Khi đang ở **Chi nhánh tổng / Chi nhánh chính**: Hiển thị 2 nút lưu cạnh nút `Hủy Bỏ`:
    1. **`Lưu thay đổi trên các chi nhánh khác`** (`scope = "ALL_BRANCHES"`).
    2. **`Lưu Thay Đổi`** (`scope = "CURRENT_ONLY"`, chỉ lưu trên thông tin chi nhánh chính).
  - Khi đang ở **Chi nhánh phụ**: Chỉ hiển thị `Hủy Bỏ` và `Lưu Thay Đổi` (chỉ lưu riêng cho chi nhánh đang chọn).

### `src/features/supplier/components/detail/SupplierProductsTab.tsx`
- Quản lý trạng thái điều khoản cung ứng theo từng chi nhánh (`branchTermsMap` lưu tại `localStorage` key `mtgrms_supplier_product_branch_terms_v1`) kết hợp với API Backend (`supplierProductApi` và `storeProductApi`).
- Hàm `getEffectiveTerms(item, targetBranchId)` trả về bộ giá trị hiệu lực (`agreedPrice`, `moq`, `allowedShortageQty`, `status`) của từng chi nhánh mà không làm ảnh hưởng chéo giữa các chi nhánh.
- Cập nhật `handleSaveEdit(input, scope)`:
  - Với `scope === "CURRENT_ONLY"`: Trước khi ghi đè giá trị cho chi nhánh hiện tại (`ALL` hoặc `branchId`), hệ thống tự động bảo toàn `defaultTerms` gốc cho các chi nhánh khác chưa chỉnh sửa. Nếu là chi nhánh phụ, gọi `storeProductApi.toggleStatus` cho riêng chi nhánh đó; nếu là chi nhánh chính/tổng, cập nhật thông tin gốc mà không ghi đè cấu hình của các chi nhánh khác.
  - Với `scope === "ALL_BRANCHES"`: Cập nhật `supplierProductApi.updateProduct` & `toggleStatus`, đồng bộ trạng thái qua tất cả chi nhánh (`storeProductApi.getStoreSummaries` + `toggleStatus`), và cập nhật `defaultTerms` áp dụng cho toàn bộ các chi nhánh.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **API tương tác**:
  - `PUT /api/suppliers/{supplierId}/products/{productId}`
  - `PATCH /api/suppliers/{supplierId}/products/{productId}/status`
  - `PATCH /api/branches/{branchId}/products/{productId}/status`
- **Breaking changes**: Không có.

---

## 4. Kết quả kiểm thử (Verification)
- **Unit & Integration Tests**: 73/73 tests trong `src/features/supplier/` -> **PASSED**.
- **Build Verification**: `npm run build` (`tsc -b && vite build`) thành công 100%.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Files Manager cần lưu tâm**:
  - `src/features/supplier/components/products/EditSupplierProductModal.tsx`
  - `src/features/supplier/components/detail/SupplierProductsTab.tsx`
- **Các bước hậu merge**: Không cần chạy migration.
