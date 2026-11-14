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
            Dùng thử miễn phí 3 ngày đầy đủ tính năng. 72 giờ bắt đầu ngay khi hoàn tất đăng ký tài khoản, đội ngũ kỹ thuật hỗ trợ cài đặt qua Zalo.
          </p>
          <button
            type="button"
            className="btn btn-white-pill btn-lg btn-glow"
            onClick={onOpenTrial}
          >
            Dùng thử miễn phí 3 ngày
          </button>
          <span className="cta-subnote">Không cần thẻ • Không tự động gia hạn</span>
        </div>
      </div>
    </section>
  );
};
