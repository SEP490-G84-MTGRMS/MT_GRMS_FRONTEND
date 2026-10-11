import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  QrCode,
  Building2,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Store,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { authService } from '../../features/auth/authService';
import { useAuthStore } from '../../stores/useAuthStore';

type AuthTab = 'credentials' | 'qr';

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [activeTab, setActiveTab] = useState<AuthTab>('credentials');
  const [tenantCode, setTenantCode] = useState('sieuthimart.mtgrms.vn');
  const [phoneOrEmail, setPhoneOrEmail] = useState('0912 345 678');
  const [password, setPassword] = useState('SecurityToken2025#');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!tenantCode.trim()) {
      setErrorMessage('Vui lòng nhập mã chuỗi hoặc tên miền cửa hàng.');
      return;
    }

    if (!phoneOrEmail.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc email đăng nhập.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.login({
        email: phoneOrEmail.trim(),
        password,
        tenantCode: tenantCode.trim(),
        rememberMe,
      });

      setAuth(res.user, res.accessToken);

      // Điều hướng thông minh theo vai trò
      if (res.user.role === 'CASHIER') {
        navigate('/pos');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {/* Thanh trên cùng: Quay lại trang chủ & Huy hiệu Bảo mật SSL */}
      <div className="auth-card-topbar">
        <Link to="/" className="auth-back-home-link">
          <ArrowLeft size={14} strokeWidth={2.2} />
          <span>Quay lại trang chủ</span>
        </Link>
        <span className="auth-ssl-badge">Bảo mật SSL</span>
      </div>

      {/* Tiêu đề thẻ */}
      <h1 className="auth-card-heading">Đăng nhập</h1>

      {/* Tabs chuyển đổi phương thức đăng nhập */}
      <div className="auth-pills-tabs" role="tablist">
        <button
          type="button"
          className={`auth-pill-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
          onClick={() => setActiveTab('credentials')}
          role="tab"
          aria-selected={activeTab === 'credentials'}
        >
          <Lock size={15} strokeWidth={2} />
          <span>Tài khoản &amp; Mật khẩu</span>
        </button>
        <button
          type="button"
          className={`auth-pill-tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveTab('qr')}
          role="tab"
          aria-selected={activeTab === 'qr'}
        >
          <QrCode size={15} strokeWidth={2} />
          <span>Quét mã QR (App)</span>
        </button>
      </div>

      {/* Thông báo lỗi */}
      {errorMessage && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: '14px' }}>
          <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* NỘI DUNG TAB 1: FORM TÀI KHOẢN & MẬT KHẨU */}
      {activeTab === 'credentials' && (
        <form onSubmit={handleLoginSubmit} className="auth-form-fields">
          {/* 1. Mã định danh chuỗi / Domain */}
          <div className="auth-field-block">
            <div className="auth-field-label-row">
              <label htmlFor="tenant-input" className="auth-field-label">
                Mã chuỗi / Gian hàng
              </label>
              <span className="auth-field-sublabel">Tenant Domain</span>
            </div>
            <div className="auth-input-container">
              <span className="auth-input-prefix-icon">
                <Building2 size={18} strokeWidth={1.8} />
              </span>
              <input
                id="tenant-input"
                type="text"
                className="auth-styled-input font-mono-input"
                placeholder="domain-cua-hang.mtgrms.vn"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* 2. Tên đăng nhập / Số điện thoại */}
          <div className="auth-field-block">
            <label htmlFor="username-input" className="auth-field-label" style={{ marginBottom: '6px' }}>
              Số điện thoại
            </label>
            <div className="auth-input-container">
              <span className="auth-input-prefix-icon">
                <Phone size={18} strokeWidth={1.8} />
              </span>
              <input
                id="username-input"
                type="text"
                className="auth-styled-input"
                placeholder="09xx xxx xxx"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* 3. Mật khẩu */}
          <div className="auth-field-block">
            <label htmlFor="password-input" className="auth-field-label" style={{ marginBottom: '6px' }}>
              Mật khẩu
            </label>
            <div className="auth-input-container">
              <span className="auth-input-prefix-icon">
                <KeyRound size={18} strokeWidth={1.8} />
              </span>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="auth-styled-input has-eye-btn"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          {/* Ghi nhớ & Quên mật khẩu */}
          <div className="auth-remember-row">
            <label className="auth-checkbox-wrap">
              <input
                type="checkbox"
                className="auth-native-check"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span>Ghi nhớ đăng nhập 30 ngày</span>
            </label>
            <Link to="/auth/forgot-password" className="auth-link-text">
              Quên mật khẩu?
            </Link>
          </div>

          {/* Nút chính: ĐĂNG NHẬP VÀO HỆ THỐNG full pill */}
          <button type="submit" className="auth-cta-primary-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>ĐANG XÁC THỰC BẢO MẬT...</span>
              </>
            ) : (
              <>
                <span>ĐĂNG NHẬP VÀO HỆ THỐNG</span>
                <ArrowRight size={19} strokeWidth={2.2} />
              </>
            )}
          </button>

          {/* Nút phụ: Vào nhanh Quầy POS Thu Ngân */}
          <button
            type="button"
            className="auth-cta-secondary-btn"
            onClick={() => navigate('/pos')}
          >
            <Store size={18} strokeWidth={2} />
            <span>Vào Nhanh Quầy POS Thu Ngân</span>
          </button>
        </form>
      )}

      {/* NỘI DUNG TAB 2: QUÉT MÃ QR (App Quản lý) */}
      {activeTab === 'qr' && (
        <div className="auth-qr-pane">
          <div className="auth-qr-frame">
            <div className="auth-qr-inner-box">
              {/* QR Code vector SVG sạch và sắc nét */}
              <svg width="140" height="140" viewBox="0 0 24 24" fill="var(--text-main)">
                <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 0h2v2h-2v-2zm2 2h2v2h-2v-2zm3 2h3v4h-3v-4zm-5 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-2-2h-2v-2h2v2z" />
              </svg>
              {/* Logo trung tâm MT-GRMS */}
              <div className="auth-qr-center-logo">
                <span>M</span>
              </div>
            </div>
          </div>

          <p className="auth-qr-guide-text">
            Mở ứng dụng <strong>MT-GRMS Manager</strong> trên điện thoại và chọn quét mã để đăng nhập ngay mà không cần mật khẩu.
          </p>

          <div className="auth-qr-sync-indicator">
            <RefreshCw size={14} strokeWidth={2.2} className="animate-spin" />
            <span>Mã QR tự làm mới sau 45s</span>
          </div>
        </div>
      )}

      {/* Hàng chuyển sang Đăng ký mở tiệm */}
      <div className="auth-bottom-switch-link">
        Chưa có tài khoản quản lý chuỗi?{' '}
        <Link to="/auth/register" className="auth-link-text">
          Đăng ký dùng thử 14 ngày
        </Link>
      </div>
    </div>
  );
};
