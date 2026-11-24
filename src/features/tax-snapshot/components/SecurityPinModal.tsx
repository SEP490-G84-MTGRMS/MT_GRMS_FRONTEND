import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';

interface SecurityPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'change' | 'reset';
  onSuccess?: (message: string) => void;
}

export const SecurityPinModal: React.FC<SecurityPinModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'change',
  onSuccess,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'change' | 'reset'>(initialTab);

  // Form states for Tab Change PIN
  const [verifyMethod, setVerifyMethod] = useState<'pin' | 'password'>('pin');
  const [currentPin, setCurrentPin] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');

  // Form states for Tab Reset PIN
  const [resetPassword, setResetPassword] = useState<string>('');
  const [resetNewPin, setResetNewPin] = useState<string>('');
  const [resetConfirmPin, setResetConfirmPin] = useState<string>('');

  // Visibility toggles
  const [showCurrentPin, setShowCurrentPin] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [showConfirmPin, setShowConfirmPin] = useState<boolean>(false);

  // Status states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useDialogFocusTrap(isOpen, dialogRef, onClose);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCurrentPin('');
      setCurrentPassword('');
      setNewPin('');
      setConfirmNewPin('');
      setResetPassword('');
      setResetNewPin('');
      setResetConfirmPin('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const validatePinDigits = (pinStr: string): boolean => {
    return /^\d{4,6}$/.test(pinStr);
  };

  const handleChangePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (verifyMethod === 'pin') {
      if (!currentPin) {
        setErrorMessage('Vui lòng nhập mã PIN hiện tại.');
        return;
      }
    } else {
      if (!currentPassword) {
        setErrorMessage('Vui lòng nhập mật khẩu tài khoản đăng nhập để xác thực.');
        return;
      }
    }

    if (!validatePinDigits(newPin)) {
      setErrorMessage('Mã PIN mới phải gồm từ 4 đến 6 chữ số (0-9).');
      return;
    }

    if (newPin !== confirmNewPin) {
      setErrorMessage('Mã PIN mới và xác nhận mã PIN không khớp nhau.');
      return;
    }

    if (verifyMethod === 'pin' && newPin === currentPin) {
      setErrorMessage('Mã PIN mới không được trùng với mã PIN hiện tại.');
      return;
    }

    setIsLoading(true);
    try {
      await taxSnapshotApi.changeSecurityPin({
        currentPin: verifyMethod === 'pin' ? currentPin : undefined,
        password: verifyMethod === 'password' ? currentPassword : undefined,
        newPin,
        confirmNewPin,
      });

      const msg = 'Đã đổi mã PIN bảo mật thành công! Hãy ghi nhớ mã PIN này để chốt các kỳ thuế.';
      setSuccessMessage(msg);
      if (onSuccess) onSuccess(msg);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể đổi mã PIN bảo mật. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu tài khoản đăng nhập của bạn.');
      return;
    }

    if (!validatePinDigits(resetNewPin)) {
      setErrorMessage('Mã PIN mới phải gồm từ 4 đến 6 chữ số (0-9).');
      return;
    }

    if (resetNewPin !== resetConfirmPin) {
      setErrorMessage('Mã PIN mới và xác nhận mã PIN không khớp nhau.');
      return;
    }

    setIsLoading(true);
    try {
      await taxSnapshotApi.resetSecurityPin({
        password: resetPassword,
        newPin: resetNewPin,
        confirmNewPin: resetConfirmPin,
      });

      const msg = 'Đã khôi phục và thiết lập lại mã PIN bảo mật thành công!';
      setSuccessMessage(msg);
      if (onSuccess) onSuccess(msg);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Mật khẩu tài khoản không chính xác hoặc không đủ quyền quản lý.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tax-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isLoading) onClose(); }}>
      <div ref={dialogRef} className="tax-modal-card" role="dialog" aria-modal="true" aria-label="Quản lý mã PIN bảo mật" style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="tax-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#F0FDFA',
                color: '#0F766E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Quản lý mã PIN bảo mật chốt sổ thuế
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Mã PIN ký số niêm phong sổ sách theo Thông tư 152/2025/TT-BTC
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="tax-drawer-close-btn"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ padding: '12px 24px 0 24px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              background: '#F1F5F9',
              borderRadius: 8,
              padding: 4,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('change');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.84rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: activeTab === 'change' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'change' ? '#0F766E' : '#64748B',
                boxShadow: activeTab === 'change' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Đổi mã PIN
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('reset');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.84rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: activeTab === 'reset' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'reset' ? '#0F766E' : '#64748B',
                boxShadow: activeTab === 'reset' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Quên / Khôi phục mã PIN
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="tax-modal-body" style={{ paddingTop: 16 }}>
          {/* Success Banner */}
          {successMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '0.84rem',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle2 size={18} className="text-teal flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                fontSize: '0.84rem',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertCircle size={18} className="text-red flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Info Notice */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <HelpCircle size={16} style={{ color: '#0F766E', marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
              Sử dụng mã PIN đã thiết lập cho tài khoản. Nếu chưa có hoặc quên mã PIN, chọn thiết lập lại bằng mật khẩu tài khoản.
            </span>
          </div>

          {/* ────────────────────────────────────────────────────────────
              TAB 1: ĐỔI MÃ PIN
              ──────────────────────────────────────────────────────────── */}
          {activeTab === 'change' && (
            <form onSubmit={handleChangePinSubmit}>
              {/* Method radio toggle */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Phương thức xác thực hiện tại:
                </label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="verifyMethod"
                      checked={verifyMethod === 'pin'}
                      onChange={() => setVerifyMethod('pin')}
                      style={{ accentColor: '#0F766E' }}
                    />
                    <span>Dùng mã PIN hiện tại</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="verifyMethod"
                      checked={verifyMethod === 'password'}
                      onChange={() => setVerifyMethod('password')}
                      style={{ accentColor: '#0F766E' }}
                    />
                    <span>Dùng mật khẩu tài khoản</span>
                  </label>
                </div>
              </div>

              {/* Current PIN or Password input */}
              {verifyMethod === 'pin' ? (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mã PIN hiện tại:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPin ? 'text' : 'password'}
                      inputMode="numeric"
                      autoFocus
                      maxLength={6}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Nhập mã PIN hiện tại (4-6 số)"
                      style={{
                        width: '100%',
                        padding: '9px 40px 9px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                        letterSpacing: showCurrentPin ? 'normal' : '3px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPin(!showCurrentPin)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      title={showCurrentPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                    >
                      {showCurrentPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mật khẩu tài khoản đăng nhập:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoFocus
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu tài khoản"
                      style={{
                        width: '100%',
                        padding: '9px 40px 9px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* New PIN */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Mã PIN mới (4 – 6 chữ số):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Nhập mã PIN mới (ví dụ: 8899)"
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                      letterSpacing: showNewPin ? 'normal' : '3px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title={showNewPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                  >
                    {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New PIN */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Xác nhận lại mã PIN mới:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Nhập lại mã PIN mới"
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                      letterSpacing: showConfirmPin ? 'normal' : '3px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title={showConfirmPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                  >
                    {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="btn-secondary-pill"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !newPin || !confirmNewPin}
                  className="btn-primary-pill"
                  style={{
                    background: '#0F766E',
                    minWidth: 140,
                    justifyContent: 'center',
                    opacity: isLoading || !newPin || !confirmNewPin ? 0.6 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Lưu mã PIN mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────────
              TAB 2: QUÊN / KHÔI PHỤC MÃ PIN
              ──────────────────────────────────────────────────────────── */}
          {activeTab === 'reset' && (
            <form onSubmit={handleResetPinSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Mật khẩu tài khoản STORE_OWNER đang đăng nhập:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    autoFocus
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Nhập mật khẩu tài khoản"
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New PIN */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Mã PIN mới (4 – 6 chữ số):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={resetNewPin}
                    onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Nhập mã PIN mới (ví dụ: 8899)"
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                      letterSpacing: showNewPin ? 'normal' : '3px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title={showNewPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                  >
                    {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New PIN */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Xác nhận lại mã PIN mới:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={resetConfirmPin}
                    onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Nhập lại mã PIN mới"
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                      letterSpacing: showConfirmPin ? 'normal' : '3px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title={showConfirmPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                  >
                    {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="btn-secondary-pill"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !resetPassword || !resetNewPin || !resetConfirmPin}
                  className="btn-primary-pill"
                  style={{
                    background: '#0F766E',
                    minWidth: 160,
                    justifyContent: 'center',
                    opacity: isLoading || !resetPassword || !resetNewPin || !resetConfirmPin ? 0.6 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang khôi phục...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Khôi phục mã PIN</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
