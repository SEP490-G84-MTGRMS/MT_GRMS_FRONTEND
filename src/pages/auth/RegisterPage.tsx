import { useState, useRef } from "react";
import type { FC, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Store,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { authService } from "../../features/auth/authService";
import { getRegistrationPasswordStrength, validateRegistration, type RegistrationValidationError } from "../../features/auth/authValidation";
import { AdminToast, type ToastState } from "../../features/admin/components/common/AdminToast";
import { RegistrationOtpModal } from "../../features/auth/components/RegistrationOtpModal";
import { AuthPolicyModal, type AuthPolicyDocType } from "../../features/auth/components/AuthPolicyModal";
import { useAuthStore } from "../../stores/useAuthStore";

export const isTrialRegistrationIntent = (intent: string | null) => intent === "trial";

export const RegisterPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startTrial = isTrialRegistrationIntent(searchParams.get("intent"));
  const registrationIdempotencyKey = useRef(crypto.randomUUID());
  const setAuth = useAuthStore((state) => state.setAuth);

  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [policyModal, setPolicyModal] = useState<AuthPolicyDocType | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<RegistrationValidationError | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // State cho bước xác thực Email OTP kích hoạt cửa hàng
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isRealEmailSent, setIsRealEmailSent] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const passwordStrength = getRegistrationPasswordStrength(password);

  const showErrorToast = (message: string) =>
    setToast({ id: String(Date.now()), message, type: "error" });

  const clearFieldError = (field: RegistrationValidationError["field"]) => {
    if (fieldError?.field !== field) return;
    setFieldError(null);
    setToast(null);
  };

  const getFieldProps = (field: RegistrationValidationError["field"]) => ({
    name: field,
    "aria-invalid": fieldError?.field === field || undefined,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setToast(null);

    const validationError = validateRegistration({ fullName, storeName, phone, email, password, confirmPassword, agreeTerms });
    setFieldError(validationError);
    if (validationError) {
      showErrorToast(validationError.message);
      const input = e.currentTarget.elements.namedItem(validationError.field);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }

    try {
      setIsLoading(true);

      const otpRes = await authService.sendRegistrationOtp({
        phone: phone.trim(),
        email: email.trim(),
        storeName: storeName.trim(),
        fullName: fullName.trim(),
        startTrial,
      });

      registrationIdempotencyKey.current = crypto.randomUUID();
      setChallengeId(otpRes.challengeId ?? null);
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
      showErrorToast(msg);
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
        startTrial,
        idempotencyKey: registrationIdempotencyKey.current,
        challengeId,
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
        startTrial,
      });
      registrationIdempotencyKey.current = crypto.randomUUID();
      setChallengeId(otpRes.challengeId ?? null);
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
            {startTrial
              ? <>Trial 3 ngày của <strong>{storeName}</strong> bắt đầu từ lúc đăng ký thành công, không cần thẻ và không tự động gia hạn.</>
              : <>Cửa hàng <strong>{storeName}</strong> đã được tạo. Hãy chọn gói dịch vụ trước khi sử dụng chức năng kinh doanh.</>}
          </p>
          <button
            type="button"
            className="auth-cta-primary-btn"
            style={{ maxWidth: "320px" }}
            onClick={() => navigate(startTrial ? "/store-owner/dashboard" : "/store-owner/subscriptions?tab=subscriptions&onboarding=1")}
          >
            <span>{startTrial ? "Vào trang Quản trị cửa hàng" : "Chọn gói dịch vụ"}</span>
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

      {startTrial && (
        <div className="auth-alert" role="status" style={{ marginBottom: "14px" }}>
          <ShieldCheck size={17} strokeWidth={2} />
          <span>Dùng thử miễn phí 3 ngày. 72 giờ bắt đầu ngay khi đăng ký thành công, không cần thẻ và không tự động gia hạn.</span>
        </div>
      )}

      <AdminToast toast={toast} onClose={() => setToast(null)} />

      <form onSubmit={handleSubmit} className="auth-form-fields" noValidate>
        <div className="auth-field-block">
          <div className="auth-field-label-row">
            <label
              htmlFor="reg-fullname"
              className="auth-field-label"
            >
              Họ và tên đại diện
            </label>
          </div>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <User size={18} strokeWidth={1.8} />
            </span>
            <input
              id="reg-fullname"
              {...getFieldProps("fullName")}
              type="text"
              className="auth-styled-input"
              placeholder="Họ và tên đại diện"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearFieldError("fullName");
              }}
              disabled={isLoading}
              required
              maxLength={100}
            />
          </div>
        </div>

        <div className="auth-field-block">
          <div className="auth-field-label-row">
            <label
              htmlFor="reg-storename"
              className="auth-field-label"
            >
              Tên cửa hàng
            </label>
          </div>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Store size={18} strokeWidth={1.8} />
            </span>
            <input
              id="reg-storename"
              {...getFieldProps("storeName")}
              type="text"
              className="auth-styled-input"
              placeholder="Tên cửa hàng"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                clearFieldError("storeName");
              }}
              disabled={isLoading}
              required
              maxLength={150}
            />
          </div>
        </div>

        <div className="auth-field-block">
          <div className="auth-field-label-row">
            <label
              htmlFor="reg-phone"
              className="auth-field-label"
            >
              Số điện thoại
            </label>
          </div>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Phone size={18} strokeWidth={1.8} />
            </span>
            <input
              id="reg-phone"
              {...getFieldProps("phone")}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              className="auth-styled-input font-mono-input"
              placeholder="09xx xxx xxx"
              value={phone}
              onChange={(e) => {
                // Tự động loại bỏ toàn bộ ký tự không phải chữ số (chống nhập chữ như asddda)
                const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(numericOnly);
                clearFieldError("phone");
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
          <div className="auth-field-label-row">
            <label
              htmlFor="reg-email"
              className="auth-field-label"
            >
              Email nhận mã OTP kích hoạt
            </label>
          </div>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Mail size={18} strokeWidth={1.8} />
            </span>
            <input
              id="reg-email"
              {...getFieldProps("email")}
              type="email"
              className="auth-styled-input"
              placeholder="chucuahang@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              disabled={isLoading}
              required
              maxLength={100}
            />
          </div>
        </div>

        <div className="auth-field-block">
          <div className="auth-field-label-row">
            <label
              htmlFor="reg-password"
              className="auth-field-label"
            >
              Mật khẩu
            </label>
          </div>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Lock size={17} strokeWidth={1.8} />
            </span>
            <input
              id="reg-password"
              {...getFieldProps("password")}
              type={showPassword ? "text" : "password"}
              className="auth-styled-input has-eye-btn"
              placeholder="8–64 ký tự, có chữ hoa, số và ký tự đặc biệt"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
                clearFieldError("confirmPassword");
              }}
              autoComplete="new-password"
              disabled={isLoading}
              required
              maxLength={64}
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

        <div
          className="auth-register-password-meter"
          data-strength={passwordStrength}
          role="meter"
          aria-label="Độ mạnh mật khẩu"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={passwordStrength}
          aria-valuetext={["Chưa nhập mật khẩu", "Yếu", "Trung bình", "Mạnh"][passwordStrength]}
        >
          {[1, 2, 3].map((level) => (
            <span key={level} data-filled={level <= passwordStrength} />
          ))}
        </div>

        <div className="auth-field-block">
          <div className="auth-field-label-row">
            <label
              htmlFor="reg-confirm-password"
              className="auth-field-label"
            >
              Xác nhận lại mật khẩu
            </label>
          </div>
          <div className="auth-input-container">
            <span className="auth-input-prefix-icon">
              <Lock size={17} strokeWidth={1.8} />
            </span>
            <input
              id="reg-confirm-password"
              {...getFieldProps("confirmPassword")}
              type={showConfirmPassword ? "text" : "password"}
              className="auth-styled-input has-eye-btn"
              placeholder="Nhập lại mật khẩu..."
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError("confirmPassword");
              }}
              autoComplete="new-password"
              disabled={isLoading}
              required
              maxLength={64}
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

        <div className="auth-field-block">
          <label
            className="auth-checkbox-wrap"
            style={{ alignItems: "flex-start" }}
          >
            <input
              type="checkbox"
              {...getFieldProps("agreeTerms")}
              className="auth-native-check"
              style={{ marginTop: "2px" }}
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                clearFieldError("agreeTerms");
              }}
              disabled={isLoading}
              required
            />
            <span style={{ fontSize: "12px", lineHeight: 1.45 }}>
              Tôi đồng ý với{" "}
              <button
                type="button"
                className="auth-link-text"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPolicyModal("terms");
                }}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
              >
                Điều khoản sử dụng
              </button>{" "}
              và{" "}
              <button
                type="button"
                className="auth-link-text"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPolicyModal("privacy");
                }}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
              >
                Chính sách bảo mật
              </button>
              .
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

      <AuthPolicyModal
        docType={policyModal}
        onClose={() => setPolicyModal(null)}
        onAccept={() => {
          setAgreeTerms(true);
          clearFieldError("agreeTerms");
        }}
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
