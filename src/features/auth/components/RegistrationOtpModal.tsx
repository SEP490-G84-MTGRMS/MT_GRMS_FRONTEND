import { useState, useEffect, useRef } from "react";
import type { FC, FormEvent, KeyboardEvent, ClipboardEvent } from "react";
import {
  ShieldCheck,
  Smartphone,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export interface RegistrationOtpModalProps {
  isOpen: boolean;
  phone: string;
  maskedPhone: string;
  storeName: string;
  isRealSmsSent: boolean;
  devOtpCode?: string | null;
  firebaseNotice?: string | null;
  isSubmitting: boolean;
  isResending: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onVerify: (otpCode: string) => void;
  onResend: () => Promise<void>;
}

const OTP_LENGTH = 6;

export const RegistrationOtpModal: FC<RegistrationOtpModalProps> = ({
  isOpen,
  phone,
  maskedPhone,
  storeName,
  isRealSmsSent,
  devOtpCode,
  firebaseNotice,
  isSubmitting,
  isResending,
  errorMessage,
  onClose,
  onVerify,
  onResend,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState<number>(60);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(60);
      setLocalError(null);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 60);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, rawValue: string) => {
    setLocalError(null);
    const cleanChar = rawValue.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = cleanChar;
    setDigits(nextDigits);

    if (cleanChar && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const nextDigits = [...digits];
        nextDigits[index] = "";
        setDigits(nextDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const nextDigits = [...digits];
        nextDigits[index - 1] = "";
        setDigits(nextDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const nextDigits = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) {
      nextDigits[i] = pasted[i];
    }
    setDigits(nextDigits);
    setLocalError(null);

    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleFillDevOtp = () => {
    if (!devOtpCode) return;
    const clean = devOtpCode.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (clean.length === OTP_LENGTH) {
      setDigits(clean.split(""));
      setLocalError(null);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      setLocalError("Vui lòng nhập đầy đủ 6 chữ số xác thực OTP.");
      return;
    }
    onVerify(code);
  };

  const handleResendClick = async () => {
    if (countdown > 0 || isResending || isSubmitting) return;
    setLocalError(null);
    await onResend();
    setDigits(Array(OTP_LENGTH).fill(""));
    setCountdown(60);
    inputRefs.current[0]?.focus();
  };

  const activeError = errorMessage || localError;
  const otpString = digits.join("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sms-otp-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          border: "1px solid var(--border-light, #EDF2F9)",
          boxShadow: "0 20px 48px rgba(15, 23, 42, 0.16)",
          padding: "24px 26px",
          position: "relative",
          fontFamily: "var(--font-sans, 'Be Vietnam Pro', sans-serif)",
        }}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Đóng hộp thoại"
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            width: "32px",
            height: "32px",
            borderRadius: "9999px",
            border: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC",
            color: "#64748B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            transition: "background-color 0.15s ease, color 0.15s ease",
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>

        {/* Icon Header */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "9999px",
            backgroundColor: "#F1F5F9",
            color: "var(--blue-primary, #0f766e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px auto",
          }}
        >
          <Smartphone size={22} strokeWidth={1.9} />
        </div>

        <h2
          id="sms-otp-modal-title"
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "var(--text-main, #0F172A)",
            textAlign: "center",
            margin: "0 0 6px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Xác thực số điện thoại SMS
        </h2>

        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-muted, #64748B)",
            textAlign: "center",
            margin: "0 0 16px 0",
            lineHeight: 1.5,
          }}
        >
          Mã xác thực 6 chữ số đã được gửi qua <strong>SMS Gateway</strong> tới số{" "}
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontWeight: 700,
              color: "var(--text-main, #0F172A)",
            }}
          >
            {phone || maskedPhone}
          </span>{" "}
          để kích hoạt cửa hàng <strong>{storeName}</strong>.
        </p>

        {firebaseNotice && (
          <div
            style={{
              backgroundColor: "#FFF8EB",
              border: "1px solid #FFE8CC",
              borderRadius: "12px",
              padding: "10px 12px",
              marginBottom: "12px",
              fontSize: "12px",
              color: "#9A3412",
              lineHeight: 1.45,
            }}
          >
            <strong>Lưu ý từ Google Firebase:</strong> {firebaseNotice}
          </div>
        )}

        {/* Chế độ Dev / Firebase Fallback gợi ý nhanh nếu chưa cấu hình Firebase thật */}
        {!isRealSmsSent && devOtpCode && (
          <div
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px dashed #CBD5E1",
              borderRadius: "14px",
              padding: "10px 14px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.4 }}>
              <span style={{ fontWeight: 600, color: "#0F172A" }}>
                Mã OTP (Dev / Chưa điền Firebase Config):
              </span>{" "}
              <strong
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: "14px",
                  color: "var(--blue-primary, #0f766e)",
                  letterSpacing: "1px",
                }}
              >
                {devOtpCode}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleFillDevOtp}
              style={{
                borderRadius: "9999px",
                padding: "4px 12px",
                fontSize: "11.5px",
                fontWeight: 600,
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                color: "#0F172A",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Điền nhanh
            </button>
          </div>
        )}

        {isRealSmsSent && (
          <div
            style={{
              backgroundColor: "#E8F9EE",
              border: "1px solid #BBF7D0",
              borderRadius: "12px",
              padding: "8px 12px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "#166534",
            }}
          >
            <CheckCircle2 size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span>Đã gửi tin nhắn SMS thật đến điện thoại của bạn.</span>
          </div>
        )}

        {activeError && (
          <div
            role="alert"
            style={{
              backgroundColor: "#FFF0F0",
              border: "1px solid #FFD6D6",
              borderRadius: "12px",
              padding: "10px 12px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "12.5px",
              color: "#DC2626",
            }}
          >
            <AlertCircle
              size={15}
              strokeWidth={2}
              style={{ flexShrink: 0, marginTop: "1px" }}
            />
            <span>{activeError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 6 Ô nhập mã OTP */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "8px",
              marginBottom: "18px",
            }}
          >
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={isSubmitting}
                aria-label={`Chữ số OTP thứ ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "50px",
                  textAlign: "center",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--text-main, #0F172A)",
                  backgroundColor: digit ? "#FFFFFF" : "#F8FAFC",
                  border: digit
                    ? "1.5px solid var(--blue-primary, #0f766e)"
                    : "1.5px solid #E2E8F0",
                  borderRadius: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                }}
              />
            ))}
          </div>

          {/* Nút xác nhận Full Pill */}
          <button
            type="submit"
            disabled={isSubmitting || otpString.length < OTP_LENGTH}
            className="auth-cta-primary-btn"
            style={{
              width: "100%",
              height: "44px",
              borderRadius: "9999px",
              opacity: isSubmitting || otpString.length < OTP_LENGTH ? 0.65 : 1,
              cursor:
                isSubmitting || otpString.length < OTP_LENGTH
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang xác thực & khởi tạo cửa hàng...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} strokeWidth={2.2} />
                <span>XÁC NHẬN MÃ OTP & MỞ CỬA HÀNG</span>
              </>
            )}
          </button>
        </form>

        {/* Bộ đếm ngược & Gửi lại mã */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12.5px",
            color: "var(--text-muted, #64748B)",
          }}
        >
          <span>Không nhận được mã SMS?</span>
          <button
            type="button"
            onClick={handleResendClick}
            disabled={countdown > 0 || isResending || isSubmitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              border: "none",
              background: "transparent",
              padding: "4px 10px",
              borderRadius: "9999px",
              fontFamily: "var(--font-sans, 'Be Vietnam Pro', sans-serif)",
              fontSize: "12.5px",
              fontWeight: 600,
              color:
                countdown > 0
                  ? "#94A3B8"
                  : "var(--blue-primary, #0f766e)",
              cursor:
                countdown > 0 || isResending || isSubmitting
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <RotateCcw size={13} strokeWidth={2} />
            {isResending ? (
              <span>Đang gửi lại...</span>
            ) : countdown > 0 ? (
              <span>
                Gửi lại mã sau{" "}
                <strong
                  style={{
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  }}
                >
                  {countdown}s
                </strong>
              </span>
            ) : (
              <span>Gửi lại mã SMS</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

