import { useState, useEffect, useRef } from "react";
import type { FC, FormEvent, KeyboardEvent, ClipboardEvent } from "react";
import {
  ShieldCheck,
  Mail,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";

export interface LoginOtpModalProps {
  isOpen: boolean;
  emailDisplay: string;
  maskedEmail: string;
  isRealEmailSent: boolean;
  devOtpCode?: string | null;
  isSubmitting: boolean;
  isResending: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onVerify: (otpCode: string) => void;
  onResend: () => Promise<void>;
}

const OTP_LENGTH = 6;

export const LoginOtpModal: FC<LoginOtpModalProps> = ({
  isOpen,
  emailDisplay,
  maskedEmail,
  isRealEmailSent,
  devOtpCode,
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
      aria-labelledby="login-email-otp-modal-title"
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

        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "9999px",
            backgroundColor: "#F1F5F9",
            color: "var(--blue-primary, #0066FF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px auto",
          }}
        >
          <Mail size={22} strokeWidth={1.9} />
        </div>

        <h2
          id="login-email-otp-modal-title"
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "var(--text-main, #0F172A)",
            textAlign: "center",
            margin: "0 0 6px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Xác thực đăng nhập 2 lớp (Email OTP)
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
          Mã bảo mật 6 chữ số đã được gửi tới hộp thư{" "}
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontWeight: 700,
              color: "var(--text-main, #0F172A)",
            }}
          >
            {maskedEmail || emailDisplay}
          </span>{" "}
          để bảo vệ tài khoản của bạn.
        </p>

        {!isRealEmailSent && devOtpCode && (
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
                Mã Email OTP (Dev / Chưa cấu hình SMTP):
              </span>{" "}
              <strong
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: "14px",
                  color: "var(--blue-primary, #0066FF)",
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

        {activeError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "12px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#B91C1C",
              fontSize: "0.82rem",
              marginBottom: "16px",
              lineHeight: 1.45,
            }}
          >
            <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{activeError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
                maxLength={1}
                value={digit}
                disabled={isSubmitting}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                aria-label={`Chữ số OTP thứ ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "52px",
                  borderRadius: "14px",
                  border: digit
                    ? "1.5px solid var(--blue-primary, #0066FF)"
                    : "1.5px solid #CBD5E1",
                  backgroundColor: digit ? "#F8FAFC" : "#FFFFFF",
                  textAlign: "center",
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  color: "var(--text-main, #0F172A)",
                  outline: "none",
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || otpString.length < OTP_LENGTH}
            className="auth-cta-primary-btn"
            style={{
              width: "100%",
              borderRadius: "9999px",
              marginBottom: "14px",
              opacity: isSubmitting || otpString.length < OTP_LENGTH ? 0.65 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang xác thực mã OTP...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} strokeWidth={2.2} />
                <span>XÁC NHẬN MÃ OTP & ĐĂNG NHẬP</span>
              </>
            )}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.82rem",
            color: "var(--text-muted, #64748B)",
            paddingTop: "4px",
          }}
        >
          <span>Chưa nhận được email?</span>
          <button
            type="button"
            onClick={handleResendClick}
            disabled={countdown > 0 || isResending || isSubmitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "0.82rem",
              fontWeight: 700,
              color:
                countdown > 0 || isResending
                  ? "#94A3B8"
                  : "var(--blue-primary, #0066FF)",
              cursor:
                countdown > 0 || isResending || isSubmitting
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <RotateCcw size={13} strokeWidth={2.2} />
            {isResending ? (
              <span>Đang gửi lại...</span>
            ) : countdown > 0 ? (
              <span>
                Gửi lại mã sau{" "}
                <strong style={{ fontFamily: "var(--font-mono, monospace)" }}>
                  {countdown}s
                </strong>
              </span>
            ) : (
              <span>Gửi lại mã OTP qua Email</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

