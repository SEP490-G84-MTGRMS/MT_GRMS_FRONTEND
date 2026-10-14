import React, { useState } from 'react';
import { Check, AlertTriangle, Clock, X, User, MapPin, Smartphone } from 'lucide-react';
import type { AttendanceRecord } from '../types';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onUpdateStatus?: (recordId: string, newStatus: AttendanceRecord['status']) => void;
}

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onUpdateStatus,
}) => {
  const [violationAmount, setViolationAmount] = useState<number>(50000);
  const [violationReason, setViolationReason] = useState('Đi muộn quá 10 phút');
  const [showViolationForm, setShowViolationForm] = useState(false);

  if (!isOpen || !record) return null;

  const handleAddViolation = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Đã ghi nhận phạt vi phạm: ${violationAmount.toLocaleString('vi-VN')} ₫ - Lý do: ${violationReason}`);
    setShowViolationForm(false);
  };

  const getStatusBadge = () => {
    switch (record.status) {
      case 'ontime':
        return (
          <span className="emp-status-pill active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Check size={13} />
            <span>Đúng giờ</span>
          </span>
        );
      case 'late':
        return (
          <span className="emp-status-pill" style={{ color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={13} />
            <span>Đi muộn {record.lateMinutes ? `(${record.lateMinutes}p)` : ''}</span>
          </span>
        );
      case 'early':
        return (
          <span className="emp-status-pill" style={{ color: '#B45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} />
            <span>Về sớm</span>
          </span>
        );
      case 'absent':
        return (
          <span className="emp-status-pill" style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <X size={13} />
            <span>Vắng mặt</span>
          </span>
        );
      default:
        return (
          <span className="emp-status-pill" style={{ color: '#64748B' }}>
            Chưa chấm công
          </span>
        );
    }
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div className="emp-modal-header">
          <h3>Chi tiết chấm công ca làm việc</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="emp-modal-body">
          {/* Thông tin nhân viên */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              background: '#F8FAFC',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <div className="emp-avatar-cell" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color="#64748B" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
                {record.employeeName} ({record.employeeCode})
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Ca: <b>{record.shiftName}</b> &bull; Ngày: <b>{record.dateStr}</b>
              </div>
            </div>
          </div>

          {/* Trạng thái chấm công */}
          <div className="emp-section-card">
            <div className="emp-section-title">
              <span>Trạng thái ghi nhận</span>
              {getStatusBadge()}
            </div>

            <div className="emp-grid-2" style={{ fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748B' }}>Giờ vào thực tế (Check-in):</span>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0F766E', marginTop: 4 }}>
                  {record.checkInTime || 'Chưa ghi nhận'}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Giờ ra thực tế (Check-out):</span>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0F766E', marginTop: 4 }}>
                  {record.checkOutTime || 'Chưa ghi nhận'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 13 }}>
              <span style={{ color: '#64748B' }}>Tổng giờ công tính toán:</span>
              <div style={{ fontWeight: 600, color: '#134E4A' }}>
                {record.workHours ? `${record.workHours} giờ công` : '0 giờ'}
              </div>
            </div>
          </div>

          {/* Vị trí GPS & Thiết bị */}
          <div className="emp-section-card">
            <div className="emp-section-title">Xác thực GPS & Thiết bị</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748B' }}>Vị trí GPS chấm công:</span>
                <div style={{ fontWeight: 600, color: '#0F766E', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <MapPin size={14} />
                  <span>{record.gpsLocation || 'Chấm công tại quầy thu ngân'}</span>
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Thiết bị di động:</span>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Smartphone size={14} color="#64748B" />
                  <span>{record.deviceInfo || 'Thiết bị được duyệt: iPhone / Android'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Phạt vi phạm nếu có */}
          {showViolationForm ? (
            <form onSubmit={handleAddViolation} style={{ background: '#FFFBEB', padding: 14, borderRadius: 10, border: '1px solid #FDE68A' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 8 }}>
                Ghi nhận vi phạm & Trừ lương
              </div>
              <div className="emp-form-group">
                <label className="emp-form-label" style={{ fontSize: 12 }}>Số tiền phạt (VNĐ):</label>
                <input
                  type="number"
                  step={10000}
                  className="emp-form-input"
                  value={violationAmount}
                  onChange={(e) => setViolationAmount(Number(e.target.value))}
                />
              </div>
              <div className="emp-form-group">
                <label className="emp-form-label" style={{ fontSize: 12 }}>Lý do vi phạm:</label>
                <input
                  type="text"
                  className="emp-form-input"
                  value={violationReason}
                  onChange={(e) => setViolationReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  style={{ height: 32, fontSize: 12 }}
                  onClick={() => setShowViolationForm(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="emp-btn emp-btn-primary"
                  style={{ height: 32, fontSize: 12 }}
                >
                  Xác nhận phạt
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="emp-btn emp-btn-outline-teal"
                style={{ height: 34, fontSize: 12 }}
                onClick={() => alert(`Ghi nhận thưởng chuyên cần cho ${record.employeeName}`)}
              >
                + Thưởng chuyên cần
              </button>
              <button
                type="button"
                className="emp-btn emp-btn-danger-outline"
                style={{ height: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setShowViolationForm(true)}
              >
                <AlertTriangle size={14} />
                <span>Ghi nhận vi phạm</span>
              </button>
              {onUpdateStatus && record.status !== 'ontime' && (
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  style={{ height: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    onUpdateStatus(record.id, 'ontime');
                    alert('Đã duyệt chuyển sang trạng thái Đúng giờ!');
                  }}
                >
                  <Check size={14} />
                  <span>Duyệt đúng giờ</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="emp-modal-footer">
          <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
