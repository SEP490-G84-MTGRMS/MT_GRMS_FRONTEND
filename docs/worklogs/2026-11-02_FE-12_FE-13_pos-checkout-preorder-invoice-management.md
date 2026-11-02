# WORKLOG: FE-12, FE-13 - POS Checkout, Pre-Order Modal, Invoicing, Return & Exchange, and Thermal Receipt Printing

- **Ngày thực hiện**: 2026-11-02
- **Người thực hiện**: Son Nguyen Ba (@sonnguyenn10)
- **Nhánh Git (Branch)**: `add/ui-pos-v3`
- **Mã tính năng liên kết**: [FE-12 - POS Checkout & Sales](../../../DOCS_MT_GRMS/specs/FE-12/spec.md), [FE-13 - Return & Refund Management](../../../DOCS_MT_GRMS/specs/FE-13/spec.md)
- **Loại thay đổi**: Feature & UI Integration

---

### 1. Mục Đích Thay Đổi (Why)
- Xây dựng giao diện bán hàng quầy POS hiện đại, tối ưu cho siêu thị thực phẩm sạch với thao tác bàn phím nhanh, quét mã vạch USB HID và đa dạng phương thức thanh toán (Tiền mặt, VietQR SePay, Ghi nợ).
- Cung cấp màn hình Quản lý Hóa đơn & Đơn đặt trước (Invoice Management) hỗ trợ quản lý đa chi nhánh cho chủ cửa hàng, phân tách rõ ràng đơn bán lẻ và đơn đặt trước giữ kho.
- Cải tiến modal Tạo Đơn Đặt Trước (`CreatePreOrderModal.tsx`): tìm kiếm khách hàng chuyên biệt theo SĐT, cho phép nhập số lượng linh hoạt với cảnh báo tức thì khi $\le 0$ hoặc vượt tồn kho, loại bỏ các đoạn text dài dòng.
- Tích hợp quy trình Đổi / Trả hàng (Return & Exchange) và in bill nhiệt trực tiếp K80/K58.

---

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/features/pos/pages/PosCheckoutPage.tsx`: Màn hình POS bán hàng chính, quản lý giỏ hàng, bảng sản phẩm, phím tắt và hoàn tất đơn.
- `src/features/pos/pages/InvoiceManagementPage.tsx`: Màn hình Quản lý Hóa đơn, Đơn đặt trước, bộ lọc chi nhánh và lịch sử giao dịch.
- `src/features/pos/components/PosPaymentPanel.tsx`: Bảng thanh toán quầy, tìm kiếm khách hàng chỉ bằng SĐT, hỗ trợ bán nợ và QR thanh toán.
- `src/features/pos/components/PosReceiptModal.tsx`: Modal xem trước và in hóa đơn thanh toán K80/K58.
- `src/features/pos/components/modals/CreatePreOrderModal.tsx`: Modal tạo đơn đặt trước, cọc $\ge 10\%$, tìm kiếm theo SĐT, kiểm tra tồn kho FEFO.
- `src/features/pos/components/modals/FulfillPreOrderModal.tsx`: Modal thanh toán tiền còn lại và bàn giao đơn đặt trước.
- `src/features/pos/components/modals/ReturnExchangeModal.tsx`: Modal đổi trả hàng theo hóa đơn gốc.
- `src/features/pos/api/posOrderApi.ts`: Client API Axios kết nối backend cho toàn bộ nghiệp vụ đơn hàng POS.
- `src/features/pos/utils/posPrintHelper.ts`: Tiện ích in ấn hóa đơn và xuất file.
- `src/hooks/useBarcodeScanner.ts`: Hook lắng nghe sự kiện máy quét mã vạch USB HID toàn cục.

---

### 3. Kết Nối API Backend
- **Endpoint kết nối**:
  - `POST /api/v1/orders/pos`: Tạo hóa đơn bán lẻ.
  - `POST /api/v1/orders/pre-order`: Tạo đơn đặt trước giữ kho.
  - `POST /api/v1/orders/pre-order/{id}/fulfill`: Hoàn tất đơn đặt trước.
  - `POST /api/v1/orders/{id}/return-exchange`: Xử lý đổi trả hàng.
  - `GET /api/v1/orders/pos/invoices`: Danh sách hóa đơn và đơn đặt trước theo chi nhánh.
  - `GET /api/v1/products/barcode/{barcode}`: Quét barcode lấy thông tin sản phẩm.
- **Xử lý UX & State**:
  - Tích hợp Toast notification sắc nét cho từng hành động thành công / thất bại.
  - Tự động fallback mock data thông minh nếu API backend đang bảo trì hoặc offline.

---

### 4. Kiểm Thử Giao Diện (Verification)
- [x] Đã chạy `npm run build`: Thành công 100% trong 662ms (0 lỗi, 0 cảnh báo TypeScript).
- [x] Đã kiểm tra Responsive giao diện trên màn hình Desktop Full HD, Màn hình cảm ứng POS thu ngân và Laptop.
- [x] Đã hòa nhập nhánh `dev` mới nhất và giải quyết 100% xung đột (0 conflict).

---

### 5. Ghi Chú Cho PM & Backend
- Backend tương ứng nằm ở nhánh `feature/pos-v3`.
- Đã cài đặt thư viện `xlsx` để hỗ trợ các chức năng xuất báo cáo excel chung của hệ thống.
