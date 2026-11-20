import type { FC } from 'react';
import { Play, Terminal, CheckCircle2, AlertCircle, Clock, Loader2, Server } from 'lucide-react';
import type { CronJobItem } from '../../types/audit.types';

interface CronJobTableProps {
  cronJobs: CronJobItem[];
  triggeringJobId: string | null;
  onTriggerNow: (job: CronJobItem) => void;
  onViewLogs: (job: CronJobItem) => void;
}

export const CronJobTable: FC<CronJobTableProps> = ({
  cronJobs,
  triggeringJobId,
  onTriggerNow,
  onViewLogs,
}) => {
  const renderStatusBadge = (status: CronJobItem['lastRunStatus']) => {
    if (status === 'SUCCESS') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#E8F9EE',
            color: '#00C853',
            border: '1px solid #BBF7D0',
            whiteSpace: 'nowrap',
          }}
        >
          <CheckCircle2 size={12} strokeWidth={2.2} />
          Thành công
        </span>
      );
    }
    if (status === 'RUNNING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#FFF8EB',
            color: '#FF9500',
            border: '1px solid #FFE8CC',
            whiteSpace: 'nowrap',
          }}
        >
          <Loader2 size={12} className="animate-spin" />
          Đang chạy...
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          background: '#FFF0F0',
          color: '#FF3B30',
          border: '1px solid #FFD6D6',
          whiteSpace: 'nowrap',
        }}
      >
        <AlertCircle size={12} strokeWidth={2.2} />
        Thất bại
      </span>
    );
  };

  return (
    <div className="plans-table-card" style={{ flex: 1, minHeight: 360 }}>
      <div className="plans-table-summary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>
          Danh sách <strong>{cronJobs.length} tác vụ ngầm cốt lõi</strong> tự động chạy định kỳ trong hệ thống MT-GRMS
        </span>
        <span style={{ fontSize: '11px', color: '#0F766E', fontWeight: 600 }}>
          Hỗ trợ nút "Kích hoạt chạy ngay" phục vụ trực quan khi báo cáo & bảo vệ đồ án
        </span>
      </div>

      <div className="plans-table-scroll">
        <table className="plans-table" style={{ minWidth: 1050 }}>
          <thead>
            <tr>
              <th style={{ width: '28%' }}>TÁC VỤ & MÔ TẢ NGHIỆP VỤ</th>
              <th style={{ width: '16%' }}>CHU KỲ (CRON SCHEDULE)</th>
              <th style={{ width: '18%' }}>LẦN CHẠY GẦN NHẤT</th>
              <th style={{ width: '12%' }}>TRẠNG THÁI</th>
              <th style={{ width: '14%' }}>LẦN CHẠY TIẾP THEO</th>
              <th style={{ width: '12%', textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {cronJobs.map((job) => {
              const isTriggering = triggeringJobId === job.id;
              return (
                <tr key={job.id}>
                  {/* Tên & Mô tả */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          background: '#EAF6F4',
                          color: '#0F766E',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        <Server size={16} strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: 'var(--blue-primary, #0066FF)' }}>
                          {job.code}
                        </div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px', marginTop: '2px' }}>
                          {job.name}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748B', lineHeight: 1.45 }}>
                          {job.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Chu kỳ */}
                  <td>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#F1F5F9',
                        color: '#0F172A',
                        border: '1px solid #CBD5E1',
                      }}
                    >
                      {job.schedule}
                    </span>
                    <small style={{ display: 'block', marginTop: '4px', color: '#64748B' }}>
                      {job.scheduleHuman}
                    </small>
                  </td>

                  {/* Lần chạy gần nhất */}
                  <td>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      {job.lastRunTime}
                    </div>
                    <small style={{ color: '#0F766E', fontWeight: 600 }}>
                      Thời lượng: {job.lastRunDuration} • {job.itemsProcessedLastRun} bản ghi
                    </small>
                  </td>

                  {/* Trạng thái */}
                  <td>{renderStatusBadge(job.lastRunStatus)}</td>

                  {/* Lần chạy tiếp theo */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569' }}>
                      <Clock size={13} strokeWidth={2} style={{ color: '#94A3B8' }} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{job.nextRunTime}</span>
                    </div>
                    <small style={{ color: '#94A3B8', fontSize: '10px' }}>{job.nodeWorker}</small>
                  </td>

                  {/* Nút hành động */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {/* Nút Kích hoạt chạy ngay (Trigger Now) */}
                      <button
                        type="button"
                        onClick={() => onTriggerNow(job)}
                        disabled={isTriggering}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          background: isTriggering ? '#F1F5F9' : '#0066FF',
                          color: isTriggering ? '#94A3B8' : '#FFFFFF',
                          border: 'none',
                          cursor: isTriggering ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'inherit',
                          whiteSpace: 'nowrap',
                          boxShadow: isTriggering ? 'none' : '0 2px 6px rgba(0, 102, 255, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                        title="Kích hoạt tác vụ ngầm chạy ngay lập tức"
                      >
                        {isTriggering ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Đang chạy...</span>
                          </>
                        ) : (
                          <>
                            <Play size={11} fill="currentColor" />
                            <span>Chạy ngay</span>
                          </>
                        )}
                      </button>

                      {/* Nút Xem log */}
                      <button
                        type="button"
                        onClick={() => onViewLogs(job)}
                        style={{
                          display: 'inline-grid',
                          placeItems: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '9999px',
                          border: '1px solid #D9E4EB',
                          background: '#FFFFFF',
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                        title="Xem log chi tiết lần chạy gần nhất"
                      >
                        <Terminal size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
