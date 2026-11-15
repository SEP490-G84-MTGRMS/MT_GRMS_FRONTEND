# WORKLOG: FE-ADMIN-DASH - Tái thiết kế màn hình Admin Dashboard tinh gọn, tối ưu theo phong cách Store Owner Dashboard

- **Ngày thực hiện**: 2026-11-15
- **Người thực hiện**: AI Assistant
- **Nhánh Git (Branch)**: `dev`
- **Mã tính năng liên kết**: [FE-ADMIN-DASH] Master SaaS Admin Dashboard Redesign
- **Loại thay đổi**: UI/UX Refactor & Bugfix

---

### 1. Mục Đích Thay Đổi (Why)
- **Vấn đề của màn hình Admin Dashboard cũ**:
  1. Thiếu tính đồng bộ với ngôn ngữ thiết kế thương hiệu mới THViet: Giao diện cồng kềnh, phân mảnh, không có cùng cấu trúc phân cấp tinh gọn như màn Dashboard bên Chủ cửa hàng (`StoreOwnerDashboardPage`).
  2. Header thiếu bộ chọn chu kỳ thời gian (Time Filter) linh hoạt để người quản trị SaaS theo dõi doanh thu MRR theo tháng/quý/năm.
  3. Biểu đồ doanh thu bị lỗi trục Y nghiêm trọng: Hiển thị giá trị `8460000M đ`, `9240000M đ` do áp đặt `stepSize: 15` và hàm format `${value}M đ` sai, dẫn đến chữ bị đè lấn tạo thành mảng đen khó nhìn.
  4. 4 thẻ KPI đầu trang hiển thị cùng một icon mặc định (icon ngôi nhà), thiếu tính biểu thị ngữ cảnh trực quan (Doanh thu MRR, Khách thuê, Điểm bán, Khẩn cấp).
  5. Bố cục thiếu phân tầng Module: Không có thẻ tổng quan Cơ cấu gói cước SaaS, không có khối tóm tắt Mạng lưới điểm bán và Giám sát hệ thống máy chủ tự động.

- **Mục tiêu đạt được**:
  1. Tái thiết kế toàn diện theo đúng chuẩn bố cục và phong cách của Store Owner Dashboard: Tinh gọn, hiện đại, bo góc mềm 22px-24px, màu sắc chủ đạo Deep Teal (`#0F766E`), nền trắng bóng đổ nhẹ, thông số sắc nét.
  2. Khắc phục triệt để lỗi hiển thị trục Y của biểu đồ doanh thu.
  3. Thiết lập hệ thống lưới 3 tầng chuẩn SaaS: 4 thẻ KPI nền tảng; Lưới trọng tâm (Primary Grid: 1.65fr : 1fr); Lưới vận hành (Operations Grid: 3 cột 1fr : 1fr : 1fr).
  4. Đảm bảo 100% các modal nghiệp vụ (Chi tiết tenant, Gia hạn ân hạn, Khóa mềm/khóa cứng) và unit tests chạy hoàn hảo.

---

### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
- `src/pages/admin/adminDashboard.css` (Tạo mới):
  - Định nghĩa toàn bộ hệ thống lớp giao diện `.admin-dash-*` đồng bộ với chuẩn `.owner-dash-*`: `.admin-dash-header`, `.admin-dash-eyebrow`, `.admin-dash-controls`, `.admin-dash-kpis`, `.admin-dash-primary-grid`, `.admin-dash-operations-grid`, `.admin-dash-stat-trio`, `.admin-dash-metric-total`, `.admin-dash-pulse`.
  - Hỗ trợ đầy đủ responsive trên Tablet (1200px), Mobile (760px, 480px).
- `src/features/admin/components/dashboard/KpiCard.tsx` (Chỉnh sửa):
  - Cập nhật hàm `renderIcon()` ánh xạ linh hoạt theo cả `metric.id` và `metric.icon`: `TrendingUpIcon` cho MRR, `StoreIcon` cho Khách thuê, `CheckCircleIcon` cho Nâng cấp/Chi nhánh, `AlertTriangleIcon` cho Sự việc cần xử lý.
  - Bổ sung `data-testid={`kpi-${metric.id}`}` giúp các bộ kiểm thử tự động nhận diện chính xác.
- `src/features/admin/components/dashboard/DashboardAnalyticsChart.tsx` (Chỉnh sửa):
  - Loại bỏ hoàn toàn cấu hình `stepSize: 15` và `stepSize: 30` gây lỗi trục Y.
  - Viết lại hàm `callback` định dạng tiền tệ thông minh: tự động chuyển đổi `>= 1.000.000` thành `X.XM đ`, `>= 1.000` thành `XK đ` và `maxTicksLimit: 6`, loại bỏ triệt để hiện tượng tràn nhãn đè lấn nhau.
- `src/pages/admin/AdminDashboardPage.tsx` (Chỉnh sửa):
  - Tái cấu trúc giao diện theo mô hình 3 tầng của Store Owner Dashboard.
  - Tầng 1: Header thẻ bo góc mềm với Dropdown Thời gian (`Tháng này`, `Quý 4/2026`, `Năm 2026`), nút Quản lý cửa hàng và nút Làm mới xoay mượt mà. Kế tiếp là Hàng 4 thẻ KPI nền tảng.
  - Tầng 2: Primary Grid kết hợp Biểu đồ Doanh thu MRR (cột trái 65%) và Cơ cấu Gói dịch vụ SaaS (cột phải 35%) với thanh tiến trình trực quan và box tổng MRR/ARR nổi bật.
  - Tầng 3: Operations Grid 3 cột vận hành (Sự việc cần can thiệp với mini list 3 tenant khẩn cấp; Mạng lưới điểm bán; Giám sát hệ thống 4/4 cronjobs).
  - Tầng 4: Bảng đầy đủ chi tiết Can thiệp khẩn cấp (`UrgentAlertTable`) và các Modal tác vụ nhanh.

---

### 3. Kiểm Thử & Xác Nhận (Verification)
- [x] Chạy Unit Tests `npm test -- AdminDashboardPage.test.tsx`: Pass 3/3 tests (100%).
- [x] Chạy Full Build `npm run build`: Thành công 100% trong 1.49s, không phát sinh bất kỳ lỗi TypeScript hay Vite bundling nào.
- [x] Đã kiểm tra tính tương thích và bảo toàn trạng thái của các Modal: `TenantDetailModal`, `ExtendGraceModal`, `ApplyLockModal`.
- [x] Tuân thủ quy định: Giữ nguyên thay đổi tại working tree, **không tự ý commit git**.

---

### 4. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
- **Mức độ rủi ro**: Rất thấp (Low Risk). Thay đổi hoàn toàn nằm ở tầng UI/Layout Presentation và CSS Styling của Admin Dashboard, không tác động tới backend hay schema CSDL.
- **Tệp cần lưu tâm**:
  - `src/pages/admin/AdminDashboardPage.tsx`
  - `src/pages/admin/adminDashboard.css`
  - `src/features/admin/components/dashboard/DashboardAnalyticsChart.tsx`
- **Hậu merge**: Không cần chạy database migration. Giao diện dev server tại `http://localhost:5173/admin/dashboard` sẽ tự động cập nhật ngay lập tức.
