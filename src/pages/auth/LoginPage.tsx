import { useState } from "react";
import type { FC, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
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

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phoneOrEmail.trim()) {
      setErrorMessage("Vui lòng nhập số điện thoại hoặc email đăng nhập.");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Vui lòng nhập mật khẩu.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.login({
        email: phoneOrEmail.trim(),
        password,
        rememberMe,
      });

      setAuth(res.user);

      // Nếu có redirectUrl, ưu tiên đưa người dùng về đúng màn hình đang làm dở
      if (redirectUrl && !redirectUrl.startsWith("/auth") && redirectUrl !== "/login") {
        navigate(redirectUrl, { replace: true });
        return;
      }

      // Điều hướng thông minh theo vai trò
      if (res.user.isAdmin || res.user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (res.user.role === "STAFF" || res.user.role === "CASHIER" || res.user.role === "EMPLOYEE") {
        navigate("/pos");
      } else {
        navigate("/store-owner/dashboard");
      }
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

      console.warn(`[Login Failed] API Status: ${status}, ErrorCode: ${errorCode}, Message: ${msg}`);
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
      </div>

      {/* Tiêu đề thẻ */}
      <h1 className="auth-card-heading">Đăng nhập</h1>

      {/* FORM ĐĂNG NHẬP */}
      <form onSubmit={handleLoginSubmit} className="auth-form-fields">
        {/* 1. Tên đăng nhập / Số điện thoại */}
        <div className="auth-field-block">
          <label
            htmlFor="username-input"
            className="auth-field-label"
            style={{ marginBottom: "6px" }}
          >
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

        {/* Thông báo lỗi màu đỏ chuyển xuống bên dưới */}
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
          onClick={() => navigate("/pos")}
        >
          <Store size={18} strokeWidth={2} />
          <span>Vào Nhanh Quầy POS Thu Ngân</span>
        </button>
      </form>

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
