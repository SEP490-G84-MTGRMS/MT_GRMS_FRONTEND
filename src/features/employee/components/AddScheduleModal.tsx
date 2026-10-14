import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import type {
  Employee,
  WorkShiftDefinition,
  Branch,
  ScheduleAssignment,
} from '../types';
import { ScheduleScopeConfirmModal, type ScheduleScopeType } from './ScheduleScopeConfirmModal';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  shifts: WorkShiftDefinition[];
  branches: Branch[];
  defaultEmployeeId?: string;
  defaultDayOfWeek?: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  defaultDateStr?: string;
  editingAssignment?: ScheduleAssignment | null;
  onSave: (assignments: ScheduleAssignment[]) => void;
  onUpdate?: (updatedAssignment: ScheduleAssignment) => void;
  onDelete?: (assignmentId: string) => void;
}

interface DayItem {
  key: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  label: string;
  date: string;
}

const DAYS: DayItem[] = [
  { key: 'T2', label: 'Thứ 2', date: '28/09' },
  { key: 'T3', label: 'Thứ 3', date: '29/09' },
  { key: 'T4', label: 'Thứ 4', date: '30/09' },
  { key: 'T5', label: 'Thứ 5', date: '01/10' },
  { key: 'T6', label: 'Thứ 6', date: '02/10' },
  { key: 'T7', label: 'Thứ 7', date: '03/10' },
  { key: 'CN', label: 'Chủ nhật', date: '04/10' },
];

export const AddScheduleModal: React.FC<AddScheduleModalProps> = ({
  isOpen,
  onClose,
  employees,
  shifts,
  branches,
  defaultEmployeeId,
  defaultDayOfWeek,
  editingAssignment,
  onSave,
  onUpdate,
  onDelete,
}) => {
  const isEditMode = !!editingAssignment;

  // Popup xác nhận phạm vi áp dụng (khi update hoặc delete)
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopeAction, setScopeAction] = useState<'update' | 'delete'>('update');
  const [pendingUpdatedItem, setPendingUpdatedItem] = useState<ScheduleAssignment | null>(null);
  const [pendingExtraAssignments, setPendingExtraAssignments] = useState<ScheduleAssignment[]>([]);

  // Nhân viên chính
  const [employeeId, setEmployeeId] = useState(
    editingAssignment?.employeeId || defaultEmployeeId || (employees[0]?.id || '')
  );

  // Ca làm việc: id của shift hoặc 'custom'
  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    editingAssignment?.shiftId || shifts[0]?.id || 'custom'
  );
  const [customStartTime, setCustomStartTime] = useState('00:00');
  const [customEndTime, setCustomEndTime] = useState('00:00');

  // Lặp lại hàng tuần
  const [isRepeating, setIsRepeating] = useState(true);
  const [selectedDays, setSelectedDays] = useState<Array<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'>>(
    editingAssignment ? [editingAssignment.dayOfWeek] : defaultDayOfWeek ? [defaultDayOfWeek] : ['T3']
  );
  const [endDate, setEndDate] = useState('');

  // Thêm lịch tương tự cho nhân viên khác
  const [applyToOthers, setApplyToOthers] = useState(false);
  const [otherEmployeeSearch, setOtherEmployeeSearch] = useState('');
  const [selectedOtherEmpIds, setSelectedOtherEmpIds] = useState<string[]>([]);
  const [isOtherEmpDropdownOpen, setIsOtherEmpDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingAssignment) {
      setEmployeeId(editingAssignment.employeeId);
      setSelectedShiftId(editingAssignment.shiftId);
      if (editingAssignment.shiftId === 'custom' && editingAssignment.shiftTime) {
        const parts = editingAssignment.shiftTime.split('-').map((s) => s.trim());
        if (parts[0]) setCustomStartTime(parts[0]);
        if (parts[1]) setCustomEndTime(parts[1]);
      }
      setSelectedDays([editingAssignment.dayOfWeek]);
      setApplyToOthers(false);
      setSelectedOtherEmpIds([]);
    } else {
      if (defaultEmployeeId) {
        setEmployeeId(defaultEmployeeId);
      } else if (employees.length > 0) {
        setEmployeeId(employees[0].id);
      }
      if (defaultDayOfWeek) {
        setSelectedDays([defaultDayOfWeek]);
      }
      setSelectedShiftId(shifts[0]?.id || 'custom');
      setApplyToOthers(false);
      setSelectedOtherEmpIds([]);
    }
  }, [isOpen, editingAssignment, defaultEmployeeId, defaultDayOfWeek, employees, shifts]);

  // Thông tin nhân viên chính
  const currentEmp = useMemo(() => {
    return employees.find((e) => e.id === employeeId) || employees[0];
  }, [employees, employeeId]);

  // Ngày hiển thị trong popup xác nhận
  const displayDateFormatted = useMemo(() => {
    if (!editingAssignment?.dateStr) return '16/10/2026';
    const str = editingAssignment.dateStr;
    if (str.includes('/2026')) return str;
    return `${str}/2026`;
  }, [editingAssignment]);

  // Tên ngày hiện tại hiển thị ở subtitle
  const currentDayInfo = useMemo(() => {
    const activeKey = selectedDays[0] || 'T3';
    const dayItem = DAYS.find((d) => d.key === activeKey);
    return dayItem ? `${dayItem.label}, ${dayItem.date}/2026` : 'Thứ 3, 29/09/2026';
  }, [selectedDays]);

  // Toggle ngày trong tuần
  const handleToggleDay = (day: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN') => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Luôn giữ ít nhất 1 ngày
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleToggleSelectAllDays = () => {
    if (selectedDays.length === DAYS.length) {
      // Đang chọn hết -> quay về ngày đầu
      setSelectedDays(['T2']);
    } else {
      // Chọn tất cả các ngày
      setSelectedDays(DAYS.map((d) => d.key));
    }
  };

  // Text tóm tắt các ngày lặp
  const repeatSummaryText = useMemo(() => {
    if (selectedDays.length === DAYS.length) return 'Lặp lại tất cả các ngày trong tuần';
    const names = DAYS.filter((d) => selectedDays.includes(d.key)).map((d) => d.label);
    return `Lặp lại ${names.join(', ')} hàng tuần`;
  }, [selectedDays]);

  // Danh sách nhân viên khác để tìm kiếm
  const candidateOtherEmployees = (employees || [])
    .filter((e) => e.id !== employeeId)
    .filter((e) =>
      (e.fullName || '').toLowerCase().includes(otherEmployeeSearch.trim().toLowerCase()) ||
      (e.employeeCode || '').toLowerCase().includes(otherEmployeeSearch.trim().toLowerCase())
    );

  const handleToggleOtherEmp = (empId: string) => {
    if (selectedOtherEmpIds.includes(empId)) {
      setSelectedOtherEmpIds(selectedOtherEmpIds.filter((id) => id !== empId));
    } else {
      setSelectedOtherEmpIds([...selectedOtherEmpIds, empId]);
    }
  };

  const handleRemoveOtherEmp = (empId: string) => {
    setSelectedOtherEmpIds(selectedOtherEmpIds.filter((id) => id !== empId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp) return;

    // Xác định thông tin ca
    let shiftName = '';
    let shiftTime = '';
    let shiftColor = '#0F766E';
    let shiftIdFinal = selectedShiftId;

    if (selectedShiftId === 'custom') {
      shiftName = 'Ca tùy chọn thời gian';
      shiftTime = `${customStartTime} - ${customEndTime}`;
      shiftColor = '#0284C7';
    } else {
      const sh = shifts.find((s) => s.id === selectedShiftId);
      if (sh) {
        shiftName = sh.name;
        shiftTime = `${sh.startTime} - ${sh.endTime}`;
        shiftColor = sh.color || '#0F766E';
      }
    }

    const branchNameFinal = branches[0]?.name || 'Chi nhánh trung tâm';

    // Nếu đang ở chế độ Cập nhật ca cụ thể -> mở popup xác nhận phạm vi thay đổi
    if (isEditMode && editingAssignment) {
      const activeDay = selectedDays[0] || editingAssignment.dayOfWeek;
      const dayObj = DAYS.find((item) => item.key === activeDay);

      const updatedItem: ScheduleAssignment = {
        ...editingAssignment,
        employeeId: currentEmp.id,
        employeeName: currentEmp.fullName,
        employeeCode: currentEmp.employeeCode,
        shiftId: shiftIdFinal,
        shiftName,
        shiftTime,
        shiftColor,
        dayOfWeek: activeDay,
        dateStr: dayObj?.date || editingAssignment.dateStr,
        branchName: branchNameFinal,
      };

      const extraAssignments: ScheduleAssignment[] = [];
      if (applyToOthers && selectedOtherEmpIds.length > 0) {
        selectedOtherEmpIds.forEach((eId) => {
          const empItem = employees.find((e) => e.id === eId);
          if (!empItem) return;
          extraAssignments.push({
            id: `sa_${Date.now()}_${eId}_${activeDay}_${Math.floor(Math.random() * 1000)}`,
            employeeId: empItem.id,
            employeeName: empItem.fullName,
            employeeCode: empItem.employeeCode,
            shiftId: shiftIdFinal,
            shiftName,
            shiftTime,
            shiftColor,
            dayOfWeek: activeDay,
            dateStr: dayObj?.date || '29/09',
            branchName: branchNameFinal,
          });
        });
      }

      setPendingUpdatedItem(updatedItem);
      setPendingExtraAssignments(extraAssignments);
      setScopeAction('update');
      setShowScopeModal(true);
      return;
    }

    // Tập hợp tất cả nhân viên được áp dụng
    const targetEmpIds = [currentEmp.id];
    if (applyToOthers && selectedOtherEmpIds.length > 0) {
      targetEmpIds.push(...selectedOtherEmpIds);
    }

    const allAssignments: ScheduleAssignment[] = [];

    targetEmpIds.forEach((eId) => {
      const empItem = employees.find((e) => e.id === eId);
      if (!empItem) return;

      selectedDays.forEach((d) => {
        const dayObj = DAYS.find((item) => item.key === d);
        allAssignments.push({
          id: `sa_${Date.now()}_${eId}_${d}_${Math.floor(Math.random() * 1000)}`,
          employeeId: empItem.id,
          employeeName: empItem.fullName,
          employeeCode: empItem.employeeCode,
          shiftId: shiftIdFinal,
          shiftName: shiftName,
          shiftTime: shiftTime,
          shiftColor: shiftColor,
          dayOfWeek: d,
          dateStr: dayObj?.date || '29/09',
          branchName: branchNameFinal,
        });
      });
    });

    onSave(allAssignments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}>
        {/* Header Modal theo mockup */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                {isEditMode ? 'Cập nhật ca làm việc' : 'Phân ca làm việc'}
              </h3>
              {isEditMode && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#F0FDFA',
                    color: '#0F766E',
                    border: '1px solid #99F6E4',
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                >
                  Chỉnh sửa
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              {!defaultEmployeeId ? (
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  style={{
                    fontWeight: 600,
                    color: '#0F766E',
                    border: '1px solid #CBD5E1',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 13,
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontWeight: 600, color: '#334155' }}>{currentEmp?.fullName}</span>
              )}
              <span style={{ margin: '0 8px', color: '#CBD5E1' }}>|</span>
              <span>{currentDayInfo}</span>
            </div>
          </div>
          <button
            type="button"
            className="emp-modal-close-btn"
            onClick={onClose}
            style={{ width: 28, height: 28, fontSize: 18 }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className="emp-modal-body"
            style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* ─── SECTION 1: CHỌN CA LÀM VIỆC ─── */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                Chọn ca làm việc
              </div>
              <div
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#FFFFFF',
                }}
              >
                {/* Danh sách các ca mặc định cố định */}
                {shifts.filter((sh) => sh.id !== 'custom').map((sh) => {
                  const isSelected = selectedShiftId === sh.id;
                  return (
                    <div
                      key={sh.id}
                      onClick={() => setSelectedShiftId(sh.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: isSelected ? '#2563EB' : sh.color || '#3B82F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? '#1D4ED8' : '#1E293B' }}>
                          {sh.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {sh.startTime} - {sh.endTime}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Ca tùy chỉnh */}
                <div
                  onClick={() => setSelectedShiftId('custom')}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedShiftId === 'custom' ? '#EFF6FF' : '#FFFFFF',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: selectedShiftId === 'custom' ? '#2563EB' : '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {selectedShiftId === 'custom' && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: selectedShiftId === 'custom' ? '#1D4ED8' : '#1E293B' }}>
                        Ca tùy chọn thời gian
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {selectedShiftId === 'custom' ? `${customStartTime} - ${customEndTime}` : '00:00 - 00:00'}
                      </div>
                    </div>
                  </div>

                  {/* Input nhập giờ khi chọn Ca tùy chỉnh */}
                  {selectedShiftId === 'custom' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 10,
                        paddingLeft: 26,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>Từ:</span>
                        <input
                          type="time"
                          value={customStartTime}
                          onChange={(e) => setCustomStartTime(e.target.value)}
                          className="emp-form-input"
                          style={{ width: 110, height: 32, padding: '2px 8px', fontSize: 13 }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>Đến:</span>
                        <input
                          type="time"
                          value={customEndTime}
                          onChange={(e) => setCustomEndTime(e.target.value)}
                          className="emp-form-input"
                          style={{ width: 110, height: 32, padding: '2px 8px', fontSize: 13 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── SECTION 2: LẶP LẠI HÀNG TUẦN ─── */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  Lặp lại hàng tuần
                </div>
                {/* Switch Toggle */}
                <label style={{ position: 'relative', display: 'inline-block', width: 38, height: 22, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isRepeating}
                    onChange={(e) => setIsRepeating(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: isRepeating ? '#2563EB' : '#CBD5E1',
                      borderRadius: 22,
                      transition: '0.2s',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      height: 16,
                      width: 16,
                      left: isRepeating ? 19 : 3,
                      bottom: 3,
                      background: '#FFFFFF',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }}
                  />
                </label>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Lịch làm việc sẽ được tự động lặp lại vào các ngày trong tuần
              </div>

              {isRepeating && (
                <div style={{ marginTop: 14 }}>
                  {/* Danh sách các nút ngày */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {DAYS.map((d) => {
                      const isSelected = selectedDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => handleToggleDay(d.key)}
                          style={{
                            padding: '6px 12px',
                            border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1',
                            borderRadius: 4,
                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                            color: isSelected ? '#1D4ED8' : '#334155',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: 12,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {d.label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleToggleSelectAllDays}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginLeft: 6,
                        textDecoration: 'underline',
                      }}
                    >
                      {selectedDays.length === DAYS.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: '#475569', marginTop: 8, fontStyle: 'italic' }}>
                    {repeatSummaryText}
                  </div>

                  {/* Ngày kết thúc & Làm việc ngày lễ */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 14,
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Kết thúc:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="emp-form-input"
                        style={{ height: 32, width: 150, fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── SECTION 3: THÊM LỊCH TƯƠNG TỰ CHO NHÂN VIÊN KHÁC ─── */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  Thêm lịch tương tự cho nhân viên khác
                </div>
                {/* Switch Toggle */}
                <label style={{ position: 'relative', display: 'inline-block', width: 38, height: 22, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyToOthers}
                    onChange={(e) => setApplyToOthers(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: applyToOthers ? '#2563EB' : '#CBD5E1',
                      borderRadius: 22,
                      transition: '0.2s',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      height: 16,
                      width: 16,
                      left: applyToOthers ? 19 : 3,
                      bottom: 3,
                      background: '#FFFFFF',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }}
                  />
                </label>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Lịch làm việc sẽ được áp dụng cho các nhân viên được chọn
              </div>

              {applyToOthers && (
                <div style={{ marginTop: 12, position: 'relative' }}>
                  {/* Ô tìm kiếm nhân viên */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      padding: '6px 12px',
                      background: '#FFFFFF',
                    }}
                  >
                    <Search size={15} color="#94A3B8" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm nhân viên..."
                      value={otherEmployeeSearch}
                      onChange={(e) => {
                        setOtherEmployeeSearch(e.target.value);
                        setIsOtherEmpDropdownOpen(true);
                      }}
                      onFocus={() => setIsOtherEmpDropdownOpen(true)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: 13,
                        color: '#1E293B',
                      }}
                    />
                  </div>

                  {/* Tags nhân viên đã chọn */}
                  {selectedOtherEmpIds.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {selectedOtherEmpIds.map((id) => {
                        const emp = employees.find((e) => e.id === id);
                        if (!emp) return null;
                        return (
                          <span
                            key={id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            <span>{emp.fullName}</span>
                            <span
                              onClick={() => handleRemoveOtherEmp(id)}
                              style={{ cursor: 'pointer', display: 'flex' }}
                              title="Bỏ chọn"
                            >
                              <X size={12} />
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Dropdown danh sách gợi ý nhân viên */}
                  {isOtherEmpDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        maxHeight: 180,
                        overflowY: 'auto',
                        zIndex: 100,
                      }}
                    >
                      {candidateOtherEmployees.length ? (
                        candidateOtherEmployees.map((e) => {
                          const isChecked = selectedOtherEmpIds.includes(e.id);
                          return (
                            <div
                              key={e.id}
                              onClick={() => handleToggleOtherEmp(e.id)}
                              style={{
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                background: isChecked ? '#EFF6FF' : '#FFFFFF',
                                borderBottom: '1px solid #F1F5F9',
                              }}
                            >
                              <div style={{ fontSize: 13, color: isChecked ? '#1D4ED8' : '#1E293B' }}>
                                <span style={{ fontWeight: 600 }}>{e.fullName}</span>{' '}
                                <span style={{ color: '#64748B' }}>({e.employeeCode})</span>
                              </div>
                              {isChecked && <Check size={14} color="#2563EB" />}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: 12, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                          Không tìm thấy nhân viên nào phù hợp
                        </div>
                      )}
                      <div
                        style={{
                          padding: '6px 12px',
                          background: '#F8FAFC',
                          textAlign: 'right',
                          borderTop: '1px solid #E2E8F0',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setIsOtherEmpDropdownOpen(false)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#2563EB',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer nút Bỏ qua & Lưu / Cập nhật */}
          <div
            className="emp-modal-footer"
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: isEditMode && onDelete ? 'space-between' : 'flex-end',
              alignItems: 'center',
              gap: 10,
              background: '#F8FAFC',
            }}
          >
            {isEditMode && onDelete && (
              <button
                type="button"
                className="emp-btn"
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  height: 36,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (editingAssignment) {
                    setScopeAction('delete');
                    setShowScopeModal(true);
                  }
                }}
              >
                Hủy ca này
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="emp-btn emp-btn-secondary"
                onClick={onClose}
                style={{ minWidth: 80, height: 36, fontSize: 13 }}
              >
                Bỏ qua
              </button>
              <button
                type="submit"
                className="emp-btn emp-btn-primary"
                style={{ minWidth: 80, height: 36, fontSize: 13 }}
              >
                {isEditMode ? 'Cập nhật' : 'Lưu'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Popup Áp dụng thay đổi này cho (Cập nhật hoặc Xóa ca) */}
      <ScheduleScopeConfirmModal
        isOpen={showScopeModal}
        onClose={() => setShowScopeModal(false)}
        actionType={scopeAction}
        dateStr={displayDateFormatted}
        startDateStr={displayDateFormatted}
        endDateStr="31/10/2026"
        onConfirm={(scope) => {
          if (scopeAction === 'update' && pendingUpdatedItem) {
            if (onUpdate) {
              onUpdate(pendingUpdatedItem);
            } else {
              onSave([pendingUpdatedItem]);
            }
            if (pendingExtraAssignments.length > 0) {
              onSave(pendingExtraAssignments);
            }
          } else if (scopeAction === 'delete' && editingAssignment) {
            if (onDelete) {
              onDelete(editingAssignment.id);
            }
          }
          setShowScopeModal(false);
          onClose();
        }}
      />
    </div>
  );
};
