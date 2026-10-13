# AGENTS.md — Quy Định Dành Cho AI Agent & Developer tại MT_GRMS_FRONTEND

> **Dự án**: MT_GRMS_FRONTEND (React 19 / TypeScript / Vite / TailwindCSS / Ant Design)  
> **Cơ chế quản lý tập trung**: AI Team Kit (SEP Kit 6 Bước & OpenSpec)

---

## 📌 QUY TRÌNH PHÁT TRIỂN & QUẢN LÝ CODE TẬP TRUNG (AI TEAM KIT)

Toàn bộ quy trình từ đặc tả, chia việc theo người phụ trách, phản biện review UI/UX, kiểm soát code hoàn thành và nghiệm thu merge PR được quản lý tập trung qua **AI Team Kit** (`ai-team-kit/team-ai-knowledge/openspec/`).

### 1. Phân Chia Công Việc Theo Từng Thành Viên (Assignee)
- Mỗi tính năng hoặc bugfix UI là một **Change** trong OpenSpec:
  - Khi bắt đầu, dev/agent chạy:
    ```bash
    /sep-spec <Mô tả chức năng/lỗi cần làm>
    ```
  - MCP Server tự động ghi nhận người phụ trách (`assignee: @github_username`).
  - Mỗi thành viên phụ trách UI (Tâm, Đức, Sơn, An, Nhật...) làm việc trên Change tương ứng của mình.

### 2. Đẩy Lên Review Đa Chiều (Persona Multi-Agent Review)
- Trước khi code UI/logic, ở bước **3: `/sep-verify-spec`**, hệ thống bắt buộc chạy review 5 chiều:
  - **Skeptic** (`review/skeptic.md` - Bắt buộc): Phản biện trạng thái Loading, Empty, Error state, khả năng xử lý bất đồng bộ, responsiveness.
  - **Codebase Reviewer** (`review/codebase.md`): Kiểm tra quy chuẩn KiotViet Style (Solid & Stable, bo tròn Full Pill / 24-28px, phông chữ `Be Vietnam Pro`, cấm animation nhún nhảy vô tận).
  - **Guardian** (`review/guardian.md`): Kiểm tra phân quyền UI theo Role & Tenant isolation.
  - **Advocate** (`review/advocate.md`): Tối ưu trải nghiệm thu ngân/quản lý kho, thao tác phím tắt, tốc độ POS.

### 3. Quản Lý Tiến Độ Code Đã Làm (Tasks Checklist)
- Các đầu việc UI được bóc tách chi tiết trong `tasks.md`:
  1. Types & DTO contracts khớp với Backend.
  2. API Services & TanStack Query hooks.
  3. UI Components theo đúng Design System chuẩn KiotViet.
  4. Trang chức năng (Page) & Routing.
  5. Kiểm thử tương tác người dùng.
- Ở bước **4: `/sep-apply`**, chỉ khi toàn bộ checklist trong `tasks.md` được đánh dấu `[x]` thì mới được chuyển sang bước kiểm thử.

### 4. Nghiệm Thu Kiểm Thử Tự Động (Test Report Verification)
- Ở bước **5: `/sep-test`**, Agent/Dev bắt buộc chạy kiểm thử:
  ```bash
  npm run build
  ```
  (0 lỗi TypeScript, 0 lỗi Vite bundle) và kiểm tra giao diện trên trình duyệt thực tế.
- Kết quả được ghi vào `test-report.md` với `verdict: PASS`.

### 5. Hỗ Trợ Admin & Tech Lead Review & Merge PR An Toàn
Admin / PM chỉ cần thực hiện 2 thao tác để kiểm tra trước khi bấm Merge PR trên GitHub:
1. **Kiểm tra danh sách và tiến độ toàn team**:
   ```bash
   cd ai-team-kit/team-ai-knowledge
   npm run sep -- list --all
   ```
2. **Kiểm tra chi tiết change cần merge**:
   ```bash
   npm run sep -- status <tên-change>
   ```
3. **Tiêu chí Admin cho phép Merge**:
   - [x] Change đã vượt qua bước Verify Spec và có persona review đầy đủ.
   - [x] 100% tasks trong `tasks.md` đã tick `[x]`.
   - [x] `test-report.md` đạt `verdict: PASS`.
   - [x] Giao diện tuân thủ quy chuẩn thiết kế, không có hiệu ứng rung lắc/nhún nhảy.
4. **Sau khi Merge**: Chạy `/sep-archive <tên-change>` để đóng change và lưu spec vào `openspec/specs/`.

<!-- sep-kit:start -->
## Quy trình SEP (team-ai-knowledge)

Repo này làm theo quy trình SEP 6 bước: `/sep-spec` → `/sep-brainstorm` → `/sep-verify-spec` → `/sep-apply` → `/sep-test` → `/sep-archive`
(xem tiến độ: `/sep-status`). Mỗi bước kết thúc bằng Approve/Reject của user. Artifact nằm trong
`D:/Sourse_code_Do_An/ai-team-kit/team-ai-knowledge/openspec/` và chỉ được ghi qua MCP server "sep".

Rules chi tiết: `.cursor/rules/sep-kit-*.mdc` (Cursor), `.agents/rules/sep-kit-*.md` (Antigravity) —
sinh từ `sep-kit/rules` (karpathy-coding, mt-grms-stack, multi-agent-review, sep-knowledge, sep-workflow). Cập nhật: `npm run sep -- init <repo>`.
<!-- sep-kit:end -->
