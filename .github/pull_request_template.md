## 📝 ĐẶC TẢ PULL REQUEST (MERGE REQUEST)

### 👤 1. Thông Tin Tác Giả & Người Thực Hiện
- **Tác giả chính (Code Owner)**: `@github_username` (Họ tên - MSSV)
- **Đồng tác giả (Co-authors nếu có)**: `@github_username` (Họ tên - MSSV)
- **Mã tính năng / Ticket**: `FE-xx` hoặc `BUG-xx`
- **Nhánh nguồn (Source Branch)**: `feat/...` ➔ **Nhánh đích (Target)**: `dev`

---

### 📊 2. Bảng Phân Bổ Code Chi Tiết (Minh Bạch Đóng Góp)
> *Ghi rõ ai chịu trách nhiệm viết component/module nào để phục vụ chấm điểm đồ án & đối soát:*

| Thành viên (MSSV) | File / Component đã viết hoặc sửa | Tỷ lệ đóng góp |
| :--- | :--- | :---: |
| Nguyễn Văn A (SE18xxxx) | `src/features/.../AdminDashboardPage.tsx` | 60% |
| Trần Văn B (SE18xxxx) | `src/features/.../TenantDataTable.tsx` | 40% |

---

### 📑 3. Hồ Sơ Kiểm Chứng & Nhật Ký Phát Triển (Bắt Buộc)
- **File Worklog đính kèm**: [`docs/worklogs/YYYY-MM-DD_FE-xx_Name_mo-ta.md`](./docs/worklogs/)
- **Change ID trong OpenSpec (nếu có)**: `openspec/changes/...`

---

### 🔍 4. Tóm Tắt Thay Đổi Kỹ Thuật
1. ...
2. ...

---

### 🧪 5. Checklist Tự Kiểm Tra (Self-Verification)
- [ ] **Đúng thông tin tác giả**: Đã cấu hình đúng `user.name` và `user.email` khớp tài khoản GitHub.
- [ ] **Bảo toàn tác giả khi merge**: Admin/Lead lưu ý chọn **"Create a merge commit"** (KHÔNG dùng Squash để tránh mất commit của thành viên).
- [ ] **Kiểm thử tự động**: Chạy `npm run build` thành công (0 lỗi, 0 warning).
- [ ] **Không conflict**: Đã rebase / merge mới nhất từ `dev`.

---

### ⚖️ 6. Cam Kết Bản Quyền Đồ Án
- [x] Tôi xác nhận phần code trên do chính tôi (và các thành viên được liệt kê) thực hiện theo phân công của nhóm.
