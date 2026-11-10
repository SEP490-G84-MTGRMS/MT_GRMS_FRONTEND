# Worklog: Đồng bộ & Lọc Danh mục Sản phẩm Nhà Cung Cấp theo Dropdown Chi Nhánh trên Header

**Ngày thực hiện**: 2026-11-10  
**Người thực hiện**: AI Coding Assistant  
**Mã Task/Feature**: FE-SUPPLIER (Supplier Products Branch Filter Synchronization)  
**Phạm vi**: `project/MT_GRMS_FRONTEND/src/features/supplier/components/detail/SupplierProductsTab.tsx`

---

## 1. Mục đích (Why)
- **Vấn đề**: Khi người dùng xem chi tiết Nhà Cung Cấp tại tab "Sản phẩm cung cấp", danh sách sản phẩm hiển thị toàn bộ danh mục sản phẩm của NCC mà không phản ánh ngữ cảnh chi nhánh đang được chọn ở Header Dropdown (`BranchSelectorDropdown`). Người dùng muốn khi đổi chi nhánh ở Header, bảng danh mục sản phẩm của nhà cung cấp sẽ tự động lọc theo chi nhánh đó hoặc hiển thị đầy đủ khi chọn "Toàn hệ thống".
- **Giải pháp**: Lắng nghe sự kiện đổi chi nhánh (`mtgrms:branch-changed` và `localStorage`), tự động gọi `storeProductApi.getStoreProducts({ storeId: activeBranch.id })` khi chọn một chi nhánh cụ thể, đối chiếu và lọc các sản phẩm của NCC đang được phân bổ về chi nhánh đó, đồng thời hiển thị số lượng tồn kho thực tế tại chi nhánh. Cung cấp badge trạng thái trực quan và nút chuyển nhanh về "Toàn hệ thống".

---

## 2. Chi tiết thay đổi (What)

### `src/features/supplier/components/detail/SupplierProductsTab.tsx`
- **Lắng nghe sự kiện chọn chi nhánh từ Topbar**:
  - Đọc chi nhánh mặc định từ `localStorage.getItem('mtgrms_active_branch')`.
  - Đăng ký `addEventListener` lắng nghe CustomEvent `mtgrms:branch-changed` và event `storage`.
  - Cập nhật state `activeBranch` tương ứng.
- **Tải và lọc sản phẩm theo chi nhánh**:
  - Khi `activeBranch.id === 'ALL'`: hiển thị toàn bộ danh mục sản phẩm của NCC trong chuỗi.
  - Khi `activeBranch.id !== 'ALL'`: gọi API `storeProductApi.getStoreProducts` để lấy danh sách sản phẩm thuộc chi nhánh đang chọn vào một Map (`branchProductMap`).
  - Giao tập hợp (`intersection`): Lọc `displayedProducts` chỉ giữ lại các sản phẩm vừa thuộc NCC vừa có mặt tại chi nhánh đang chọn.
- **Bổ sung UI Indicators & Thông tin kho chi nhánh**:
  - Thêm badge hiển thị chi nhánh đang áp dụng lọc kèm nút shortcut "(Xem toàn hệ thống)".
  - Trong cột trạng thái bảng: Hiển thị thêm dòng tồn kho thực tế tại chi nhánh: `Kho: {currentStock} {uom}`.
  - Cập nhật Empty State: Khi chi nhánh chưa được phân bổ sản phẩm nào của NCC, hiển thị thông báo rõ ràng kèm 2 nút hành động: "Xem toàn hệ thống" và "Gán sản phẩm cho chi nhánh".
  - Tự động đồng bộ số trang và phân trang (`effectiveTotal`, `totalPages`, `paginatedItems`).

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **Không thay đổi Backend Contract**: Tận dụng API `GET /api/suppliers/{id}/products` và `GET /api/branches/{id}/products` hiện có ở Frontend để giao tập hợp, đảm bảo tải nhanh và mượt mà.
- **Breaking changes**: Không có. Mọi tính năng khác như Phân trang, Tìm kiếm từ khóa SKU/Tên, Lọc ngành hàng, Thêm/Sửa sản phẩm NCC vẫn hoạt động độc lập và ổn định.

---

## 4. Kết quả kiểm thử (Verification)
- **Vitest Unit & Integration Tests**: Chạy toàn bộ 73 tests trong `src/features/supplier/` -> **73/73 PASSED**.
  - `assignProductModalLogic.test.ts` (5 tests pass)
  - `supplierProductValidation.test.ts` (6 tests pass)
  - `supplierGeneralProfile.test.tsx` (8 tests pass)
  - `supplierDeliveryCutoffMasterAudit.test.tsx` (14 tests pass)
  - `supplierDetailMasterAudit.test.tsx` (30 tests pass)
  - `SupplierListPage.test.tsx` (10 tests pass)
- **Build verification**: `npm run build` chạy thành công không có lỗi TypeScript / Vite.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Files Manager cần lưu tâm**:
  - `src/features/supplier/components/detail/SupplierProductsTab.tsx`
- **Các bước hậu merge**: Không cần migrate DB hay cài đặt thêm thư viện.
