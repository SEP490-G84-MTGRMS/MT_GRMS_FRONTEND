import type { FC } from 'react';
import { Eye, ShieldAlert, AlertCircle, Info } from 'lucide-react';
import type { AuditLogItem } from '../../types/audit.types';

interface AuditLogTableProps {
  logs: AuditLogItem[];
  onSelectLog: (log: AuditLogItem) => void;
}

export const AuditLogTable: FC<AuditLogTableProps> = ({ logs, onSelectLog }) => {
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

  const renderRiskBadge = (level: AuditLogItem['riskLevel']) => {
    if (level === 'DANGER') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#FFF0F0',
            color: '#FF3B30',
            border: '1px solid #FFD6D6',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldAlert size={12} strokeWidth={2.2} />
          Nguy cơ cao
        </span>
      );
    }
    if (level === 'WARNING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#FFF8EB',
            color: '#D97706',
            border: '1px solid #FDE68A',
            whiteSpace: 'nowrap',
          }}
        >
          <AlertCircle size={12} strokeWidth={2.2} />
          Cảnh báo
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          background: '#F0F6FF',
          color: '#0066FF',
          border: '1px solid #DBE9FE',
          whiteSpace: 'nowrap',
        }}
      >
        <Info size={12} strokeWidth={2.2} />
        Thông tin
      </span>
    );
  };

  return (
    <div className="plans-table-card" style={{ flex: 1, minHeight: 360 }}>
      <div className="plans-table-scroll">
        <table className="plans-table" style={{ minWidth: 1050 }}>
          <thead>
            <tr>
              <th style={{ width: '16%' }}>MÃ & THỜI GIAN</th>
              <th style={{ width: '22%' }}>NGƯỜI THỰC HIỆN</th>
              <th style={{ width: '28%' }}>HÀNH VI & ĐỐI TƯỢNG TÁC ĐỘNG</th>
              <th style={{ width: '18%' }}>ĐỊA CHỈ IP & VỊ TRÍ</th>
              <th style={{ width: '10%' }}>MỨC ĐỘ</th>
              <th style={{ width: '6%', textAlign: 'right' }}>XEM</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="plans-empty">
                  Không tìm thấy bản ghi nhật ký kiểm toán nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              logs.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectLog(item)}
                  style={{ cursor: 'pointer' }}
                  title="Bấm để xem chi tiết đối soát và dữ liệu Before / After"
                >
                  {/* Mã ID & Thời gian */}
                  <td>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--blue-primary, #0066FF)', fontSize: '12px' }}>
                      {item.id}
                    </div>
                    <small style={{ color: '#64748B', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                      {formatDateTime(item.timestamp)}
                    </small>
                  </td>

                  {/* Người thực hiện */}
                  <td>
                    <div style={{ fontWeight: 600, color: '#14253E' }}>{item.actorName}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{item.actorEmail}</div>
                    <div style={{ marginTop: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          background: item.actorRole === 'SUPER_ADMIN' ? '#EFF6FF' : '#F8FAFC',
                          color: item.actorRole === 'SUPER_ADMIN' ? '#1D4ED8' : '#475569',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {item.actorRole}
                      </span>
                    </div>
                  </td>

                  {/* Hành động & Đối tượng */}
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                      {item.actionTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      <strong style={{ color: '#0F766E' }}>{item.targetName}</strong>
                      <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>({item.targetId})</span>
                    </div>
                    {item.reason && (
                      <div style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic', marginTop: '3px' }}>
                        Lý do: {item.reason}
                      </div>
                    )}
                  </td>

                  {/* IP & Location */}
                  <td>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      {item.ipAddress}
                    </div>
                    <small style={{ color: '#64748B' }}>{item.location}</small>
                  </td>

                  {/* Mức độ */}
                  <td>{renderRiskBadge(item.riskLevel)}</td>

                  {/* Thao tác */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLog(item);
                      }}
                      style={{
                        display: 'inline-grid',
                        placeItems: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '9999px',
                        border: '1px solid #D9E4EB',
                        background: '#FFFFFF',
                        color: 'var(--blue-primary, #0066FF)',
                        cursor: 'pointer',
                      }}
                      title="Xem chi tiết"
                    >
                      <Eye size={15} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
