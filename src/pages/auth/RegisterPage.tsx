import { useState, useMemo } from "react";
import type { FC, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Store,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import type { ConfirmationResult } from "firebase/auth";
import {
  isFirebasePhoneAuthConfigured,
  sendFirebasePhoneOtp,
  clearRecaptchaVerifier,
  translateFirebaseSmsError,
} from "../../config/firebase";
import { authService } from "../../features/auth/authService";
import { RegistrationOtpModal } from "../../features/auth/components/RegistrationOtpModal";
import { useAuthStore } from "../../stores/useAuthStore";

export const RegisterPage: FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // State cho bước xác thực SMS OTP qua Google Firebase Phone Auth
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [isRealSmsSent, setIsRealSmsSent] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
  const [firebaseNotice, setFirebaseNotice] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [firebaseConfirmation, setFirebaseConfirmation] =
    useState<ConfirmationResult | null>(null);

  // Tính toán độ mạnh mật khẩu (Weak / Medium / Strong)
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
    if (!phone.trim()) {
      setErrorMessage("Vui lòng nhập số điện thoại liên hệ.");
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

      // 1. Kiểm tra trùng số điện thoại và gửi SMS qua TextBee Gateway trên Backend
      const otpRes = await authService.sendRegistrationOtp({
        phone: phone.trim(),
        storeName: storeName.trim(),
        fullName: fullName.trim(),
      });

      setMaskedPhone(otpRes.maskedPhone);

      // 2. Nếu TextBee đã gửi SMS thật thành công thì dùng trực tiếp luôn
      if (otpRes.isRealSmsSent) {
        setFirebaseConfirmation(null);
        setIsRealSmsSent(true);
        setDevOtpCode(null);
        setFirebaseNotice(null);
      } else if (isFirebasePhoneAuthConfigured()) {
        try {
          const confirmation = await sendFirebasePhoneOtp(phone.trim());
          setFirebaseConfirmation(confirmation);
          setIsRealSmsSent(true);
          setDevOtpCode(null);
          setFirebaseNotice(null);
        } catch {
          setFirebaseConfirmation(null);
          setIsRealSmsSent(false);
          setDevOtpCode(otpRes.devOtpCode ?? null);
          setFirebaseNotice(null);
        }
      } else {
        setFirebaseConfirmation(null);
        setIsRealSmsSent(otpRes.isRealSmsSent);
        setDevOtpCode(otpRes.devOtpCode ?? null);
        setFirebaseNotice(null);
      }

      setOtpErrorMessage(null);
      setIsOtpModalOpen(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể gửi mã xác thực SMS. Vui lòng thử lại.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndCreateStore = async (otpCode: string) => {
    setOtpErrorMessage(null);
    try {
      setIsVerifyingOtp(true);

      let firebaseIdToken: string | undefined;
      if (firebaseConfirmation) {
        const userCredential = await firebaseConfirmation.confirm(otpCode);
        firebaseIdToken = await userCredential.user.getIdToken();
      }

      const res = await authService.register({
        fullName: fullName.trim(),
        storeName: storeName.trim(),
        phone: phone.trim(),
        password,
        agreeTerms,
        otpCode: firebaseIdToken ? undefined : otpCode,
        firebaseIdToken,
      });

      clearRecaptchaVerifier();
      setIsOtpModalOpen(false);
      setAuth(res.user, res.accessToken);
      setIsSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && !err.message.includes("auth/")
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
        storeName: storeName.trim(),
        fullName: fullName.trim(),
      });
      setMaskedPhone(otpRes.maskedPhone);

      if (isFirebasePhoneAuthConfigured()) {
        try {
          const confirmation = await sendFirebasePhoneOtp(phone.trim());
          setFirebaseConfirmation(confirmation);
          setIsRealSmsSent(true);
          setDevOtpCode(null);
          setFirebaseNotice(null);
        } catch (fbErr: unknown) {
          const reason = translateFirebaseSmsError(fbErr);
          setFirebaseConfirmation(null);
          setIsRealSmsSent(false);
          setDevOtpCode(otpRes.devOtpCode ?? null);
          setFirebaseNotice(reason);
        }
      } else {
        setFirebaseConfirmation(null);
        setIsRealSmsSent(otpRes.isRealSmsSent);
        setDevOtpCode(otpRes.devOtpCode ?? null);
        setFirebaseNotice(null);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể gửi lại mã SMS OTP. Vui lòng thử lại.";
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
      {/* Thanh trên cùng */}
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
        {/* Tên người đại diện */}
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

        {/* Tên cửa hàng */}
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

        {/* Số điện thoại */}
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
              className="auth-styled-input font-mono-input"
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {/* Mật khẩu */}
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

        {/* Xác nhận lại mật khẩu */}
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

        {/* Đồng ý điều khoản */}
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

        {/* Nút Submit */}
        <button
          type="submit"
          className="auth-cta-primary-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Đang gửi mã xác thực SMS...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} strokeWidth={2.2} />
              <span>ĐĂNG KÝ MỞ CỬA HÀNG NGAY</span>
            </>
          )}
        </button>
      </form>

      {/* Container ẩn cho Google Firebase Invisible reCAPTCHA */}
      <div id="recaptcha-verifier-container" />

      <RegistrationOtpModal
        isOpen={isOtpModalOpen}
        phone={phone.trim()}
        maskedPhone={maskedPhone}
        storeName={storeName.trim()}
        isRealSmsSent={isRealSmsSent}
        devOtpCode={devOtpCode}
        firebaseNotice={firebaseNotice}
        isSubmitting={isVerifyingOtp}
        isResending={isResendingOtp}
        errorMessage={otpErrorMessage}
        onClose={() => {
          clearRecaptchaVerifier();
          setIsOtpModalOpen(false);
        }}
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
