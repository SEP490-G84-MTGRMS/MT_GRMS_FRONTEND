import { useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  onOpenLogin?: () => void;
  onOpenTrial: () => void;
}

export const Navbar: FC<NavbarProps> = ({ onOpenTrial }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="site-header" id="header">
      <div className="container nav-container">
        <Link to="/" className="brand-logo" aria-label="MT-GRMS Trang Chủ">
          <div className="logo-symbol">
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2C16 2 4 14.5 4 21C4 26.5228 8.47715 31 14 31C19.5228 31 24 26.5228 24 21C24 14.5 16 2 16 2Z"
                fill="url(#brandBlueGrad)"
              />
              <path
                d="M20 10C20 10 28 17.5 28 22C28 25.866 24.866 29 21 29C17.134 29 14 25.866 14 22C14 17.5 20 10 20 10Z"
                fill="#00C2FF"
                fillOpacity="0.9"
              />
              <circle cx="14" cy="22" r="3.5" fill="#FFFFFF" />
              <defs>
                <linearGradient id="brandBlueGrad" x1="4" y1="2" x2="24" y2="31" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0066FF" />
                  <stop offset="1" stopColor="#0047BA" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-name">MT-GRMS</span>
          </div>
        </Link>

        <div className="nav-right-group">
          <nav className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`} id="navMenu">
            <a href="#giai-phap" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              Giải pháp
            </a>
            <a href="#dich-vu" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              Dịch vụ & Tiện ích
            </a>
            <a href="#hoi-dap" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              Chính sách & Hỏi đáp
            </a>

            <Link
              to="/admin/dashboard"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--blue-primary)', fontWeight: 600 }}
            >
              👑 Demo Admin
            </Link>
            <Link
              to="/employee/pos"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#0F766E', fontWeight: 600 }}
            >
              🧑‍💼 Demo Employee (POS)
            </Link>
          </nav>

          <div className="nav-buttons">
            <Link to="/auth/login" className="btn btn-ghost btn-pill">
              Đăng nhập
            </Link>
            <button type="button" className="btn btn-primary btn-pill" onClick={onOpenTrial}>
              Dùng thử miễn phí
            </button>
            <button
              type="button"
              className={`mobile-toggle ${mobileMenuOpen ? 'active' : ''}`}
              id="mobileToggle"
              aria-label="Menu"
              onClick={() => setMobileMenuOpen(prev => !prev)}
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
