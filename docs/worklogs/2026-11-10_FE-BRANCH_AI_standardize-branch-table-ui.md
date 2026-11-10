# Worklog: Chuẩn Hóa Giao Diện Bảng Quản Lý Chi Nhánh & Kho Hàng Đồng Bộ Với Bảng Sản Phẩm Theo Cửa Hàng

- **Ngày thực hiện**: 2026-11-10
- **Task / Module**: `FE-BRANCH` (Quản lý Chi nhánh & Kho hàng - `/store-owner/subscriptions?tab=branches`)
- **Author**: AI Agent

---

## 1. Mục đích (Why)
- Chuẩn hóa bảng danh sách chi nhánh tại màn hình **Quản lý chi nhánh & Kho hàng** (`http://localhost:5173/store-owner/subscriptions?tab=branches`) theo đúng thiết kế, cấu trúc DOM/CSS (`so-list-table-card`, `so-list-table-head`, `so-list-table-body`, `so-list-pager`), typography, màu sắc, trạng thái (`SupplierStatusBadge`) và nút thao tác (`so-list-action-btn`) của bảng **Sản Phẩm Theo Cửa Hàng / Chi Nhánh** (`http://localhost:5173/store-owner/stores/products`).

---

## 2. Danh sách file & Nội dung đã sửa (What)

1. **`src/pages/store/components/BranchManagementTab.tsx`**:
   - **Cấu trúc bảng chuẩn `.so-list-table-card`**:
     - Thay thế thẻ wrapper cũ bằng `<div className="so-list-table-card">` gồm 3 phần: `div.so-list-table-head`, `div.so-list-table-body.supplier-table-scroll-container` (đồng bộ cuộn ngang giữa header và body qua `headerRef`/`bodyRef`), và `div.so-list-pager`.
   - **Tiêu đề cột (Header) & Sắp xếp (Sorting)**:
     - Tách cột "Tên & Địa chỉ chi nhánh" thành 2 cột riêng biệt `TÊN CHI NHÁNH` và `ĐỊA CHỈ` để hiển thị ngang hàng đồng bộ với bảng sản phẩm.
     - Áp dụng `thStyle` chữ in hoa (`uppercase`, `fontSize: 12`, `fontWeight: 700`, `color: '#334155'`, `backgroundColor: '#f8fafc'`, `borderBottom: '1px solid #cbd5e1'`) kèm icon `<ArrowUpDown size={12} />` cho phép sắp xếp tăng/giảm dần trên các cột: `MÃ CHI NHÁNH`, `TÊN CHI NHÁNH`, `ĐỊA CHỈ`, `HOTLINE`, `QUẢN LÝ PHỤ TRÁCH`.
   - **Định dạng dòng dữ liệu (Row & Cells)**:
     - Cột **Mã chi nhánh**: Hiển thị font monospace màu xanh cổ vịt (`color: '#0f766e'`, `fontWeight: 600`, `fontSize: 12`) giống hệt cột `MÃ SKU` bên bảng sản phẩm.
     - Cột **Tên chi nhánh**: Sử dụng `.so-list-name` kèm badge `Trụ sở chính` gọn gàng.
     - Cột **Trạng thái**: Sử dụng trực tiếp component `<SupplierStatusBadge status={isActive ? 'Active' : 'Inactive'} />` (chấm tròn xanh + `Hoạt động` / `Tạm ngưng`).
     - Cột **Thao tác**: Sử dụng nút `<button className="so-list-action-btn">Thao tác</button>` đồng bộ với bảng sản phẩm, kết hợp 2 nút icon gọn (`.so-list-action-btn--icon`) cho bật/tắt trạng thái (`Power`) và xóa chi nhánh (`Trash2`).
   - **Thanh phân trang (Footer Pagination)**:
     - Bổ sung thanh `.so-list-pager` hiển thị `Hiển thị X - Y trên Z chi nhánh`, bộ chọn `Bản ghi/trang` (`15`, `24`, `36`, `48`) và điều hướng `Trước` / `Trang X / Y` / `Sau`.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- Tái sử dụng hệ thống class `.so-list-*` từ `src/styles/so-list-page.css` và component `SupplierStatusBadge` giúp đồng nhất 100% trải nghiệm thị giác giữa các màn hình quản trị của Store Owner.
- Không thay đổi API contract hay luồng xử lý modal (`BranchFormModal`, `BranchDetailModal`, `BranchUpgradeModal`).

---

## 4. Kết quả kiểm thử (Verification)
- Chạy `npm run build` (`tsc -b && vite build`) thành công 100%, không phát sinh lỗi TypeScript hay bundle.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: **Low** (Chỉ cập nhật tầng trình bày UI/UX của bảng chi nhánh trong `BranchManagementTab.tsx`).
- **File cần review**: `src/pages/store/components/BranchManagementTab.tsx`.
- **Bước hậu merge**: Không yêu cầu cấu hình thêm.
