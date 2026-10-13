import React, { useState, useEffect } from 'react';
import type {
  Employee,
  WorkShiftDefinition,
  Branch,
  ScheduleAssignment,
} from '../types';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  shifts: WorkShiftDefinition[];
  branches: Branch[];
  defaultEmployeeId?: string;
  defaultDayOfWeek?: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  defaultDateStr?: string;
  onSave: (assignments: ScheduleAssignment[]) => void;
}

const DAYS: Array<{ key: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'; label: string; date: string }> = [
  { key: 'T2', label: 'Thứ 2', date: '14/10' },
  { key: 'T3', label: 'Thứ 3', date: '15/10' },
  { key: 'T4', label: 'Thứ 4', date: '16/10' },
  { key: 'T5', label: 'Thứ 5', date: '17/10' },
  { key: 'T6', label: 'Thứ 6', date: '18/10' },
  { key: 'T7', label: 'Thứ 7', date: '19/10' },
  { key: 'CN', label: 'Chủ nhật', date: '20/10' },
];

export const AddScheduleModal: React.FC<AddScheduleModalProps> = ({
  isOpen,
  onClose,
  employees,
  shifts,
  branches,
  defaultEmployeeId,
  defaultDayOfWeek,
  onSave,
}) => {
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || (employees[0]?.id || ''));
  const [shiftId, setShiftId] = useState(shifts[0]?.id || '');
  const [selectedDays, setSelectedDays] = useState<Array<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'>>(
    defaultDayOfWeek ? [defaultDayOfWeek] : ['T2']
  );
  const [branchId, setBranchId] = useState(branches[0]?.id || '');

  useEffect(() => {
    if (defaultEmployeeId) setEmployeeId(defaultEmployeeId);
    if (defaultDayOfWeek) setSelectedDays([defaultDayOfWeek]);
  }, [defaultEmployeeId, defaultDayOfWeek, isOpen]);

  if (!isOpen) return null;

  const handleToggleDay = (day: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN') => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === employeeId);
    const sh = shifts.find((s) => s.id === shiftId);
    const br = branches.find((b) => b.id === branchId);

    if (!emp || !sh) {
      alert('Vui lòng chọn nhân viên và ca làm việc hợp lệ!');
      return;
    }

    const assignments: ScheduleAssignment[] = selectedDays.map((d) => {
      const dayObj = DAYS.find((item) => item.key === d);
      return {
        id: `sa_${Date.now()}_${d}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeCode: emp.employeeCode,
        shiftId: sh.id,
        shiftName: sh.name,
        shiftTime: `${sh.startTime} - ${sh.endTime}`,
        shiftColor: sh.color,
        dayOfWeek: d,
        dateStr: dayObj?.date || '14/10',
        branchName: br?.name || 'Chi nhánh trung tâm',
      };
    });

    onSave(assignments);
    onClose();
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 520 }}>
        <div className="emp-modal-header">
          <h3>Phân ca làm việc cho nhân viên</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            <div className="emp-form-group">
              <label className="emp-form-label">
                Nhân viên <span className="required">*</span>
              </label>
              <select
                className="emp-form-select"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="emp-form-group">
              <label className="emp-form-label">
                Ca làm việc <span className="required">*</span>
              </label>
              <select
                className="emp-form-select"
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                required
              >
                {shifts.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.name} ({sh.startTime} - {sh.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div className="emp-form-group">
              <label className="emp-form-label">Chi nhánh phân công</label>
              <select
                className="emp-form-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="emp-form-group">
              <label className="emp-form-label">Chọn các ngày trong tuần</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DAYS.map((d) => {
                  const isSelected = selectedDays.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: isSelected ? '1px solid #0F766E' : '1px solid #E2E8F0',
                        background: isSelected ? '#F0FDFA' : '#FFFFFF',
                        color: isSelected ? '#0F766E' : '#334155',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleToggleDay(d.key)}
                    >
                      {d.label} ({d.date})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="emp-btn emp-btn-primary">
              Lưu phân ca
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
