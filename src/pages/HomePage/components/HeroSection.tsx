import type { FC } from 'react';
import { Lightbulb, Clock, QrCode, ChevronRight } from 'lucide-react';

interface HeroSectionProps {
  onOpenTrial: () => void;
}

export const HeroSection: FC<HeroSectionProps> = ({ onOpenTrial }) => {
  const scrollToSolutions = () => {
    const el = document.getElementById('giai-phap');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-section">
      <div className="container hero-grid">
        <div className="hero-left">
          <h1 className="hero-title">
            Phần mềm quản lý<br />
            <span className="text-blue">tiệm tạp hóa</span>
          </h1>

          <p className="hero-desc">
            Bán hàng nhanh, quản lý tồn kho và tự động cảnh báo cận hạn. Dễ dùng cho mọi chủ tiệm.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary btn-pill btn-lg btn-glow"
              onClick={onOpenTrial}
            >
              Dùng thử miễn phí
            </button>
            <a href="#giai-phap" className="btn btn-play-pill btn-lg">
              <span>Khám phá tính năng</span>
              <span className="play-circle">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              </span>
            </a>
          </div>

          <div className="hero-subnote-link" onClick={scrollToSolutions}>
            <span className="bulb-icon" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--blue-primary)' }}>
              <Lightbulb size={16} strokeWidth={1.9} />
            </span>
            <span className="bulb-text">Bán hàng chỉ 3 giây — Làm quen sau 5 phút</span>
            <span className="bulb-arrow" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <ChevronRight size={15} strokeWidth={2} />
            </span>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-visual-frame">
            <div className="hero-img-wrapper">
              <img
                src="/hero_kiotviet.jpg"
                alt="Chủ tiệm tạp hóa thao tác bán hàng với MT-GRMS"
                className="hero-showcase-img"
              />
            </div>

            <div className="floating-badge badge-top-fefo">
              <div
                className="badge-icon-bubble"
                style={{ backgroundColor: '#F1F5F9', color: 'var(--blue-primary)' }}
              >
                <Clock size={18} strokeWidth={1.9} />
              </div>
              <div className="badge-text-col">
                <strong>Cảnh báo cận date</strong>
                <span>Nhắc xả hàng kịp thời</span>
              </div>
            </div>

            <div className="floating-badge badge-bottom-vietqr">
              <div
                className="badge-icon-bubble"
                style={{ backgroundColor: '#F1F5F9', color: 'var(--blue-primary)' }}
              >
                <QrCode size={18} strokeWidth={1.9} />
              </div>
              <div className="badge-text-col">
                <strong>Thanh toán mã QR</strong>
                <span>Khớp tiền tự động, chính xác</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
