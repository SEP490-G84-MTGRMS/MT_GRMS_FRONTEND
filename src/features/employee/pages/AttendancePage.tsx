import React, { useState } from 'react';
import type { AttendanceRecord, ApprovalRequest } from '../types';
import {
  MOCK_WORK_SHIFTS,
  MOCK_ATTENDANCE_RECORDS,
  MOCK_APPROVAL_REQUESTS,
} from '../services/mockData';
import { AttendanceDetailModal } from '../components/AttendanceDetailModal';
import { ApprovalRequestsModal } from '../components/ApprovalRequestsModal';
import '../employee.css';

const DAYS_HEADER: Array<{ key: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'; label: string; date: number; isToday?: boolean }> = [
  { key: 'T2', label: 'Thứ hai', date: 14 },
  { key: 'T3', label: 'Thứ ba', date: 15 },
  { key: 'T4', label: 'Thứ tư', date: 16 },
  { key: 'T5', label: 'Thứ năm', date: 17 },
  { key: 'T6', label: 'Thứ sáu', date: 18, isToday: true },
  { key: 'T7', label: 'Thứ bảy', date: 19 },
  { key: 'CN', label: 'Chủ nhật', date: 20 },
];

export const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE_RECORDS);
  const [shifts] = useState(MOCK_WORK_SHIFTS);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(MOCK_APPROVAL_REQUESTS);

  const [searchEmployee, setSearchEmployee] = useState('');
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
  const [weekLabel] = useState('Tuần 3 - Th. 10 2026');

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);

  const filteredRecords = records.filter((r) =>
    r.employeeName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    r.employeeCode.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const handleUpdateRecordStatus = (recordId: string, newStatus: AttendanceRecord['status']) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status: newStatus } : r))
    );
    if (selectedRecord?.id === recordId) {
      setSelectedRecord((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleApproveRequests = (ids: string[]) => {
    setApprovalRequests((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: 'approved' } : r))
    );
    alert(`Đã duyệt ${ids.length} yêu cầu thành công!`);
  };

  const handleRejectRequests = (ids: string[]) => {
    setApprovalRequests((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: 'rejected' } : r))
    );
    alert(`Đã từ chối ${ids.length} yêu cầu!`);
  };

  const pendingAttendanceCount = approvalRequests.filter(
    (r) => r.type === 'attendance' && r.status === 'pending'
  ).length;

  return (
    <div className="emp-page-container">
      {/* Header Bar */}
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 className="emp-header-title" style={{ margin: 0 }}>
            <span>Bảng chấm công</span>
          </h2>

          <div className="emp-search-box" style={{ width: 220 }}>
            <span className="emp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
            />
          </div>

          <select
            className="emp-filter-select"
            style={{ width: 130 }}
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as 'week' | 'month')}
          >
            <option value="week">Theo tuần</option>
            <option value="month">Theo tháng</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', padding: '4px 12px', borderRadius: 9999, border: '1px solid #E2E8F0' }}>
            <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              &larr;
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F766E' }}>{weekLabel}</span>
            <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              &rarr;
            </button>
          </div>
        </div>

        <div className="emp-header-actions">
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={() => setShowGpsModal(true)}
          >
            📍 Địa chỉ GPS
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={() => setShowQrModal(true)}
          >
            📱 Mã QR GPS
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary emp-approval-btn"
            onClick={() => setShowApprovalModal(true)}
          >
            📋 Duyệt chấm công
            {pendingAttendanceCount > 0 && (
              <span className="emp-pending-badge">{pendingAttendanceCount}</span>
            )}
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-primary"
            onClick={() => alert('Xuất bảng chấm công ra file Excel')}
          >
            📥 Xuất Excel
          </button>
        </div>
      </div>

      {/* Ma trận bảng chấm công theo ca */}
      <div className="emp-table-container">
        <table className="emp-table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>Ca làm việc</th>
              {DAYS_HEADER.map((d) => (
                <th
                  key={d.key}
                  style={{
                    textAlign: 'center',
                    background: d.isToday ? '#E0F2FE' : undefined,
                    color: d.isToday ? '#0369A1' : undefined,
                  }}
                >
                  <div>{d.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {d.date} {d.isToday && <small style={{ fontSize: 10, display: 'block' }}>(Hôm nay)</small>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((sh) => (
              <tr key={sh.id} style={{ minHeight: 90 }}>
                {/* Cột ca */}
                <td style={{ verticalAlign: 'top', padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 9999,
                        background: sh.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{sh.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#0F766E', marginTop: 4 }}>
                    {sh.startTime} - {sh.endTime}
                  </div>
                </td>

                {/* 7 ngày trong tuần */}
                {DAYS_HEADER.map((day) => {
                  const dayRecords = filteredRecords.filter(
                    (r) => r.shiftId === sh.id && r.dayOfWeek === day.key
                  );

                  return (
                    <td
                      key={day.key}
                      style={{
                        verticalAlign: 'top',
                        padding: 8,
                        background: day.isToday ? '#F0F9FF' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {dayRecords.map((att) => (
                          <div
                            key={att.id}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 8,
                              padding: '6px 8px',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              transition: 'transform 0.15s ease',
                            }}
                            onClick={() => setSelectedRecord(att)}
                            title="Bấm để xem chi tiết chấm công"
                          >
                            <div style={{ fontWeight: 600, fontSize: 12, color: '#0F172A' }}>
                              {att.employeeName}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                              {att.checkInTime ? `${att.checkInTime} - ${att.checkOutTime || '...'}` : 'Chưa check-in'}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              {att.status === 'ontime' && (
                                <span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>
                                  ✓ Đúng giờ
                                </span>
                              )}
                              {att.status === 'late' && (
                                <span style={{ fontSize: 10, color: '#D97706', fontWeight: 700 }}>
                                  ⚠️ Muộn {att.lateMinutes}p
                                </span>
                              )}
                              {att.status === 'early' && (
                                <span style={{ fontSize: 10, color: '#B45309', fontWeight: 700 }}>
                                  ⏰ Về sớm
                                </span>
                              )}
                            </div>
                          </div>
                        ))}

                        {dayRecords.length === 0 && (
                          <div style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', padding: 8 }}>
                            -
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal chi tiết chấm công */}
      <AttendanceDetailModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        onUpdateStatus={handleUpdateRecordStatus}
      />

      {/* Modal Duyệt chấm công */}
      <ApprovalRequestsModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        requests={approvalRequests}
        onApprove={handleApproveRequests}
        onReject={handleRejectRequests}
      />

      {/* Popup Mã QR Check-in */}
      {showQrModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div className="emp-modal-header">
              <h3>Mã QR Check-in Nhân viên</h3>
              <button type="button" className="emp-modal-close-btn" onClick={() => setShowQrModal(false)}>
                &times;
              </button>
            </div>
            <div className="emp-modal-body" style={{ padding: 24 }}>
              <div
                style={{
                  width: 200,
                  height: 200,
                  margin: '0 auto',
                  background: '#F8FAFC',
                  border: '2px solid #0F766E',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 64,
                }}
              >
                📱
              </div>
              <p style={{ marginTop: 16, fontSize: 13, color: '#475569' }}>
                Quét mã QR bằng ứng dụng nhân viên khi có mặt tại cửa hàng để ghi nhận chấm công tự động.
              </p>
              <div style={{ fontWeight: 700, color: '#0F766E', fontSize: 14 }}>
                Chi nhánh trung tâm - Bán kính: 200m
              </div>
            </div>
            <div className="emp-modal-footer">
              <button type="button" className="emp-btn emp-btn-secondary" onClick={() => setShowQrModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Địa chỉ GPS */}
      {showGpsModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ maxWidth: 520 }}>
            <div className="emp-modal-header">
              <h3>Thiết lập vị trí GPS chấm công</h3>
              <button type="button" className="emp-modal-close-btn" onClick={() => setShowGpsModal(false)}>
                &times;
              </button>
            </div>
            <div className="emp-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', padding: 12, borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#0F766E' }}>📍 Chi nhánh trung tâm</div>
                  <div style={{ color: '#64748B', marginTop: 2 }}>Số 42 Cầu Giấy, Q. Cầu Giấy, Hà Nội</div>
                  <div style={{ fontSize: 11, color: '#0F766E', marginTop: 4 }}>Bán kính hợp lệ: <b>250 mét</b> &bull; GPS: 21.0362, 105.7905</div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#1E293B' }}>📍 Chi nhánh 2</div>
                  <div style={{ color: '#64748B', marginTop: 2 }}>Số 15 Lê Văn Lương, Q. Thanh Xuân, Hà Nội</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Bán kính hợp lệ: <b>200 mét</b> &bull; GPS: 21.0028, 105.8012</div>
                </div>
              </div>
            </div>
            <div className="emp-modal-footer">
              <button type="button" className="emp-btn emp-btn-secondary" onClick={() => setShowGpsModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
