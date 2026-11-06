# Worklog: Bổ Sung Chức Năng Cập Nhật Thông Tin Gian Hàng & Modal Chỉnh Sửa

- **Ngày thực hiện**: 2026-11-06
- **Mã task / Tính năng**: FE-STORE (Store Info Management)
- **Tác giả**: AI Coding Assistant
- **Mô tả ngắn**: Bổ sung nút "Cập nhật thông tin", tạo modal `EditStoreInfoModal`, trạng thái loading `isSaving`, thông báo nổi Toast khi cập nhật thông tin chuỗi gian hàng, và tích hợp API thật `GET /api/tenant/subscriptions/history` cho tab Lịch sử mua hàng (thay thế mock data).

---

## 1. Mục đích (Why)
- Trước đó, tab "Thông tin gian hàng" (`/store-owner/subscriptions?tab=store-info`) chỉ hiển thị các trường nhập liệu tĩnh, không có nút "Cập nhật thông tin" rõ ràng trên card header, không có modal chỉnh sửa chuyên nghiệp, và thông báo lưu thành công bị khuất ở đầu trang.
- Tab "Lịch sử mua hàng" (`/store-owner/subscriptions?tab=order-history`) trước đó chỉ sử dụng dữ liệu giả định cứng (`mockOrders`) mà không hề kết nối tới API backend, khiến chủ cửa hàng không xem được hợp đồng và giao dịch mua gói dịch vụ thật.
- Giúp chủ cửa hàng dễ dàng cập nhật thông tin pháp lý & nhận diện chuỗi cửa hàng (MST, Địa chỉ, Tỉnh thành, Hotline) sau khi tạo tài khoản, đồng thời theo dõi chính xác lịch sử đăng ký/gia hạn gói dịch vụ.

---

## 2. Danh sách tệp & Nội dung thay đổi (What)
- [`src/pages/store/api/storeApi.ts`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/api/storeApi.ts):
  - Khai báo interface `SubscriptionOrderHistoryItem`.
  - Bổ sung hàm API `getSubscriptionHistory()` gọi `GET /api/tenant/subscriptions/history`.
- [`src/pages/store/components/OrderHistoryTab.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/components/OrderHistoryTab.tsx):
  - Xóa bỏ toàn bộ dữ liệu mock cứng (`mockOrders`).
  - Tích hợp hook `useEffect` và state `isLoading`, `errorMessage` để tải dữ liệu lịch sử mua hàng từ API thật.
  - Bổ sung nút "Làm mới", thông báo lỗi có thể retry, spinner loading và empty state thân thiện khi chưa có giao dịch.
- [`src/pages/store/components/EditStoreInfoModal.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/components/EditStoreInfoModal.tsx) *(Mới)*:
  - Tạo mới component Modal chỉnh sửa thông tin gian hàng với header, body form, và footer.
  - Hỗ trợ nhập và cập nhật: Tên chuỗi *, MST, Hotline, Tỉnh/Thành phố, Địa chỉ trụ sở chính.
  - Phân vùng rõ các thông tin cố định do hệ thống cấp (Subdomain, Email nhận thông báo) kèm badge `Cố định`.
  - Hiệu ứng loading spinner `Loader2` và vô hiệu hóa nút submit khi đang lưu.
- [`src/pages/store/components/StoreInfoTab.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/components/StoreInfoTab.tsx):
  - Bổ sung nút **"Cập nhật thông tin"** trên thanh tiêu đề và nút **"Chỉnh sửa"** trong `profile-card-header`.
  - Thay thế đoạn text mô tả tĩnh cũ ("Quản lý tên thương hiệu...") bằng dải metadata định danh lấy trực tiếp từ data thật: Mã gian hàng (`code`/`tenantId`), Tên miền con (`subdomain.mt-grms.vn`) và Trạng thái hoạt động (`ACTIVE`).
  - Tích hợp `EditStoreInfoModal` cho phép người dùng click để cập nhật thông tin trong cửa sổ modal.
  - Vẫn duy trì khả năng chỉnh sửa trực tiếp và lưu với nút "Lưu thay đổi" ở cuối form.
  - Thêm Toast thông báo nổi (`toastMessage`) ở góc dưới cùng bên phải màn hình khi cập nhật thành công hoặc gặp lỗi.
  - Khóa (read-only) và gắn badge cho các trường cố định hệ thống (Subdomain, Email hệ thống).
- [`src/pages/store/components/BranchManagementTab.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/components/BranchManagementTab.tsx):
  - Tối ưu hóa triệt để Network request: tách riêng `fetchQuota()` (chỉ gọi 1 lần khi mount hoặc khi thêm/sửa chi nhánh) khỏi `fetchBranches()`.
  - Bổ sung cơ chế Debounce 350ms khi gõ tìm kiếm (`keyword`) hoặc đổi bộ lọc trạng thái, ngăn chặn triệt để tình trạng spam 20+ request liên tiếp ("rác network").
- [`src/pages/store/StoreSettingsHubPage.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/StoreSettingsHubPage.tsx):
  - Nâng cấp hàm `handleUpdateStoreInfo` trả về `Promise<boolean>` để thông báo kết quả chính xác cho `StoreInfoTab` và modal.
- [`src/pages/store/__tests__/StoreInfoTab.test.tsx`](file:///d:/FPT_University/Final/Grade/new/project/MT_GRMS_FRONTEND/src/pages/store/__tests__/StoreInfoTab.test.tsx) *(Mới)*:
  - Bổ sung 3 unit tests tự động kiểm thử hiển thị thông tin, mở modal và gửi yêu cầu cập nhật thành công.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **State Management**: `showEditModal`, `isSaving`, `toastMessage` floating banner.
- **API Call**: Gọi trực tiếp `storeApi.updateStoreInfo()` và đồng bộ lại `storeInfo` qua `mapBackendStoreToFrontend`.
- **Validation**: Bắt buộc nhập tên chuỗi, thông báo lỗi trực quan nếu để trống.

---

## 4. Kết quả kiểm thử (Verification)
- `npm run build`: Thành công (Exit code 0, không có lỗi TypeScript).
- `vitest run src/pages/store/__tests__/StoreInfoTab.test.tsx`: 3/3 tests pass (100%).

---

## 5. Ghi chú cho Manager (Manager Merge Notes)
- **Mức độ rủi ro**: Thấp (Low).
- **Lưu ý**: Tận dụng triệt để các class CSS có sẵn trong `store-hub.css`, giao diện đồng nhất với `AccountProfileTab`.

