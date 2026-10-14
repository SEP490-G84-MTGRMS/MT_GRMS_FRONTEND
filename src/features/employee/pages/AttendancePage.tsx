import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  QrCode,
  ClipboardCheck,
  Download,
  Check,
  AlertTriangle,
  Clock,
  Smartphone,
} from 'lucide-react';
import type { AttendanceRecord, ApprovalRequest } from '../types';
import {
  MOCK_WORK_SHIFTS,
  MOCK_ATTENDANCE_RECORDS,
  MOCK_APPROVAL_REQUESTS,
} from '../services/mockData';
import { AttendanceDetailModal } from '../components/AttendanceDetailModal';
import { ApprovalRequestsModal } from '../components/ApprovalRequestsModal';
import '../employee.css';

const getWeekDates = (offsetWeeks: number) => {
  // Mốc mặc định: Thứ Hai 14/10/2026 (Tuần 3 - Th. 10 2026)
  const baseMonday = new Date(2026, 9, 14);
  const monday = new Date(baseMonday);
  monday.setDate(baseMonday.getDate() + offsetWeeks * 7);

  // Tính tuần trong tháng
  const firstDay = new Date(monday.getFullYear(), monday.getMonth(), 1);
  const firstDayOffset = (firstDay.getDay() + 6) % 7; // Thứ 2 là 0, CN là 6
  const weekNumber = Math.ceil((monday.getDate() + firstDayOffset) / 7);
  const month = monday.getMonth() + 1;
  const year = monday.getFullYear();
  const label = `Tuần ${weekNumber} - Th. ${month} ${year}`;

  const dayKeys: Array<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'> = [
    'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN',
  ];
  const dayNames = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];

  const days = dayKeys.map((key, index) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + index);
    return {
      key,
      label: dayNames[index],
      date: cur.getDate(),
      isToday: offsetWeeks === 0 && key === 'T6',
    };
  });

  return { label, days };
};

export const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE_RECORDS);
  const [shifts] = useState(MOCK_WORK_SHIFTS);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(MOCK_APPROVAL_REQUESTS);

  const [searchEmployee, setSearchEmployee] = useState('');
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  const weekData = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const DAYS_HEADER = weekData.days;

  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);

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
      {/* ─── HEADER BAR ─── */}
      <div>
        <h2 className="emp-header-title">
          <span>Bảng chấm công</span>
        </h2>
      </div>
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="emp-search-box" style={{ width: 220 }}>
            <span className="emp-search-icon">
              <Search size={16} />
            </span>
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

          {/* Điều hướng tuần */}
          <div className="emp-date-navigator">
            <button
              type="button"
              className="emp-date-navigator-btn"
              onClick={handlePrevWeek}
              title="Tuần trước"
            >
              &lt;
            </button>
            <span className="emp-date-navigator-label">{weekData.label}</span>
            <button
              type="button"
              className="emp-date-navigator-btn"
              onClick={handleNextWeek}
              title="Tuần sau"
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="emp-header-actions">
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowGpsModal(true)}
          >
            <MapPin size={15} />
            <span>Địa chỉ GPS</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowQrModal(true)}
          >
            <QrCode size={15} />
            <span>Mã QR GPS</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary emp-approval-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowApprovalModal(true)}
          >
            <ClipboardCheck size={15} />
            <span>Duyệt chấm công</span>
            {pendingAttendanceCount > 0 && (
              <span className="emp-pending-badge">{pendingAttendanceCount}</span>
            )}
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => alert('Xuất bảng chấm công ra file Excel')}
          >
            <Download size={15} />
            <span>Xuất Excel</span>
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
                                <span style={{ fontSize: 10, color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <Check size={11} />
                                  <span>Đúng giờ</span>
                                </span>
                              )}
                              {att.status === 'late' && (
                                <span style={{ fontSize: 10, color: '#D97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <AlertTriangle size={11} />
                                  <span>Muộn {att.lateMinutes}p</span>
                                </span>
                              )}
                              {att.status === 'early' && (
                                <span style={{ fontSize: 10, color: '#B45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <Clock size={11} />
                                  <span>Về sớm</span>
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
                }}
              >
                <Smartphone size={64} color="#0F766E" />
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
                  <div style={{ fontWeight: 700, color: '#0F766E', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} />
                    <span>Chi nhánh trung tâm</span>
                  </div>
                  <div style={{ color: '#64748B', marginTop: 2 }}>Số 42 Cầu Giấy, Q. Cầu Giấy, Hà Nội</div>
                  <div style={{ fontSize: 11, color: '#0F766E', marginTop: 4 }}>Bán kính hợp lệ: <b>250 mét</b> &bull; GPS: 21.0362, 105.7905</div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} />
                    <span>Chi nhánh 2</span>
                  </div>
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
