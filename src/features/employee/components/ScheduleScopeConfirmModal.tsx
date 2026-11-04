import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type ScopeActionType = 'update' | 'delete';
export type ScheduleScopeType = 'single' | 'following' | 'all';

interface ScheduleScopeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType?: ScopeActionType;
  dateStr?: string;
  startDateStr?: string;
  endDateStr?: string;
  onConfirm: (scope: ScheduleScopeType) => void;
}

export const ScheduleScopeConfirmModal: React.FC<ScheduleScopeConfirmModalProps> = ({
  isOpen,
  onClose,
  dateStr = '16/10/2026',
  startDateStr,
  endDateStr = '31/10/2026',
  onConfirm,
}) => {
  const [selectedScope, setSelectedScope] = useState<ScheduleScopeType>('single');

  useEffect(() => {
    if (isOpen) {
      setSelectedScope('single');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveStart = startDateStr || dateStr;

  const handleConfirm = () => {
    onConfirm(selectedScope);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          margin: 16,
          boxSizing: 'border-box',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.2px',
            }}
          >
            Áp dụng thay đổi này cho
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Radio Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 15,
              color: '#1E293B',
              fontWeight: 500,
            }}
          >
            <input
              type="radio"
              name="schedule_scope"
              checked={selectedScope === 'single'}
              onChange={() => setSelectedScope('single')}
              style={{
                width: 18,
                height: 18,
                accentColor: '#0066FF',
                cursor: 'pointer',
                margin: 0,
              }}
            />
            <span>Chỉ ngày {dateStr}</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 15,
              color: '#1E293B',
              fontWeight: 500,
            }}
          >
            <input
              type="radio"
              name="schedule_scope"
              checked={selectedScope === 'following'}
              onChange={() => setSelectedScope('following')}
              style={{
                width: 18,
                height: 18,
                accentColor: '#0066FF',
                cursor: 'pointer',
                margin: 0,
              }}
            />
            <span>
              Từ ngày {dateStr} đến ngày {endDateStr}
            </span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 15,
              color: '#1E293B',
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            <input
              type="radio"
              name="schedule_scope"
              checked={selectedScope === 'all'}
              onChange={() => setSelectedScope('all')}
              style={{
                width: 18,
                height: 18,
                accentColor: '#0066FF',
                cursor: 'pointer',
                margin: 0,
                marginTop: 2,
              }}
            />
            <span>
              Tất cả các ngày (từ ngày {effectiveStart} đến ngày {endDateStr})
            </span>
          </label>
        </div>

        {/* Lưu ý */}
        <div style={{ marginTop: 20, marginBottom: 24, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
          <strong>Lưu ý:</strong> Chỉ áp dụng thay đổi trên các Chi tiết ca làm việc chưa chấm công
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              background: '#0066FF',
              border: 'none',
              borderRadius: 8,
              padding: '8px 22px',
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 102, 255, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0052CC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0066FF';
            }}
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
};
