import { useState } from 'react';
import type { FC } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: '1. Người lớn tuổi (trên 50 tuổi) không rành công nghệ có tự dùng được không?',
    answer:
      'Hoàn toàn dùng được. MT-GRMS được thiết kế với giao diện chữ to, nút bấm lớn và các phím tắt quen thuộc trên bàn phím (F2 để tìm hàng, F8 để tính tiền). Đội ngũ hỗ trợ sẽ gọi video qua Zalo hướng dẫn từng bước chỉ sau 5 phút là cô chú có thể tự bán hàng thành thạo.',
  },
  {
    question: '2. Tiệm tôi nhỏ, có bắt buộc phải mua máy POS đắt tiền không?',
    answer:
      'Không cần đầu tư máy mới. Bạn có thể sử dụng bất kỳ máy tính bàn cũ, laptop gia đình hoặc máy tính bảng và điện thoại thông minh sẵn có. Phần mềm chạy mượt mà ngay trên trình duyệt web, không tốn dung lượng bộ nhớ.',
  },
  {
    question: '3. Hàng cận date theo nguyên tắc FEFO hoạt động ra sao khi nhập hàng?',
    answer:
      'Khi nhập các mặt hàng như sữa, bánh kẹo hay gia vị, bạn chỉ cần gõ hạn sử dụng ghi trên bao bì. Khi bán lẻ tại quầy, hệ thống tự động kiểm tra: Lô hàng còn dưới 7 ngày sẽ báo Đỏ cảnh báo để bạn đem ra phía trước xả hàng giá vốn trước khi quá hạn.',
  },
  {
    question: '4. Tôi đang dùng sổ tay hoặc phần mềm khác, chuyển dữ liệu hàng hóa sang có mất thời gian không?',
    answer:
      'Rất nhanh chóng. Bạn chỉ cần gửi file Excel hàng hóa cũ hoặc danh sách sổ tay, chuyên viên của MT-GRMS sẽ hỗ trợ nạp sẵn toàn bộ danh mục sản phẩm, giá bán, mã vạch vào hệ thống cho bạn hoàn toàn miễn phí trong vòng 30 phút.',
  },
  {
    question: '5. Nếu mất kết nối Internet thì có bán hàng được không?',
    answer:
      'Có. Màn hình POS thu ngân hỗ trợ chế độ Offline cục bộ. Khi mất mạng bạn vẫn quét mã vạch và tính tiền cho khách bình thường. Khi có mạng trở lại, hệ thống sẽ tự động đồng bộ doanh thu lên đám mây mà không bị thất thoát dữ liệu.',
  },
];

export const FaqSection: FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <section className="section-padded" id="hoi-dap">
      <div className="container max-w-860">
        <div className="section-heading-center">
          <span className="sub-heading-pill">Hỗ Trợ 24/7</span>
          <h2 className="main-heading">Câu hỏi thường gặp của chủ tiệm</h2>
        </div>

        <div className="accordion-group">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className={`accordion-card ${isOpen ? 'active' : ''}`}>
                <button
                  type="button"
                  className="accordion-head-btn"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>
                  <span className="acc-plus">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="accordion-body-text">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
