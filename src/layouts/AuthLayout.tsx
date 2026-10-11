import type { FC } from 'react';
import { Outlet, Link } from 'react-router-dom';
import {
  Phone,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export const AuthLayout: FC = () => {
  return (
    <div className="auth-shell">
      {/* Header thanh thương hiệu MT-GRMS KiotViet Style chuẩn login.html */}
      <header className="auth-header">
        <div className="auth-header-inner">
          <Link to="/" className="auth-header-brand" aria-label="MT-GRMS Trang Chủ">
            <div className="auth-logo-badge">
              <span>M</span>
            </div>
            <div className="auth-brand-info">
              <div className="auth-brand-title-row">
                <span className="auth-brand-name-text">MT-GRMS</span>
                <span className="auth-badge-enterprise">Enterprise</span>
              </div>
              <span className="auth-brand-subtext">Quản Trị Chuỗi Siêu Thị</span>
            </div>
          </Link>

          <div className="auth-header-right">
            <a href="tel:19006868" className="auth-header-hotline" title="Gọi tổng đài hỗ trợ">
              <span className="auth-hotline-icon-box">
                <Phone size={15} strokeWidth={2} />
              </span>
              <span>
                Hỗ trợ kỹ thuật 24/7:{' '}
                <strong className="auth-hotline-num">1900 6868</strong>
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* Khu vực nội dung trung tâm (Centered Card Layout với Lưới nền tinh tế) */}
      <main className="auth-main-area bg-grid-subtle">
        <div className="auth-card-wrapper">
          <Outlet />
        </div>
      </main>

      {/* Footer đầy đủ bản quyền và bảo mật TLS 256-bit */}
      <footer className="auth-footer">
        <div className="auth-footer-inner">
          <div className="auth-footer-security">
            <div className="auth-security-item">
              <ShieldCheck size={16} strokeWidth={2.2} style={{ color: 'var(--green-money)' }} />
              <span>Bảo mật TLS 256-bit</span>
            </div>
            <span className="auth-security-divider">|</span>
            <div className="auth-security-item">
              <Lock size={15} strokeWidth={2} style={{ color: 'var(--blue-primary)' }} />
              <span>Chứng nhận an toàn chuẩn ISO/IEC 27001:2022</span>
            </div>
          </div>
          <div className="auth-footer-copyright">
            <span>© 2025 MT-GRMS Enterprise Retail Solutions. Tất cả các quyền được bảo lưu.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
