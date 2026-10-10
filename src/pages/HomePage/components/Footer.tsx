import type { FC } from "react";

export const Footer: FC = () => {
  return (
    <footer className="site-footer">
      <div className="container footer-layout">
        <div className="footer-brand-box">
          <a href="#" className="brand-logo footer-logo">
            <div className="logo-symbol">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 2C16 2 4 14.5 4 21C4 26.5228 8.47715 31 14 31C19.5228 31 24 26.5228 24 21C24 14.5 16 2 16 2Z"
                  fill="#0066FF"
                />
                <path
                  d="M20 10C20 10 28 17.5 28 22C28 25.866 24.866 29 21 29C17.134 29 14 25.866 14 22C14 17.5 20 10 20 10Z"
                  fill="#00C2FF"
                />
              </svg>
            </div>
            <span className="logo-name">MT-GRMS</span>
          </a>
          <p className="footer-desc">
            Hệ thống quản lý bán lẻ đa chi nhánh chuyên biệt 100% cho tiệm tạp
            hóa gia đình và siêu thị mini. Dự án thuộc Đồ án Tốt nghiệp Kỹ thuật
            Phần mềm FPT University (SEP490-G84).
          </p>
          <div className="footer-tags">
            <span className="tech-pill">ASP.NET Core 8</span>
            <span className="tech-pill">React 19</span>
            <span className="tech-pill">Multi-Tenant SaaS</span>
          </div>
        </div>

        <div className="footer-links-col">
          <h4>Giải pháp cốt lõi</h4>
          <ul>
            <li>
              <a href="#giai-phap">Cảnh báo hạn dùng FEFO 3 mức màu</a>
            </li>
            <li>
              <a href="#giai-phap">Quy đổi Thùng - Lốc - Lon - Gói</a>
            </li>
            <li>
              <a href="#giai-phap">VietQR động khớp tiền tự động</a>
            </li>
            <li>
              <a href="#giai-phap">Sổ nợ khách quen & đối soát Zalo</a>
            </li>
            <li>
              <a href="#giai-phap">Cảnh báo chống bán dưới giá vốn</a>
            </li>
            <li>
              <a href="#giai-phap">Báo cáo thuế Hộ Kinh Doanh</a>
            </li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4>Thông tin & Tiện ích</h4>
          <ul>
            <li>
              <a href="#dich-vu">Hệ sinh thái tiện ích mở rộng</a>
            </li>
            <li>
              <a href="#giai-phap">Trải nghiệm tính năng tạp hóa</a>
            </li>
            <li>
              <a href="#hoi-dap">Câu hỏi thường gặp</a>
            </li>
            <li>
              <a href="/admin/dashboard" style={{ color: 'var(--blue-primary)', fontWeight: 600 }}>
                👑 Cổng Master Admin
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4>Liên hệ hỗ trợ</h4>
          <p>
            <strong>Hotline / Zalo:</strong> 0123.456.789
          </p>
          <p>
            <strong>Email:</strong>email@gmail.com
          </p>
          <p>
            <strong>Địa chỉ:</strong> Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ
            Thăng Long, Hà Nội
          </p>
        </div>
      </div>

      <div className="footer-bottom-line">
        <div className="container bottom-inner">
          <span>© 2026 MT-GRMS (SEP490-G84). Trường Đại học FPT Hà Nội.</span>
          <span>Phần mềm quản lý bán lẻ tối ưu cho tiệm tạp hóa Việt Nam.</span>
        </div>
      </div>
    </footer>
  );
};
