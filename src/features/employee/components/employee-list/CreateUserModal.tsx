import React, { useState, useEffect, useMemo } from 'react';
import { X, Eye, EyeOff, User, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { employeeApi } from '../api/employeeApi';

export interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  phone?: string;
  initialUsername?: string;
  branchName?: string;
  deferSave?: boolean;
  onSuccess: (user: { id: string; username: string; role: string; displayName?: string; password?: string }) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeCode,
  phone,
  initialUsername,
  branchName,
  deferSave,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const isUpdateMode = Boolean(initialUsername && initialUsername.trim());

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Khởi tạo form khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    setDisplayName(employeeName || '');

    // Tự động điền số điện thoại theo input của EmployeeFormModal. Nếu số điện thoại chưa điền thì mặc định để trống.
    if (initialUsername && initialUsername.trim()) {
      setUsername(initialUsername.trim());
    } else if (phone && phone.trim()) {
      setUsername(phone.trim().replace(/[^0-9+]/g, ''));
    } else {
      setUsername('');
    }

    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    setTouched({});
    setHasSubmitted(false);
  }, [isOpen, employeeName, phone, initialUsername]);

  // Realtime Inline Validation
  const displayNameError = useMemo(() => {
    const trimmed = displayName.trim();
    if (!trimmed) return 'Tên hiển thị không được để trống.';
    if (trimmed.length < 2) return 'Tên hiển thị phải từ 2 đến 100 ký tự.';
    if (displayName.length > 100) return 'Tên hiển thị không vượt quá 100 ký tự.';
    if (!/^[\p{L}\s'.\-]+$/u.test(trimmed)) {
      return 'Tên hiển thị không được chứa chữ số hoặc ký tự đặc biệt.';
    }
    return null;
  }, [displayName]);

  const usernameError = useMemo(() => {
    const trimmed = username.trim();
    if (!trimmed) return 'Tên đăng nhập không được để trống.';
    if (trimmed.length < 3) return 'Tên đăng nhập phải từ 3 đến 50 ký tự.';
    if (trimmed.length > 50) return 'Tên đăng nhập không vượt quá 50 ký tự.';
    if (/\s/.test(trimmed)) return 'Tên đăng nhập không được chứa khoảng trắng.';
    if (/[^\x00-\x7F]/.test(trimmed)) {
      return 'Tên đăng nhập chỉ được nhập chữ cái tiếng Việt không dấu (a-z) và chữ số (0-9).';
    }
    if (!/^[a-z0-9._-]+$/i.test(trimmed)) {
      return 'Tên đăng nhập chỉ gồm chữ cái không dấu (a-z), chữ số (0-9), dấu chấm, gạch dưới (_) hoặc gạch ngang (-).';
    }
    return null;
  }, [username]);

  const passwordError = useMemo(() => {
    if (!isUpdateMode && !password) return 'Mật khẩu khởi tạo không được để trống.';
    if (password && password.length < 6) return 'Mật khẩu phải bao gồm tối thiểu 6 ký tự.';
    if (password.length > 50) return 'Mật khẩu không vượt quá 50 ký tự.';
    return null;
  }, [password, isUpdateMode]);

  const confirmPasswordError = useMemo(() => {
    if (!isUpdateMode && !confirmPassword) return 'Vui lòng nhập xác nhận mật khẩu.';
    if ((password || confirmPassword) && password !== confirmPassword) {
      return 'Xác nhận mật khẩu không trùng khớp với mật khẩu đã nhập.';
    }
    return null;
  }, [password, confirmPassword, isUpdateMode]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    if (displayNameError) {
      setErrorMessage(displayNameError);
      return false;
    }
    if (usernameError) {
      setErrorMessage(usernameError);
      return false;
    }
    if (passwordError) {
      setErrorMessage(passwordError);
      return false;
    }
    if (confirmPasswordError) {
      setErrorMessage(confirmPasswordError);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    if (!validate()) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const trimmedUsername = username.trim().toLowerCase();
      const trimmedDisplayName = displayName.trim();
      const defaultRole = 'STAFF';

      if (employeeId && !deferSave) {
        let res: { userId: string; username: string; role: string };

        if (isUpdateMode) {
          try {
            res = await employeeApi.updateIdentityAccount(employeeId, {
              username: trimmedUsername,
              password: password.trim(),
              role: 'STAFF',
              displayName: trimmedDisplayName,
            });
          } catch (updateErr: any) {
            res = await employeeApi.createIdentityAccount(employeeId, {
              username: trimmedUsername,
              password: password.trim() || 'Staff@123456',
              role: 'STAFF',
              displayName: trimmedDisplayName,
            });
          }
        } else {
          res = await employeeApi.createIdentityAccount(employeeId, {
            username: trimmedUsername,
            password: password.trim(),
            role: 'STAFF',
            displayName: trimmedDisplayName,
          });
        }

        setSuccessMessage(isUpdateMode ? 'Cập nhật tài khoản thành công!' : 'Cấp tài khoản đăng nhập thành công!');
        setTimeout(() => {
          onSuccess({
            id: res.userId,
            username: res.username || trimmedUsername,
            role: defaultRole,
            displayName: trimmedDisplayName,
            password: password.trim(),
          });
          onClose();
        }, 600);
      } else {
        // Trường hợp thêm mới nhân viên chưa có ID trong DB: trả về username/role tạm thời
        setSuccessMessage(isUpdateMode ? 'Cập nhật tài khoản thành công!' : 'Cấp tài khoản thành công!');
        setTimeout(() => {
          onSuccess({
            id: `temp_${Date.now()}`,
            username: trimmedUsername,
            role: defaultRole,
            displayName: trimmedDisplayName,
            password: password.trim(),
          });
          onClose();
        }, 400);
      }
    } catch (err: any) {
      console.error('Lỗi khi thao tác tài khoản Identity cho nhân viên:', err);
      const code = err?.response?.data?.errorCode;
      let msg = err?.response?.data?.message || err?.message || 'Thao tác tài khoản đăng nhập thất bại.';

      if (code === 'DUPLICATE_USERNAME') {
        msg = `Tên đăng nhập '${username.trim()}' đã có người sử dụng. Vui lòng chọn tên khác!`;
      } else if (code === 'CONFLICT') {
        msg = 'Nhân viên này đã được cấp tài khoản đăng nhập trước đó.';
      } else if (err?.response?.data?.errors) {
        const errorEntries = Object.entries(err.response.data.errors);
        if (errorEntries.length > 0) {
          const firstErr: any = errorEntries[0][1];
          msg = Array.isArray(firstErr) ? firstErr[0] : String(firstErr);
        }
      }

      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="emp-modal-overlay"
      style={{
        zIndex: 1250,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="emp-modal-card"
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: 'min(90vh, 640px)',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#CCFBF1',
                color: '#0F766E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: '#0F172A' }}>
                {isUpdateMode ? 'Cập nhật tài khoản đăng nhập' : 'Cấp tài khoản đăng nhập'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                {isUpdateMode
                  ? 'Thay đổi thông tin tài khoản hoặc đặt lại mật khẩu cho nhân viên'
                  : 'Tạo thông tin đăng nhập hệ thống MT-GRMS cho nhân viên'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Banner Thông tin nhân viên */}
            {(employeeName || employeeCode || branchName) && (
              <div
                style={{
                  backgroundColor: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  color: '#0F766E',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700 }}>{employeeName || 'Nhân viên'}</span>
                  {employeeCode && <span style={{ marginLeft: 6, color: '#0D9488' }}>({employeeCode})</span>}
                </div>
                {branchName && <div style={{ fontSize: 11.5, color: '#115E59' }}>{branchName}</div>}
              </div>
            )}

            {/* Thông báo lỗi */}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  borderRadius: 8,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Thông báo thành công */}
            {successMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #86EFAC',
                  color: '#15803D',
                  borderRadius: 8,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Lưu ý nếu nhân viên chưa lưu */}
            {!employeeId && (
              <div
                style={{
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: 8,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 12,
                  color: '#92400E',
                }}
              >
                <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Nhân viên đang tạo mới. Tên tài khoản sẽ được tạm lưu và cấp chính thức sau khi bạn lưu hồ sơ nhân viên.
                </span>
              </div>
            )}

            {/* Tên hiển thị */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', margin: 0 }}>
                  Tên hiển thị <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: displayName.length > 100 ? '#EF4444' : '#94A3B8' }}>
                  {displayName.length}/100
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A"
                  value={displayName}
                  maxLength={100}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (!touched.displayName) markTouched('displayName');
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onBlur={() => {
                    setDisplayName((prev) => prev.replace(/\s+/g, ' ').trim());
                    markTouched('displayName');
                  }}
                  disabled={isSubmitting}
                  required
                  style={{
                    width: '100%',
                    padding: '8.5px 12px',
                    borderRadius: 6,
                    border: `1px solid ${(touched.displayName || hasSubmitted) && displayNameError ? '#EF4444' : '#CBD5E1'}`,
                    fontSize: 13,
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              {(touched.displayName || hasSubmitted) && displayNameError && (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>•</span> {displayNameError}
                </div>
              )}
            </div>

            {/* Tên đăng nhập */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', margin: 0 }}>
                  Tên đăng nhập <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: username.length > 50 ? '#EF4444' : '#94A3B8' }}>
                  {username.length}/50
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="VD: cashier_lan hoặc nv001"
                  value={username}
                  maxLength={50}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase());
                    if (!touched.username) markTouched('username');
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onBlur={() => markTouched('username')}
                  disabled={isSubmitting}
                  required
                  style={{
                    width: '100%',
                    padding: '8.5px 12px',
                    borderRadius: 6,
                    border: `1px solid ${(touched.username || hasSubmitted) && usernameError ? '#EF4444' : '#CBD5E1'}`,
                    fontSize: 13,
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              {(touched.username || hasSubmitted) && usernameError ? (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>•</span> {usernameError}
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                  Từ 3 - 50 ký tự, chỉ gồm chữ cái không dấu (a-z), chữ số (0-9), dấu chấm, gạch dưới/ngang.
                </span>
              )}
            </div>

            {/* Mật khẩu */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', margin: 0 }}>
                  {isUpdateMode ? 'Mật khẩu mới' : 'Mật khẩu khởi tạo'}{' '}
                  {!isUpdateMode ? (
                    <span style={{ color: '#EF4444' }}>*</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#64748B' }}>(Để trống nếu không đổi)</span>
                  )}
                </label>
                <span style={{ fontSize: 11, color: password.length > 50 ? '#EF4444' : '#94A3B8' }}>
                  {password.length}/50
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isUpdateMode ? 'Nhập mật khẩu mới nếu muốn thay đổi' : 'Tối thiểu 6 ký tự'}
                  value={password}
                  maxLength={50}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!touched.password) markTouched('password');
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onBlur={() => markTouched('password')}
                  disabled={isSubmitting}
                  required={!isUpdateMode}
                  style={{
                    width: '100%',
                    padding: '8.5px 36px 8.5px 12px',
                    borderRadius: 6,
                    border: `1px solid ${(touched.password || hasSubmitted) && passwordError ? '#EF4444' : '#CBD5E1'}`,
                    fontSize: 13,
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: 4,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {(touched.password || hasSubmitted) && passwordError && (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>•</span> {passwordError}
                </div>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', margin: 0 }}>
                  {isUpdateMode ? 'Xác nhận mật khẩu mới' : 'Xác nhận mật khẩu'}{' '}
                  {!isUpdateMode && <span style={{ color: '#EF4444' }}>*</span>}
                </label>
                <span style={{ fontSize: 11, color: confirmPassword.length > 50 ? '#EF4444' : '#94A3B8' }}>
                  {confirmPassword.length}/50
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={isUpdateMode ? 'Nhập lại mật khẩu mới nếu thay đổi' : 'Nhập lại mật khẩu khởi tạo'}
                  value={confirmPassword}
                  maxLength={50}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (!touched.confirmPassword) markTouched('confirmPassword');
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onBlur={() => markTouched('confirmPassword')}
                  disabled={isSubmitting}
                  required={!isUpdateMode}
                  style={{
                    width: '100%',
                    padding: '8.5px 36px 8.5px 12px',
                    borderRadius: 6,
                    border: `1px solid ${(touched.confirmPassword || hasSubmitted) && confirmPasswordError ? '#EF4444' : '#CBD5E1'}`,
                    fontSize: 13,
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: 4,
                  }}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {(touched.confirmPassword || hasSubmitted) && confirmPasswordError && (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>•</span> {confirmPasswordError}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 22px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8.5px 16px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8.5px 20px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#0F766E',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
              }}
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              <span>
                {isSubmitting
                  ? (isUpdateMode ? 'Đang cập nhật...' : 'Đang cấp tài khoản...')
                  : (isUpdateMode ? 'Lưu thay đổi' : 'Cấp tài khoản')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
