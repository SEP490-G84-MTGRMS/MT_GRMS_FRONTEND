import type { FC } from 'react';
import { ServiceCard } from './ServiceCard';

export const ServicesEcosystemSection: FC = () => {
  const services = [
    {
      title: 'Xem báo cáo điều hành mọi lúc mọi nơi',
      description:
        'Giám đốc, kế toán trưởng có thể theo dõi tình hình tài chính ngay trên di động, kịp thời ra quyết định điều hành doanh nghiệp.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: 'Kết nối ngân hàng điện tử',
      description:
        'Kết nối với ngân hàng để chuyển tiền, đối chiếu sổ phụ, nắm bắt số dư theo thời gian thực giúp tiết kiệm thời gian, công sức.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z" />
        </svg>
      ),
    },
    {
      title: 'Kết nối với Cơ quan Thuế',
      description:
        'Cho phép kế toán dễ dàng kê khai đầy đủ các loại thuế theo quy định và nộp thuế điện tử ngay trên phần mềm.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <line x1="9" y1="15" x2="15" y2="9" />
          <circle cx="9.5" cy="9.5" r="1" fill="#0066FF" />
          <circle cx="14.5" cy="14.5" r="1" fill="#0066FF" />
        </svg>
      ),
    },
    {
      title: 'Kết nối với hơn 100 đối tác',
      description:
        'Kết nối với các hệ thống hóa đơn điện tử, chữ ký số, bán hàng, nhân sự, email, sms,... giảm thiểu nhập liệu chồng chéo, sai lệch dữ liệu.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: 'Tự động nhập liệu',
      description:
        'Tự động nhập liệu hóa đơn mua hàng, bán hàng, nhập khẩu dữ liệu từ excel giúp rút ngắn thời gian nhập liệu, tránh sai sót.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M10 8l4 4-4 4" />
          <path d="M4 12h10" />
        </svg>
      ),
    },
    {
      title: 'Đầy đủ báo cáo quản trị',
      description:
        'Hàng trăm báo cáo quản trị theo mẫu hoặc tự thiết kế chỉnh sửa, đáp ứng nhu cầu của doanh nghiệp thuộc mọi ngành nghề.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="7" width="20" height="14" rx="3" />
          <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
          <line x1="12" y1="12" x2="12" y2="12.01" />
        </svg>
      ),
    },
    {
      title: 'Tự động hóa việc lập báo cáo',
      description:
        'Tự động tổng hợp số liệu lên báo cáo thuế, báo cáo tài chính và các sổ sách giúp doanh nghiệp nộp báo cáo kịp thời, chính xác.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 13a3 3 0 1 1 3 3" />
          <polyline points="12 16 12 13 15 13" />
        </svg>
      ),
    },
    {
      title: 'Hỗ trợ kiểm soát chứng từ hợp lệ',
      description:
        'Gợi ý thông tin KH/ NCC dựa trên MST giúp tiết kiệm thời gian nhập liệu. Cảnh báo NCC ngưng hoạt động tránh rủi ro về hoá đơn.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 12l2 2 4-4" />
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M12 3v3" />
        </svg>
      ),
    },
    {
      title: 'Giám sát tồn kho',
      description:
        'Nắm bắt thông tin tồn kho chi tiết theo từng nhu cầu quản trị của DN như số lô, HSD, màu sắc, chủng loại giúp tránh thất thoát, lãng phí.',
      icon: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0066FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    },
  ];

  return (
    <section className="section-padded bg-soft-blue" id="dich-vu">
      <div className="container">
        <div className="section-heading-center">
          <span className="sub-heading-pill">HỆ SINH THÁI DỊCH VỤ</span>
          <h2 className="main-heading">Tiện ích kết nối & Quản trị mở rộng</h2>
          <p className="heading-lead">
            Đồng bộ dữ liệu đa kênh, kết nối ngân hàng điện tử, hóa đơn thuế và quản trị tồn kho chuyên sâu.
          </p>
        </div>

        <div className="services-grid-3">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              title={service.title}
              description={service.description}
              icon={service.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
