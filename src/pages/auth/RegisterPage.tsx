import { useState, useMemo } from "react";
import type { FC, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Store,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { authService } from "../../features/auth/authService";
import { RegistrationOtpModal } from "../../features/auth/components/RegistrationOtpModal";
import { useAuthStore } from "../../stores/useAuthStore";

export const RegisterPage: FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // State cho bước xác thực Email OTP kích hoạt cửa hàng
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isRealEmailSent, setIsRealEmailSent] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!password)
      return { score: 0, text: "", color: "transparent", width: "0%" };

    if (password.length < 6) {
      return {
        score: 1,
        text: "Yếu (tối thiểu 6 ký tự)",
        color: "var(--red-accent)",
        width: "25%",
      };
    }

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    else if (/[A-Za-z]/.test(password)) score += 0.5;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score < 2.5) {
      return {
        score: 1,
        text: "Yếu",
        color: "var(--red-accent)",
        width: "35%",
      };
    }
    if (score < 4) {
      return {
        score: 2,
        text: "Trung bình",
        color: "var(--orange-accent)",
        width: "65%",
      };
    }
    return {
      score: 3,
      text: "Mạnh",
      color: "var(--green-money)",
      width: "100%",
    };
  }, [password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên chủ cửa hàng / người quản lý.");
      return;
    }
    if (!storeName.trim()) {
      setErrorMessage("Vui lòng nhập tên chuỗi hoặc cửa hàng bán lẻ.");
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!cleanPhone) {
      setErrorMessage("Vui lòng nhập số điện thoại liên hệ.");
      return;
    }
    if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(cleanPhone)) {
      setErrorMessage("Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage("Vui lòng nhập địa chỉ email hợp lệ (VD: chucuahang@gmail.com).");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Mật khẩu bảo mật phải có tối thiểu 6 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.");
      return;
    }
    if (!agreeTerms) {
      setErrorMessage(
        "Vui lòng xác nhận đồng ý với Điều khoản dịch vụ để tiếp tục.",
      );
      return;
    }

    try {
      setIsLoading(true);

      const otpRes = await authService.sendRegistrationOtp({
        phone: phone.trim(),
        email: email.trim(),
        storeName: storeName.trim(),
        fullName: fullName.trim(),
      });

      setMaskedEmail(otpRes.maskedEmail);
      setIsRealEmailSent(otpRes.isRealEmailSent);
      setDevOtpCode(otpRes.devOtpCode ?? null);
      setOtpErrorMessage(null);
      setIsOtpModalOpen(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể gửi mã xác thực Email OTP. Vui lòng thử lại.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndCreateStore = async (otpCode: string) => {
    setOtpErrorMessage(null);
    try {
      setIsVerifyingOtp(true);

      const res = await authService.register({
        fullName: fullName.trim(),
        storeName: storeName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        agreeTerms,
        otpCode,
      });

      setIsOtpModalOpen(false);
      setAuth(res.user);
      setIsSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại.";
      setOtpErrorMessage(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendRegistrationOtp = async () => {
    setOtpErrorMessage(null);
    try {
      setIsResendingOtp(true);
      const otpRes = await authService.sendRegistrationOtp({
        phone: phone.trim(),
        email: email.trim(),
        storeName: storeName.trim(),
        fullName: fullName.trim(),
      });
      setMaskedEmail(otpRes.maskedEmail);
      setIsRealEmailSent(otpRes.isRealEmailSent);
      setDevOtpCode(otpRes.devOtpCode ?? null);
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

  if (isSuccess) {
    return (
      <div className="auth-card">
        <div
          style={{
            padding: "24px 12px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CheckCircle2
            size={54}
            strokeWidth={2}
            style={{ color: "var(--green-money)", marginBottom: "14px" }}
          />
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              margin: "0 0 8px 0",
              color: "var(--text-main)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Khởi tạo cửa hàng thành công!
          </h2>
          <p
            style={{
              fontSize: "0.92rem",
              color: "var(--text-muted)",
              margin: "0 0 24px 0",
              maxWidth: "380px",
              lineHeight: 1.5,
            }}
          >
            Chào mừng bạn đến với hệ thống bán lẻ <strong>MT-GRMS</strong>. Cửa
            hàng <strong>{storeName}</strong> của bạn đã sẵn sàng trải nghiệm.
          </p>
          <button
            type="button"
            className="auth-cta-primary-btn"
            style={{ maxWidth: "320px" }}
            onClick={() => navigate("/store-owner/dashboard")}
          >
            <span>Vào trang Quản trị cửa hàng</span>
            <ArrowRight size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-topbar">
        <Link to="/" className="auth-back-home-link">
          <ArrowLeft size={14} strokeWidth={2.2} />
          <span>Quay lại trang chủ</span>
        </Link>
      </div>

      <h1 className="auth-card-heading">Đăng ký mở cửa hàng</h1>

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

      <form onSubmit={handleSubmit} className="auth-form-fields">
        <div className="auth-field-block">
          <label
            htmlFor="reg-fullname"
            className="auth-field-label"
            style={{ marginBottom: "6px" }}
          >
            Họ và tên đại diện
          </label>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <User size={18} strokeWidth={1.8} />
            </span>
            <input
              id="reg-fullname"
              type="text"
              className="auth-styled-input"
              placeholder="Họ và tên đại diện"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="auth-field-block">
          <label
            htmlFor="reg-storename"
            className="auth-field-label"
            style={{ marginBottom: "6px" }}
          >
            Tên cửa hàng
          </label>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Store size={18} strokeWidth={1.8} />
            </span>
            <input
              id="reg-storename"
              type="text"
              className="auth-styled-input"
              placeholder="Tên cửa hàng"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="auth-field-block">
          <label
            htmlFor="reg-phone"
            className="auth-field-label"
            style={{ marginBottom: "5px" }}
          >
            Số điện thoại
          </label>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Phone size={18} strokeWidth={1.8} />
            </span>
            <input
              id="reg-phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={11}
              className="auth-styled-input font-mono-input"
              placeholder="09xx xxx xxx"
              value={phone}
              onChange={(e) => {
                // Tự động loại bỏ toàn bộ ký tự không phải chữ số (chống nhập chữ như asddda)
                const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                setPhone(numericOnly);
                if (errorMessage) setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                // Chặn gõ phím chữ, chỉ cho phép số, phím xóa và điều hướng
                const allowedControlKeys = [
                  "Backspace",
                  "Delete",
                  "ArrowLeft",
                  "ArrowRight",
                  "Tab",
                  "Enter",
                ];
                if (
                  allowedControlKeys.includes(e.key) ||
                  (e.ctrlKey || e.metaKey) // Ctrl+C, Ctrl+V, Ctrl+A
                ) {
                  return;
                }
                if (!/^\d$/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="auth-field-block">
          <label
            htmlFor="reg-email"
            className="auth-field-label"
            style={{ marginBottom: "5px" }}
          >
            Email nhận mã OTP kích hoạt
          </label>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Mail size={18} strokeWidth={1.8} />
            </span>
            <input
              id="reg-email"
              type="email"
              className="auth-styled-input"
              placeholder="chucuahang@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="auth-field-block">
          <label
            htmlFor="reg-password"
            className="auth-field-label"
            style={{ marginBottom: "6px" }}
          >
            Mật khẩu
          </label>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Lock size={17} strokeWidth={1.8} />
            </span>
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              className="auth-styled-input has-eye-btn"
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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
                <EyeOff size={16} strokeWidth={1.8} />
              ) : (
                <Eye size={16} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        {password && (
          <div
            className="auth-strength-meter"
            style={{ marginTop: "-4px", marginBottom: "2px" }}
          >
            <div className="auth-strength-bar">
              <div
                className="auth-strength-fill"
                style={{
                  width: passwordStrength.width,
                  backgroundColor: passwordStrength.color,
                }}
              />
            </div>
            <span
              className="auth-strength-text"
              style={{
                color: passwordStrength.color,
                fontFamily: "var(--font-mono)",
              }}
            >
              {passwordStrength.text}
            </span>
          </div>
        )}

        <div className="auth-field-block">
          <label
            htmlFor="reg-confirm-password"
            className="auth-field-label"
            style={{ marginBottom: "6px" }}
          >
            Xác nhận lại mật khẩu
          </label>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Lock size={17} strokeWidth={1.8} />
            </span>
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              className="auth-styled-input has-eye-btn"
              placeholder="Nhập lại mật khẩu..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showConfirmPassword ? (
                <EyeOff size={16} strokeWidth={1.8} />
              ) : (
                <Eye size={16} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        <div className="auth-remember-row" style={{ alignItems: "flex-start" }}>
          <label
            className="auth-checkbox-wrap"
            style={{ alignItems: "flex-start" }}
          >
            <input
              type="checkbox"
              className="auth-native-check"
              style={{ marginTop: "2px" }}
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              disabled={isLoading}
            />
            <span style={{ fontSize: "12px", lineHeight: 1.45 }}>
              Tôi đồng ý với{" "}
              <span className="auth-link-text">Điều khoản sử dụng</span> và{" "}
              <span className="auth-link-text">Chính sách bảo mật</span>.
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="auth-cta-primary-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Đang gửi mã OTP qua Email...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} strokeWidth={2.2} />
              <span>ĐĂNG KÝ MỞ CỬA HÀNG NGAY</span>
            </>
          )}
        </button>
      </form>

      <RegistrationOtpModal
        isOpen={isOtpModalOpen}
        email={email.trim()}
        maskedEmail={maskedEmail}
        storeName={storeName.trim()}
        isRealEmailSent={isRealEmailSent}
        devOtpCode={devOtpCode}
        isSubmitting={isVerifyingOtp}
        isResending={isResendingOtp}
        errorMessage={otpErrorMessage}
        onClose={() => setIsOtpModalOpen(false)}
        onVerify={handleVerifyOtpAndCreateStore}
        onResend={handleResendRegistrationOtp}
      />

      <div className="auth-bottom-switch-link">
        Đã có tài khoản quản lý chuỗi?{" "}
        <Link to="/auth/login" className="auth-link-text">
          Đăng nhập tại đây
        </Link>
      </div>
    </div>
  );
};
