import React, { useState } from 'react';
import { employeeApi } from '../api/employeeApi';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  onSuccess: (user: { id: string; username: string; role: string }) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (employeeId) {
        const res = await employeeApi.createIdentityAccount(employeeId, {
          username: username.trim(),
          password: password.trim(),
          role: role.toUpperCase(),
        });
        onSuccess({
          id: res.userId,
          username: res.username || username.trim(),
          role: res.role || role,
        });
      } else {
        const newUser = {
          id: `usr_${Date.now()}`,
          username: username.trim(),
          role,
        };
        onSuccess(newUser);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Cấp tài khoản thất bại.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card" style={{ maxWidth: 480 }}>
        <div className="emp-modal-header">
          <h3>Tạo tài khoản đăng nhập</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  borderRadius: 6,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {errorMessage}
              </div>
            )}

            <div className="emp-form-group">
              <label className="emp-form-label">
                Tên đăng nhập <span className="required">*</span>
              </label>
              <input
                type="text"
                className="emp-form-input"
                placeholder="VD: cashier_lan"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
                disabled={isSubmitting}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-form-label">
                Vai trò phân quyền <span className="required">*</span>
              </label>
              <select
                className="emp-form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="cashier">Thu ngân (Cashier)</option>
                <option value="staff">Nhân viên bán hàng (Staff)</option>
                <option value="branch_manager">Quản lý chi nhánh (Branch Manager)</option>
                <option value="store_owner">Chủ cửa hàng (Store Owner)</option>
              </select>
            </div>
          </div>

          <div className="emp-modal-footer">
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="emp-btn emp-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
