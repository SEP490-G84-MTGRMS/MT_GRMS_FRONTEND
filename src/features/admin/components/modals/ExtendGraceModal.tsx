import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { Tenant } from '../../types/admin.types';

interface ExtendGraceModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenant: Tenant, days: number, reason: string) => void;
}

export const ExtendGraceModal: FC<ExtendGraceModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [days, setDays] = useState(15);
  const [reason, setReason] = useState('');

  if (!isOpen || !tenant) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(tenant, days, reason);
    onClose();
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">Gia hạn Thời gian Ân hạn (Grace Period)</div>
          <button type="button" className="admin-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div style={{ fontSize: 13 }}>
              Khách hàng: <b>{tenant.name}</b> ({tenant.subdomain})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>
                Số ngày gia hạn thêm <span style={{ color: 'var(--red-accent)' }}>*</span>
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
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
                <option value={7}>+7 Ngày ân hạn</option>
                <option value={15}>+15 Ngày ân hạn</option>
                <option value={30}>+30 Ngày ân hạn (Tối đa)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>
                Lý do giải trình gia hạn <span style={{ color: 'var(--red-accent)' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Khách hàng đang làm thủ tục ủy nhiệm chi qua Zalo..."
                required
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
            <button type="submit" className="admin-btn admin-btn-primary">
              Lưu Gia Hạn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
