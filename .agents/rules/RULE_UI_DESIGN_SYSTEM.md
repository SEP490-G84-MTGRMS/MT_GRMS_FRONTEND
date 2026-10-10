# RULE: QUY CHUẨN THIẾT KẾ GIAO DIỆN BO TRÒN (KIOTVIET STYLE) & CẤM HIỆU ỨNG NHÚNG NHẢY

> **Mã quy tắc**: `RULE-UI-DESIGN-SYSTEM`  
> **Phạm vi áp dụng**: Toàn bộ dự án MT-GRMS (bao gồm giao diện mẫu `project/Html/` và toàn bộ mã nguồn Frontend React 19 SPA tại `project/MT_GRMS_FRONTEND/`).  
> **Đối tượng bắt buộc**: Toàn bộ AI Coding Agents (Antigravity, Gemini, Copilot...) và Lập trình viên Frontend trong nhóm SEP490-G84.  
> **Mục tiêu**: Chuẩn hóa phong cách giao diện hiện đại, thân thiện, đáng tin cậy theo chuẩn mực SaaS bán lẻ Việt Nam (tham khảo KiotViet); ngăn chặn triệt để các phong cách "AI-generated" vụng về và hiệu ứng chuyển động nhún nhảy gây khó chịu cho người dùng.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Mã Màu HomePage Là Phong Cách Chính Xuyên Suốt Toàn Dự Án**:
   - Toàn bộ các trang (Trang chủ Landing, Quầy thu ngân POS, Bảng điều khiển Dashboard, Quản lý kho Catalog, Sổ quỹ, Mini Web Store, Màn hình đăng nhập...) **BẮT BUỘC** sử dụng đồng nhất bảng màu chuẩn KiotViet Brand Blue Palette từ HomePage (`#0066FF`, `#F7FAFF`, `#00C2FF`, `#00C853`, `#FF9500`, `#FF3B30`).
   - Cấm sử dụng các mã màu ngẫu nhiên hoặc phong cách giao diện lạc tông giữa các trang.
2. **Quy Tắc Component Hóa: MỖI THẺ (CARD) & KHỐI PHẢI TẠO COMPONENT RIÊNG**:
   - **Mỗi thẻ UI (Card, Stat Card, Banner, Feature Card, Service Card, Modal, Table Item, Filter Bar...) PHẢI được bóc tách thành một Component độc lập** (file `.tsx` riêng) trong thư mục `components/` hoặc `features/<feature>/components/`.
   - **Tuyệt đối CẤM viết mã nguyên khối (Monolithic)**: Không nhồi nhét hàng trăm dòng JSX vào một file Page duy nhất.
   - Mỗi component phải có Type / Props rõ ràng, logic tương tác độc lập và hỗ trợ tái sử dụng tối đa.
3. **Thẩm mỹ chuẩn KiotViet & Bán Lẻ Chuyên Nghiệp**:
   - Sử dụng phông chữ **`Be Vietnam Pro`**, kết hợp phong cách bo tròn toàn diện mềm mại (Pill-shaped buttons `border-radius: 9999px` & Rounded cards `24px - 28px`).
4. **Giao diện Tĩnh & Vững Chãi (Solid & Grounded)**:
   - Phần mềm quản lý bán hàng tại quầy phục vụ người thật, cô chú lớn tuổi thao tác cả ngày, cần sự **ổn định, sắc nét và đáng tin cậy**.
   - Tuyệt đối không dùng các hiệu ứng chuyển động rung lắc, bay bổng, nhún nhảy làm phân tâm thị giác.
5. **Thiết kế vì người bán tạp hóa Việt Nam**:
   - Chữ to, số to, tương phản cao đạt chuẩn WCAG AA.
   - Thể hiện rõ các nghiệp vụ cốt lõi: Quản lý date FEFO 3 mức màu, chuyển đổi đa đơn vị thùng/lon, VietQR động khớp tiền tự động và sổ nợ Zalo.

---

## 2. Quy Chuẩn Kỹ Thuật Chi Tiết (Design System Specifications)

### 2.1. Bảng Màu Thương Hiệu Chủ Đạo (Color Palette Standard)
Được định nghĩa xuyên suốt tại `src/index.css`:
- **Primary Blue Palette**:
  - Main Primary: `#0066FF` (`--blue-primary`)
  - Hover: `#0052CC` (`--blue-hover`)
  - Deep / Active: `#003D99` (`--blue-dark`)
  - Soft Light: `#F0F6FF` (`--blue-light`)
  - Subtle Blue: `#E8F1FF` (`--blue-subtle`)
  - Border Blue: `#DBE9FE` (`--blue-border`)
  - Cyan Accent: `#00C2FF` (`--cyan-accent`)
- **Nền trang & Bề mặt (Surfaces)**:
  - Nền trang chủ đạo: Xanh da trời nhạt dịu mắt `#F7FAFF` (`--bg-soft-blue`)
  - Nền thẻ (Card Surface): Trắng thuần `#FFFFFF` (`--bg-card`)
  - Đường viền thẻ (Card Border): `#EDF2F9` (`--border-light`) / `#E5EDF8` (`--border-subtle`)
- **Màu sắc trạng thái nghiệp vụ bán lẻ**:
  - Tiền tệ / Doanh thu / Trạng thái tốt: `#00C853` (Nền: `#E8F9EE`, Viền: `#BBF7D0`)
  - Cảnh báo cận hạn FEFO mức trung bình (8 - 15 ngày): `#FF9500` (Nền: `#FFF8EB`, Viền: `#FFE8CC`)
  - Cảnh báo cận hạn FEFO khẩn cấp ($\le 7$ ngày): `#FF3B30` (Nền: `#FFF0F0`, Viền: `#FFD6D6`)

### 2.2. Phông Chữ & Typography
- **Phông chữ chính (Sans-serif)**: Bắt buộc dùng `'Be Vietnam Pro', -apple-system, sans-serif`.
  - Tiêu đề lớn (Hero Title): `font-weight: 800`, `letter-spacing: -0.025em`.
  - Tiêu đề khu vực (Section Heading): `font-weight: 800`, `letter-spacing: -0.02em`.
  - Tiêu đề thẻ (Card Title): `font-weight: 700`.
  - Nội dung thường: `font-weight: 400` hoặc `500`.
- **Phông số liệu & Mã vạch (Monospace)**: Dùng `'JetBrains Mono', Consolas, monospace` cho giá tiền, mã đơn hàng, số tồn kho. Bắt buộc kích hoạt `font-variant-numeric: tabular-nums;` để số liệu căn thẳng hàng.

### 2.3. Hệ Thống Bo Tròn (Border Radius Scale)
- **Chuẩn Full Pill (`border-radius: 9999px`)**:
  - Bắt buộc áp dụng cho: Toàn bộ nút bấm (`.btn`, CTA), thanh menu active, tất cả huy hiệu (`badge`, `pill-tags`), thanh tìm kiếm quét mã, bộ nút chọn phương thức thanh toán, nút chuyển đổi đơn vị (Thùng/Lon).
- **Thẻ Lớn (`border-radius: 24px - 28px`)**:
  - Bắt buộc áp dụng cho: Thẻ 3 tính năng nổi (`hero-floating-card`), thẻ quầy POS terminal, thẻ bảng tính ROI, bảng so sánh trực diện, thẻ bảng giá, modal dialogs.
- **Khung Màn Hình & Hình Ảnh (`border-radius: 32px - 36px`)**:
  - Áp dụng cho mockup màn hình laptop, tablet, showcase frame.

---

## 3. 🚨 ĐIỀU CẤM KỴ TUYỆT ĐỐI (STRICT FORBIDDEN RULES)

### ❌ CẤM 1: KHÔNG DÙNG HIỆU ỨNG NHÚNG NHẢY / ANIMATION RƯỜM RÀ
- **Tuyệt đối KHÔNG dùng**:
  - Các animation lặp vô tận (`animation: ... infinite;`).
  - Các keyframe nhún nhảy bồng bềnh (`@keyframes floatBounce`, `translateY` nhấp nhô liên tục).
  - Hiệu ứng rung lắc (shake), phóng to thu nhỏ nhịp thở (pulse scale) trên huy hiệu và thẻ nổi.
- **Quy tắc thay thế**:
  - Mọi thẻ nổi (floating badges, cards) phải được định vị **hoàn toàn tĩnh (static, fixed offset)**, đổ bóng mềm tự nhiên (`box-shadow: 0 14px 34px rgba(0, 30, 90, 0.12)`).
  - Hiệu ứng hover chỉ được thay đổi nhẹ về màu nền, viền (`border-color`) hoặc bóng đổ (`box-shadow`) với `transition: all 0.15s ease;`. **Không dùng `transform: translateY` hay `transform: scale` gây cảm giác rung rinh, nhảy giật**.

### ❌ CẤM 2: KHÔNG VIẾT MÃ MONOLITHIC / CẤM QUÊN TÁCH COMPONENT
- Không được viết hàng trăm dòng code HTML/JSX vào 1 file duy nhất.
- Mọi thẻ, danh sách, modal, banner đều phải được đóng gói thành Component có kiểu Typescript rõ ràng.

### ❌ CẤM 3: KHÔNG ĐỂ GÃY DÒNG TỪ KHÓA & TIÊU ĐỀ
- Tuyệt đối không để từ khóa thương hiệu (`MT-GRMS`), tên viết tắt hoặc số tiền (`56.000 đ`) bị ngắt dòng giữa chữ cái hoặc dấu gạch nối. Bắt buộc dùng `white-space: nowrap;` hoặc non-breaking hyphen `&#8209;`.
- Menu Header trên thanh điều hướng phải được giữ trên 1 dòng đơn (`white-space: nowrap`), không bao giờ để chữ tự ngắt thành 2 dòng làm phình chiều cao thanh header.

---

## 4. Checklist Nghiệm Thu UI Dành Cho Reviewer & Developer
- [ ] Đã sử dụng mã màu chuẩn KiotViet Brand Blue (`#0066FF`, `#F7FAFF`) chưa?
- [ ] **Mọi thẻ UI đã được bóc tách thành Component riêng biệt chưa?**
- [ ] Phông chữ đã nạp đúng `Be Vietnam Pro` và `JetBrains Mono` chưa?
- [ ] Toàn bộ nút bấm và huy hiệu đã bo tròn dạng Pill (`border-radius: 9999px`) chưa?
- [ ] Các thẻ chính đã bo góc `24px - 28px` với bóng đổ mềm mại chưa?
- [ ] **ĐÃ LOẠI BỎ TOÀN BỘ animation nhún nhảy / floatBounce chưa? Các thẻ nổi có nằm tĩnh và chắc chắn không?**
- [ ] Tên thương hiệu `MT-GRMS` và menu header có bị gãy dòng không?
