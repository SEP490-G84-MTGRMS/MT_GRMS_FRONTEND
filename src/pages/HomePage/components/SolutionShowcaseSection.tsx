import { useState } from 'react';
import type { FC } from 'react';

interface SolutionItem {
  title: string;
  desc: string;
}

const SOLUTIONS: SolutionItem[] = [
  {
    title: 'Cảnh báo hạn dùng FEFO 3 mức màu',
    desc: 'Tự động nhắc xuất bán các lô hàng cận date trước theo nguyên tắc First-Expired, First-Out. Phân loại 3 mức màu: Đỏ (≤ 7 ngày), Cam (8-15 ngày), Vàng (16-30 ngày) giúp chủ tiệm kịp thanh lý xả hàng 50% trước khi hỏng.',
  },
  {
    title: 'Quy đổi Thùng - Lốc - Lon - Gói',
    desc: 'Nhập cả thùng bia hay két nước ngọt nhưng bán lẻ từng lon mà tồn kho luôn khớp chuẩn xác từng đơn vị. Chuyển đổi đơn vị chỉ bằng một click chuột ngay tại màn hình thu ngân, xóa tan nỗi lo tính nhẩm sai lệch.',
  },
  {
    title: 'VietQR động tự động khớp tiền',
    desc: 'Mỗi hóa đơn sinh một mã QR chứa chính xác số tiền lẻ đến từng đồng. Webhook ngân hàng thông báo âm thanh "Ting Ting" khi tiền vào tài khoản, thu ngân nhận diện tiền về tức thì, an tâm không lo bị chụp bill giả giờ tan tầm.',
  },
  {
    title: 'Sổ nợ khách quen & đối soát Zalo',
    desc: 'Thay thế hoàn toàn cuốn sổ nợ lem nhem dễ rách và thất lạc. Cho phép ghi nợ một chạm cho khách quen trong xóm theo tên (Bác Ba, Cô Năm...) và bấm nút tạo tin nhắn sao kê công nợ rõ ràng, lịch sự gửi qua Zalo.',
  },
  {
    title: 'Chặn bán dưới giá vốn (COGS)',
    desc: 'Hệ thống tự động lưu vết giá nhập hàng từ nhà phân phối. Khi người thân bán hộ gõ nhầm giá bán thấp hơn giá nhập, màn hình sẽ báo đỏ ngăn chặn ngay để bảo vệ biên lợi nhuận của tiệm.',
  },
  {
    title: 'Báo cáo thuế Hộ Kinh Doanh tối giản',
    desc: 'Tự động tổng hợp doanh thu theo đúng mẫu báo cáo cho Hộ Kinh Doanh Cá Thể theo quy định mới. Xuất bảng kê doanh thu và báo cáo bán hàng 1 chạm mà không cần kiến thức kế toán rườm rà.',
  },
];

export const SolutionShowcaseSection: FC = () => {
  const [activeSolution, setActiveSolution] = useState<number>(0);

  const toggleSolution = (index: number) => {
    setActiveSolution(prev => (prev === index ? -1 : index));
  };

  return (
    <section className="section-padded" id="giai-phap">
      <div className="container">
        <div className="section-heading-center">
          <h2 className="main-heading">Giải pháp quản lý tiệm tạp hóa</h2>
          <p className="heading-lead">
            Giải pháp toàn diện giúp chủ tiệm kiểm soát hàng cận date, bán lẻ nhanh chóng và chấm dứt thất thoát tồn kho.
          </p>
        </div>

        <div className="solution-showcase-box">
          {/* Cột Trái: Accordion Danh Sách Giải Pháp */}
          <div className="solution-accordion-col" id="solutionAccordion">
            {SOLUTIONS.map((item, index) => {
              const isActive = activeSolution === index;
              return (
                <div
                  key={index}
                  className={`solution-acc-item ${isActive ? 'active' : ''}`}
                  data-solution={index}
                >
                  <div className="solution-acc-head" onClick={() => toggleSolution(index)}>
                    <span className="solution-title">{item.title}</span>
                    <button
                      type="button"
                      className="btn-acc-toggle"
                      aria-label="Thu gọn hoặc mở rộng"
                    >
                      <span className="icon-toggle">{isActive ? '−' : '+'}</span>
                    </button>
                  </div>
                  {isActive && (
                    <div className="solution-acc-body">
                      <p>{item.desc}</p>
                      <a href="#dich-vu" className="solution-link">
                        Tìm hiểu thêm &rarr;
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cột Phải: Visual Showcase với radar sóng đồng tâm & hình ảnh chủ tiệm */}
          <div className="solution-visual-col">
            <div className="solution-visual-card">
              {/* Vòng tròn radar sóng đồng tâm */}
              <div className="radar-orbit orbit-ring-1"></div>
              <div className="radar-orbit orbit-ring-2"></div>
              <div className="radar-orbit orbit-ring-3"></div>

              {/* Các chấm điểm kết nối trên quỹ đạo */}
              <div className="orbit-connect-dot dot-1"></div>
              <div className="orbit-connect-dot dot-2"></div>
              <div className="orbit-connect-dot dot-3"></div>

              {/* Các biểu tượng tính năng nổi trên quỹ đạo tròn */}
              <div className="orbit-bubble-node node-top-fefo" title="Cảnh báo FEFO Đỏ/Cam/Vàng">
                <div className="orbit-badge-icon bg-pink-gradient">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                  </svg>
                </div>
              </div>

              <div className="orbit-bubble-node node-mid-vietqr" title="VietQR Động Ting Ting">
                <div className="orbit-badge-icon bg-blue-gradient">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-3 2h2v3h-2zm3 3h3v3h-3zm-2 2h2v2h-2z" />
                  </svg>
                </div>
              </div>

              <div className="orbit-bubble-node node-bot-zalo" title="Sổ nợ khách quen Zalo">
                <div className="orbit-badge-icon bg-orange-gradient">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                  </svg>
                </div>
              </div>

              {/* Hình ảnh chủ tiệm tạp hóa mỉm cười cầm điện thoại */}
              <div className="solution-person-wrapper">
                <img
                  src="/solution_showcase.jpg"
                  alt="Chủ tiệm tạp hóa quản lý bán hàng với MT-GRMS"
                  className="solution-person-img"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
