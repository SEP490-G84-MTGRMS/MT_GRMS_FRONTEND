import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, Plus, Download, User } from 'lucide-react';
import type {
  Employee,
  WorkShiftDefinition,
  ScheduleAssignment,
} from '../types';
import {
  MOCK_EMPLOYEES,
  MOCK_WORK_SHIFTS,
  MOCK_BRANCHES,
  MOCK_SCHEDULE_ASSIGNMENTS,
} from '../services/mockData';
import { AddScheduleModal } from '../components/AddScheduleModal';
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

export const WorkSchedulePage: React.FC = () => {
  const [employees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [shifts] = useState<WorkShiftDefinition[]>(MOCK_WORK_SHIFTS);
  const [branches] = useState(MOCK_BRANCHES);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>(MOCK_SCHEDULE_ASSIGNMENTS);

  const [viewMode, setViewMode] = useState<'by_employee' | 'by_shift'>('by_employee');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [weekLabel] = useState('Tuần 3 - Th. 10 2026');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>();
  const [selectedDay, setSelectedDay] = useState<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN' | undefined>();

  const filteredEmployees = employees.filter((e) =>
    e.fullName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const handleOpenCell = (empId: string, day: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN') => {
    setSelectedEmpId(empId);
    setSelectedDay(day);
    setShowAddModal(true);
  };

  const handleSaveAssignments = (newItems: ScheduleAssignment[]) => {
    setAssignments((prev) => [...prev, ...newItems]);
  };

  const handleDeleteAssignment = (assignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có muốn hủy phân ca này?')) {
      setAssignments((prev) => prev.filter((a) => a.id !== assignId));
    }
  };

  const formatVND = (num?: number) => {
    if (!num) return '0 ₫';
    return `${num.toLocaleString('vi-VN')} ₫`;
  };

  return (
    <div className="emp-page-container">
      {/* ─── HEADER TOOLBAR ─── */}
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 className="emp-header-title" style={{ margin: 0 }}>
            <span>Lịch làm việc</span>
          </h2>

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

          <Link to="/store-owner/employees/shifts" style={{ textDecoration: 'none' }}>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Clock size={15} />
              <span>Quản lý ca</span>
            </button>
          </Link>

          <button
            type="button"
            className="emp-btn emp-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              setSelectedEmpId(undefined);
              setSelectedDay(undefined);
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
          <table className="emp-table" style={{ textAlign: 'center' }}>
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
                    {/* Cột nhân viên */}
                    <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{emp.fullName}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{emp.employeeCode}</div>
                    </td>

                    {/* 7 Ngày trong tuần */}
                    {DAYS_HEADER.map((day) => {
                      const matched = assignments.filter(
                        (a) => a.employeeId === emp.id && a.dayOfWeek === day.key
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
          <table className="emp-table" style={{ textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ width: 220, textAlign: 'left' }}>Ca làm việc</th>
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
                <tr key={sh.id} style={{ height: 75 }}>
                  <td style={{ textAlign: 'left' }}>
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
                    <div style={{ fontSize: 11, color: '#0F766E', marginTop: 2 }}>
                      {sh.startTime} - {sh.endTime} ({sh.totalHours}h)
                    </div>
                  </td>

                  {DAYS_HEADER.map((day) => {
                    const assignedEmps = assignments.filter(
                      (a) => a.shiftId === sh.id && a.dayOfWeek === day.key
                    );

                    return (
                      <td key={day.key} style={{ verticalAlign: 'top', padding: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {assignedEmps.map((item) => (
                            <span
                              key={item.id}
                              style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: 6,
                                padding: '3px 6px',
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#1E293B',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <User size={12} color="#64748B" />
                              <span>{item.employeeName}</span>
                            </span>
                          ))}
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

      {/* Modal Phân Ca */}
      <AddScheduleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        employees={employees}
        shifts={shifts}
        branches={branches}
        defaultEmployeeId={selectedEmpId}
        defaultDayOfWeek={selectedDay}
        onSave={handleSaveAssignments}
      />
    </div>
  );
};
