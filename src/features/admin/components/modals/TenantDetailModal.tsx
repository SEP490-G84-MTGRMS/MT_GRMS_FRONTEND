import type { FC } from 'react';
import type { Tenant } from '../../types/admin.types';
import { mockTenantQuota, mockFeatureFlags } from '../../data/mockAdminData';
import { ClockIcon, LockIcon } from '../common/AdminIcons';

interface TenantDetailModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onExtendGrace?: (tenant: Tenant) => void;
  onLock?: (tenant: Tenant) => void;
}

export const TenantDetailModal: FC<TenantDetailModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onExtendGrace,
  onLock,
}) => {
  if (!isOpen || !tenant) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="admin-modal-box"
        style={{ maxWidth: 760 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <div className="admin-modal-title">
              Hồ sơ Chi tiết: {tenant.name} (<span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue-primary)' }}>{tenant.subdomain}</span>)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              MST: {tenant.taxCode} &bull; Ngày hết hạn: {tenant.expiryDate}
            </div>
          </div>
          <button type="button" className="admin-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="admin-modal-body">
          {/* QUOTA SECTION */}
          <div style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-main)' }}>
              Định ngạch Tài nguyên & Quota Tiêu thụ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mockTenantQuota.map((q) => (
                <div key={q.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span>{q.label}</span>
                    <span>
                      <b>{q.used}</b> / {q.total} {q.unit} ({q.percentage}%)
                    </span>
                  </div>
                  <div className="admin-progress-track">
                    <div
                      className="admin-progress-fill"
                      style={{ width: `${q.percentage}%`, backgroundColor: q.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6 FEATURE FLAGS */}
          <div style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--text-main)' }}>
              6 Tính năng Nghiệp vụ Bán lẻ Cốt lõi
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {mockFeatureFlags.map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-soft-blue)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12.5,
                  }}
                >
                  <span>{f.name}</span>
                  <span className="admin-badge admin-badge-active">BẬT</span>
                </div>
              ))}
            </div>
          </div>

          {/* LEGAL & CONTACT INFO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}>
            <div style={{ padding: 12, background: 'var(--bg-soft-blue)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Thông tin Liên hệ</div>
              <div>Chủ sở hữu: <b>{tenant.ownerName}</b></div>
              <div>Email: {tenant.ownerEmail}</div>
              <div>Hotline: {tenant.ownerPhone}</div>
              <div>Khu vực: {tenant.city}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--bg-soft-blue)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Hạ tầng Kỹ thuật</div>
              <div>Mô hình: <b>Database-per-tenant cô lập</b></div>
              <div>Database: <code>{tenant.subdomain}_db</code></div>
              <div>Sao lưu S3: <code>s3://mtgrms-backup/{tenant.subdomain}</code></div>
              <div>Trạng thái mã hóa: AES-256</div>
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              onClose();
              onExtendGrace?.(tenant);
            }}
          >
            <ClockIcon size={14} />
            <span>Gia hạn ân hạn</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={() => {
              onClose();
              onLock?.(tenant);
            }}
          >
            <LockIcon size={14} />
            <span>Khóa tài khoản</span>
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
