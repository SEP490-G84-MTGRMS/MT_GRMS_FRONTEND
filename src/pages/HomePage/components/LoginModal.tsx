import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginModal: FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) return;

    onSuccess();
    onClose();
    // Chuyển hướng vào màn hình POS hoặc Dashboard
    navigate('/pos');
  };

  return (
    <div className="modal-backdrop active" role="dialog" aria-modal="true">
      <div className="modal-dialog-box">
        <button
          type="button"
          className="dialog-close-btn"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
        >
          &times;
        </button>
        <div className="modal-head">
          <h3 className="modal-title">Đăng nhập Quầy MT-GRMS</h3>
          <p className="modal-sub">
            Dành cho chủ cửa hàng và nhân viên thu ngân đã kích hoạt tài khoản.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <label htmlFor="loginPhone" className="form-label">
              Số điện thoại đăng nhập
            </label>
            <input
              type="tel"
              id="loginPhone"
              className="input-rounded"
              placeholder="VD: 0912 345 678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="loginPass" className="form-label" style={{ marginBottom: 0 }}>
                Mật khẩu
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/auth/forgot-password');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--blue-primary)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
              >
                Quên mật khẩu?
              </button>
            </div>
            <input
              type="password"
              id="loginPass"
              className="input-rounded"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-pill btn-block btn-lg">
            Đăng nhập vào hệ thống
          </button>

          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/auth/register');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--blue-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Đăng ký ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
