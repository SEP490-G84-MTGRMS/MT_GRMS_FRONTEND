import type { FC } from 'react';

interface CtaBannerProps {
  onOpenTrial: () => void;
}

export const CtaBanner: FC<CtaBannerProps> = ({ onOpenTrial }) => {
  return (
    <section className="section-padded">
      <div className="container">
        <div className="cta-banner-card">
          <h2 className="cta-banner-title">Bắt đầu quản lý tiệm tạp hóa nhàn hơn từ hôm nay</h2>
          <p className="cta-banner-desc">
            Đăng ký trải nghiệm đầy đủ tính năng trong 14 ngày. Đội ngũ kỹ thuật hỗ trợ cài đặt và nhập danh mục mẫu tận nơi qua Zalo.
          </p>
          <button
            type="button"
            className="btn btn-white-pill btn-lg btn-glow"
            onClick={onOpenTrial}
          >
            Đăng ký dùng thử miễn phí 14 ngày
          </button>
          <span className="cta-subnote">Không cần nhập thẻ tín dụng • Kích hoạt tài khoản trong 5 phút</span>
        </div>
      </div>
    </section>
  );
};
