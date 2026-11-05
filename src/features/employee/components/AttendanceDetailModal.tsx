import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Smartphone,
  Trash2,
  RefreshCw,
  Info,
  X,
} from 'lucide-react';
import type { AttendanceRecord } from '../types';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onUpdateStatus?: (recordId: string, newStatus: AttendanceRecord['status']) => void;
}

type TabType = 'setup' | 'history' | 'all';

interface TabItem {
  key: TabType;
  label: string;
}

const TABS: TabItem[] = [
  { key: 'setup', label: 'Chấm công' },
  { key: 'history', label: 'Lịch sử chấm công' },
];

const SHIFT_OPTIONS = [
  'Ca sáng (06:00 - 14:15)',
  'Ca chiều (14:00 - 22:15)',
  'Ca đêm (22:00 - 06:15)',
  'Ca tùy chọn (Linh hoạt)',
];

interface AttendanceDetailModalContentProps {
  record: AttendanceRecord;
  onClose: () => void;
  onUpdateStatus?: (recordId: string, newStatus: AttendanceRecord['status']) => void;
}

const AttendanceDetailModalContent: React.FC<AttendanceDetailModalContentProps> = ({
  record,
  onClose,
  onUpdateStatus,
}) => {
  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('setup');

  // Form states
  const [selectedShift, setSelectedShift] = useState(record.shiftName || SHIFT_OPTIONS[0]);
  const [note, setNote] = useState('');
  const [attendanceType, setAttendanceType] = useState<'working' | 'paid_leave' | 'unpaid_leave'>('working');

  // Check-in / Check-out states
  const [hasCheckIn, setHasCheckIn] = useState<boolean>(true);
  const [checkInTime, setCheckInTime] = useState<string>(record.checkInTime || '06:00');
  const [hasCheckOut, setHasCheckOut] = useState<boolean>(true);
  const [checkOutTime, setCheckOutTime] = useState<string>(record.checkOutTime || '14:15');

  
  // Sync state when record changes
  useEffect(() => {
    setSelectedShift(record.shiftName || SHIFT_OPTIONS[0]);
    setCheckInTime(record.checkInTime || '06:00');
    setCheckOutTime(record.checkOutTime || '14:15');
    setHasCheckIn(!!record.checkInTime || record.status === 'ontime' || record.status === 'late');
    setHasCheckOut(!!record.checkOutTime || record.status === 'ontime' || record.status === 'early');
  }, [record]);

  
  // Save changes
  const handleSave = () => {
    if (onUpdateStatus) {
      if (attendanceType === 'paid_leave' || attendanceType === 'unpaid_leave') {
        onUpdateStatus(record.id, 'absent');
      } else {
        onUpdateStatus(record.id, 'ontime');
      }
    }
    alert(`Đã lưu thiết lập chấm công thành công cho nhân viên ${record.employeeName}!`);
    onClose();
  };

  const handleResetAttendance = () => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy kết quả chấm công của ${record.employeeName}?`)) {
      if (onUpdateStatus) {
        onUpdateStatus(record.id, 'not_checked');
      }
      onClose();
    }
  };

  const handleChangeShift = () => {
    const nextShift =
      selectedShift === SHIFT_OPTIONS[0]
        ? SHIFT_OPTIONS[1]
        : selectedShift === SHIFT_OPTIONS[1]
        ? SHIFT_OPTIONS[2]
        : SHIFT_OPTIONS[0];
    setSelectedShift(nextShift);
    alert(`Đã đổi sang ca làm việc: ${nextShift}`);
  };

  // Status Badge Label
  const getStatusDisplay = () => {
    switch (record.status) {
      case 'ontime':
        return <span style={{ color: '#059669', fontWeight: 600 }}>[Đúng giờ]</span>;
      case 'late':
        return (
          <span style={{ color: '#D97706', fontWeight: 600 }}>
            [Đi muộn {record.lateMinutes ? `${record.lateMinutes}p` : ''}]
          </span>
        );
      case 'early':
        return <span style={{ color: '#B45309', fontWeight: 600 }}>[Về sớm]</span>;
      case 'absent':
        return <span style={{ color: '#DC2626', fontWeight: 600 }}>[Vắng mặt]</span>;
      default:
        return <span style={{ color: '#D97706', fontWeight: 600 }}>[Chưa chấm công]</span>;
    }
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card">
        {/* Header Modal */}
        <div className="emp-modal-header" style={{ background: '#F8FAFC', padding: '16px 24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
              Chấm công
            </h3>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span><b>{record.employeeName}</b></span>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <span>{record.employeeCode}</span>
              <span style={{ color: '#CBD5E1' }}>|</span>
              {getStatusDisplay()}
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="emp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Thông tin chung: Thời gian, Ca làm việc, Ghi chú */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              paddingBottom: 16,
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Thời gian</span>
              <span style={{ fontSize: 13, color: '#334155' }}>
                Thứ {record.dayOfWeek ? record.dayOfWeek.replace('T', '') : '2'}, {record.dateStr}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Ca làm việc</span>
              <select
                className="emp-form-select"
                style={{ height: 36, maxWidth: 300, fontSize: 13 }}
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
              >
                {SHIFT_OPTIONS.map((sh) => (
                  <option key={sh} value={sh}>
                    {sh}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>Ghi chú</span>
              <textarea
                className="emp-form-input"
                rows={2}
                placeholder="Nhập ghi chú chấm công (nếu có)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ resize: 'vertical', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Quick Anchor Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 20,
              borderBottom: '1.5px solid #E2E8F0',
              paddingBottom: 4,
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2.5px solid #0F766E' : '2.5px solid transparent',
                    color: isActive ? '#0F766E' : '#64748B',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    padding: '6px 4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: -5.5,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 1. THIẾT LẬP CHẤM CÔNG */}
          {(activeTab === 'setup' || activeTab === 'all') && (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '16px 20px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 12 }}>
                1. Thiết lập chấm công
              </div>

              {/* Radio Group: Đi làm, Nghỉ phép hưởng lương, Nghỉ không lương */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="attType"
                    checked={attendanceType === 'working'}
                    onChange={() => setAttendanceType('working')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span>Đi làm</span>
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="attType"
                    checked={attendanceType === 'paid_leave'}
                    onChange={() => setAttendanceType('paid_leave')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span>Nghỉ phép hưởng lương</span>
                  <Info size={13} color="#94A3B8" />
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="attType"
                    checked={attendanceType === 'unpaid_leave'}
                    onChange={() => setAttendanceType('unpaid_leave')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span>Nghỉ không lương</span>
                  <Info size={13} color="#94A3B8" />
                </label>
              </div>

              {/* Thiết lập giờ Vào / Ra */}
              {attendanceType === 'working' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 80, fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={hasCheckIn}
                        onChange={(e) => setHasCheckIn(e.target.checked)}
                        style={{ accentColor: '#0F766E' }}
                      />
                      <span>Vào</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="time"
                        className="emp-form-input"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        disabled={!hasCheckIn}
                        style={{ width: 130, height: 34, fontSize: 13 }}
                      />
                      <Clock size={15} color="#64748B" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 80, fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={hasCheckOut}
                        onChange={(e) => setHasCheckOut(e.target.checked)}
                        style={{ accentColor: '#0F766E' }}
                      />
                      <span>Ra</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="time"
                        className="emp-form-input"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        disabled={!hasCheckOut}
                        style={{ width: 130, height: 34, fontSize: 13 }}
                      />
                      <Clock size={15} color="#64748B" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. LỊCH SỬ CHẤM CÔNG (LOG GPS / QUẸT THẺ) */}
          {(activeTab === 'history' || activeTab === 'all') && (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '16px 20px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>2. Lịch sử chấm công (Log GPS / Quẹt thẻ)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={15} color="#0F766E" />
                  <span style={{ color: '#475569' }}>Vị trí GPS:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {record.gpsLocation || 'Số 42 Cầu Giấy (Cách shop 25m - Hợp lệ)'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Smartphone size={15} color="#64748B" />
                  <span style={{ color: '#475569' }}>Thiết bị di động:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {record.deviceInfo || 'iPhone 14 Pro Max (IMEI: 358921...)'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={15} color="#0F766E" />
                  <span style={{ color: '#475569' }}>Tổng giờ làm tính toán:</span>
                  <span style={{ fontWeight: 700, color: '#0F766E' }}>
                    {record.workHours ? `${record.workHours} giờ công` : '8.25 giờ công'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Modal chuẩn Design System */}
        <div
          className="emp-modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
            background: '#F8FAFC',
          }}
        >
          {/* Nút bên trái: Hủy & Đổi ca */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: '#DC2626',
                borderColor: '#FECACA',
                background: '#FEF2F2',
              }}
              onClick={handleResetAttendance}
            >
              <Trash2 size={14} />
              <span>Hủy</span>
            </button>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: '#0F766E',
                borderColor: '#99F6E4',
                background: '#F0FDFA',
              }}
              onClick={handleChangeShift}
            >
              <RefreshCw size={14} />
              <span>Đổi ca</span>
            </button>
          </div>

          {/* Nút bên phải: Bỏ qua & Lưu */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              onClick={onClose}
              style={{ fontSize: 13, minWidth: 90 }}
            >
              Bỏ qua
            </button>
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              onClick={handleSave}
              style={{ fontSize: 13, minWidth: 90 }}
            >
              Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onUpdateStatus,
}) => {
  if (!isOpen || !record) return null;

  return (
    <AttendanceDetailModalContent
      record={record}
      onClose={onClose}
      onUpdateStatus={onUpdateStatus}
    />
  );
};

export default AttendanceDetailModal;
