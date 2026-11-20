import { useEffect, useRef } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import type { AuditLogItem } from '../../types/audit.types';

interface AuditLogDetailModalProps {
  log: AuditLogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogDetailModal = ({ log, isOpen, onClose }: AuditLogDetailModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, [isOpen]);
  if (!isOpen || !log) return null;

  return (
    <dialog ref={dialogRef} className="audit-dialog admin-plans" aria-labelledby="audit-detail-title"
      onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <header className="audit-dialog-header">
        <span className="plans-name-icon"><ShieldCheck size={20} /></span>
        <div><h2 id="audit-detail-title">Chi tiết nhật ký</h2><small>{log.id}</small></div>
        <button className="audit-close" aria-label="Đóng chi tiết" onClick={onClose}><X size={20} /></button>
      </header>
      <div className="audit-dialog-body">
        <dl className="audit-detail-grid">
          <div><dt>Người thực hiện</dt><dd>{log.actorName}<small>{log.actorRole}</small></dd></div>
          <div><dt>Thời gian Việt Nam</dt><dd>{new Date(log.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</dd></div>
          <div><dt>Hành động</dt><dd>{log.actionTitle}</dd></div>
          <div><dt>Địa chỉ IP</dt><dd>{log.ipAddress || '—'}</dd></div>
          <div><dt>Đối tượng</dt><dd>{log.targetName}<small>{log.targetId || '—'}</small></dd></div>
          <div><dt>Mã cửa hàng</dt><dd>{log.tenantId || '—'}</dd></div>
          <div className="audit-detail-wide"><dt>Thiết bị và trình duyệt</dt><dd>{log.userAgent || 'Chưa được ghi nhận'}</dd></div>
        </dl>
        <div className="audit-diff">
          <section><h3>Dữ liệu trước thay đổi</h3><pre>{log.details?.oldValue == null
            ? 'Chưa được ghi nhận' : JSON.stringify(log.details.oldValue, null, 2)}</pre></section>
          <section><h3>Dữ liệu sau thay đổi</h3><pre>{log.details?.newValue == null
            ? 'Chưa được ghi nhận' : JSON.stringify(log.details.newValue, null, 2)}</pre></section>
        </div>
      </div>
      <footer><button className="admin-btn admin-btn-secondary" onClick={onClose}>Đóng</button></footer>
    </dialog>
  );
};
