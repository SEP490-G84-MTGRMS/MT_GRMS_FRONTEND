import { useState } from "react";
import type { FC } from "react";
import { Link } from "react-router-dom";

interface NavbarProps {
  onOpenLogin?: () => void;
  onOpenTrial: () => void;
}

export const Navbar: FC<NavbarProps> = ({ onOpenTrial }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="site-header" id="header">
      <div className="container nav-container">
        <Link to="/" className="brand-logo" aria-label="THViet Trang Chủ">
          <img
            src="/logo/thviet_logo_horizontal.png"
            alt="THViet - Quản Lý Tạp Hóa Việt"
            className="brand-logo-img"
          />
        </Link>

        <div className="nav-right-group">
          <nav
            className={`nav-menu ${mobileMenuOpen ? "active" : ""}`}
            id="navMenu"
          >
            <a
              href="#giai-phap"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Giải pháp
            </a>
            <a
              href="#dich-vu"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dịch vụ & Tiện ích
            </a>
            <a
              href="#hoi-dap"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Chính sách & Hỏi đáp
            </a>
          </nav>

          <div className="nav-buttons">
            <Link to="/auth/login" className="btn btn-ghost btn-pill">
              Đăng nhập
            </Link>
            <button
              type="button"
              className="btn btn-primary btn-pill"
              onClick={onOpenTrial}
            >
              Dùng thử miễn phí
            </button>
            <button
              type="button"
              className={`mobile-toggle ${mobileMenuOpen ? "active" : ""}`}
              id="mobileToggle"
              aria-label="Menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
