import { useState } from "react";
import type { FC, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useAuthStore } from "../../stores/useAuthStore";

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [phoneOrEmail, setPhoneOrEmail] = useState("admin@mtgrms.vn");
  const [password, setPassword] = useState("Admin@123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      setAuth(res.user, res.accessToken);

      // Điều hướng thông minh theo vai trò
      if (res.user.role === "CASHIER") {
        navigate("/pos");
      } else {
        navigate("/admin/dashboard");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản.";
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

      {/* Thông báo lỗi */}
      {errorMessage && (
        <div
          className="auth-alert auth-alert-error"
          role="alert"
          style={{ marginBottom: "14px" }}
        >
          <AlertCircle
            size={16}
            strokeWidth={2}
            style={{ flexShrink: 0, marginTop: "2px" }}
          />
          <span>{errorMessage}</span>
        </div>
      )}

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
