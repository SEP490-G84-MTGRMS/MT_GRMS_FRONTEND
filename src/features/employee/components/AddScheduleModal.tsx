import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Check, Clock, ChevronDown } from 'lucide-react';
import type {
  Employee,
  WorkShiftDefinition,
  Branch,
  ScheduleAssignment,
} from '../types';
import { shiftConfigApi, type ShiftConfigDto } from '../api/shiftConfigApi';
import { ScheduleScopeConfirmModal } from './ScheduleScopeConfirmModal';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  shifts?: WorkShiftDefinition[];
  branches: Branch[];
  defaultEmployeeId?: string;
  defaultDayOfWeek?: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  defaultDateStr?: string;
  editingAssignment?: ScheduleAssignment | null;
  onSave: (assignments: ScheduleAssignment[]) => void;
  onUpdate?: (updatedAssignment: ScheduleAssignment) => void;
  onDelete?: (assignmentId: string) => void;
}

const SHIFT_COLORS: Record<string, string> = {
  'ca sáng': '#F59E0B',
  'ca chiều': '#3B82F6',
  'ca tối': '#8B5CF6',
  'ca đêm': '#6366F1',
  'ca hành chính': '#10B981',
  'ca gãy': '#EC4899',
};

const getShiftColor = (shiftName: string): string => {
  const lower = (shiftName || '').toLowerCase();
  for (const [key, color] of Object.entries(SHIFT_COLORS)) {
    if (lower.includes(key)) {
      return color;
    }
  }
  return '#0F766E';
};

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

  // Thông tin nhân viên chính
  const currentEmp = useMemo(() => {
    return employees.find((e) => e.id === employeeId) || employees[0];
  }, [employees, employeeId]);

  // Danh sách các BranchId của Employee hiện tại đang làm
  const currentEmpBranchIds = useMemo(() => {
    const list: string[] = [];
    if (currentEmp?.workingBranchIds && Array.isArray(currentEmp.workingBranchIds)) {
      list.push(...currentEmp.workingBranchIds.filter(Boolean));
    }
    if (currentEmp?.salaryBranchId && !list.includes(currentEmp.salaryBranchId)) {
      list.push(currentEmp.salaryBranchId);
    }
    return list;
  }, [currentEmp]);

  const currentEmpBranchId = useMemo(() => {
    return currentEmpBranchIds[0] || undefined;
  }, [currentEmpBranchIds]);

  // Danh sách cấu hình ca làm việc fetch từ ShiftConfigsController
  const [shiftsData, setShiftsData] = useState<WorkShiftDefinition[]>(shifts || []);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);

  // Danh sách ca khả dụng: Kiểm tra theo cả branchId và danh sách branchIds của ca làm việc
  const activeShifts = useMemo(() => {
    const base = shiftsData.length > 0 ? shiftsData : (shifts || []);
    if (currentEmpBranchIds.length === 0) return base;

    return base.filter((s) => {
      if (s.id === 'custom') return true;
      // Ca không gắn chi nhánh nào (áp dụng toàn hệ thống)
      if (!s.branchId && (!s.branchIds || s.branchIds.length === 0)) return true;

      // Danh sách branchId mà ca làm việc này áp dụng
      const shiftBranchIds =
        s.branchIds && s.branchIds.length > 0
          ? s.branchIds
          : s.branchId
          ? [s.branchId]
          : [];

      // Kiểm tra xem ca làm việc có thuộc bất kỳ chi nhánh nào của nhân viên hiện tại không
      return currentEmpBranchIds.some((empBId) => shiftBranchIds.includes(empBId));
    });
  }, [shiftsData, shifts, currentEmpBranchIds]);

  // Ca làm việc: id của shift hoặc 'custom'
  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    editingAssignment?.shiftId || activeShifts[0]?.id || 'custom'
  );
  const [customStartTime, setCustomStartTime] = useState('00:00');
  const [customEndTime, setCustomEndTime] = useState('00:00');
  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false);
  const [shiftSearchKeyword, setShiftSearchKeyword] = useState('');
  const shiftDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch cấu hình ca làm việc từ ShiftConfigsController theo branchId & branchIds của Employee hiện tại
  useEffect(() => {
    if (!isOpen) return;
    let isSubscribed = true;

    const fetchShiftConfigs = async () => {
      setIsLoadingShifts(true);
      try {
        // Gọi API ShiftConfigsController truyền cả branchId và branchIds của Employee hiện tại
        const res = await shiftConfigApi.getShiftConfigsPaged({
          isActive: true,
          pageSize: 100,
          branchId: currentEmpBranchId,
          branchIds: currentEmpBranchIds.length > 0 ? currentEmpBranchIds : undefined,
        });

        if (!isSubscribed) return;

        const items = res.items || [];
        if (items.length > 0) {
          const mapped: WorkShiftDefinition[] = items.map((c: ShiftConfigDto) => ({
            id: c.id,
            name: c.shiftName,
            startTime: (c.startTime || '00:00').substring(0, 5),
            endTime: (c.endTime || '00:00').substring(0, 5),
            totalHours: c.durationHours,
            checkInAllowance: `${(c.allowedCheckInStart || '00:00').substring(0, 5)} - ${(c.allowedCheckInEnd || '00:00').substring(0, 5)}`,
            color: getShiftColor(c.shiftName),
            status: c.isActive ? 'active' : 'inactive',
            branchId: c.branchId,
            branchName: c.branchName || undefined,
            branchIds: c.branchIds || (c.branchId ? [c.branchId] : []),
            branchNames: c.branchNames || (c.branchName ? [c.branchName] : []),
          }));
          setShiftsData(mapped);
        } else {
          // Lọc từ props shifts theo branchIds của Employee nếu API trả rỗng
          const fallback = (shifts || []).filter((s) => {
            if (s.id === 'custom') return true;
            if (!s.branchId && (!s.branchIds || s.branchIds.length === 0)) return true;
            if (currentEmpBranchIds.length === 0) return true;
            const shiftBranchIds =
              s.branchIds && s.branchIds.length > 0
                ? s.branchIds
                : s.branchId
                ? [s.branchId]
                : [];
            return currentEmpBranchIds.some((empBId) => shiftBranchIds.includes(empBId));
          });
          setShiftsData(fallback);
        }
      } catch (err) {
        console.warn('Lỗi khi fetch ca làm việc từ ShiftConfigsController, dùng shifts dự phòng:', err);
        const fallback = (shifts || []).filter((s) => {
          if (s.id === 'custom') return true;
          if (!s.branchId && (!s.branchIds || s.branchIds.length === 0)) return true;
          if (currentEmpBranchIds.length === 0) return true;
          const shiftBranchIds =
            s.branchIds && s.branchIds.length > 0
              ? s.branchIds
              : s.branchId
              ? [s.branchId]
              : [];
          return currentEmpBranchIds.some((empBId) => shiftBranchIds.includes(empBId));
        });
        setShiftsData(fallback);
      } finally {
        if (isSubscribed) {
          setIsLoadingShifts(false);
        }
      }
    };

    fetchShiftConfigs();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, currentEmp?.id, currentEmpBranchId, currentEmpBranchIds]);

  // Tự động gán ca hợp lệ theo BranchId mới khi đổi nhân viên
  useEffect(() => {
    if (!editingAssignment && activeShifts.length > 0) {
      const exists = activeShifts.some((s) => s.id === selectedShiftId);
      if (!exists && selectedShiftId !== 'custom') {
        setSelectedShiftId(activeShifts[0].id);
      }
    }
  }, [activeShifts, editingAssignment, selectedShiftId]);

  // Đóng dropdown ca làm việc khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shiftDropdownRef.current &&
        !shiftDropdownRef.current.contains(event.target as Node)
      ) {
        setIsShiftDropdownOpen(false);
      }
    };

    if (isShiftDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShiftDropdownOpen]);

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
      setSelectedShiftId(activeShifts[0]?.id || 'custom');
      setApplyToOthers(false);
      setSelectedOtherEmpIds([]);
    }
  }, [isOpen, editingAssignment, defaultEmployeeId, defaultDayOfWeek, employees, activeShifts]);

  // Thông tin ca hiện tại đang chọn
  const currentSelectedShift = useMemo(() => {
    if (selectedShiftId === 'custom') return null;
    return activeShifts.find((s) => s.id === selectedShiftId);
  }, [activeShifts, selectedShiftId]);

  const filteredShiftsList = useMemo(() => {
    return activeShifts
      .filter((s) => s.id !== 'custom')
      .filter(
        (s) =>
          s.name.toLowerCase().includes(shiftSearchKeyword.toLowerCase()) ||
          s.startTime.includes(shiftSearchKeyword) ||
          s.endTime.includes(shiftSearchKeyword)
      );
  }, [activeShifts, shiftSearchKeyword]);

  const showCustomOption =
    !shiftSearchKeyword.trim() ||
    'ca tùy chọn thời gian'.includes(shiftSearchKeyword.toLowerCase()) ||
    'tùy chọn'.includes(shiftSearchKeyword.toLowerCase()) ||
    'custom'.includes(shiftSearchKeyword.toLowerCase());

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

  // Danh sách nhân viên khác để tìm kiếm (chỉ lấy nhân viên cùng chi nhánh với nhân viên hiện tại)
  const candidateOtherEmployees = useMemo(() => {
    return (employees || [])
      .filter((e) => e.id !== employeeId)
      .filter((e) => {
        if (currentEmpBranchIds.length === 0) return true;
        return currentEmpBranchIds.some(
          (bId) =>
            e.salaryBranchId === bId ||
            (e.workingBranchIds && e.workingBranchIds.includes(bId))
        );
      })
      .filter(
        (e) =>
          (e.fullName || '').toLowerCase().includes(otherEmployeeSearch.trim().toLowerCase()) ||
          (e.employeeCode || '').toLowerCase().includes(otherEmployeeSearch.trim().toLowerCase())
      );
  }, [employees, employeeId, currentEmpBranchIds, otherEmployeeSearch]);

  // Khi đổi nhân viên chính (hoặc chi nhánh), tự động lọc bỏ các nhân viên khác không cùng chi nhánh
  useEffect(() => {
    if (currentEmpBranchIds.length === 0 || selectedOtherEmpIds.length === 0) return;
    setSelectedOtherEmpIds((prev) =>
      prev.filter((id) => {
        const emp = employees.find((e) => e.id === id);
        if (!emp) return false;
        return currentEmpBranchIds.some(
          (bId) =>
            emp.salaryBranchId === bId ||
            (emp.workingBranchIds && emp.workingBranchIds.includes(bId))
        );
      })
    );
  }, [currentEmpBranchIds, employees]);

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
      shiftColor = '#0F766E';
    } else {
      const sh = activeShifts.find((s) => s.id === selectedShiftId);
      if (sh) {
        shiftName = sh.name;
        shiftTime = `${sh.startTime} - ${sh.endTime}`;
        shiftColor = sh.color || '#0F766E';
      }
    }

    const branchNameFinal =
      currentEmp?.workingBranchNames?.[0] ||
      currentEmp?.salaryBranchName ||
      branches.find((b) => b.id === currentEmpBranchId)?.name ||
      branches[0]?.name ||
      'Chi nhánh trung tâm';

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
        branchId: currentEmpBranchId,
        branchName: branchNameFinal,
      };

      const extraAssignments: ScheduleAssignment[] = [];
      if (applyToOthers && selectedOtherEmpIds.length > 0) {
        selectedOtherEmpIds.forEach((eId) => {
          const empItem = employees.find((e) => e.id === eId);
          if (!empItem) return;
          const otherBranchId =
            (empItem?.workingBranchIds && empItem.workingBranchIds[0]) ||
            empItem?.salaryBranchId;
          const otherBranchName =
            empItem?.workingBranchNames?.[0] ||
            empItem?.salaryBranchName ||
            branches.find((b) => b.id === otherBranchId)?.name ||
            branchNameFinal;

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
            branchId: otherBranchId,
            branchName: otherBranchName,
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
      const empItemBranchId =
        (empItem?.workingBranchIds && empItem.workingBranchIds[0]) ||
        empItem?.salaryBranchId;
      const empItemBranchName =
        empItem?.workingBranchNames?.[0] ||
        empItem?.salaryBranchName ||
        branches.find((b) => b.id === empItemBranchId)?.name ||
        branchNameFinal;

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
          branchId: empItemBranchId,
          branchName: empItemBranchName,
        });
      });
    });

    onSave(allAssignments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ padding: 0, overflow: 'hidden' }}>
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
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                Chọn ca làm việc
              </div>

              {/* Custom Searchable Shift Dropdown */}
              <div ref={shiftDropdownRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setIsShiftDropdownOpen((prev) => !prev)}
                  style={{
                    height: 42,
                    padding: '6px 14px',
                    border: `1px solid ${isShiftDropdownOpen ? '#0F766E' : '#CBD5E1'}`,
                    borderRadius: 8,
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    transition: 'all 0.15s ease',
                    boxShadow: isShiftDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1 }}>
                    <Clock size={16} color="#64748B" style={{ flexShrink: 0 }} />

                    {selectedShiftId === 'custom' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: '#F0FDFA',
                            color: '#0F766E',
                            border: '1px solid #99F6E4',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Ca tùy chọn
                        </span>
                        <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                          {customStartTime} - {customEndTime}
                        </span>
                      </div>
                    ) : currentSelectedShift ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                          {currentSelectedShift.name}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748B' }}>
                          ({currentSelectedShift.startTime} - {currentSelectedShift.endTime})
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: 13 }}>Chọn ca làm việc...</span>
                    )}
                  </div>

                  <ChevronDown
                    size={16}
                    style={{
                      transform: isShiftDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      color: '#64748B',
                      flexShrink: 0,
                    }}
                  />
                </div>

                {/* Dropdown Panel */}
                {isShiftDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 6,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Search Input Bar */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: 6,
                          padding: '5px 10px',
                        }}
                      >
                        <Search size={14} color="#94A3B8" />
                        <input
                          type="text"
                          value={shiftSearchKeyword}
                          onChange={(e) => setShiftSearchKeyword(e.target.value)}
                          placeholder="Tìm kiếm ca làm việc..."
                          style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            width: '100%',
                            fontSize: 13,
                            color: '#1E293B',
                          }}
                          autoFocus
                        />
                        {shiftSearchKeyword && (
                          <button
                            type="button"
                            onClick={() => setShiftSearchKeyword('')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#94A3B8',
                              padding: 0,
                              display: 'flex',
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Count & Status */}
                    <div
                      style={{
                        padding: '6px 12px',
                        background: '#F8FAFC',
                        borderBottom: '1px solid #F1F5F9',
                        fontSize: 12,
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        Tìm thấy {filteredShiftsList.length + (showCustomOption ? 1 : 0)} ca làm việc
                      </span>
                      {isLoadingShifts && (
                        <span style={{ fontSize: 11, color: '#0F766E', fontWeight: 500 }}>
                          Đang đồng bộ ShiftConfig...
                        </span>
                      )}
                    </div>

                    {/* Shifts List */}
                    <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
                      {isLoadingShifts && filteredShiftsList.length === 0 && (
                        <div style={{ padding: '16px 12px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                          Đang tải danh sách ca từ ShiftConfig...
                        </div>
                      )}

                      {filteredShiftsList.map((sh) => {
                        const isSelected = selectedShiftId === sh.id;
                        return (
                          <div
                            key={sh.id}
                            onClick={() => {
                              setSelectedShiftId(sh.id);
                              setIsShiftDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              cursor: 'pointer',
                              background: isSelected ? '#F0FDFA' : 'transparent',
                              transition: 'background 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: isSelected ? 700 : 600,
                                  color: isSelected ? '#0F766E' : '#1E293B',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <span>{sh.name}</span>
                                {sh.branchNames && sh.branchNames.length > 1 ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      padding: '1px 6px',
                                      background: '#F1F5F9',
                                      color: '#475569',
                                      borderRadius: 4,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {sh.branchNames.length} chi nhánh
                                  </span>
                                ) : (sh.branchNames?.[0] || sh.branchName) ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      padding: '1px 6px',
                                      background: '#F1F5F9',
                                      color: '#475569',
                                      borderRadius: 4,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {sh.branchNames?.[0] || sh.branchName}
                                  </span>
                                ) : null}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                                {sh.startTime} - {sh.endTime} ({sh.totalHours}h)
                              </div>
                            </div>

                            {isSelected && <Check size={16} color="#0F766E" />}
                          </div>
                        );
                      })}

                      {/* Option Ca tùy chọn */}
                      {showCustomOption && (
                        <div
                          onClick={() => {
                            setSelectedShiftId('custom');
                            setIsShiftDropdownOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderTop: '1px dashed #E2E8F0',
                            background: selectedShiftId === 'custom' ? '#F0FDFA' : 'transparent',
                            transition: 'background 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedShiftId !== 'custom') e.currentTarget.style.background = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            if (selectedShiftId !== 'custom') e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: selectedShiftId === 'custom' ? 700 : 600, color: selectedShiftId === 'custom' ? '#0F766E' : '#1E293B' }}>
                              Ca tùy chọn
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                              Tự do thiết lập giờ bắt đầu và kết thúc
                            </div>
                          </div>

                          {selectedShiftId === 'custom' && <Check size={16} color="#0F766E" />}
                        </div>
                      )}

                      {!filteredShiftsList.length && !showCustomOption && (
                        <div style={{ padding: '16px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                          Không tìm thấy ca làm việc nào phù hợp
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Khung nhập giờ bắt đầu - kết thúc khi chọn Ca tùy chọn */}
              {selectedShiftId === 'custom' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginTop: 10,
                    padding: '12px 16px',
                    background: '#F0FDFA',
                    border: '1px solid #99F6E4',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F766E' }}>Giờ bắt đầu:</span>
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="emp-form-input"
                      style={{ width: 110, height: 34, padding: '2px 8px', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F766E' }}>Giờ kết thúc:</span>
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="emp-form-input"
                      style={{ width: 110, height: 34, padding: '2px 8px', fontSize: 13 }}
                    />
                  </div>
                </div>
              )}
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
                      background: isRepeating ? '#0F766E' : '#CBD5E1',
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
                            border: isSelected ? '2px solid #0F766E' : '1px solid #CBD5E1',
                            borderRadius: 4,
                            background: isSelected ? '#F0FDFA' : '#FFFFFF',
                            color: isSelected ? '#0F766E' : '#334155',
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
                        color: '#0F766E',
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
                      background: applyToOthers ? '#0F766E' : '#CBD5E1',
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
                {currentEmp?.workingBranchNames?.[0] || currentEmp?.salaryBranchName ? (
                  <span>
                    Chỉ áp dụng cho các nhân viên cùng chi nhánh (
                    <strong style={{ color: '#0F766E' }}>
                      {currentEmp?.workingBranchNames?.[0] || currentEmp?.salaryBranchName}
                    </strong>
                    )
                  </span>
                ) : (
                  'Lịch làm việc sẽ được áp dụng cho các nhân viên cùng chi nhánh'
                )}
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
                      placeholder="Tìm kiếm nhân viên cùng chi nhánh..."
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
                              background: '#F0FDFA',
                              color: '#0F766E',
                              border: '1px solid #99F6E4',
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
                                background: isChecked ? '#F0FDFA' : '#FFFFFF',
                                borderBottom: '1px solid #F1F5F9',
                              }}
                            >
                              <div style={{ fontSize: 13, color: isChecked ? '#0F766E' : '#1E293B' }}>
                                <span style={{ fontWeight: 600 }}>{e.fullName}</span>{' '}
                                <span style={{ color: '#64748B' }}>({e.employeeCode})</span>
                              </div>
                              {isChecked && <Check size={14} color="#0F766E" />}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: 12, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                          Không tìm thấy nhân viên cùng chi nhánh nào phù hợp
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
                            color: '#0F766E',
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
        onConfirm={(_scope) => {
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
