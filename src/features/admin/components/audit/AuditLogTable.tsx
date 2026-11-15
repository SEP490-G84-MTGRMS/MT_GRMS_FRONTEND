import { Eye } from 'lucide-react';
import type { AuditLogItem } from '../../types/audit.types';

interface AuditLogTableProps {
  logs: AuditLogItem[];
  onSelectLog: (log: AuditLogItem) => void;
}

export const AuditLogTable = ({ logs, onSelectLog }: AuditLogTableProps) => (
  <div className="plans-table-scroll">
    <table className="plans-table audit-table">
      <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th>
        <th>Đối tượng</th><th>Địa chỉ IP</th><th>Thao tác</th></tr></thead>
      <tbody>
        {!logs.length && <tr><td colSpan={6} className="plans-empty">Không có nhật ký phù hợp với bộ lọc.</td></tr>}
        {logs.map(log => (
          <tr key={log.id}>
            <td><strong>{new Date(log.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong>
              <small title={log.id} className="audit-id">{log.id}</small></td>
            <td><strong>{log.actorName}</strong><small>{log.actorRole}</small></td>
            <td><span className="plans-status is-active audit-action">{log.actionTitle}</span></td>
            <td><strong>{log.targetName || '—'}</strong><small>{log.targetId || '—'}</small></td>
            <td className="audit-ip">{log.ipAddress || '—'}</td>
            <td><div className="plans-row-actions"><button type="button" title="Xem chi tiết"
              aria-label={'Xem nhật ký ' + log.id} onClick={() => onSelectLog(log)}><Eye size={15} /></button></div></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
