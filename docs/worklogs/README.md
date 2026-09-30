# THƯ MỤC QUẢN LÝ WORKLOG NỘI BỘ FRONTEND

> **Quy định**: Mọi commit hoặc Pull Request trong repository này **BẮT BUỘC** phải có 1 file worklog `.md` lưu trong thư mục này.  
> **Quy tắc gốc**: Xem [`DOCS_MT_GRMS/rules/RULE_WORKLOG_AND_COMMIT.md`](../../../DOCS_MT_GRMS/rules/RULE_WORKLOG_AND_COMMIT.md)

---

## 📌 Cách Tạo File Worklog

1. Sao chép mẫu từ file [`WORKLOG_TEMPLATE.md`](./WORKLOG_TEMPLATE.md).
2. Đặt tên file theo cú pháp:
   ```text
   YYYY-MM-DD_FE-<ID>_<AUTHOR>_<MOTA_NGAN>.md
   ```
   *Ví dụ*:
   - `2026-10-01_FE-01_TAM_product-catalog-table.md`
   - `2026-10-02_FE-02_DUC_fefo-expiry-badge.md`
   - `2026-10-03_BUG-02_SON_fix-pos-cart-shortcut.md`
3. Điền đầy đủ: Mục đích, tệp UI đã sửa, API Backend đã kết nối, kết quả test.
4. Commit file `.md` này cùng với các file code React/TypeScript của bạn.
5. Sau khi PM merge PR, file này sẽ được PM dẫn link vào [`DOCS_MT_GRMS/PM_TRACKING_DASHBOARD.md`](../../../DOCS_MT_GRMS/PM_TRACKING_DASHBOARD.md).
