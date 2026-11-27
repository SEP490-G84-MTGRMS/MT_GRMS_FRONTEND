// src/pages/store/components/ChangePasswordModal.tsx
import { useState, type FC, type FormEvent } from 'react';
import { X, KeyRound, ShieldAlert, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../../../features/auth/authService';
import { getRegistrationPasswordStrength } from '../../../features/auth/authValidation';
import { useAuthStore } from '../../../stores/useAuthStore';

interface ChangePasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const STRONG_PASSWORD_MESSAGE =
  'Mật khẩu mới phải có 8–64 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.';

export const ChangePasswordModal: FC<ChangePasswordModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordStrength = getRegistrationPasswordStrength(newPassword);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!currentPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (passwordStrength !== 3) {
      setErrorMsg(STRONG_PASSWORD_MESSAGE);
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
      });
      if (res.user) {
        useAuthStore.getState().updateUser(res.user);
      }
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể đổi mật khẩu. Vui lòng thử lại.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="store-modal-backdrop"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-modal-title"
        className="store-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="store-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={20} color="var(--blue-primary)" strokeWidth={1.9} />
            <div id="change-password-modal-title" className="store-modal-title">
              Đổi mật khẩu tài khoản
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={isSubmitting}
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={20} strokeWidth={1.9} />
          </button>
        </div>

        {isSuccess ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <CheckCircle2 size={50} color="#00C853" strokeWidth={2} />
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
              Đổi mật khẩu thành công!
            </div>
            <p style={{ fontSize: 13, color: '#64748B', maxWidth: 340, margin: 0 }}>
              Phiên làm việc hiện tại được giữ nguyên và các phiên đăng nhập cũ trên thiết bị khác đã được thu hồi an toàn.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="store-modal-body">
              {errorMsg && (
                <div
                  role="alert"
                  style={{
                    backgroundColor: '#FFF0F0',
                    border: '1px solid #FFD6D6',
                    color: '#DC2626',
                    padding: '10px 14px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div>
                <label
                  htmlFor="current-password-input"
                  style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}
                >
                  Mật khẩu hiện tại *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="current-password-input"
                    type={showCurrent ? 'text' : 'password'}
                    required
                    maxLength={128}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    aria-label={showCurrent ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showCurrent ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-password-input"
                  style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}
                >
                  Mật khẩu mới *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="new-password-input"
                    type={showNew ? 'text' : 'password'}
                    required
                    maxLength={64}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    placeholder="8–64 ký tự, chữ hoa, chữ thường, số & ký tự đặc biệt"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((prev) => !prev)}
                    aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showNew ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                  </button>
                </div>
                <div
                  role="meter"
                  aria-label="Độ mạnh mật khẩu mới"
                  aria-valuemin={0}
                  aria-valuemax={3}
                  aria-valuenow={passwordStrength}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}
                >
                  {[1, 2, 3].map((level) => {
                    const activeColor =
                      passwordStrength === 3 ? '#00C853' : passwordStrength === 2 ? '#FF9500' : '#FF3B30';
                    return (
                      <span
                        key={level}
                        style={{
                          height: 4,
                          borderRadius: 9999,
                          backgroundColor: level <= passwordStrength ? activeColor : '#E2E8F0',
                          transition: 'background-color 0.15s ease',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password-input"
                  style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}
                >
                  Xác nhận mật khẩu mới *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="confirm-password-input"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    maxLength={64}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showConfirm ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  backgroundColor: '#F8FAFC',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                }}
              >
                <ShieldAlert size={18} color="#475569" strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.45 }}>
                  MT-GRMS sẽ giữ phiên làm việc hiện tại và tự động hủy các phiên đăng nhập cũ trên tất cả thiết bị khác sau khi bạn đổi mật khẩu.
                </span>
              </div>
            </div>

            <div className="store-modal-footer">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 22px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--blue-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13.5,
                  fontWeight: 700,
                  opacity: isSubmitting ? 0.75 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <span>{isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
