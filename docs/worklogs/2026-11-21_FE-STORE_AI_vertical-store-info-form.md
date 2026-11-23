# Worklog: Chuyển đổi giao diện Form Thông tin cửa hàng sang bố cục dọc (Vertical Layout)

- **Ngày thực hiện**: 2026-11-21
- **Mã Task / FE**: FE-STORE / Store Hub
- **Tác giả**: AI Assistant
- **Mô tả ngắn**: Tái cấu trúc form nhập liệu `StoreInfoTab.tsx` từ dạng lưới ngang 4 cột sang bố cục xếp chồng theo chiều dọc (vertical column stack), giúp form trực quan, chuẩn UI settings KiotViet/SaaS và không bị kéo dãn kỳ dị trên màn hình rộng.

---

## 1. Mục đích (Why)
- Trước đó, các trường nhập liệu trong thẻ "Thông tin cửa hàng" (`Tên cửa hàng *`, `Số điện thoại liên hệ`, `Mã số thuế`, `Tỉnh / Thành phố`) được đặt trong lưới CSS Grid với `repeat(auto-fit, minmax(240px, 1fr))`.
- Trên màn hình độ phân giải rộng (1920px+), 4 trường này bị dàn ngang thành 1 hàng duy nhất gây mất cân đối thị giác, khó quan sát và trường "Địa chỉ" bị kéo dãn tràn bề ngang.
- Khách hàng yêu cầu sắp xếp lại theo chiều dọc ("sửa cho tôi thành cách xếp theo chiều dọc cho tôi") nhằm đảm bảo trải nghiệm nhập liệu tự nhiên, chuẩn form cài đặt của hệ thống bán lẻ.

---

## 2. Danh sách file & Nội dung đã sửa (What)
1. **`project/MT_GRMS_FRONTEND/src/pages/store/components/StoreInfoTab.tsx`**:
   - Chuyển container chứa các input từ `display: grid; gridTemplateColumns: repeat(...)` sang `display: flex; flexDirection: column; gap: 16; maxWidth: 640`.
   - Mỗi trường dữ liệu (`Tên cửa hàng *`, `Số điện thoại liên hệ`, `Mã số thuế`, `Tỉnh / Thành phố`, `Địa chỉ`) xếp theo hàng dọc độc lập kèm placeholder trực quan.
   - Bổ sung `maxWidth: 640px` cho khối form và phần "Gói dịch vụ" để layout gọn gàng, thanh lịch, dễ nhìn trên cả desktop lớn và mobile.
   - Đặt nút submit "Lưu thay đổi" nằm ngay phía dưới các input theo chiều dọc form.

---

## 3. Chi tiết kỹ thuật (Technical Highlights)
- **Component**: `StoreInfoTab` (`src/pages/store/components/StoreInfoTab.tsx`).
- **Responsive**: Chiều rộng tối đa 640px với `box-sizing: border-box`, tương thích hoàn toàn trên cả màn hình nhỏ lẫn màn hình siêu rộng 2K/4K.
- **Breaking changes**: Không có breaking change. 100% contracts và event handlers `onUpdateStoreInfo`, validation số điện thoại, tên cửa hàng được bảo toàn trọn vẹn.

---

## 4. Kết quả kiểm thử (Verification)
- **Unit Test**: `npm test -- StoreInfoTab.test.tsx --run` -> **PASS (6/6 tests)**.
- **Frontend Build**: `npm run build` -> Đã hoàn tất thành công.

---

## 5. Ghi chú cho Manager khi duyệt & merge (Manager Merge Notes)
- **Mức độ rủi ro**: Rất thấp (Low) - Chỉ thay đổi bố cục CSS Flexbox/Layout của component `StoreInfoTab`.
- **Lưu ý**: Tuân thủ quy định không tự ý commit/push code lên Git khi chưa có lệnh từ người dùng.
