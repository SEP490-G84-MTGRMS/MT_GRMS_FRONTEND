import type { FC } from "react";
import { Link } from "react-router-dom";

export const Footer: FC = () => {
  return (
    <footer className="site-footer">
      <div className="container footer-layout">
        <div className="footer-brand-box">
          <Link to="/" className="brand-logo footer-logo" aria-label="THViet Trang Chủ">
            <img
              src="/logo/thviet_logo_horizontal.png"
              alt="THViet - Quản Lý Tạp Hóa Việt"
              style={{ height: 68, width: "auto", objectFit: "contain", marginBottom: 16 }}
            />
          </Link>
          <p className="footer-desc">
            Hệ thống quản lý tạp hóa bán lẻ đa chi nhánh THViet chuyên biệt 100%
            cho tiệm tạp hóa gia đình và siêu thị mini. Dự án thuộc Đồ án Tốt
            nghiệp Kỹ thuật Phần mềm FPT University (SEP490-G84).
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
          </ul>
        </div>

        <div className="footer-links-col">
          <h4>Liên hệ hỗ trợ</h4>
          <p>
            <strong>Hotline / Zalo:</strong> 0123.456.789
          </p>
          <p>
            <strong>Email:</strong> email@gmail.com
          </p>
          <p>
            <strong>Địa chỉ:</strong> Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ
            Thăng Long, Hà Nội
          </p>
        </div>
      </div>

      <div className="footer-bottom-line">
        <div className="container bottom-inner">
          <span>© 2026 THViet (SEP490-G84). Trường Đại học FPT Hà Nội.</span>
          <span>Phần mềm quản lý bán lẻ tối ưu cho tiệm tạp hóa Việt Nam.</span>
        </div>
      </div>
    </footer>
  );
};
