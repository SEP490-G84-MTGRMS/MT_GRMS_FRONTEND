# Worklog: Bổ sung Tab "Sản phẩm cung cấp" vào màn hình Chi tiết Nhà Cung Cấp

- **Ngày thực hiện**: 2026-11-10
- **Mã Task**: FE-SUPPLIER
- **Tác giả**: AI Assistant
- **Dự án**: `project/MT_GRMS_FRONTEND`

---

## 1. Mục đích (Why)
Trước đây, màn hình **Chi tiết Nhà Cung Cấp** (`SupplierDetailPage.tsx`) chỉ có 5 tab (`Hồ sơ chung`, `Giao hàng & Cutoff`, `Ngày nghỉ lễ`, `Công nợ & thanh toán`, `Lịch sử giao dịch`), khiến chủ cửa hàng khi xem hồ sơ một nhà cung cấp không thể xem trực tiếp danh mục mặt hàng mà NCC đó đang cung ứng, cũng không thể gán thêm sản phẩm mới hoặc chỉnh sửa giá nhập sỉ / MOQ ngay tại chỗ mà phải chuyển sang màn hình tổng hợp **Sản Phẩm Theo Nhà Cung Cấp**.

Mục tiêu của bản cập nhật:
- Bổ sung mục **`Sản phẩm cung cấp`** (`key: 'products'`) vào thanh điều hướng của màn hình Chi tiết Nhà Cung Cấp.
- Nâng cấp toàn diện component `SupplierProductsTab.tsx` để kết nối API thực tế theo `supplier.id`, hỗ trợ lọc/tìm kiếm, phân trang, gán sản phẩm mới và sửa điều khoản cung ứng trực tiếp.

---

## 2. Danh sách file & Nội dung đã sửa (What)

1. **`src/features/supplier/pages/SupplierDetailPage.tsx`**:
   - Import `SupplierProductsTab` từ `../components/detail/SupplierProductsTab`.
   - Mở rộng kiểu `TabKey` thêm `'products'`.
   - Bổ sung `{ key: 'products', label: 'Sản phẩm cung cấp' }` vào `ALL_TABS` ngay sau tab `Hồ sơ chung`.
   - Render `<SupplierProductsTab supplier={currentSupplier} canEdit={isStoreOwner} onNotify={showToast} />` khi `activeTab === 'products'`.

2. **`src/features/supplier/components/detail/SupplierProductsTab.tsx`**:
   - Tích hợp gọi API `supplierProductApi.getSupplierProducts(supplier.id, ...)` để tải danh sách sản phẩm của riêng nhà cung cấp đang xem kèm phân trang (`pageIndex`, `pageSize`).
   - Tải danh sách `masterProducts` qua `supplierProductApi.getMasterProducts()` để phục vụ modal gán sản phẩm và trích xuất danh mục ngành hàng.
   - Bổ sung thanh bộ lọc trực quan: Tìm kiếm theo `Mã SKU / Tên sản phẩm`, lọc theo `Ngành hàng`, lọc theo `Trạng thái` (`Hoạt động` / `Ngưng cung ứng`), nút `Tìm kiếm` và `Đặt lại`.
   - Chuẩn hóa bảng dữ liệu đồng bộ với màn **Sản Phẩm Theo Nhà Cung Cấp** (lược bỏ 2 cột thừa `Mã NCC` và `Nhà cung cấp` do đang ở trong chi tiết của chính NCC đó): `#`, `Ảnh`, `Mã SKU`, `Tên sản phẩm`, `Ngành hàng`, `ĐVT`, `Giá nhập sỉ`, `MOQ`, `Thiếu cho phép`, `Trạng thái`, `Thao tác (Sửa)`.
   - Tích hợp nút **`+ Gán sản phẩm mới`** mở `AssignProductModal` với NCC hiện tại được cố định sẵn, và nút **`Sửa`** trên từng dòng mở `EditSupplierProductModal` để cập nhật giá nhập sỉ, MOQ, hạn mức giao thiếu và trạng thái.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **API Integration**: Tái sử dụng hoàn toàn `supplierProductApi` (`GET /api/suppliers/{supplierId}/products`, `POST /api/suppliers/{supplierId}/products/batch`, `PUT /api/suppliers/{supplierId}/products/{productId}`, `PATCH .../status`).
- **Backward Compatibility**: Giữ prop `products?: SupplierProductItem[]` là tùy chọn để tương thích ngược nếu component được truyền dữ liệu tĩnh.
- **RBAC**: Tuân thủ biến `canEdit` (`isStoreOwner`), ẩn các nút `Gán sản phẩm mới` và cột `Thao tác (Sửa)` đối với tài khoản nhân viên chỉ có quyền xem.
- **Breaking Changes**: Không có.

---

## 4. Kết quả kiểm thử (Verification)
- `npm run build`: Build TypeScript & Vite bundle thành công, 0 lỗi.
- `npm test -- --run`: Toàn bộ test suites pass 100%.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: **Low** (Chỉ bổ sung tab hiển thị & thao tác sản phẩm bên trong trang Chi tiết NCC, tái sử dụng các modal và API sẵn có).
- **File cần lưu tâm**:
  - `src/features/supplier/pages/SupplierDetailPage.tsx`
  - `src/features/supplier/components/detail/SupplierProductsTab.tsx`
- **Các bước hậu merge**: Không cần cấu hình thêm hay chạy migration.

