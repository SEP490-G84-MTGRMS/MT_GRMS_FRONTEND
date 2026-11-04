import type { FC } from 'react';

export const FloatingFeaturesCard: FC = () => {
  return (
    <section className="floating-features-section">
      <div className="container">
        <div className="hero-floating-card">
          <div className="float-feature-col">
            <div className="float-icon-wrap icon-pink-soft">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF4D82">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div className="float-content">
              <h3 className="float-title">Dễ dùng & Thao tác nhanh</h3>
              <p className="float-desc">Giao diện trực quan, bán hàng chỉ 3 giây, ai cũng dùng được ngay.</p>
            </div>
          </div>

          <div className="float-divider"></div>

          <div className="float-feature-col">
            <div className="float-icon-wrap icon-orange-soft">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF9900">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
            </div>
            <div className="float-content">
              <h3 className="float-title">Chống mất vốn hàng hỏng</h3>
              <p className="float-desc">
                Tự động nhắc xả hàng cận date, ngăn chặn bán dưới giá vốn, giữ trọn tiền lãi mỗi tháng.
              </p>
            </div>
          </div>

          <div className="float-divider"></div>

          <div className="float-feature-col">
            <div className="float-icon-wrap icon-blue-soft">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--blue-primary, #0F766E)">
                <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
              </svg>
            </div>
            <div className="float-content">
              <h3 className="float-title">Chuẩn nghiệp vụ tạp hóa</h3>
              <p className="float-desc">
                Quy đổi Thùng sang Lon 1 chạm, sổ nợ khách quen rõ ràng, thanh toán QR tự động không lo bill giả.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
