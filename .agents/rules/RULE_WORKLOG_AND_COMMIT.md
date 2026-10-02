# RULE: BẮT BUỘC GHI FILE WORKLOG TÓM TẮT (.MD) CHO FRONTEND

> **Mã quy tắc**: `RULE-01-WORKLOG-FRONTEND`  
> **Repository**: `MT_GRMS_FRONTEND` (React 19 / TypeScript / Vite)  
> **Mục tiêu**: Giúp Quản lý (Manager / Lead Reviewer) dễ dàng kiểm soát thay đổi, review diff nhanh chóng và merge an toàn không phát sinh xung đột.

---

## 1. Hành Động Bắt Buộc Khi Code & Commit

Mỗi khi AI Coding Agent hoặc Developer:
- Viết mới hoặc sửa đổi code trong `src/` (components, pages, services, store, types...).
- Sửa lỗi UI/UX, tích hợp API, refactor giao diện.
- Chuẩn bị tạo Git Commit hoặc mở Pull Request.

**BẮT BUỘC THỰC HIỆN ĐỦ 4 BƯỚC:**

### Bước 1: Tạo / Cập Nhật File Tóm Tắt Markdown (.md)
- Lưu tại: `docs/worklogs/YYYY-MM-DD_<MÃ_TASK>_<AUTHOR>_<MÔ_TẢ_NGẮN>.md`
  *(Ví dụ: `2026-10-02_FE-01_TAM_product-table-component.md`)*
- Khung mẫu:
  ```markdown
  # WORKLOG: [MÃ_TÍNH_NĂNG] - [TIÊU_ĐỀ_NGẮN_GỌN]

  - **Ngày thực hiện**: YYYY-MM-DD
  - **Người thực hiện**: [Tên thành viên / AI Agent]
  - **Nhánh Git (Branch)**: `feat/FE-xx-...` hoặc `fix/...`
  - **Mã tính năng liên kết**: [FE-xx](../../../DOCS_MT_GRMS/specs/FE-xx/spec.md)
  - **Loại thay đổi**: [Feature / Bugfix / Refactor / UI-UX]

  ---

  ### 1. Mục Đích Thay Đổi (Why)
  - [Giải thích ngắn gọn lý do thay đổi và màn hình/chức năng được bổ sung]

  ### 2. Danh Sách Tệp Đã Sửa Đổi & Thêm Mới (What)
  - `src/components/...`: [Thêm/sửa component nào]
  - `src/pages/...`: [Màn hình nào được cập nhật]
  - `src/services/...`: [Gọi API nào từ Backend]
  - `src/types/...`: [Định nghĩa kiểu dữ liệu nào]

  ### 3. Chi Tiết UI/UX & API Integration
  - **Route & Đường Dẫn Màn Hình**: `/dashboard/...`
  - **Endpoint Backend Được Gọi**: `[GET / POST] /api/v1/...`
  - **Breaking Changes / Side Effects**: [Có ảnh hưởng trang khác không]

  ### 4. Kiểm Thử & Xác Nhận (Verification)
  - [x] Đã chạy `npm run build`: Thành công (0 lỗi TypeScript).
  - [x] Đã kiểm tra trực tiếp trên giao diện trình duyệt.

  ### 5. Ghi Chú Cho Manager Khi Duyệt & Merge (Manager Merge Notes)
  - **Mức độ rủi ro**: [Thấp / Trung bình / Cao]
  - **File trọng yếu cần review**: `[Tên file]`
  - **Hướng dẫn Manager test nhanh**: [Đăng nhập tài khoản nào, vào URL nào để thấy kết quả]
  ```

### Bước 2: Cập Nhật CHANGELOG.md
- Thêm 1-2 gạch đầu dòng vào `CHANGELOG.md` dưới mục `[Unreleased]` tương ứng (Added / Changed / Fixed).
- Dẫn link tới file worklog vừa tạo.

### Bước 3: Commit Git Kèm File Worklog
- Bắt buộc `git add` file worklog `.md` chung lượt với code.
- Commit message:
  ```text
  <type>(<scope>): <mô tả ngắn> [worklog: docs/worklogs/<tên-file>.md]
  ```

### Bước 4: Tạo Pull Request
- Đính kèm link file worklog `.md` vào phần mô tả PR.
- Manager duyệt PR dựa trên tóm tắt này và tiến hành merge.
