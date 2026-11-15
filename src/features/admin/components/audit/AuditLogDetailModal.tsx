import type { FC } from 'react';
import { X, ShieldAlert, AlertCircle, Info, User, Globe, Laptop } from 'lucide-react';
import type { AuditLogItem } from '../../types/audit.types';

interface AuditLogDetailModalProps {
  log: AuditLogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogDetailModal: FC<AuditLogDetailModalProps> = ({ log, isOpen, onClose }) => {
  if (!isOpen || !log) return null;

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 45px rgba(0, 30, 90, 0.16)',
          border: '1px solid #E2EAF0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2EAF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                background: log.riskLevel === 'DANGER' ? '#FFF0F0' : log.riskLevel === 'WARNING' ? '#FFF8EB' : '#F0F6FF',
                color: log.riskLevel === 'DANGER' ? '#FF3B30' : log.riskLevel === 'WARNING' ? '#D97706' : '#0066FF',
              }}
            >
              {log.riskLevel === 'DANGER' ? (
                <ShieldAlert size={20} strokeWidth={2} />
              ) : log.riskLevel === 'WARNING' ? (
                <AlertCircle size={20} strokeWidth={2} />
              ) : (
                <Info size={20} strokeWidth={2} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--blue-primary, #0066FF)',
                  }}
                >
                  {log.id}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: log.riskLevel === 'DANGER' ? '#FFF0F0' : log.riskLevel === 'WARNING' ? '#FFF8EB' : '#F0F6FF',
                    color: log.riskLevel === 'DANGER' ? '#FF3B30' : log.riskLevel === 'WARNING' ? '#D97706' : '#0066FF',
                    border: '1px solid currentColor',
                  }}
                >
                  {log.riskLevel}
                </span>
              </div>
              <h3 style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                {log.actionTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '9999px',
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* Body Scrollable */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
              background: '#F8FAFC',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                <User size={13} strokeWidth={2} />
                <span>Người thực hiện</span>
              </div>
              <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                {log.actorName}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {log.actorEmail} ({log.actorRole})
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                <Globe size={13} strokeWidth={2} />
                <span>Thời gian & Địa chỉ IP</span>
              </div>
              <div style={{ marginTop: '4px', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#0F172A' }}>
                {log.ipAddress}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {formatDateTime(log.timestamp)} • {log.location}
              </div>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                <Laptop size={13} strokeWidth={2} />
                <span>Thiết bị & Trình duyệt (User Agent)</span>
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#334155', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>
                {log.userAgent}
              </div>
            </div>
          </div>

          {/* Target & Reason */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Đối tượng tác động:{' '}
              <strong style={{ color: '#0F766E' }}>{log.targetName}</strong>{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>({log.targetId})</span>
            </div>
            {log.reason && (
              <div style={{ fontSize: '12px', color: '#1E293B' }}>
                <strong>Lý do ghi nhận:</strong> {log.reason}
              </div>
            )}
            {log.details?.changesSummary && (
              <div style={{ fontSize: '12px', color: 'var(--blue-primary, #0066FF)', fontWeight: 600 }}>
                {log.details.changesSummary}
              </div>
            )}
          </div>

          {/* Before & After Diff Box */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                So sánh dữ liệu biến động (Audit State Diff)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Old Value */}
              <div
                style={{
                  background: '#FFF5F5',
                  border: '1px solid #FED7D7',
                  borderRadius: '14px',
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#C53030', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Dữ liệu trước thay đổi (Old Value)</span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '8px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1px solid #FEB2B2',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#742A2A',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {log.details?.oldValue ? JSON.stringify(log.details.oldValue, null, 2) : '(Không có dữ liệu cũ / Tạo mới)'}
                </pre>
              </div>

              {/* New Value */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '14px',
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Dữ liệu sau thay đổi (New Value)</span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '8px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1px solid #86EFAC',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#14532D',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {log.details?.newValue ? JSON.stringify(log.details.newValue, null, 2) : '(Không có dữ liệu mới / Xóa)'}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#F8FAFC',
          }}
        >
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            style={{ borderRadius: '9999px', minWidth: '100px' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
