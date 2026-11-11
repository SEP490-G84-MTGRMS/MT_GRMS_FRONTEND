import { useState } from "react";
import type { FC, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Store,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { authService } from "../../features/auth/authService";
import { ApiError } from "../../features/auth/authTypes";
import { LoginOtpModal } from "../../features/auth/components/LoginOtpModal";
import { useAuthStore } from "../../stores/useAuthStore";

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const setAuth = useAuthStore((state) => state.setAuth);

  const [phoneOrEmail, setPhoneOrEmail] = useState("admin@mtgrms.vn");
  const [password, setPassword] = useState("Admin@123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionExpiredNotice] = useState<string | null>(
    redirectUrl ? "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục." : null
  );

  // State cho bước xác thực 2FA Email OTP khi đăng nhập
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [isRealEmailSent, setIsRealEmailSent] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const navigateByRole = (user: { isAdmin?: boolean; role: string }) => {
    if (redirectUrl && !redirectUrl.startsWith("/auth") && redirectUrl !== "/login") {
      navigate(redirectUrl, { replace: true });
      return;
    }

    if (user.isAdmin || user.role === "ADMIN") {
      navigate("/admin/dashboard");
    } else if (user.role === "STAFF") {
      navigate("/employee/schedule");
    } else if (user.role === "CASHIER" || user.role === "EMPLOYEE") {
      navigate("/pos");
    } else {
      navigate("/store-owner/dashboard");
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phoneOrEmail.trim()) {
      setErrorMessage("Vui lòng nhập email hoặc tài khoản đăng nhập.");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Vui lòng nhập mật khẩu.");
      return;
    }

    try {
      setIsLoading(true);
      const otpInitRes = await authService.sendLoginOtp({
        email: phoneOrEmail.trim(),
        password,
        rememberMe,
      });

      setTempToken(otpInitRes.tempToken);
      setMaskedEmail(otpInitRes.maskedEmail);
      setTargetEmail(otpInitRes.targetEmail);
      setIsRealEmailSent(otpInitRes.isRealEmailSent);
      setDevOtpCode(otpInitRes.devOtpCode ?? null);
      setOtpErrorMessage(null);
      setIsOtpModalOpen(true);
    } catch (err: unknown) {
      let msg = "Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản.";
      let status: number | undefined;
      let errorCode: string | undefined;

      if (err instanceof ApiError) {
        status = err.status;
        errorCode = err.errorCode;
        msg = err.message;
      } else if (typeof err === "object" && err !== null) {
        const anyErr = err as Record<string, any>;
        status = anyErr.status || anyErr.statusCode || anyErr.response?.status;
        errorCode = anyErr.errorCode || anyErr.response?.data?.errorCode;
        msg = anyErr.message || anyErr.response?.data?.message || msg;
      }

      console.warn(`[Login OTP Send Failed] API Status: ${status}, ErrorCode: ${errorCode}, Message: ${msg}`);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (otpCode: string) => {
    setOtpErrorMessage(null);
    try {
      setIsVerifyingOtp(true);
      const res = await authService.verifyLoginOtp({
        tempToken,
        otpCode,
      });

      setIsOtpModalOpen(false);
      setAuth(res.user);
      navigateByRole(res.user);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Mã xác thực Email OTP không chính xác hoặc đã hết hạn.";
      setOtpErrorMessage(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendLoginOtp = async () => {
    setOtpErrorMessage(null);
    try {
      setIsResendingOtp(true);
      const otpInitRes = await authService.sendLoginOtp({
        email: phoneOrEmail.trim(),
        password,
        rememberMe,
      });
      setTempToken(otpInitRes.tempToken);
      setMaskedEmail(otpInitRes.maskedEmail);
      setTargetEmail(otpInitRes.targetEmail);
      setIsRealEmailSent(otpInitRes.isRealEmailSent);
      setDevOtpCode(otpInitRes.devOtpCode ?? null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể gửi lại mã Email OTP. Vui lòng thử lại.";
      setOtpErrorMessage(msg);
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <div className="auth-card">
      {/* Thanh trên cùng: Quay lại trang chủ */}
      <div className="auth-card-topbar">
        <Link to="/" className="auth-back-home-link">
          <ArrowLeft size={14} strokeWidth={2.2} />
          <span>Quay lại trang chủ</span>
        </Link>
      </div>

      {/* Tiêu đề thẻ */}
      <h1 className="auth-card-heading">Đăng nhập</h1>

      {/* FORM ĐĂNG NHẬP */}
      <form onSubmit={handleLoginSubmit} className="auth-form-fields">
        {/* 1. Email / Tài khoản */}
        <div className="auth-field-block">
          <label
            htmlFor="username-input"
            className="auth-field-label"
            style={{ marginBottom: "6px" }}
          >
            Email hoặc Tài khoản
          </label>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Mail size={18} strokeWidth={1.8} />
            </span>
            <input
              id="username-input"
              type="text"
              className="auth-styled-input"
              placeholder="admin@mtgrms.vn hoặc số điện thoại"
              value={phoneOrEmail}
              onChange={(e) => setPhoneOrEmail(e.target.value)}
              autoComplete="username"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {/* 2. Mật khẩu */}
        <div className="auth-field-block">
          <label
            htmlFor="password-input"
            className="auth-field-label"
            style={{ marginBottom: "6px" }}
          >
            Mật khẩu
          </label>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <KeyRound size={18} strokeWidth={1.8} />
            </span>
            <input
              id="password-input"
              type={showPassword ? "text" : "password"}
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
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={1.8} />
              ) : (
                <Eye size={18} strokeWidth={1.8} />
              )}
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

        {/* Thông báo phiên hết hạn màu vàng hổ phách nếu được chuyển hướng về */}
        {sessionExpiredNotice && !errorMessage && (
          <div
            className="auth-alert auth-alert-warning"
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              backgroundColor: "#FFFBEB",
              border: "1px solid #FCD34D",
              borderRadius: "10px",
              color: "#D97706",
              fontSize: "13.5px",
              fontWeight: 600,
              margin: "6px 0 8px 0",
              lineHeight: 1.4,
            }}
          >
            <AlertCircle
              size={17}
              strokeWidth={2.2}
              style={{ flexShrink: 0, color: "#D97706" }}
            />
            <span style={{ color: "#D97706" }}>{sessionExpiredNotice}</span>
          </div>
        )}

        {/* Thông báo lỗi màu đỏ */}
        {errorMessage && (
          <div
            className="auth-alert auth-alert-error"
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: "10px",
              color: "#DC2626",
              fontSize: "13.5px",
              fontWeight: 600,
              margin: "6px 0 8px 0",
              lineHeight: 1.4,
            }}
          >
            <AlertCircle
              size={17}
              strokeWidth={2.2}
              style={{ flexShrink: 0, color: "#DC2626" }}
            />
            <span style={{ color: "#DC2626" }}>{errorMessage}</span>
          </div>
        )}

        {/* Nút chính: ĐĂNG NHẬP VÀO HỆ THỐNG full pill */}
        <button
          type="submit"
          className="auth-cta-primary-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>ĐANG GỬI MÃ EMAIL OTP...</span>
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
          onClick={() => navigate("/pos")}
        >
          <Store size={18} strokeWidth={2} />
          <span>Vào Nhanh Quầy POS Thu Ngân</span>
        </button>
      </form>

      <LoginOtpModal
        isOpen={isOtpModalOpen}
        emailDisplay={targetEmail || phoneOrEmail.trim()}
        maskedEmail={maskedEmail}
        isRealEmailSent={isRealEmailSent}
        devOtpCode={devOtpCode}
        isSubmitting={isVerifyingOtp}
        isResending={isResendingOtp}
        errorMessage={otpErrorMessage}
        onClose={() => setIsOtpModalOpen(false)}
        onVerify={handleVerifyLoginOtp}
        onResend={handleResendLoginOtp}
      />

      {/* Hàng chuyển sang Đăng ký mở tiệm */}
      <div className="auth-bottom-switch-link">
        Chưa có tài khoản quản lý chuỗi?{" "}
        <Link to="/auth/register" className="auth-link-text">
          Đăng ký
        </Link>
      </div>
    </div>
  );
};
