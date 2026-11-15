# Đặc tả bàn giao — Tổng quan tài chính & lãi lỗ

> Tài liệu dành cho dev triển khai giao diện theo mockup [`finance-overview-redesign-mockup.html`](./finance-overview-redesign-mockup.html). Mockup là tham chiếu UI/UX độc lập; số tiền, chi nhánh và dữ liệu biểu đồ trong đó chỉ mang tính minh họa, không phải số liệu giao dịch đã đối soát hoặc hợp đồng API/nghiệp vụ.

## 1. Mục tiêu

- Làm rõ tình hình tiền mặt hiện có và dòng tiền trong một kỳ có thể chọn.
- Tổ chức báo cáo trong hai tab: **Sức khỏe tiền mặt** và **Lãi lỗ (P&L)**.
- Gắn nhãn kỳ báo cáo rõ ràng vào dữ liệu dòng tiền và tiêu đề P&L; phân biệt số dư hiện tại (snapshot) với chỉ số phát sinh theo kỳ.
- Hỗ trợ người dùng xem nhanh toàn chuỗi hoặc từng chi nhánh và chọn khoảng ngày tùy ý trong P&L.
- Giữ bố cục gọn, dễ quét; không để chữ mặc định, tiêu đề hoặc số tiền tràn khỏi card ở desktop và mobile.

## 2. Phạm vi và nguyên tắc triển khai

- Mockup hiện tại là bản HTML standalone. Khi đưa vào ứng dụng, xây dựng bằng stack và quy ước hiện có của frontend React/TypeScript; không đưa nguyên file HTML hoặc CSS global của mockup vào production.
- Đặc tả này định nghĩa cấu trúc trình bày và hành vi mong muốn, không thay thế thiết kế API, quy tắc kế toán, phân quyền hay xác nhận nghiệp vụ.
- Số liệu trong mockup, bao gồm số dư, khoản nợ/quá hạn, số liệu dòng tiền, bảng chi nhánh và biểu đồ P&L, là **dữ liệu mẫu**. Chỉ hiển thị chúng như dữ liệu thực sau khi xác định được nguồn dữ liệu và mapping nghiệp vụ.
- Các thao tác như “Cập nhật”, xem chi tiết, chuyển chế độ kế toán là điểm tích hợp UI; kết nối API/điều hướng thực tế theo chức năng sẵn có. Không giả lập thành công như thể đã ghi nhận giao dịch.
- Không thay đổi phép tính số dư, cách ghi nhận thu/chi, cơ sở P&L hoặc logic kế toán chỉ dựa vào ví dụ trong mockup.

## 3. Khung trang và điều hướng

Thứ tự nội dung từ trên xuống:

1. **Header:** biểu tượng khu vực tài chính; nhãn “Quản lý tài chính”; tiêu đề “Tổng quan tài chính & lãi lỗ”; mô tả/ngày dữ liệu; cụm thao tác bên phải gồm “Chế độ Kế toán” và “Cập nhật”.
2. **Tab cấp trang:** “Sức khỏe tiền mặt” và “Lãi lỗ (P&L)”. Chỉ render panel đang chọn; panel còn lại không chiếm không gian layout.
3. **Panel Sức khỏe tiền mặt:** tổng tiền có thể sử dụng, phân bổ nguồn tiền, chỉ số dòng tiền theo kỳ, bảng sức khỏe tiền mặt theo chi nhánh nằm bên trong cùng thẻ tổng quan tiền mặt và điểm cần chú ý.
4. **Panel Lãi lỗ (P&L):** bộ chọn kỳ, phạm vi chi nhánh, tùy chọn ngày, ghi chú phạm vi, tiêu đề/cơ sở báo cáo và biểu đồ waterfall.

### Hành vi tab

- Mặc định mở **Sức khỏe tiền mặt**.
- Tab đang chọn có trạng thái active dễ nhận biết; khi chuyển tab cập nhật cả `aria-selected` và panel liên kết.
- Khi chuyển tab, không hiển thị đồng thời hai panel hoặc để panel ẩn chiếm khoảng trắng.
- Giữ trạng thái bộ lọc của mỗi tab khi chuyển qua lại, trừ khi sản phẩm có yêu cầu nghiệp vụ khác.

## 4. Header

- Tiêu đề chính: **Tổng quan tài chính & lãi lỗ**.
- Mô tả phụ nêu ngắn gọn phạm vi dữ liệu và thời điểm cập nhật; ngày hiển thị phải lấy từ dữ liệu/thời gian cập nhật phù hợp, không hard-code ngày trong mockup.
- “Chế độ Kế toán” là switch có trạng thái bật/tắt thực và tên truy cập được. Chưa suy diễn hành vi hoặc phép tính của chế độ này; kết nối với chế độ kế toán hiện có sau khi xác định hợp đồng nghiệp vụ.
- “Cập nhật” khởi chạy hành vi refresh được ứng dụng hỗ trợ. Trong khi tải phải có trạng thái loading/disabled; khi lỗi cần báo lỗi và cho phép thử lại, không đổi số liệu âm thầm.

## 5. Tab “Sức khỏe tiền mặt”

### 5.1. Thẻ tổng tiền và phân bổ số dư

- Tiêu đề: **Tiền hiện có · có thể sử dụng ngay**; số dư tổng là thành phần nổi bật nhất.
- Nhãn cập nhật thời điểm gần nhất đặt bên phải khi đủ chỗ; trên màn hình hẹp được phép xuống dòng, không đè lên tổng tiền.
- Thanh phân bổ và legend thể hiện tối đa ba nhóm hiện có trong mockup: két quầy thu ngân, két sắt chủ shop và ngân hàng. Mỗi nhóm gồm màu/dấu hiệu, tên, số tiền và tỷ trọng.
- Tỷ trọng phải được tính từ dữ liệu thực; kiểm tra tổng tỷ trọng và cách làm tròn trước khi hiển thị. Không suy ra số tiền ngân hàng/tài khoản từ ảnh thiết kế.
- Các thành phần trên là snapshot tại thời điểm cập nhật; **không thay đổi theo kỳ đã chọn ở phần dòng tiền**.
- Màu sắc không phải tín hiệu duy nhất: tên và giá trị phải hiển thị cùng mỗi phân đoạn; bổ sung nhãn truy cập được cho biểu đồ phân bổ.

### 5.2. Dải chỉ số cần chú ý

Hiển thị ba ô cùng một hàng trên desktop, xếp thành cột khi viewport hẹp:

1. Tiền đang chuyển và trạng thái nhận tiền.
2. Khách hàng đang nợ và số khách liên quan.
3. Phải trả quá hạn và số khoản liên quan.

Số tiền cảnh báo dùng màu nhấn cảnh báo nhưng vẫn cần nhãn chữ. Empty state phải diễn đạt rõ khi không có khoản cần xử lý (ví dụ: “Không có khoản quá hạn”), không chỉ để `0` thiếu ngữ cảnh.

### 5.3. Dòng tiền trong kỳ

- Tiêu đề: **Tiền vào và tiền ra trong kỳ**.
- Có một select **Kỳ xem**, gồm năm lựa chọn trong mockup:
  - Tháng này.
  - 7 ngày qua.
  - Tháng trước.
  - Quý này.
  - Năm nay.
- Mặc định chọn **Tháng này** theo mockup. Tên option và phạm vi ngày phải được tính theo ngày hiện tại, locale và quy tắc kỳ đã được nghiệp vụ xác nhận; chuỗi ngày trong mockup chỉ là ví dụ.
- Dòng mô tả dưới tiêu đề thể hiện khoảng ngày chính xác và ghi rõ số liệu minh họa/sample khi chưa nối dữ liệu thật.
- Bốn chỉ số theo đúng thứ tự: **Số dư đầu kỳ**, **Tiền vào**, **Tiền ra**, **Dòng tiền ròng · thu trừ chi**.
- Đổi kỳ phải cập nhật đồng bộ khoảng ngày và cả bốn chỉ số; không cập nhật riêng label trong khi giữ số liệu của kỳ khác.
- Quy tắc kiểm tra trên dữ liệu trả về (không tự thay thế quy tắc nghiệp vụ): `dòng tiền ròng = tiền vào - tiền ra`. Nếu sản phẩm định nghĩa số dư cuối kỳ ở nơi khác, cần nghiệp vụ xác nhận cách đối chiếu với số dư đầu kỳ và dòng tiền ròng.
- Thu hiển thị màu tích cực; chi hiển thị màu cảnh báo; số âm/dương phải có dấu hoặc định dạng nhất quán. Không dựa riêng vào màu.
- Phần “Ví dụ các khoản mục thu và chi · số liệu minh họa” có thể thu gọn/mở rộng, mặc định đóng. Nội dung hiện là ví dụ diễn giải, không được trình bày thành danh sách giao dịch thật.
- Ghi chú trong mockup nêu rõ số minh họa không phải dữ liệu giao dịch đã đối soát và số dư hiện có phía trên là snapshot không đổi theo kỳ. Giữ thông tin này cho tới khi đã thay bằng giải thích sản phẩm đã được duyệt.

### 5.4. Bảng sức khỏe chi nhánh trong thẻ tổng quan

- Bảng **Sức khỏe tiền mặt theo chi nhánh** đặt ở phần cuối, bên trong cùng thẻ tổng quan tiền mặt chứa snapshot số dư và dòng tiền; không tách thành thẻ/card độc lập.
- Bảng **Sức khỏe tiền mặt theo chi nhánh** có các cột: Chi nhánh, Tiền sẵn có, Đang chuyển, Phải trả quá hạn, Trạng thái và hành động chi tiết.
- Header bảng có select **Chi nhánh** với mặc định **Toàn bộ chi nhánh** và các chi nhánh được phép truy cập. Chọn toàn bộ hiển thị tất cả các hàng và hàng tổng toàn chuỗi; chọn một chi nhánh chỉ hiển thị hàng đó và ẩn hàng tổng.
- Dùng chung select **Kỳ xem** của phần dòng tiền. Thay đổi kỳ cập nhật khoảng ngày/nhãn kỳ trên bảng. Khi chỉ chọn một chi nhánh, ghi rõ scope chi nhánh; dữ liệu snapshot chi nhánh không được giả định thay đổi theo kỳ nếu chưa có nguồn dữ liệu tương ứng.
- Có hàng tổng toàn chuỗi ở scope toàn bộ; các chỉ số tổng phải khớp với phạm vi các chi nhánh được phép xem. Nhãn tóm tắt trạng thái cần phản ánh scope đang chọn.
- Trạng thái dùng nhãn chữ (ví dụ: Ổn định/Cần theo dõi), không chỉ dùng chấm màu.
- Bảng giữ khả năng đọc ở màn nhỏ: cuộn ngang trong container của bảng, không làm tràn toàn trang. Cung cấp vùng cuộn có thể thao tác bằng bàn phím nếu cần.
- Nút xem chi tiết chi nhánh mở màn hình/luồng có sẵn và truyền đúng chi nhánh; không chỉ đổi text UI nếu chưa có điều hướng thực.

### 5.5. Điểm cần chú ý

- Dòng “Điểm cần chú ý” tóm tắt số lượng vấn đề cần xử lý; nút “Xem chi tiết” dẫn đến luồng khoản phải trả tương ứng khi có tích hợp.

## 6. Tab “Lãi lỗ (P&L)” 

### 6.1. Bộ chọn kỳ và chi nhánh

- Có các kỳ nhanh: **Hôm nay**, **7 ngày qua**, **Tháng này**, **Tháng trước**, **Quý này**, **Năm nay**, **Tùy chọn ngày**.
- Chỉ một kỳ nhanh active tại một thời điểm.
- “Tùy chọn ngày” hiển thị hai input ngày **Từ ngày**, **Đến ngày** và nút **Áp dụng**. Mặc định ẩn khi không ở chế độ tùy chọn.
- Trước khi áp dụng cần xác thực đủ ngày, ngày bắt đầu không sau ngày kết thúc và không nhận định dạng không hợp lệ. Hiển thị lỗi cạnh vùng nhập hoặc thông báo phù hợp; không âm thầm giữ kỳ cũ như thể đã áp dụng.
- Chọn nhanh hoặc áp dụng khoảng tùy chỉnh phải cập nhật nhãn kỳ/ngày đồng bộ ở ghi chú phạm vi, banner và subtitle biểu đồ.
- Select **Phạm vi chi nhánh** gồm **Toàn chuỗi** và từng chi nhánh người dùng được phép truy cập. Đổi phạm vi cập nhật ghi chú, tiêu đề và dữ liệu biểu đồ theo cùng scope.
- Dữ liệu minh họa hiện có thể chỉ đổi nhãn mà không đổi biểu đồ; triển khai thật phải truy vấn/tính lại P&L theo cả khoảng ngày và scope. Không thể coi việc đổi label là đã lọc dữ liệu.

### 6.2. Banner và cơ sở báo cáo

- Banner nêu **Hiệu quả kinh doanh**, khoảng ngày/phạm vi phù hợp và cơ sở báo cáo.
- Mockup ghi **Thực thu thực chi**; giữ đây là nhãn tham chiếu cho tới khi nghiệp vụ xác nhận cơ sở và quy tắc phân loại chính thức.
- Hành động “Dành cho kế toán”/chế độ kế toán phải tích hợp vào luồng thực tế đã có. Không tạo chuyển đổi kế toán giả chỉ để đổi nhãn.

### 6.3. Biểu đồ waterfall

- Card gồm tiêu đề **Bậc thang Lợi nhuận P&L (Thực thu thực chi)**, subtitle chứa kỳ/cơ sở, legend và biểu đồ.
- Legend phân biệt nhóm **Doanh thu/Lãi**, **Chi phí & Giá vốn**, **Lãi ròng về két**; màu phải đi kèm nhãn.
- Dãy hạng mục và phép tính hiển thị phải lấy từ mô hình P&L đã được backend/nghiệp vụ xác nhận. Nhãn, thứ tự, giá trị, dấu cộng/trừ, kết nối bậc thang và tổng lãi phải khớp dữ liệu; không dùng số mẫu trong SVG làm dữ liệu production.
- Biểu đồ phải có accessible name/description hoặc bảng/tóm tắt dữ liệu thay thế để người dùng screen reader tiếp cận được giá trị chính.
- Có trạng thái loading, lỗi tải lại, không dữ liệu và dữ liệu không đủ để dựng biểu đồ.
- Trên mobile, ưu tiên card co giãn; nếu cần cuộn ngang cho biểu đồ, chỉ giới hạn cuộn trong vùng biểu đồ và giữ tiêu đề/legend khả dụng.

## 7. Responsive và quy tắc trình bày

### Desktop (trên 1024 px)

- Giới hạn bề rộng nội dung theo layout của ứng dụng; header và thanh hành động trên cùng một hàng khi đủ chỗ.
- Phân bổ nguồn tiền chia ba cột; ba chỉ số cảnh báo chia ba cột; bốn chỉ số dòng tiền chia bốn cột.
- Tiêu đề dòng tiền và select kỳ nằm cùng hàng; bảng chi nhánh dùng toàn bề rộng card.

### Tablet (641–1024 px)

- Header/nút và bộ lọc được phép wrap, không đè lên nội dung.
- Các grid giảm số cột theo không gian; card không tạo cột quá hẹp khiến số liệu hoặc nhãn chồng lấn.
- P&L toolbar được phép wrap giữa nhóm kỳ và phạm vi chi nhánh.

### Mobile (640 px trở xuống)

- Padding card giảm; header dòng tiền chuyển thành xếp dọc; select kỳ chiếm chiều rộng vùng nội dung.
- Chỉ số dòng tiền xếp hai cột; ở màn hình rất hẹp (tham chiếu 360 px) xếp một cột để không cắt số.
- Phần khoản mục thu/chi xếp một cột; chỉ riêng vùng bảng/biểu đồ được phép có cuộn ngang có chủ đích.
- Điều khiển có vùng chạm phù hợp; nhãn không bị tách rời khỏi input/select; không để tràn viewport.

### Visual system

- Tham chiếu mockup: font **Be Vietnam Pro** (fallback sans-serif); nền tổng thể xanh-xám rất nhạt, card trắng, viền mảnh, bo góc vừa phải, bóng đổ nhẹ.
- Teal là màu nhận diện/chính; xanh lá biểu thị thu/giá trị tích cực; đỏ/cam dùng cho chi/quá hạn; xanh dương phân biệt ngân hàng. Cần kiểm tra contrast trong ứng dụng thật.
- Dùng chữ số tabular cho tiền; format VND nhất quán theo locale sản phẩm (ví dụ `185.169.000đ`). Tránh tự đưa đơn vị triệu/tỷ nếu làm mất độ chính xác.
- Duy trì phân cấp rõ: tiêu đề card > giá trị chính > số liệu phụ > chú thích. Không để browser default font/heading style lọt vào khi chuyển mockup sang component.

## 8. Dữ liệu, trạng thái và lỗi

Không hard-code các giá trị của mockup. Mapping dữ liệu thực cần được chốt riêng, tối thiểu bao gồm:

- Thời điểm và phạm vi snapshot số dư.
- Số dư theo từng nguồn tiền và quy tắc loại trừ/cộng gộp.
- Dữ liệu đầu kỳ, tổng thu, tổng chi, dòng tiền ròng và khoảng ngày áp dụng.
- Công nợ khách hàng, khoản phải trả/quá hạn, số lượng đối tượng và trạng thái.
- Danh sách/ID chi nhánh; quyền xem scope; cách tính hàng tổng.
- Các cấu phần P&L, cơ sở tính, dấu/chiều của từng cấu phần và quy tắc làm tròn.

Mỗi vùng dữ liệu bất đồng bộ cần xác định trạng thái:

- **Loading:** skeleton hoặc trạng thái tải trong card; tránh nhảy layout lớn.
- **Success:** hiển thị dữ liệu cùng kỳ, scope và thời điểm cập nhật rõ ràng.
- **Empty:** diễn đạt không có dữ liệu cho kỳ/scope; phân biệt với lỗi hoặc số 0 thật.
- **Error:** nêu lỗi có thể hiểu, nút thử lại; không thay bằng dữ liệu mẫu mà không cảnh báo.
- **Partial/stale:** khi có một phần dữ liệu hoặc dữ liệu cũ, gắn nhãn phù hợp thay vì tạo cảm giác đã cập nhật đầy đủ.

Không tính lại hoặc suy diễn số liệu tài chính ở presentation layer nếu quy tắc chưa thống nhất. Định nghĩa rõ timezone, biên đầu/cuối kỳ, kỳ quý, năm tài chính, ngày hiện tại và cách xử lý dữ liệu trễ trước khi nối API.

## 9. Accessibility và tương tác

- Tab dùng semantics tablist/tab/tabpanel; select/input có label gắn đúng; switch có role và trạng thái truy cập được.
- Tất cả thao tác dùng được bằng bàn phím; focus indicator nhìn thấy rõ; không đặt `outline: none` nếu không có thay thế.
- Thông báo thay kỳ, lỗi ngày, cập nhật thành công/thất bại cần được truyền đạt bằng text và, khi phù hợp, `aria-live`.
- Biểu đồ và thanh phân bổ có mô tả text thay thế; không truyền nghĩa chỉ bằng màu.
- Kiểm tra tương phản màu chữ/nền và zoom/phóng to trên desktop lẫn mobile.

## 10. Tiêu chí nghiệm thu

- [ ] Mặc định mở tab **Sức khỏe tiền mặt**; chuyển tab cập nhật đúng panel và trạng thái truy cập.
- [ ] Số dư snapshot được phân biệt rõ với dữ liệu phát sinh theo kỳ; đổi kỳ dòng tiền không thay số dư snapshot.
- [ ] Có đủ 5 kỳ dòng tiền; đổi kỳ cập nhật chính xác label ngày và toàn bộ chỉ số theo response của kỳ tương ứng.
- [ ] P&L có đủ 7 lựa chọn kỳ, khoảng ngày tùy chỉnh có validate và áp dụng; đổi scope/period làm mới dữ liệu chứ không chỉ đổi nhãn.
- [ ] Banner, ghi chú phạm vi và biểu đồ cùng hiển thị kỳ/scope đã chọn.
- [ ] Không dùng số liệu trong mockup như dữ liệu production; trạng thái sample được ghi rõ trong môi trường demo.
- [ ] Loading, empty, error và retry được thiết kế cho từng vùng lấy dữ liệu.
- [ ] Bảng chi nhánh/biểu đồ không làm tràn toàn trang trên viewport hẹp; không cắt chữ hoặc giá trị tiền.
- [ ] Các tương tác chính hoạt động bằng chuột, bàn phím và có nhãn screen reader phù hợp.
- [ ] Kiểm thử trực quan tối thiểu tại desktop, tablet, mobile; chạy các lệnh lint/test/build phù hợp của repo trước khi bàn giao.

## 11. Câu hỏi cần xác nhận với PO/Backend trước khi hoàn thiện dữ liệu

1. Định nghĩa chính xác “tiền hiện có/có thể sử dụng ngay”, tiền đang chuyển và thời điểm chốt snapshot.
2. Quy tắc biên ngày và timezone cho “7 ngày qua”, “tháng/quý/năm này”, cùng năm tài chính.
3. Cơ sở P&L chính thức là thực thu thực chi hay cơ sở khác; cấu phần và quy tắc đối chiếu với kế toán.
4. API/DTO, quyền theo role/tenant/chi nhánh, trạng thái loading/error và chính sách dữ liệu stale.
5. Hành vi cụ thể của “Chế độ Kế toán”, “Cập nhật”, “Xem chi tiết” và thao tác trên từng chi nhánh.
