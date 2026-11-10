# CHANGELOG - MT_GRMS_FRONTEND

Toàn bộ các thay đổi của repository Frontend React SPA được tổng hợp tại đây theo từng phiên bản. Chi tiết từng commit xem tại [`docs/worklogs/`](./docs/worklogs/).

---

## [Unreleased] - 2026-11-10

### Changed
- **Tái cấu trúc Modal "Chỉnh sửa sản phẩm tại chi nhánh" sang bố cục ngang 2 cột (`EditStoreProductModal.tsx`)**: Chuyển đổi toàn bộ form chỉnh sửa sản phẩm từ xếp dọc 1 cột (15 trường gây cuộn dọc dài) sang bố cục lưới 2 cột ngang (`grid-template-columns: repeat(2, 1fr)`), mở rộng `maxWidth: 860px`, sắp xếp logic các cặp trường thông tin (Chi nhánh, Sản phẩm, Nhà cung cấp, Giá vốn & Giá bán lẻ, MOQ & Trạng thái), loại bỏ hiện tượng cuộn dọc không hợp lý và tối ưu trải nghiệm người dùng [FE-PRODUCT] [worklog: docs/worklogs/2026-11-10_FE-PRODUCT_AI_filter-store-products-by-header-branch.md].

### Removed
- **Lược bỏ cột "Mã NCC" và "Nhà Cung Cấp" trong bảng Sản phẩm theo Cửa hàng (`StoreProductTable.tsx`)**: Bỏ 2 cột `Mã NCC` và `Nhà Cung Cấp` khỏi bảng dữ liệu trên màn hình "Sản Phẩm Theo Cửa Hàng / Chi Nhánh" (`/store-owner/stores/products`), tái phân bổ lại tỷ lệ độ rộng cho 10 cột còn lại (Mã SKU, Tên SP, Giá vốn, Giá bán lẻ, Giá bán theo ĐVT, MOQ, ĐVT, Trạng thái, Thao tác) giúp giao diện thoáng đãng, dễ theo dõi [FE-PRODUCT] [worklog: docs/worklogs/2026-11-10_FE-PRODUCT_AI_filter-store-products-by-header-branch.md].
- **Lược bỏ ô lọc & cột "Mã cửa hàng", "Cửa hàng" và đồng bộ lọc sản phẩm theo Header Branch Dropdown (`StoreProductManagementPage.tsx`, `StoreProductFilterBar.tsx`, `StoreProductTable.tsx`)**: Bỏ 2 ô lọc và 2 cột `Mã cửa hàng`, `Cửa hàng` trên màn hình "Sản Phẩm Theo Cửa Hàng / Chi Nhánh"; tự động lắng nghe dropdown Chi nhánh trên Header (`mtgrms:branch-changed`, `localStorage`) để lọc danh sách sản phẩm theo chi nhánh đang chọn [FE-PRODUCT] [worklog: docs/worklogs/2026-11-10_FE-PRODUCT_AI_filter-store-products-by-header-branch.md].
- **Lược bỏ màn hình độc lập "Cửa Hàng với nhà cung cấp" và hợp nhất vào tab "Giao hàng & Cutoff" (`SupplierDeliveryConfigTab.tsx`, `SupplierDetailPage.tsx`, `SupplierListPage.tsx`, `AppTopNav.tsx`, `router.tsx`)**: Bỏ trang và menu "Cửa Hàng với nhà cung cấp" (`/store-owner/suppliers/branches`) bị trùng lặp; tích hợp quản lý trạng thái phân bổ chi nhánh, ngày giao hàng theo thứ, MOQ và giờ Cutoff trực tiếp vào tab "Giao hàng & Cutoff" kết hợp đồng bộ với dropdown Chi nhánh trên Header [FE-SUPPLIER] [worklog: docs/worklogs/2026-11-10_FE-SUPPLIER_AI_merge-supplier-branch-into-delivery-cutoff-tab.md].
- **Lược bỏ nút điều hướng và menu độc lập "Sản Phẩm Theo Nhà Cung Cấp" (`SupplierListPage.tsx`, `AppTopNav.tsx`, `router.tsx`)**: Bỏ nút "Sản phẩm theo NCC" trên thanh tác vụ của trang Quản lý Nhà Cung Cấp, trang Gán NCC với Cửa hàng và trang Sản phẩm theo Cửa hàng sau khi đã hợp nhất quản lý sản phẩm trực tiếp bên trong chi tiết từng NCC; tinh gọn menu Hàng hóa trên thanh điều hướng TopNav và điều hướng an toàn route cũ về `/store-owner/suppliers` [FE-SUPPLIER] [worklog: docs/worklogs/2026-11-10_FE-SUPPLIER_AI_remove-redundant-supplier-products-nav.md].

### Added
- **Đồng bộ & Lọc danh mục sản phẩm NCC theo dropdown Chi nhánh trên Header (`SupplierProductsTab.tsx`)**: Tự động lắng nghe sự kiện đổi chi nhánh (`mtgrms:branch-changed`, `localStorage`), tải và giao tập hợp sản phẩm (`storeProductApi.getStoreProducts`), hiển thị tồn kho thực tế tại chi nhánh, badge trạng thái và empty state thông minh với nút chuyển nhanh "Xem toàn hệ thống" [FE-SUPPLIER] [worklog: docs/worklogs/2026-11-10_FE-SUPPLIER_AI_filter-supplier-products-by-header-branch.md].
- **Bổ sung Tab "Sản phẩm cung cấp" vào màn hình Chi tiết Nhà Cung Cấp (`SupplierDetailPage.tsx`, `SupplierProductsTab.tsx`)**: Thêm tab `Sản phẩm cung cấp` trên thanh điều hướng chi tiết NCC, tự động tải danh mục mặt hàng của NCC từ API (`GET /api/suppliers/{id}/products`), hỗ trợ tìm kiếm theo SKU/Tên SP, lọc theo Ngành hàng & Trạng thái, phân trang, gán sản phẩm mới (`AssignProductModal`) và sửa trực tiếp giá nhập sỉ, MOQ, hạn mức giao thiếu (`EditSupplierProductModal`) [FE-SUPPLIER] [worklog: docs/worklogs/2026-11-10_FE-SUPPLIER_AI_add-supplier-products-detail-tab.md].

### Fixed
- **Cô lập chỉnh sửa điều khoản cung ứng theo chi nhánh & Bổ sung nút "Lưu thay đổi trên các chi nhánh khác" tại chi nhánh tổng (`EditSupplierProductModal.tsx`, `SupplierProductsTab.tsx`)**: Khắc phục lỗi khi sửa trạng thái Mở/Đóng hoặc Giá nhập, MOQ, Thiếu cho phép ở một chi nhánh làm thay đổi toàn hệ thống; bổ sung nút **"Lưu thay đổi trên các chi nhánh khác"** trên chi nhánh tổng/chi nhánh chính để đồng bộ toàn chuỗi khi cần, trong khi nút **"Lưu Thay Đổi"** chỉ lưu riêng trên chi nhánh đang chọn [FE-SUPPLIER] [worklog: docs/worklogs/2026-11-10_FE-SUPPLIER_AI_branch-isolated-product-edit.md].
- **Sửa lỗi xác thực mật khẩu màn Đăng ký (`RegisterPage.tsx`)**: Điều chỉnh điều kiện độ dài tối thiểu từ 8 ký tự về 6 ký tự đồng bộ với Backend, nâng cấp thanh đo độ mạnh mật khẩu `passwordStrength` giúp các mật khẩu trung bình (từ 6 ký tự trở lên kết hợp chữ và số hoặc độ dài >= 8) được phép tạo tài khoản thành công mà không bị chặn, cập nhật thông báo lỗi chuẩn xác và điều hướng trực tiếp vào Cổng quản trị cửa hàng (`/store-owner/dashboard`) [FE-AUTH] [worklog: docs/worklogs/2026-11-10_FE-AUTH_AI_register-password-strength-fix.md].

## [Unreleased] - 2026-11-09

### Added
- Chuẩn hóa hệ thống phân quyền với enum `UserRoleEnum` ({ `ADMIN`, `STORE_OWNER`, `STAFF` }) tương thích tiêu chuẩn `erasableSyntaxOnly`; cập nhật `UserProfile.role` và `userRole`; đổi tên key `localStorage` trạng thái sidebar sang `ui_sidebar_open` để phân tách rạch ròi với quyền hạn admin [FE-AUTH] [worklog: docs/worklogs/2026-11-09_FE-AUTH_AI_user-role-enum-standardization.md].
- Chuyển đổi toàn diện cơ chế xác thực sang HttpOnly Cookie: loại bỏ 100% việc lưu trữ token trong `localStorage` (miễn nhiễm XSS Token Theft), triển khai Silent Refresh với Axios Request Queue trong `httpClient.ts`, tự động đồng bộ phiên khi F5 qua `GET /api/auth/me`, và điều hướng thông minh khi phiên hết hạn kèm ghi nhớ `redirectUrl` [FE-AUTH] [worklog: docs/worklogs/2026-11-09_FE-AUTH_AI_httponly-cookie-and-session-expiry.md].

### Fixed
- Đồng bộ `withCredentials: true` trong `financeHttpClient.ts` để tự động gửi HttpOnly Cookie khi gọi các API phân hệ Tài chính - Sổ quỹ - Thuế, khắc phục lỗi `401 Unauthorized` trên Console [FE-AUTH] [worklog: docs/worklogs/2026-11-09_FE-AUTH_AI_user-role-enum-standardization.md].
- **Phóng to kích thước & chữ mô tả cột bên trái Modal Thanh toán gói (`SubscriptionCheckoutModal.tsx`, `store-hub.css`)**: Tăng chiều rộng cột trái từ 330px lên 400px, nâng `maxWidth` modal lên 960px, phóng to font chữ tên gói (19px), giá (26px), mô tả ngắn (13.5px) và toàn bộ 7 tính năng kèm icon tích xanh lớn hơn, giúp dễ đọc và nổi bật giá trị gói cước [FE-BRANCH] [worklog: docs/worklogs/2026-11-09_FE-BRANCH_AI_redesign-branch-detail-modal-inputs.md].
- **Sửa lỗi rớt dòng chữ tại 4 thẻ KPI chỉ số tổng quát (`BranchDetailModal.tsx`)**: Bố trí icon lên phía trên riêng biệt và cho tiêu đề trải rộng 100% chiều ngang thẻ với `whiteSpace: 'nowrap'`, loại bỏ triệt để hiện tượng rớt chữ ("doanh", "hàng", "dịch") xuống dòng 2, đồng đều chiều cao và cân đối 4 cột [FE-BRANCH] [worklog: docs/worklogs/2026-11-09_FE-BRANCH_AI_redesign-branch-detail-modal-inputs.md].
- **Tối giản hóa Modal Chi tiết chi nhánh (`BranchDetailModal.tsx`)**: Lược bỏ 2 tab danh sách và bảng chi tiết sản phẩm / nhân viên ở phía dưới, giữ nguyên 4 thẻ KPI chỉ số tổng quát (SKU, SOH, Thiếu hàng, Nhân sự) giúp modal vừa vặn màn hình và tải nhanh hơn [FE-BRANCH] [worklog: docs/worklogs/2026-11-09_FE-BRANCH_AI_redesign-branch-detail-modal-inputs.md].
- **Tái thiết kế lưới ô nhập liệu Modal Chi tiết chi nhánh (`BranchDetailModal.tsx`)**: Chuyển đổi từ bố cục auto-fit minmax sang hệ thống lưới 2 cột kỷ luật (`1fr 1fr`), chuẩn hóa chiều cao 38px cho tất cả các control, khắc phục triệt để hiện tượng xô lệch hàng, co ép tên chi nhánh và tràn chữ checkbox Trụ sở chính [FE-BRANCH] [worklog: docs/worklogs/2026-11-09_FE-BRANCH_AI_redesign-branch-detail-modal-inputs.md].
- **Cải tiến cơ chế đồng bộ dữ liệu & phản hồi lưu thay đổi (`BranchDetailModal.tsx`)**: Bổ sung fallback giữ nguyên form khi API detail chậm hoặc gặp sự cố, đồng bộ tức thời huy hiệu Trụ sở chính trên header, hiển thị trạng thái loading spinner khi lưu và thông báo badge xanh "Đã lưu thành công!" [FE-BRANCH] [worklog: docs/worklogs/2026-11-09_FE-BRANCH_AI_redesign-branch-detail-modal-inputs.md].
- **Loại bỏ nút Sửa trong cột Thao tác (`BranchManagementTab.tsx`)**: Lược bỏ nút icon bút chì thừa do chức năng chỉnh sửa đã được hợp nhất trực tiếp bên trong modal Chi tiết chi nhánh, giúp cột Thao tác tinh gọn và thoáng mắt [FE-BRANCH] [worklog: docs/worklogs/2026-11-09_FE-BRANCH_AI_redesign-branch-detail-modal-inputs.md].

## [Unreleased] - 2026-11-08
### Added
- **Chuẩn hóa giao diện 2 Gói cước SaaS mới (Gói Thường 99k & Gói Pro 249k)**: Xóa bỏ gói miễn phí vĩnh viễn (0đ), cập nhật bảng giá đối xứng `SubscriptionPricingCards.tsx` và `storeData.ts` tập trung vào giá trị cốt lõi của siêu thị tạp hóa [FE-09] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Nâng cấp Modal Thanh toán thích ứng (`SubscriptionCheckoutModal.tsx`)**: Loại bỏ hoàn toàn ô nhập "Kho phụ" do mỗi chi nhánh tự động kiêm kho hàng tại chỗ; bổ sung tùy chọn mua thêm Quản lý & Phân quyền nhân viên (+30k/tháng) cho Gói Thường và Stepper mua thêm chi nhánh (+80k/chi nhánh/tháng) cho Gói Pro [FE-09] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- Bổ sung trường `hasStaffManagementAddon` trong payload API `storeApi.purchaseSubscription` [FE-09] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Lọc và hiển thị chuẩn xác 2 gói cước từ API (`SubscriptionPricingCards.tsx`)**: Lọc API response chỉ nhận gói `STANDARD` và `PRO`, loại bỏ triệt để các thẻ gói cũ còn sót lại từ DB, căn chỉnh bố cục 2 thẻ trực quan và chuẩn hóa cơ chế fallback [FE-09] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Bổ sung thẻ Gói Dùng Thử riêng biệt bên trái (`SubscriptionPricingCards.tsx`, `storeData.ts`)**: Thêm thẻ "Gói Dùng Thử (Trải Nghiệm)" 0 đ / 3 ngày nằm bên trái ngoài cùng cạnh Gói Thường, mở khóa trải nghiệm đầy đủ tính năng và kích hoạt 1 chạm [FE-09] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Tối giản hóa Modal Thanh toán gói (`SubscriptionCheckoutModal.tsx`)**: Tinh gọn chu kỳ mua gói về 3 lựa chọn (3 Tháng, 6 Tháng, 1 Năm), loại bỏ chu kỳ 24 tháng; loại bỏ hoàn toàn hình thức quét mã VietQR trong modal, chuyển 100% sang trừ tiền trực tiếp vào Ví gian hàng (Store Wallet); loại bỏ banner quảng cáo trùng lặp, tối giản giao diện sạch đẹp, hiển thị trực quan số dư ví và trạng thái đủ/thiếu tiền [FE-09] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Thiết kế Split 2 Cột cho Modal Thanh toán (`SubscriptionCheckoutModal.tsx`, `store-hub.css`)**: Khắc phục tiêu đề dài bị rơi chữ xuống dòng; chia layout modal thành 2 cột cân đối: Cột trái hiển thị thông tin gói và toàn bộ danh sách tính năng / quyền lợi gói cước với icon tích xanh; Cột phải phục vụ chọn chu kỳ (3m, 6m, 1y), addon và thanh toán ví gian hàng [FE-09] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Tái cấu trúc Modal Nạp tiền Ví dạng Split 2 Cột (`StoreWalletTopupModal.tsx`, `store-hub.css`)**: Cột trái đặt mã QR VietQR Napas247 siêu lớn (250x250) trải dài từ đỉnh ngang nút chọn mệnh giá xuống tận đáy; cột phải bố trí các nút mệnh giá (50k, 100k, 200k, Khác), ô nhập số tiền đồng bộ 2 chiều, thông tin chuyển khoản ngân hàng và tổng thanh toán [FE-WALLET] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Cập nhật hiển thị và xử lý Quota chi nhánh (`BranchQuotaBar.tsx`, `BranchManagementTab.tsx`)**: Hiển thị cảnh báo trực quan khi số chi nhánh vượt quá hạn mức (`Đã sử dụng 4/2 chi nhánh (Vượt quá hạn mức 2 chi nhánh)`); bắt lỗi và hiển thị thông báo alert khi người dùng cố tình kích hoạt chi nhánh vượt quá hạn mức gói [FE-STORE] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Bổ sung nút Xóa chi nhánh (`BranchManagementTab.tsx`, `branchManagementApi.ts`)**: Thêm nút icon thùng rác (Trash2) màu đỏ trong cột Thao tác, có hộp thoại xác nhận chi tiết giải phóng hạn mức, bảo vệ chi nhánh chính không cho phép xóa, và tự động đồng bộ lại danh sách cùng hạn mức quota [FE-STORE] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Bổ sung Modal Xem Chi Tiết & Thông Số Tổng Quát Chi Nhánh (`BranchDetailModal.tsx`, `BranchManagementTab.tsx`, `branchManagementApi.ts`)**: Bấm vào hàng chi nhánh hoặc icon Con mắt (Eye) mở modal hiển thị thông tin cơ bản ở phần trên (Mã, Tên, Trụ sở chính, Địa chỉ, Hotline, Email, Quản lý) và các thông số tổng quát ở phần dưới (4 KPI cards: SKU kinh doanh, tồn kho SOH, cảnh báo thiếu hàng, nhân sự; cùng các tabs xem nhanh danh sách sản phẩm và nhân sự) [FE-STORE] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].
- **Chuyển đổi thông tin cơ bản thành Input chỉnh sửa trực tiếp & Thêm nút Lưu trong Modal Chi tiết (`BranchDetailModal.tsx`, `BranchManagementTab.tsx`)**: Cho phép sửa trực tiếp Tên, Địa chỉ, Hotline, Email, Quản lý, Trụ sở chính ngay tại modal chi tiết và lưu trực tiếp bằng nút "Lưu thay đổi", không cần mở popup chỉnh sửa riêng biệt [FE-STORE] [worklog: docs/worklogs/2026-11-08_FE-09_AI_subscription-tier-quota-redesign.md].

## [Unreleased] - 2026-11-07
### Added
- **Nâng cấp và tinh gọn Modal Thêm/Sửa chi nhánh (`BranchFormModal.tsx`)**: Tự động sinh mã chi nhánh 100% theo thứ tự chuỗi (`BR-01` -> `BR-02`), khóa cố định không bắt người dùng nhập tay; bổ sung tùy chọn "Đặt làm cơ sở chính (Trụ sở chính)" cho cả 2 màn hình Thêm mới và Chỉnh sửa; bổ sung Email liên hệ, tùy chọn Đồng bộ danh mục hàng hóa & cảnh báo hạn mức Quota; loại bỏ các trường mở rộng không cần thiết để form gọn gàng, thao tác nhanh [FE-STORE] [worklog: docs/worklogs/2026-11-07_FE-STORE_AI_enhance-branch-create-modal.md].
- Tích hợp thanh hạn mức Quota và nút mở nhanh modal "Nâng cấp gói" ngay trong form tạo chi nhánh khi tài khoản đạt giới hạn số lượng điểm bán.

## [Unreleased] - 2026-11-06
### Added
- Bổ sung chức năng **Cập nhật thông tin gian hàng**: thêm nút "Cập nhật thông tin", tạo component `EditStoreInfoModal`, trạng thái loading `isSaving`, và thông báo nổi Toast khi lưu dữ liệu gian hàng (MST, Hotline, Tỉnh/TP, Địa chỉ) [FE-STORE] [worklog: docs/worklogs/2026-11-06_FE-STORE_AI_store-info-update-modal-and-toast.md].
- Tích hợp API thật cho màn hình **Lịch sử mua hàng** (`OrderHistoryTab.tsx`): loại bỏ mock data cứng, kết nối `storeApi.getSubscriptionHistory()`, hiển thị hợp đồng thật, thời hạn, trạng thái và empty state khi chưa có giao dịch [FE-STORE] [worklog: docs/worklogs/2026-11-06_FE-STORE_AI_store-info-update-modal-and-toast.md].

### Changed
- Tối ưu hóa hiệu năng và network trong tab Chi nhánh (`BranchManagementTab.tsx`): debounce 350ms khi gõ tìm kiếm hoặc đổi filter, tách riêng quota fetch khỏi search list, triệt tiêu tình trạng gọi API liên tiếp [FE-STORE] [worklog: docs/worklogs/2026-11-06_FE-STORE_AI_store-info-update-modal-and-toast.md].

### Fixed
- Sửa lỗi vỡ thanh tiến trình (Stepper) 3 bước trên màn hình Quên mật khẩu (`ForgotPasswordPage.tsx`): chuyển sang layout ngang chuẩn Responsive, căn nối tâm hoàn hảo giữa các vòng tròn số bước và icon Check hoàn thành với đường kẻ divider [FE-AUTH] [worklog: docs/worklogs/2026-11-06_FE-AUTH_AI_forgot-password-email-otp.md].
- Đồng bộ hóa các endpoints xác thực quên mật khẩu, mã OTP và thiết lập lại mật khẩu qua chuẩn route `/api/auth/...`.

## [Unreleased] - 2026-11-05
### Fixed
- Sửa lỗi trích xuất phản hồi API đăng ký `POST /api/v1/auth/register` trong `authService.ts`: giải nén `unwrapLogin(response.data)` từ vỏ bọc `ApiResponse`, khắc phục triệt để lỗi `Cannot read properties of undefined (reading 'tenantId')` trên màn hình Đăng ký [FE-AUTH] [worklog: docs/worklogs/2026-11-05_FE-AUTH_AI_fix-register-api-response-unwrapping.md].
- Phòng vệ kiểm tra null-safe cho `user` trước khi truy cập `user.tenantId` trong `useAuthStore.ts`.

## [Unreleased] - 2026-11-04
### Added
- Tích hợp cổng thanh toán VietQR SePay thật, tái thiết kế giao diện Modal Nạp ví (`StoreWalletTopupModal`) theo chuẩn Deep Teal (`#0F766E`), tích hợp cơ chế Polling 3s/lần tự động cập nhật số dư, và đồng bộ tab Sổ cái `WalletLedgerTab` [FE-WALLET] [worklog: docs/worklogs/2026-11-04_FE-WALLET_AI_sepay-wallet-topup-modal.md].
### Added
- Thêm component Dropdown **Chọn chi nhánh** (`BranchSelectorDropdown`) trên thanh header chính (`AppTopNav`), hỗ trợ chọn từng chi nhánh hoặc xem toàn hệ thống [worklog: docs/worklogs/2026-11-03_FE-STORE_AI_remove-wallet-topup-from-status-bar.md].

### Changed
- Đồng bộ hóa 100% typography (Be Vietnam Pro, tabular-nums) và bảng màu thương hiệu Deep Teal (#0F766E) cho modal Đăng ký gói (SubscriptionCheckoutModal) và bảng giá (SubscriptionPricingCards) [FE-STORE] [worklog: docs/worklogs/2026-11-04_FE-STORE_AI_unify-typography-and-checkout-modal-theme.md].
- Sửa layout bảng gói cước dịch vụ (pricing-cards-grid) mở rộng 100% toàn chiều ngang, loại bỏ max-width 1040px và khoảng trắng thừa bên phải màn hình [FE-STORE] [worklog: docs/worklogs/2026-11-04_FE-STORE_AI_expand-pricing-grid-full-width.md].
- Hợp nhất an toàn nhánh feature/store-owner-confige-management vào dev, giải quyết xung đột httpClient, authService, LoginPage, AppTopNav, Navbar và hoàn thiện build [worklog: docs/worklogs/2026-11-03_MERGE-DEV_AI_resolve-store-owner-config-merge.md].
- Loại bỏ hoàn toàn mục và tab **"Bản xác nhận dịch vụ"** khỏi thanh điều hướng bên trái và trang Hub Cài đặt gian hàng (`StoreSettingsHubPage`) [worklog: docs/worklogs/2026-11-03_FE-STORE_AI_remove-service-confirmation-tab.md].
- Tinh gọn Dropdown chọn chi nhánh: bỏ các icon và mã cửa hàng (`BR-xxx`), hiển thị đầy đủ tên chi nhánh và địa chỉ rõ ràng, không bị co kéo hoặc cắt chữ.
- Loại bỏ hoàn toàn mục "Ví gian hàng" & nút "Nạp ví" cùng popup VietQR khỏi thanh trạng thái tổng quan `StoreTopStatusBar`.
- Loại bỏ menu thả xuống (dropdown / mega-menu) của mục **"Cửa hàng"** trên `AppTopNav`, chuyển thành liên kết trực tiếp vào trang `/store-owner/subscriptions`.

## [0.1.1] - 2026-10-13
### Added
- Đồng bộ nhánh `dev` vào nhánh `add/login-screen` (module Nhà Cung Cấp, Chi phí vận hành, StoreOwnerLayout).
- Nâng cấp `AppTopNav`: Mega Menu 3 cột cho mục "Nhập hàng" theo chuẩn KiotViet SaaS (Nhà cung cấp, Mua hàng, Mua dịch vụ).
- Hỗ trợ hover tự động hạ menu, debounce grace period 180ms và active highlight chính xác theo URL query string.
- Xây dựng hoàn chỉnh hệ thống Xác thực người dùng (Login, Register, Forgot Password) [FE-AUTH].
- Zustand store quản lý phiên đăng nhập và Axios interceptor tự động refresh token.
- Thành phần bảo vệ route `ProtectedRoute` và nút Đăng xuất trên `AdminTopbar`.
- Giao diện chuẩn KiotViet Blue Palette, bo tròn Full Pill 9999px và 100% SVG đơn sắc.

## [0.1.0] - 2026-09-30
### Added
- Khởi tạo cấu trúc repository React 19 / Vite / TypeScript.
- Cấu hình thư mục quản lý worklog nội bộ: `docs/worklogs/`.
- Cấu hình template Pull Request: `.github/pull_request_template.md`.
