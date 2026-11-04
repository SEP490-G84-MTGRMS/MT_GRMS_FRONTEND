import React, { useState } from 'react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; username: string; role: string }) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!');
      return;
    }
    const newUser = {
      id: `usr_${Date.now()}`,
      username: username.trim(),
      role,
    };
    onSuccess(newUser);
    onClose();
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card" style={{ maxWidth: 480 }}>
        <div className="emp-modal-header">
          <h3>Tạo tài khoản đăng nhập</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            <div className="emp-form-group">
              <label className="emp-form-label">
                Tên đăng nhập <span className="required">*</span>
              </label>
              <input
                type="text"
                className="emp-form-input"
                placeholder="VD: cashier_lan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-form-label">
                Mật khẩu <span className="required">*</span>
              </label>
              <input
                type="password"
                className="emp-form-input"
                placeholder="Nhập mật khẩu khởi tạo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-form-label">Vai trò / Phân quyền</label>
              <select
                className="emp-form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="cashier">Nhân viên thu ngân / Bán hàng</option>
                <option value="stocker">Nhân viên kho</option>
                <option value="manager">Quản lý cửa hàng</option>
                <option value="admin">Quản trị viên chi nhánh</option>
              </select>
            </div>
          </div>

          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="emp-btn emp-btn-primary">
              Tạo tài khoản
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
