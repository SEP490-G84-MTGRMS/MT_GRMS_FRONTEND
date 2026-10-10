# AGENTS.md — Quy Định Dành Cho AI Agent & Developer tại MT_GRMS_FRONTEND

> **Dự án**: MT_GRMS_FRONTEND (React 19 / TypeScript / Vite / TailwindCSS / Ant Design)  
> **Quy tắc cốt lõi**: `RULE-WORKLOG-AND-COMMIT`

---

## 📌 QUY TẮC BẮT BUỘC: GHI FILE WORKLOG (.MD) KHI CODE & COMMIT

Bất kỳ khi nào AI Agent hoặc Developer thực hiện viết code, sửa code, chỉnh sửa UI, refactor hoặc chuẩn bị commit trong repository này:

### 1. Hành Động Bắt Buộc:
1. **Tạo / Cập nhật file Markdown tóm tắt** tại `docs/worklogs/`:
   - Tên file: `YYYY-MM-DD_<MÃ_TÍNH_NĂNG>_<AUTHOR>_<MÔ_TẢ_NGẮN>.md`
   - *Ví dụ*: `2026-10-02_FE-01_TAM_product-table-component.md`, `2026-10-02_FE-05_AI_batch-stock-modal.md`.
   - Có thể sao chép khung mẫu chuẩn từ [`docs/worklogs/WORKLOG_TEMPLATE.md`](./docs/worklogs/WORKLOG_TEMPLATE.md).

2. **Nội Dung Bắt Buộc Phải Có Trong File Worklog**:
   - **Mục đích thay đổi (Why)**: Bài toán giải quyết, lý do thay đổi giao diện hoặc logic.
   - **Danh sách file & Tóm tắt chi tiết (What)**: Liệt kê cụ thể từng file trong `src/` (components, pages, services, hooks, types) và tóm tắt những gì đã sửa đổi/thêm mới.
   - **Thay Đổi UI/UX & API Integration**:
     - Component mới / UI flow.
     - API integration: Endpoint nào đã được gọi, DTO types tương ứng.
     - Breaking changes: Có làm ảnh hưởng trang nào khác không.
   - **Kết quả kiểm thử**:
     - `npm run build`: 0 lỗi biên dịch TypeScript/Vite.
     - Đã test hiển thị và tương tác trực tiếp trên giao diện trình duyệt.
   - **Chỉ Dẫn Dành Cho Manager Khi Duyệt & Merge PR**:
     - Đánh giá mức độ rủi ro (Low / Medium / High).
     - Các file Manager cần review kỹ nhất.
     - Hướng dẫn test nhanh giao diện (đường dẫn URL, tài khoản test, điều kiện dữ liệu).

3. **Cập Nhật CHANGELOG.md**:
   - Thêm 1-2 dòng tóm tắt công việc vào [`CHANGELOG.md`](./CHANGELOG.md) dưới mục `[Unreleased]`.

4. **Khi Commit Code**:
   - File worklog markdown PHẢI được `git add` và commit cùng lượt với các file code Frontend.
   - Commit message mẫu:
     ```text
     feat(FE-xx): <tóm tắt ngắn> [worklog: docs/worklogs/<tên-file>.md]
     ```

5. **Khi Mở Pull Request**:
   - Dán đường dẫn file worklog markdown vào phần mô tả PR theo [`pull_request_template.md`](./.github/pull_request_template.md).
   - Manager duyệt PR dựa trên tóm tắt này để merge an toàn.

<!-- sep-kit:start -->
## Quy trình SEP (team-ai-knowledge)

Repo này làm theo quy trình SEP 6 bước: `/sep-spec` → `/sep-brainstorm` → `/sep-verify-spec` → `/sep-apply` → `/sep-test` → `/sep-archive`
(xem tiến độ: `/sep-status`). Mỗi bước kết thúc bằng Approve/Reject của user. Artifact nằm trong
`D:/FPT_University/Final/Grade/new/project/ai-team-kit/team-ai-knowledge/openspec/` và chỉ được ghi qua MCP server "sep".

Rules chi tiết: `.cursor/rules/sep-kit-*.mdc` (Cursor), `.agents/rules/sep-kit-*.md` (Antigravity) —
sinh từ `sep-kit/rules` (karpathy-coding, mt-grms-stack, multi-agent-review, sep-knowledge, sep-workflow). Cập nhật: `npm run sep -- init <repo>`.
<!-- sep-kit:end -->
