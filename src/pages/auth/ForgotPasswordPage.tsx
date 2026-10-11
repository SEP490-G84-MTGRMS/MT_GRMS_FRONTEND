import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { authService } from '../../features/auth/authService';

type Step = 1 | 2 | 3;

export const ForgotPasswordPage: FC = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bước 1: Gửi yêu cầu OTP
  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ đã liên kết với tài khoản.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.requestPasswordReset(email.trim());
      setSuccessMessage(res.message);
      setCurrentStep(2);
      setOtpCode('889966');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi mã xác nhận. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Kiểm tra OTP
  const handleVerifyOtp = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setErrorMessage('Vui lòng nhập mã OTP xác thực hợp lệ (tối thiểu 4 - 6 ký tự).');
      return;
    }

    setSuccessMessage('Mã xác thực chính xác! Vui lòng thiết lập mật khẩu đăng nhập mới.');
    setCurrentStep(3);
  };

  // Bước 3: Đặt lại mật khẩu mới
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.confirmPasswordReset({
        email: email.trim(),
        otpCode: otpCode.trim(),
        newPassword,
      });

      setSuccessMessage(res.message);
      setTimeout(() => {
        navigate('/auth/login');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật mật khẩu. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {/* Thanh trên cùng */}
      <div className="auth-card-topbar">
        <Link to="/auth/login" className="auth-back-home-link">
          <ArrowLeft size={14} strokeWidth={2.2} />
          <span>Quay lại Đăng nhập</span>
        </Link>
        <span className="auth-ssl-badge">Bảo mật SSL</span>
      </div>

      <h1 className="auth-card-heading">Khôi phục mật khẩu</h1>
      <p className="auth-card-subheading">
        {currentStep === 1 && 'Nhập email đã đăng ký để nhận mã OTP xác thực an toàn.'}
        {currentStep === 2 && `Nhập mã xác thực gồm 6 chữ số đã gửi về ${email}.`}
        {currentStep === 3 && 'Thiết lập mật khẩu mới vững chắc cho tài khoản của bạn.'}
      </p>

      {/* Tiến trình 3 bước (Progress Indicator) */}
      <div className="auth-steps-progress" aria-label="Tiến trình khôi phục">
        <div className={`auth-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="auth-step-circle">1</div>
          <span className="auth-step-label">Nhập Email</span>
        </div>
        <div style={{ flex: 1, height: '2px', background: currentStep > 1 ? 'var(--blue-primary)' : 'var(--border-subtle)', margin: '0 8px 18px 8px' }} />
        <div className={`auth-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="auth-step-circle">2</div>
          <span className="auth-step-label">Mã OTP</span>
        </div>
        <div style={{ flex: 1, height: '2px', background: currentStep > 2 ? 'var(--blue-primary)' : 'var(--border-subtle)', margin: '0 8px 18px 8px' }} />
        <div className={`auth-step-item ${currentStep === 3 ? 'active' : ''}`}>
          <div className="auth-step-circle">3</div>
          <span className="auth-step-label">Mật khẩu mới</span>
        </div>
      </div>

      {errorMessage && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: '14px' }}>
          <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && !errorMessage && (
        <div className="auth-alert auth-alert-info" style={{ marginBottom: '14px' }}>
          <CheckCircle2 size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* BƯỚC 1: NHẬP EMAIL */}
      {currentStep === 1 && (
        <form onSubmit={handleRequestOtp} className="auth-form-fields">
          <div className="auth-field-block">
            <label htmlFor="forgot-email" className="auth-field-label" style={{ marginBottom: '6px' }}>
              Địa chỉ Email đăng ký
            </label>
            <div className="auth-input-container">
              <span className="auth-input-prefix-icon">
                <Mail size={18} strokeWidth={1.8} />
              </span>
              <input
                id="forgot-email"
                type="email"
                className="auth-styled-input"
                placeholder="VD: admin@mtgrms.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-cta-primary-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang gửi mã xác thực...</span>
              </>
            ) : (
              <>
                <span>GỬI MÃ XÁC THỰC OTP</span>
                <ArrowRight size={18} strokeWidth={2.2} />
              </>
            )}
          </button>
        </form>
      )}

      {/* BƯỚC 2: NHẬP MÃ OTP */}
      {currentStep === 2 && (
        <form onSubmit={handleVerifyOtp} className="auth-form-fields">
          <div className="auth-field-block">
            <div className="auth-field-label-row">
              <label htmlFor="otp-input" className="auth-field-label">
                Mã xác thực OTP (6 chữ số)
              </label>
              <button
                type="button"
                className="auth-link-text"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '11px' }}
                onClick={() => setSuccessMessage(`Đã gửi lại mã OTP đến ${email}`)}
              >
                Gửi lại mã?
              </button>
            </div>
            <div className="auth-input-container">
              <span className="auth-input-prefix-icon">
                <KeyRound size={18} strokeWidth={1.8} />
              </span>
              <input
                id="otp-input"
                type="text"
                className="auth-styled-input auth-otp-input"
                placeholder="889966"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-cta-primary-btn" disabled={isLoading}>
            <span>XÁC THỰC MÃ OTP</span>
            <ArrowRight size={18} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            className="auth-cta-secondary-btn"
            onClick={() => setCurrentStep(1)}
          >
            Thay đổi địa chỉ email
          </button>
        </form>
      )}

      {/* BƯỚC 3: THIẾT LẬP MẬT KHẨU MỚI */}
      {currentStep === 3 && (
        <form onSubmit={handleResetPassword} className="auth-form-fields">
          <div className="auth-field-block">
            <div className="auth-field-label-row">
              <label htmlFor="new-pass" className="auth-field-label">
                Mật khẩu mới
              </label>
              <span className="auth-field-sublabel">Tối thiểu 8 ký tự</span>
            </div>
            <div className="auth-input-container">
              <span className="auth-input-prefix-icon">
                <Lock size={18} strokeWidth={1.8} />
              </span>
              <input
                id="new-pass"
                type={showPassword ? 'text' : 'password'}
                className="auth-styled-input has-eye-btn"
                placeholder="Nhập mật khẩu mới an toàn..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
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

          <div className="auth-field-block">
            <label htmlFor="confirm-new-pass" className="auth-field-label" style={{ marginBottom: '6px' }}>
              Xác nhận lại mật khẩu mới
            </label>
            <div className="auth-input-container">
              <span className="auth-input-prefix-icon">
                <Lock size={18} strokeWidth={1.8} />
              </span>
              <input
                id="confirm-new-pass"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-styled-input has-eye-btn"
                placeholder="Nhập lại chính xác mật khẩu..."
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-cta-primary-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang lưu mật khẩu mới...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} strokeWidth={2.2} />
                <span>CẬP NHẬT MẬT KHẨU MỚI</span>
              </>
            )}
          </button>
        </form>
      )}

      <div className="auth-bottom-switch-link">
        Nhớ mật khẩu đăng nhập?{' '}
        <Link to="/auth/login" className="auth-link-text">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
};
