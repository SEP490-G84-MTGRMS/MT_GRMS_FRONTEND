import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { Tenant, LockType } from '../../types/admin.types';
import { AlertTriangleIcon } from '../common/AdminIcons';

interface ApplyLockModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenant: Tenant, lockType: LockType, reason: string) => void;
}

export const ApplyLockModal: FC<ApplyLockModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [lockType, setLockType] = useState<LockType>('soft');
  const [reason, setReason] = useState('');

  if (!isOpen || !tenant) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(tenant, lockType, reason);
    onClose();
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">Áp dụng Lệnh Khóa Tài Khoản</div>
          <button type="button" className="admin-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--red-light)',
                border: '1px solid var(--red-border)',
                color: '#991b1b',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangleIcon size={18} color="#991b1b" style={{ flexShrink: 0 }} />
              <div>
                Lệnh khóa sẽ có hiệu lực ngay lập tức và thu hồi toàn bộ phiên đăng nhập tại quầy POS.
              </div>
            </div>

            <div style={{ fontSize: 13 }}>
              Khách hàng: <b>{tenant.name}</b> ({tenant.subdomain})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>
                Hình thức khóa tài khoản <span style={{ color: 'var(--red-accent)' }}>*</span>
              </label>
              <select
                value={lockType}
                onChange={(e) => setLockType(e.target.value as LockType)}
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  fontFamily: 'inherit',
                  fontSize: 13.5,
                  outline: 'none',
                }}
              >
                <option value="soft">Khóa Mềm (Soft-Lock - Chỉ đọc theo GB-13)</option>
                <option value="hard">Đình chỉ Toàn Bộ (Hard-Lock - Cấm truy cập theo GB-08)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>
                Lý do giải trình bắt buộc (tối thiểu 10 ký tự) <span style={{ color: 'var(--red-accent)' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập chi tiết lý do phục vụ đối soát kiểm toán hệ thống..."
                required
                minLength={10}
                rows={3}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  fontFamily: 'inherit',
                  fontSize: 13.5,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="admin-btn admin-btn-danger">
              Xác nhận Thi hành Lệnh Khóa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
