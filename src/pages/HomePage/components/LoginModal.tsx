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
            <label htmlFor="loginPass" className="form-label">
              Mật khẩu
            </label>
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
        </form>
      </div>
    </div>
  );
};
