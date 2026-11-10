# Worklog: Lược Bỏ Mã Cửa Hàng & Cửa Hàng Và Lọc Danh Sách Sản Phẩm Theo Header Branch Dropdown

**Ngày thực hiện**: 2026-11-10  
**Người thực hiện**: AI Coding Assistant  
**Mã Task/Feature**: FE-PRODUCT (Filter Store Products by Header Branch Dropdown & Remove Redundant Store Columns)  
**Phạm vi**:  
- `project/MT_GRMS_FRONTEND/src/features/product/pages/StoreProductManagementPage.tsx`  
- `project/MT_GRMS_FRONTEND/src/features/product/components/StoreProductFilterBar.tsx`  
- `project/MT_GRMS_FRONTEND/src/features/product/components/StoreProductTable.tsx`  

---

## 1. Mục đích (Why)
- **Vấn đề**: Màn hình **"Sản Phẩm Theo Cửa Hàng / Chi Nhánh"** (`/store-owner/stores/products`) đang có 2 ô lọc (`Mã cửa hàng`, `Cửa hàng`) và 2 cột hiển thị (`MÃ CỬA HÀNG`, `CỬA HÀNG`) bị dư thừa trong khi trên thanh Header đã có sẵn Dropdown chọn Chi nhánh (`Toàn hệ thống` / từng Chi nhánh cụ thể).
- **Giải pháp**:
  1. **Lược bỏ ô lọc & cột `Mã cửa hàng` và `Cửa hàng`**:
     - Xóa 2 ô lọc `Mã cửa hàng` (`storeCode`) và `Cửa hàng` (`storeName`) trong `StoreProductFilterBar.tsx`. Hàng 1 của thanh bộ lọc giờ bố trí cân đối 4 ô: `Mã SKU`, `Tên sản phẩm`, `Mã NCC`, `Nhà cung cấp`.
     - Xóa 2 cột `MÃ CỬA HÀNG` và `CỬA HÀNG` trong `StoreProductTable.tsx`, giúp bảng dữ liệu rộng rãi và dễ đọc hơn.
  2. **Lọc danh sách sản phẩm trực tiếp theo Dropdown Chi nhánh trên Header (`StoreProductManagementPage.tsx`)**:
     - Tự động đọc chi nhánh đang chọn từ `localStorage` (`mtgrms_active_branch`) và lắng nghe sự kiện `mtgrms:branch-changed` để cập nhật `appliedFilters.storeId` (`'ALL'` hoặc `branch.id`) và tải lại danh sách sản phẩm.
     - Hiển thị huy hiệu ngữ cảnh chi nhánh ngay cạnh tiêu đề trang (`Toàn hệ thống` hoặc `Chi nhánh: <Tên chi nhánh>` kèm nút chuyển nhanh `(Xem toàn hệ thống)`).

---

## 2. Chi tiết thay đổi (What)

### `src/features/product/components/StoreProductFilterBar.tsx`
- Loại bỏ `'storeCode'` và `'storeName'` khỏi `FieldKey` và mảng `FIELDS`.
- Đưa 4 ô lọc `Mã SKU`, `Tên sản phẩm`, `Mã NCC`, `Nhà cung cấp` lên cùng 1 dòng lưới 4 cột (`repeat(4, 1fr)`), dòng dưới hiển thị `Trạng thái` và nút `Tìm kiếm` / `Đặt lại`.

### `src/features/product/components/StoreProductTable.tsx`
- Loại bỏ 2 cột `MÃ CỬA HÀNG` và `CỬA HÀNG` khỏi `<thead>`, `<tbody>`, `<colgroup>` và `SortField`.
- Tinh chỉnh lại độ rộng `<colgroup>` cho 12 cột còn lại.

### `src/features/product/pages/StoreProductManagementPage.tsx`
- Thêm state `activeBranch` khởi tạo từ `getStoredActiveBranch()` và đồng bộ tức thời qua sự kiện `mtgrms:branch-changed` & `storage`.
- Tự động truyền `storeId: activeBranch.id || 'ALL'` vào `appliedFilters` để `storeProductApi.getStoreProducts` trả về đúng danh sách sản phẩm của chi nhánh được chọn trên Header.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **API tương tác**: `GET /api/branches/products` (hoặc `/api/branches/{storeId}/products` thông qua `storeProductApi.getStoreProducts`).
- **Breaking changes**: Không có.

---

## 4. Kết quả kiểm thử (Verification)
- **Unit & Integration Tests**: 60/60 tests trong `src/features/product/` -> **PASSED**.
- **Build Verification**: `npm run build` (`tsc -b && vite build`) thành công 100%.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Files Manager cần lưu tâm**:
  - `src/features/product/pages/StoreProductManagementPage.tsx`
  - `src/features/product/components/StoreProductFilterBar.tsx`
  - `src/features/product/components/StoreProductTable.tsx`
- **Các bước hậu merge**: Không cần migrate DB.
