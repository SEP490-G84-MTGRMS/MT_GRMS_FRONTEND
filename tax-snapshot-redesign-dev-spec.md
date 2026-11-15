# Đặc tả thiết kế — Giao diện Thuế hộ kinh doanh

> Tài liệu bàn giao cho dev triển khai giao diện theo mockup `tax-snapshot-redesign-mockup.html`. Đây là đặc tả UI/UX; số liệu và thao tác trong mockup hiện là dữ liệu minh họa, không phải quy tắc nghiệp vụ cuối cùng.

## 1. Mục tiêu

- Tổ chức màn hình theo hai khu vực rõ ràng: **Tờ khai thuế** và **Sổ kế toán**.
- Giúp người dùng thấy ngay doanh thu lũy kế, mức tiến gần ngưỡng và trạng thái nghĩa vụ thuế.
- Tránh lặp doanh thu thành nhiều KPI. Số doanh thu lớn ở tổng quan là số chính; doanh thu tính thuế chi tiết được trình bày trong bảng tờ khai khi cần đối chiếu.
- Giảm chiều cao phần tổng quan, ưu tiên hiển thị nội dung nghiệp vụ trên màn hình đầu.
- Tách bạch thao tác xuất tờ khai, xuất một sổ và xuất trọn bộ sổ.

## 2. Khung màn hình và thứ tự nội dung

Thứ tự từ trên xuống:

1. **Thanh tiêu đề:** biểu tượng sản phẩm, nhãn “Quản lý tài chính”, tiêu đề “Thuế hộ kinh doanh”; phía phải có bộ chọn kỳ, menu thao tác khác và nút “Chốt kỳ”.
2. **Thẻ tổng quan doanh thu:** doanh thu lũy kế/năm, ngưỡng, trạng thái, tiến độ, giải thích ngưỡng có thể thu gọn; phía cuối chỉ có hai thông tin phụ: thuế dự kiến và hạn nộp. Không thêm KPI doanh thu tính thuế ở đây.
3. **Hai tab chính:** “Tờ khai thuế” và “Sổ kế toán”.
4. **Nội dung tab đang chọn.** Mặc định mở “Tờ khai thuế”.
5. **Ghi chú cuối trang** (nếu sản phẩm vẫn cần).

## 3. Thẻ tổng quan doanh thu

### Nội dung

- Nhãn: **Doanh thu năm {năm}**.
- Doanh thu lũy kế là con số có độ nhấn mạnh lớn nhất; hiển thị đơn vị và ngưỡng ngay cạnh, ví dụ `310.000.000 đ / 1 tỷ`.
- Trạng thái dạng pill, ví dụ “Chưa đến ngưỡng chịu thuế”. Cần hỗ trợ trạng thái phù hợp với kết quả tính thuế thực tế; không cố định nội dung minh họa.
- Dòng tiến độ thể hiện phần trăm đã đạt và số còn lại, ví dụ “Đã đạt 31% ngưỡng 1 tỷ” và “Còn 690 triệu đ”. Thanh tiến độ mảnh nằm ngay bên dưới.
- Không hiển thị thêm nhãn mốc `0 đ`/`1 tỷ đ` ở hai đầu thanh; ngưỡng đã được nêu trong số doanh thu và dòng tiến độ.
- Liên kết/nút “Xem chi tiết” mở phần giải thích ngưỡng. Mặc định đóng để tiết kiệm chiều cao.
- Cuối card có **hai** thông tin: “Thuế dự kiến kỳ này” và “Hạn nộp kỳ này”. Không hiển thị “Doanh thu tính thuế” ở đây vì trùng với số doanh thu lớn phía trên.

### Bố cục và kích thước

- Desktop: doanh thu và trạng thái cùng một hàng nếu đủ chỗ. Tiến độ chiếm toàn bộ chiều rộng nội dung bên dưới. Hai thông tin thuế/hạn nộp nằm trên cùng một hàng, chia đôi card, có đường phân cách nhẹ.
- Dùng padding gọn (tham chiếu mockup: 16–20 px), khoảng cách đứng nhỏ và không tạo card con riêng cho từng thông tin.
- Tránh để phần mô tả, tiến độ, KPI và khoảng trắng khiến card chiếm quá nhiều chiều cao. Card nên là một vùng tổng quan ngắn; nội dung chi tiết thuộc các tab bên dưới.
- Màu trạng thái cần có tương phản tốt; không truyền đạt trạng thái chỉ bằng màu.

## 4. Tab “Tờ khai thuế”

- Hiển thị tiêu đề/mã tờ khai, kỳ kê khai và địa điểm kinh doanh.
- Nhóm hành động ở phần đầu: **Xem trước**, **Xuất XML** và tùy chọn giảm VAT (nếu nghiệp vụ cho phép).
- Bảng tờ khai gồm ngành nghề, doanh thu tính thuế, GTGT, TNCN. Đây là nơi hiển thị doanh thu tính thuế chi tiết; không lặp lại thành KPI lớn trong thẻ tổng quan.
- Có ghi chú rõ số liệu là ước tính/tham khảo nếu chưa phải dữ liệu đã xác nhận.
- Tóm tắt thuế trong tờ khai cần nhất quán với phần “Thuế dự kiến kỳ này”; nếu thể hiện lại các thành phần GTGT/TNCN thì không tạo thêm một chỉ số doanh thu tổng quan.

## 5. Tab “Sổ kế toán”

- Chia layout desktop thành danh sách mẫu sổ bên trái và nội dung sổ đang chọn bên phải.
- Danh sách có đủ bảy mẫu: **S1a, S2a, S2b, S2c, S2d, S2e, S3a**. Hiển thị mã và tên; mẫu đang chọn có nền/nhấn mạnh trạng thái active.
- Cuối danh sách bên trái có một nút **“Xuất trọn bộ 7 sổ”**. Chỉ một nút xuất toàn bộ trong khu vực này, không lặp thêm card xuất bộ.
- Header nội dung sổ hiển thị tên sổ, kỳ/mẫu và hai hành động: **In sổ** và **Xuất sổ này**. Nút xuất phải xuất đúng sổ hiện được chọn.
- Khi đổi sổ: cập nhật trạng thái active, tiêu đề/mã sổ, dữ liệu bảng, chỉ số liên quan (nếu có) và ngữ cảnh nút xuất. Không để nhãn/nội dung vẫn là sổ trước.
- Bảng thay đổi cột theo loại sổ thực tế. Dữ liệu trống cần có empty state hữu ích, không để vùng trắng không giải thích.
- Các chỉ số trong chi tiết sổ (ví dụ doanh thu ghi nhận, số chứng từ, trạng thái) mô tả riêng dữ liệu sổ; không được sao chép nguyên KPI tổng quan thuế.

## 6. Responsive

### Desktop (trên 760 px)

- Giữ header trên một hàng khi đủ chiều rộng.
- Danh sách sổ và chi tiết sổ nằm cạnh nhau; danh sách tham chiếu rộng khoảng 250 px, phần chi tiết co giãn.
- Bảng có thể cuộn ngang trong container nếu các cột không thể thu gọn an toàn.

### Tablet/mobile (760 px trở xuống)

- Header và các nút được phép xuống dòng; không để tràn ngang viewport.
- Khu vực sổ chuyển thành một cột; danh sách mẫu sổ có thể xếp lưới hai cột, sau đó đến chi tiết sổ.
- Card tổng quan giảm padding; doanh thu vẫn là trọng tâm. Hai thông tin thuế/hạn nộp có thể xếp gọn hoặc xuống dòng tùy chiều rộng, không gây ép chữ.
- Tab phải cuộn/chia kích thước hợp lý, vùng chạm đủ lớn.

### Mobile nhỏ (480 px trở xuống)

- Ưu tiên nhãn và số liệu dễ đọc; không ép một dòng làm tràn card.
- Các bảng dùng cuộn ngang có chủ đích hoặc cách trình bày mobile tương đương; không thu nhỏ chữ đến mức khó đọc.
- Các nút thao tác giữ vùng chạm phù hợp và không chồng lên tiêu đề.

## 7. Hành vi và trạng thái

- **Chọn tab:** cập nhật tab active, `aria-selected` và panel tương ứng; chỉ panel đang chọn được hiển thị.
- **Xem chi tiết ngưỡng:** mở/đóng giải thích, cập nhật `aria-expanded` và nhãn hành động (“Xem chi tiết”/“Thu gọn”).
- **Chọn kỳ:** tải lại doanh thu, tiến độ, trạng thái, dự kiến thuế, hạn nộp, dữ liệu tờ khai và sổ theo kỳ đã chọn.
- **Chọn mẫu sổ:** cập nhật toàn bộ nội dung theo mã sổ đã chọn.
- **Xuất/ in:** nối đúng API hoặc quy trình hiện có; xử lý loading, lỗi, thành công và quyền truy cập. Không coi toast “Bản demo” trong mockup là triển khai thật.
- **Chốt kỳ:** phải có xác nhận và trạng thái kết quả; bảo vệ khỏi chốt lặp nếu nghiệp vụ yêu cầu.
- **Giảm VAT:** chỉ bật nếu phù hợp quy tắc nghiệp vụ; khi thay đổi phải tính lại dữ liệu liên quan và thể hiện nguồn/cách tính.
- Có trạng thái tải, lỗi, dữ liệu rỗng và dữ liệu không đủ điều kiện tính toán cho các vùng lấy dữ liệu từ API.

## 8. Hướng dẫn trình bày dữ liệu

- Định dạng tiền Việt Nam nhất quán (dấu phân cách hàng nghìn, hậu tố `đ`); không để số bị xuống dòng giữa chừng.
- Nêu rõ phạm vi thời gian: năm lũy kế hay kỳ kê khai; không dùng “doanh thu” chung chung nếu có nhiều khái niệm nghiệp vụ.
- Phân biệt **doanh thu lũy kế**, **doanh thu tính thuế**, **thuế dự kiến** bằng nhãn/định nghĩa. Chỉ số nào trùng nghĩa trong cùng vùng thì bỏ, không chỉ đổi cách viết.
- Dữ liệu minh họa trong mockup (ví dụ số tiền, ngày hạn nộp, trạng thái) không được hardcode vào giao diện production.

## 9. Accessibility và chất lượng

- Dùng cấu trúc heading theo thứ bậc; tab, tabpanel, switch và progressbar có tên/role/trạng thái truy cập được.
- Có thể thao tác bằng bàn phím; trạng thái focus nhìn thấy được.
- Kiểm tra tương phản chữ/nền và không dựa riêng vào màu để biểu thị trạng thái.
- Bảng có header rõ ràng; nút chỉ có icon có accessible name.
- Tránh layout shift khi tải dữ liệu hoặc đổi tab/kỳ.

## 10. Tiêu chí nghiệm thu

- [ ] Màn hình có đúng hai tab chính: “Tờ khai thuế” và “Sổ kế toán”.
- [ ] Thẻ tổng quan chỉ có một con số doanh thu nổi bật; không có KPI “Doanh thu tính thuế” lặp lại.
- [ ] Card tổng quan có tiến độ, trạng thái và chỉ hai thông tin phụ là thuế dự kiến/hạn nộp; không có mốc 0/1 tỷ lặp dưới thanh.
- [ ] “Xem chi tiết” mở/đóng phần giải thích và mặc định không chiếm diện tích.
- [ ] Có đủ bảy mẫu sổ; chọn mẫu nào thì tiêu đề, dữ liệu và nút xuất đều theo mẫu đó.
- [ ] Xuất trọn bộ nằm ở danh sách sổ; xuất sổ đang chọn nằm trong header chi tiết; không có card xuất trùng.
- [ ] Layout sử dụng được ở desktop, tablet và mobile từ chiều rộng 320 px; không có tràn ngang ngoài vùng bảng được chủ đích cuộn.
- [ ] Các thao tác thật có loading/error/success phù hợp; dữ liệu và phép tính lấy từ nghiệp vụ/API, không dùng số mockup.
- [ ] Keyboard, focus, accessible name và trạng thái ARIA được kiểm tra.

## 11. Tham chiếu

- Mockup hiện tại: `tax-snapshot-redesign-mockup.html`.
- Tài liệu này mô tả mục tiêu và hành vi mong muốn; khi có khác biệt về nghiệp vụ thuế, quy tắc đã được xác nhận bởi product/BA và backend là nguồn quyết định, không dùng nội dung dữ liệu minh họa trong mockup làm căn cứ tính thuế.