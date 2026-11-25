import type { FC } from 'react';
import {
  BarChart3,
  QrCode,
  FileSpreadsheet,
  Users,
  ScanBarcode,
  Layers,
  Calculator,
  Truck,
  Clock,
} from 'lucide-react';
import { ServiceCard } from './ServiceCard';

export const ServicesEcosystemSection: FC = () => {
  const iconColor = 'var(--blue-primary, #0066FF)';
  const services = [
    {
      title: 'Theo dõi cửa hàng từ xa thời gian thực',
      description:
        'Chủ tiệm nắm bắt doanh thu theo giờ, tiền mặt tại két thu ngân và ca làm nhân viên ngay trên điện thoại dù không có mặt tại quầy.',
      icon: <BarChart3 size={34} color={iconColor} strokeWidth={1.9} />,
    },
    {
      title: 'Thanh toán VietQR Napas247 khớp tự động',
      description:
        'Sinh mã QR động đúng số tiền từng hóa đơn POS và tự động xác nhận biến động số dư trong vài giây, chống dán đè mã QR giả.',
      icon: <QrCode size={34} color={iconColor} strokeWidth={1.9} />,
    },
    {
      title: 'Sổ sách Thuế Hộ Kinh Doanh chuẩn quy định',
      description:
        'Tổng hợp doanh thu bán lẻ và xuất bộ sổ kế toán hộ kinh doanh theo quy định hiện hành nhanh gọn, minh bạch, không lo sai số.',
      icon: <Calculator size={34} color={iconColor} strokeWidth={1.9} />,
    },
    {
      title: 'Sổ nợ khách quen & Nhắc nợ qua Zalo',
      description:
        'Ghi nhận mua chịu tại quầy chỉ với 1 chạm, theo dõi hạn mức công nợ từng khách hàng và gửi thông báo đối soát lịch sự qua Zalo.',
      icon: <Users size={34} color={iconColor} strokeWidth={1.9} />,
    },
    {
      title: 'Kho 5.000+ hàng tạp hóa mẫu sẵn có',
      description:
        'Quét mã vạch sản phẩm FMCG phổ biến là tự động điền tên hàng, thương hiệu và đơn vị tính, rút ngắn tối đa thời gian khai báo ban đầu.',
      icon: <ScanBarcode size={34} color={iconColor} strokeWidth={1.9} />,
    },
    {
      title: 'Quy đổi Thùng - Lốc - Lon - Gói tự động',
      description:
        'Nhập hàng theo thùng nhưng bán lẻ theo lốc hoặc lon; hệ thống tự động trừ tồn kho chính xác về đơn vị cơ sở và cảnh báo bán dưới giá vốn.',
      icon: <Layers size={34} color={iconColor} strokeWidth={1.9} />,
    },
    {
      title: 'Báo cáo lãi lỗ P&L & Sổ quỹ rõ ràng',
      description:
        'Tự động bóc tách doanh thu thuần, giá vốn theo lô xuất bán và chi phí vận hành (điện, nước, mặt bằng) để tính lợi nhuận thực tế.',
      icon: <FileSpreadsheet size={34} color={iconColor} strokeWidth={1.9} />,
    },
    {
      title: 'Quản lý Nhà cung cấp & Công nợ nhập hàng',
      description:
        'Kiểm soát đơn đặt hàng PO, phiếu nhập kho GRN đa lô và lịch nhắc thanh toán công nợ nhà phân phối theo tuổi nợ chi tiết.',
      icon: <Truck size={34} color={iconColor} strokeWidth={1.9} />,
    },
    {
      title: 'Giám sát tồn kho theo Lô & Hạn dùng FEFO',
      description:
        'Cảnh báo hàng cận date theo 3 mức màu trực quan và ưu tiên gợi ý xuất bán lô hết hạn trước (FEFO), giảm thiểu hủy hàng hỏng.',
      icon: <Clock size={34} color={iconColor} strokeWidth={1.9} />,
    },
  ];

  return (
    <section className="section-padded bg-soft-blue" id="dich-vu">
      <div className="container">
        <div className="section-heading-center">
          <span className="sub-heading-pill">HỆ SINH THÁI TIỆN ÍCH</span>
          <h2 className="main-heading">Trọn bộ nghiệp vụ cho tiệm tạp hóa & siêu thị mini</h2>
          <p className="heading-lead">
            Đồng bộ bán hàng tại quầy, thanh toán VietQR, quản trị lô hạn dùng FEFO, công nợ và sổ sách thuế hộ kinh doanh trên một nền tảng duy nhất.
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
