import React, { useState, useMemo } from 'react';
import { Search, Clock, Plus, Download, User } from 'lucide-react';
import type {
  Employee,
  EmployeeStatus,
  WorkShiftDefinition,
  ScheduleAssignment,
  DebtTransaction,
} from '../types';
import {
  MOCK_EMPLOYEES,
  MOCK_WORK_SHIFTS,
  MOCK_BRANCHES,
  MOCK_SCHEDULE_ASSIGNMENTS,
} from '../services/mockData';
import { AddScheduleModal } from '../components/AddScheduleModal';
import { EmployeeDetailModal } from '../components/EmployeeDetailModal';
import { ShiftInfoModal } from '../components/ShiftInfoModal';
import { ScheduleScopeConfirmModal } from '../components/ScheduleScopeConfirmModal';
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

export const WorkSchedulePage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [shifts, setShifts] = useState<WorkShiftDefinition[]>(MOCK_WORK_SHIFTS);
  const [branches] = useState(MOCK_BRANCHES);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>(MOCK_SCHEDULE_ASSIGNMENTS);

  // Đảm bảo luôn đồng bộ danh sách ca (bao gồm cả Ca tùy chọn)
  React.useEffect(() => {
    setShifts(MOCK_WORK_SHIFTS);
  }, []);

  const [viewMode, setViewMode] = useState<'by_employee' | 'by_shift'>('by_employee');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  const weekData = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const DAYS_HEADER = weekData.days;

  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<ScheduleAssignment | null>(null);
  const [showShiftInfoModal, setShowShiftInfoModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>();
  const [selectedDay, setSelectedDay] = useState<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN' | undefined>();

  // State mở Modal chi tiết nhân viên (chuyên tab Lịch làm việc)
  const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<Employee | null>(null);

  const filteredEmployees = employees.filter((e) =>
    e.fullName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const handleOpenCell = (empId: string, day: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN') => {
    setSelectedEmpId(empId);
    setSelectedDay(day);
    setEditingAssignment(null);
    setShowAddModal(true);
  };

  const handleEditAssignment = (assignment: ScheduleAssignment) => {
    setSelectedEmpId(assignment.employeeId);
    setSelectedDay(assignment.dayOfWeek);
    setEditingAssignment(assignment);
    setShowAddModal(true);
  };

  const handleSaveAssignments = (newItems: ScheduleAssignment[]) => {
    setAssignments((prev) => [...prev, ...newItems]);
  };

  const handleUpdateAssignment = (updated: ScheduleAssignment) => {
    setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDeleteAssignment = (assignId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = assignments.find((a) => a.id === assignId);
    if (item) {
      setDeletingAssignment(item);
    }
  };

  const handleToggleEmployeeStatus = (employeeId: string) => {
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === employeeId) {
          const newStatus: EmployeeStatus = e.status === 'active' ? 'inactive' : 'active';
          const updated: Employee = { ...e, status: newStatus };
          if (selectedDetailEmployee?.id === employeeId) {
            setSelectedDetailEmployee(updated);
          }
          return updated;
        }
        return e;
      })
    );
  };

  const handleAddPayment = (employeeId: string, payment: DebtTransaction) => {
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === employeeId) {
          const updatedDebt = payment.remainingDebtAfter;
          const updatedHistory = [payment, ...(e.debtHistory || [])];
          const updated = { ...e, debtAmount: updatedDebt, debtHistory: updatedHistory };
          if (selectedDetailEmployee?.id === employeeId) {
            setSelectedDetailEmployee(updated);
          }
          return updated;
        }
        return e;
      })
    );
  };


  const formatVND = (num?: number) => {
    if (!num) return '0 ₫';
    return `${num.toLocaleString('vi-VN')} ₫`;
  };

  return (
    <div className="emp-page-container">
      {/* ─── HEADER TOOLBAR ─── */}
      <div>
        <h2 className="emp-header-title">
          <span>Lịch làm việc</span>
        </h2>
      </div>
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="emp-search-box" style={{ width: 240 }}>
            <span className="emp-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Lọc nhân viên..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
            />
          </div>

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
          {/* Switch View Mode */}
          <select
            className="emp-filter-select"
            style={{ width: 170 }}
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'by_employee' | 'by_shift')}
          >
            <option value="by_employee">Xem theo nhân viên</option>
            <option value="by_shift">Xem theo ca</option>
          </select>

          {/* Nút hiển thị Thông tin ca làm việc */}
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowShiftInfoModal(true)}
            title="Xem quy định và khung giờ 4 ca làm việc cố định"
          >
            <Clock size={15} />
            <span>Thông tin ca</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              setSelectedEmpId(undefined);
              setSelectedDay(undefined);
              setEditingAssignment(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={15} />
            <span>Phân ca làm việc</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => alert('Xuất file lịch làm việc Excel')}
          >
            <Download size={15} />
            <span>Xuất file</span>
          </button>
        </div>
      </div>

      {/* ─── CHẾ ĐỘ XEM 1: THEO NHÂN VIÊN ─── */}
      {viewMode === 'by_employee' && (
        <div className="emp-table-container">
          <table className="emp-table" style={{ textAlign: 'center', tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 200, textAlign: 'left' }}>Nhân viên</th>
                {DAYS_HEADER.map((d) => (
                  <th
                    key={d.key}
                    style={{
                      background: d.isToday ? '#E0F2FE' : undefined,
                      color: d.isToday ? '#0369A1' : undefined,
                      textAlign: 'center',
                    }}
                  >
                    <div>{d.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {d.date} {d.isToday && <small style={{ fontSize: 10, display: 'block' }}>(Hôm nay)</small>}
                    </div>
                  </th>
                ))}
                <th style={{ width: 140, textAlign: 'right' }}>Lương dự kiến</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const empAssignments = assignments.filter((a) => a.employeeId === emp.id);
                const shiftCount = empAssignments.length;
                const estimatedWage = shiftCount * 250000;

                return (
                  <tr key={emp.id} style={{ height: 68 }}>
                    {/* Cột nhân viên (Click để xem chi tiết lịch làm việc 360) */}
                    <td
                      style={{
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onClick={() => setSelectedDetailEmployee(emp)}
                      title="Nhấn để xem chi tiết lịch làm việc của nhân viên này"
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '4px 6px',
                          borderRadius: 8,
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F0FDFA';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div
                          className="emp-avatar-cell"
                          style={{
                            width: 36,
                            height: 36,
                            minWidth: 36,
                            fontSize: 14,
                            fontWeight: 700,
                            borderRadius: '50%',
                            background: '#CCFBF1',
                            color: '#0F766E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #99F6E4',
                          }}
                        >
                          {emp.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={emp.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <span>{emp.fullName.charAt(0)}</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: '#0F766E',
                              fontSize: 13,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span>{emp.fullName}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontWeight: 600 }}>{emp.employeeCode}</span>
                            <span style={{ color: '#CBD5E1' }}>&bull;</span>
                            <span
                              style={{
                                color: shiftCount > 0 ? '#0D9488' : '#94A3B8',
                                fontWeight: 500,
                              }}
                            >
                              {shiftCount} ca tuần này
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 7 Ngày trong tuần */}
                    {DAYS_HEADER.map((day) => {
                      const matched = assignments.filter(
                        (a) => a && a.employeeId === emp.id && a.dayOfWeek === day.key
                      );

                      return (
                        <td
                          key={day.key}
                          style={{
                            background: day.isToday ? '#F0F9FF' : undefined,
                            verticalAlign: 'middle',
                            padding: 6,
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                            {matched.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleEditAssignment(item)}
                                title="Nhấn để cập nhật ca làm việc này"
                                style={{
                                  background: `${item.shiftColor}18`,
                                  border: 'none',
                                  color: item.shiftColor,
                                  borderRadius: 6,
                                  padding: '4px 8px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  width: '90%',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.filter = 'brightness(0.95)';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.filter = 'none';
                                  e.currentTarget.style.transform = 'none';
                                }}
                              >
                                <span>{item.shiftName}</span>
                                <button
                                  type="button"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: item.shiftColor,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    padding: 0,
                                  }}
                                  onClick={(e) => handleDeleteAssignment(item.id, e)}
                                  title="Hủy ca"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              style={{
                                background: 'transparent',
                                border: '1px dashed #CBD5E1',
                                borderRadius: 6,
                                width: 26,
                                height: 24,
                                cursor: 'pointer',
                                color: '#94A3B8',
                                fontSize: 14,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onClick={() => handleOpenCell(emp.id, day.key)}
                              title="Thêm lịch làm việc"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      );
                    })}

                    {/* Lương dự kiến */}
                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, color: '#0F766E' }}>{formatVND(estimatedWage)}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{shiftCount} ca</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── CHẾ ĐỘ XEM 2: THEO CA LÀM VIỆC ─── */}
      {viewMode === 'by_shift' && (
        <div className="emp-table-container">
          <table className="emp-table" style={{ textAlign: 'center', tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 230, textAlign: 'left' }}>Ca làm việc</th>
                {DAYS_HEADER.map((d) => (
                  <th key={d.key} style={{ textAlign: 'center' }}>
                    <div>{d.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{d.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map((sh) => (
                <tr key={sh.id} style={{ height: 80 }}>
                  <td style={{ textAlign: 'left', verticalAlign: 'middle', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          minWidth: 10,
                          borderRadius: 9999,
                          background: sh.color,
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{sh.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#0F766E', marginTop: 4, paddingLeft: 18 }}>
                      {sh.id === 'custom' ? 'Thời gian linh hoạt theo phân ca' : `${sh.startTime} - ${sh.endTime} (${sh.totalHours}h)`}
                    </div>
                  </td>

                  {DAYS_HEADER.map((day) => {
                    const assignedEmps = assignments.filter(
                      (a) => a && a.shiftId === sh.id && a.dayOfWeek === day.key
                    );

                    return (
                      <td key={day.key} style={{ verticalAlign: 'middle', padding: '8px 6px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                          {assignedEmps.map((item) => {
                            if (!item) return null;
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleEditAssignment(item)}
                                title={`Nhấn để cập nhật ca làm của ${item.employeeName || ''}`}
                                style={{
                                  background: '#F0FDFA',
                                  border: '1px solid #99F6E4',
                                  borderRadius: 8,
                                  padding: '5px 8px',
                                  width: '92%',
                                  maxWidth: 165,
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  transition: 'all 0.15s ease',
                                  boxShadow: '0 1px 2px rgba(15, 118, 110, 0.05)',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#CCFBF1';
                                  e.currentTarget.style.borderColor = '#5EEAD4';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#F0FDFA';
                                  e.currentTarget.style.borderColor = '#99F6E4';
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#0F766E',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  <User size={13} color="#0F766E" />
                                  <span>{item.employeeName || ''}</span>
                                </div>
                                {sh.id === 'custom' && item.shiftTime && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: '#047857',
                                      fontWeight: 600,
                                      marginTop: 2,
                                      background: '#DCFCE7',
                                      borderRadius: 4,
                                      padding: '1px 4px',
                                      display: 'inline-block',
                                    }}
                                  >
                                    {item.shiftTime}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {assignedEmps.length === 0 && (
                            <span style={{ fontSize: 11, color: '#CBD5E1', fontStyle: 'italic' }}>
                              Trống ca
                            </span>
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
      )}

      {/* Modal Phân Ca / Cập Nhật Ca Làm Việc */}
      <AddScheduleModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingAssignment(null);
        }}
        employees={employees}
        shifts={shifts}
        branches={branches}
        defaultEmployeeId={selectedEmpId}
        defaultDayOfWeek={selectedDay}
        editingAssignment={editingAssignment}
        onSave={handleSaveAssignments}
        onUpdate={handleUpdateAssignment}
        onDelete={handleDeleteAssignment}
      />

      {/* Modal Chi Tiết Lịch Làm Việc Của Nhân Viên (360 độ - tab Lịch làm việc) */}
      <EmployeeDetailModal
        isOpen={!!selectedDetailEmployee}
        onClose={() => setSelectedDetailEmployee(null)}
        employee={selectedDetailEmployee}
        initialTab="schedule"
        onEdit={() => {}}
        onToggleStatus={handleToggleEmployeeStatus}
        onAddPayment={handleAddPayment}
      />

      {/* Modal Thông Tin Các Ca Làm Việc Cố Định */}
      <ShiftInfoModal
        isOpen={showShiftInfoModal}
        onClose={() => setShowShiftInfoModal(false)}
        shifts={shifts}
      />

      {/* Popup Áp dụng thay đổi này cho (khi hủy ca từ bảng lịch làm việc) */}
      <ScheduleScopeConfirmModal
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        actionType="delete"
        dateStr={
          deletingAssignment?.dateStr
            ? deletingAssignment.dateStr.includes('/2026')
              ? deletingAssignment.dateStr
              : `${deletingAssignment.dateStr}/2026`
            : '16/10/2026'
        }
        startDateStr={
          deletingAssignment?.dateStr
            ? deletingAssignment.dateStr.includes('/2026')
              ? deletingAssignment.dateStr
              : `${deletingAssignment.dateStr}/2026`
            : '16/10/2026'
        }
        endDateStr="31/10/2026"
        onConfirm={() => {
          if (deletingAssignment) {
            setAssignments((prev) => prev.filter((a) => a.id !== deletingAssignment.id));
          }
          setDeletingAssignment(null);
        }}
      />
    </div>
  );
};
