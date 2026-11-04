// src/pages/store/components/TermsOfServiceTab.tsx
import type { FC } from 'react';
import { ShieldCheck, Lock, Headphones, RefreshCw } from 'lucide-react';

export const TermsOfServiceTab: FC = () => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="profile-card">
        <div className="profile-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} color="#0066FF" />
            <div className="profile-card-title">Điều khoản sử dụng dịch vụ MT-GRMS SaaS</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ padding: 8, borderRadius: 10, backgroundColor: '#E8F1FF', color: '#0066FF' }}>
              <Lock size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                1. Quyền sở hữu và Bảo mật dữ liệu kinh doanh
              </div>
              <div>
                Toàn bộ dữ liệu sản phẩm, doanh thu, giá vốn, danh sách khách hàng và công nợ thuộc quyền sở hữu tuyệt đối của Chủ gian hàng. MT-GRMS cam kết không chia sẻ hoặc khai thác dữ liệu của khách hàng cho bất kỳ bên thứ ba nào. Hệ thống mã hóa đường truyền theo tiêu chuẩn TLS 1.3 và cơ chế Global Query Filters cô lập Multi-Tenancy.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ padding: 8, borderRadius: 10, backgroundColor: '#E8F9EE', color: '#008738' }}>
              <RefreshCw size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                2. Cam kết thời gian hoạt động ổn định (SLA 99.9%)
              </div>
              <div>
                Hạ tầng máy chủ đám mây đảm bảo hệ thống vận hành liên tục 24/7/365 với độ sẵn sàng đạt 99.9%. Trong trường hợp mạng internet tại quầy POS bị gián đoạn, hệ thống tự động lưu trữ hóa đơn ngoại tuyến và đồng bộ lại ngay khi có mạng.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ padding: 8, borderRadius: 10, backgroundColor: '#FFF8EB', color: '#FF9500' }}>
              <Headphones size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                3. Chính sách hỗ trợ kỹ thuật và bảo hành
              </div>
              <div>
                Tổng đài hỗ trợ <strong>1900 6522</strong> hoạt động từ 8h00 đến 22h00 các ngày trong tuần (kể cả Thứ 7, Chủ Nhật và ngày lễ). Khách hàng sử dụng gói Chuyên nghiệp và Cao cấp được hỗ trợ trực tuyến 1-1 từ đội ngũ kỹ sư vận hành.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
