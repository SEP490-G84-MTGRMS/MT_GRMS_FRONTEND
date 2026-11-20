import { useState } from 'react';
import type { FC } from 'react';
import { X, Terminal, Copy, Check, Server, Clock } from 'lucide-react';
import type { CronJobItem } from '../../types/audit.types';

interface CronJobRunModalProps {
  job: CronJobItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CronJobRunModal: FC<CronJobRunModalProps> = ({ job, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !job) return null;

  const handleCopy = () => {
    const text = job.recentLogs.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          maxWidth: '720px',
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
            padding: '18px 24px',
            borderBottom: '1px solid #E2EAF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#0F172A',
                color: '#38BDF8',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Terminal size={18} strokeWidth={2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 700, color: '#0066FF' }}>
                  {job.code}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: '#E8F9EE',
                    color: '#00C853',
                  }}
                >
                  {job.lastRunStatus}
                </span>
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Nhật ký thực thi: {job.name}
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

        {/* Info Ribbon */}
        <div
          style={{
            padding: '12px 24px',
            background: '#F1F5F9',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#475569',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Server size={13} style={{ color: '#64748B' }} />
              <strong>Máy chủ:</strong> {job.nodeWorker}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} style={{ color: '#64748B' }} />
              <strong>Thời lượng:</strong> {job.lastRunDuration}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              color: '#0F172A',
            }}
          >
            {copied ? <Check size={12} color="#00C853" /> : <Copy size={12} />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép log'}</span>
          </button>
        </div>

        {/* Console Log Terminal */}
        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
          <div
            style={{
              background: '#0B0F19',
              borderRadius: '14px',
              padding: '16px',
              color: '#E2E8F0',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontSize: '12px',
              lineHeight: 1.6,
              border: '1px solid #1E293B',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
              maxHeight: '360px',
              overflowY: 'auto',
            }}
          >
            {job.recentLogs.map((line, idx) => {
              let color = '#94A3B8';
              if (line.includes('SUCCESS')) color = '#4ADE80';
              else if (line.includes('WARN')) color = '#FBBF24';
              else if (line.includes('DANGER') || line.includes('ERROR')) color = '#F87171';
              else if (line.includes('INFO')) color = '#38BDF8';

              return (
                <div key={idx} style={{ color, marginBottom: '4px', wordBreak: 'break-all' }}>
                  {line}
                </div>
              );
            })}
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
            style={{ borderRadius: '9999px', minWidth: '90px' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
