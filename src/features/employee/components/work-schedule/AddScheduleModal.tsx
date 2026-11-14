import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Check, Clock, ChevronDown } from 'lucide-react';
import type {
  Employee,
  WorkShiftDefinition,
  Branch,
  ScheduleAssignment,
} from '../../types';
import { shiftConfigApi, type ShiftConfigDto } from '../../api/shiftConfigApi';
import { scheduleApi, isLeaveSchedule, isScheduleDeletable, type CreateRecurringSchedulePayload } from '../../api/scheduleApi';
import { ScheduleScopeConfirmModal, type ScheduleScopeType, type ScheduleScopeDateRange } from './ScheduleScopeConfirmModal';
import { getVietnamToday, getVietnamTodayIso } from '../../lib/vietnamTime';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  shifts?: WorkShiftDefinition[];
  branches: Branch[];
  defaultEmployeeId?: string;
  defaultDayOfWeek?: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  defaultDateStr?: string;
  defaultStartDate?: string;
  weekDays?: Array<{
    key: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
    label: string;
    date: string | number;
    dateStr?: string;
    dateIso?: string;
    fullDate?: any;
    isToday?: boolean;
  }>;
  weekAssignments?: ScheduleAssignment[];
  editingAssignment?: ScheduleAssignment | null;
  onSave?: (assignments: ScheduleAssignment[]) => void;
  onUpdate?: (updatedAssignment: ScheduleAssignment) => void;
  onDelete?: (
    assignmentId: string,
    scope?: ScheduleScopeType,
    dateRange?: ScheduleScopeDateRange
  ) => Promise<void> | void;
  onSuccess?: (actionType?: 'create' | 'update' | 'delete') => Promise<void> | void;
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

const DAY_OF_WEEK_MAP: Record<number, 'CN' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7'> = {
  0: 'CN',
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
};

const getScheduleDayOfWeek = (s: ScheduleAssignment): 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN' => {
  if (s.dayOfWeek && ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].includes(s.dayOfWeek)) {
    return s.dayOfWeek as any;
  }
  if (s.workDate) {
    const d = new Date(s.workDate);
    if (!isNaN(d.getTime())) return DAY_OF_WEEK_MAP[d.getDay()] || 'T2';
  }
  if (s.dateStr) {
    const parts = s.dateStr.split('/');
    if (parts.length >= 2) {
      const dd = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10) - 1;
      const yyyy = parts.length >= 3 ? parseInt(parts[2], 10) : getVietnamToday().getFullYear();
      const d = new Date(yyyy, mm, dd);
      if (!isNaN(d.getTime())) return DAY_OF_WEEK_MAP[d.getDay()] || 'T2';
    }
  }
  return 'T2';
};

const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

const getShiftIntervalMinutes = (startStr: string, endStr: string): [number, number] => {
  const startMin = parseTimeToMinutes(startStr);
  let endMin = parseTimeToMinutes(endStr);
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }
  return [startMin, endMin];
};

const getAssignmentDurationHours = (a: ScheduleAssignment, shiftsList: WorkShiftDefinition[]): number => {
  if (typeof a.durationHours === 'number' && a.durationHours > 0) {
    return a.durationHours;
  }
  const matchedShift = shiftsList.find(
    (s) => s.id === a.shiftId || (a.shiftName && s.name.toLowerCase().trim() === a.shiftName.toLowerCase().trim())
  );
  if (matchedShift && matchedShift.totalHours > 0) {
    return matchedShift.totalHours;
  }
  if (a.shiftTime && a.shiftTime.includes('-')) {
    const [st, et] = a.shiftTime.split('-').map((x) => x.trim());
    const [sMin, eMin] = getShiftIntervalMinutes(st, et);
    return Math.round(((eMin - sMin) / 60) * 100) / 100;
  }
  return 8;
};

// Hàm kiểm tra xem ca làm việc có phải là ca lặp lại tuần sau hay không
const checkIsRepeatingSchedule = async (assignment: ScheduleAssignment): Promise<boolean> => {
  try {
    let baseDate: Date | null = null;
    if (assignment.workDate) {
      const d = new Date(assignment.workDate);
      if (!isNaN(d.getTime())) baseDate = d;
    }
    if (!baseDate && assignment.dateStr) {
      const parts = assignment.dateStr.split('/');
      if (parts.length >= 2) {
        const dd = parseInt(parts[0], 10);
        const mm = parseInt(parts[1], 10) - 1;
        const yyyy = parts.length >= 3 ? parseInt(parts[2], 10) : getVietnamToday().getFullYear();
        const d = new Date(yyyy, mm, dd);
        if (!isNaN(d.getTime())) baseDate = d;
      }
    }

    if (!baseDate) return false;

    // Ngày cùng thứ tuần sau (+7 ngày)
    const nextWeekDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 7);
    const dd = String(nextWeekDate.getDate()).padStart(2, '0');
    const mm = String(nextWeekDate.getMonth() + 1).padStart(2, '0');
    const yyyy = nextWeekDate.getFullYear();
    const nextWeekDateIso = `${yyyy}-${mm}-${dd}`;

    const nextWeekSchedules = await scheduleApi.getSchedules({
      employeeId: assignment.employeeId,
      fromDate: nextWeekDateIso,
      toDate: nextWeekDateIso,
      pageSize: 10,
    });

    const targetShiftId = assignment.shiftId;
    const targetShiftName = assignment.shiftName?.toLowerCase().trim();

    return nextWeekSchedules.some((s) => {
      const matchesShift =
        (targetShiftId && s.shiftId === targetShiftId) ||
        (targetShiftName && s.shiftName && s.shiftName.toLowerCase().trim() === targetShiftName);
      return matchesShift;
    });
  } catch (err) {
    console.warn('Lỗi kiểm tra ca tuần sau:', err);
    return false;
  }
};

export const AddScheduleModal: React.FC<AddScheduleModalProps> = ({
  isOpen,
  onClose,
  employees,
  shifts,
  branches,
  defaultEmployeeId,
  defaultDayOfWeek,
  defaultStartDate,
  weekDays,
  weekAssignments,
  editingAssignment,
  onSave,
  onUpdate,
  onDelete,
  onSuccess,
}) => {
  const isEditMode = !!editingAssignment;

  // Popup xác nhận phạm vi áp dụng (khi xóa ca)
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopeAction, setScopeAction] = useState<'update' | 'delete'>('delete');

  // Nhân viên chính
  const [employeeId, setEmployeeId] = useState(
    editingAssignment?.employeeId || defaultEmployeeId || (employees[0]?.id || '')
  );

  // Trạng thái gửi API & Báo lỗi
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Ca làm việc: id của shift
  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    editingAssignment?.shiftId || activeShifts[0]?.id || ''
  );
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
            code: c.shiftCode,
            name: c.shiftName,
            startTime: (c.startTime || '00:00').substring(0, 5),
            endTime: (c.endTime || '00:00').substring(0, 5),
            totalHours: c.durationHours,
            checkInAllowance: `${(c.startTime || '00:00').substring(0, 5)} - ${(c.endTime || '00:00').substring(0, 5)}`,
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

  // Tự động gán ca hợp lệ theo BranchId mới khi đổi nhân viên hoặc khi danh sách ca cập nhật
  useEffect(() => {
    if (activeShifts.length === 0) return;
    if (editingAssignment) {
      const matchedShift = activeShifts.find(
        (s) =>
          s.id === editingAssignment.shiftId ||
          (editingAssignment.shiftName &&
            s.name.toLowerCase().trim() === editingAssignment.shiftName.toLowerCase().trim())
      );
      if (matchedShift && !activeShifts.some((s) => s.id === selectedShiftId)) {
        setSelectedShiftId(matchedShift.id);
      }
    } else {
      const exists = activeShifts.some((s) => s.id === selectedShiftId);
      if (!exists) {
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
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  // Thêm lịch tương tự cho nhân viên khác
  const [applyToOthers, setApplyToOthers] = useState(false);
  const [otherEmployeeSearch, setOtherEmployeeSearch] = useState('');
  const [selectedOtherEmpIds, setSelectedOtherEmpIds] = useState<string[]>([]);
  const [isOtherEmpDropdownOpen, setIsOtherEmpDropdownOpen] = useState(false);

  // Danh sách các ngày trong tuần (ưu tiên dùng weekDays truyền từ bảng lịch làm việc)
  const activeDaysList = useMemo(() => {
    if (weekDays && weekDays.length > 0) {
      return weekDays.map((w) => ({
        key: w.key,
        label: w.label,
        date: w.dateStr || String(w.date),
        dateIso: w.dateIso || '',
      }));
    }
    return DAYS.map((d) => ({
      key: d.key,
      label: d.label,
      date: d.date,
      dateIso: '',
    }));
  }, [weekDays]);

  // Ngày bắt đầu tính toán (ISO YYYY-MM-DD)
  const calculatedStartDate: string = useMemo(() => {
    if (editingAssignment?.workDate) {
      return editingAssignment.workDate.slice(0, 10);
    }
    if (defaultStartDate) return defaultStartDate;
    const activeKey = selectedDays[0] || defaultDayOfWeek || 'T2';
    const dayObj = activeDaysList.find((d) => d.key === activeKey);
    if (dayObj && dayObj.dateIso) {
      return dayObj.dateIso;
    }
    return getVietnamTodayIso();
  }, [editingAssignment, defaultStartDate, selectedDays, defaultDayOfWeek, activeDaysList]);

  // Ngày cuối cùng của tháng sau (hiển thị khi không chọn ngày kết thúc)
  const endOfNextMonthDisplay = useMemo(() => {
    const d = new Date(calculatedStartDate);
    if (isNaN(d.getTime())) return '';
    const currentMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const daysInNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const endOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), daysInNextMonth);
    const dd = String(endOfNextMonth.getDate()).padStart(2, '0');
    const mm = String(endOfNextMonth.getMonth() + 1).padStart(2, '0');
    const yyyy = endOfNextMonth.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, [calculatedStartDate]);

  useEffect(() => {
    if (!isOpen) return;

    setSubmitError(null);
    setIsSubmitting(false);
    setHasEndDate(false);
    setEndDate('');

    if (editingAssignment) {
      setEmployeeId(editingAssignment.employeeId);
      const matchedShift = activeShifts.find(
        (s) =>
          s.id === editingAssignment.shiftId ||
          (editingAssignment.shiftName && s.name.toLowerCase().trim() === editingAssignment.shiftName.toLowerCase().trim())
      );
      if (matchedShift) {
        setSelectedShiftId(matchedShift.id);
      } else {
        setSelectedShiftId(editingAssignment.shiftId || activeShifts[0]?.id || '');
      }

      // Tìm tất cả các thứ trong tuần đã được giao ca này của nhân viên
      const empId = editingAssignment.employeeId;
      const targetShiftId = editingAssignment.shiftId;
      const targetShiftName = editingAssignment.shiftName?.toLowerCase().trim();

      const matchingAssignments = (weekAssignments || []).filter((a) => {
        if (a.employeeId !== empId) return false;
        const matchesShift =
          (targetShiftId && a.shiftId === targetShiftId) ||
          (targetShiftName && a.shiftName && a.shiftName.toLowerCase().trim() === targetShiftName);
        return matchesShift;
      });

      const assignedDays = Array.from(
        new Set(matchingAssignments.map((a) => a.dayOfWeek))
      ).filter((d): d is 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN' =>
        ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].includes(d as any)
      );

      // Đảm bảo luôn bao gồm thứ của ca hiện tại
      if (editingAssignment.dayOfWeek && !assignedDays.includes(editingAssignment.dayOfWeek)) {
        assignedDays.push(editingAssignment.dayOfWeek);
      }

      const DAY_ORDER: Record<string, number> = {
        T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6, CN: 7,
      };
      assignedDays.sort((a, b) => (DAY_ORDER[a] || 0) - (DAY_ORDER[b] || 0));

      // Khởi tạo tạm thời là không lặp lại và chỉ chọn ngày của ca hiện tại
      setSelectedDays([editingAssignment.dayOfWeek]);
      setIsRepeating(false);
      setApplyToOthers(false);
      setSelectedOtherEmpIds([]);

      // Kiểm tra xem ca làm việc này có phải là ca lặp lại tuần sau hay không
      let isSubscribed = true;
      checkIsRepeatingSchedule(editingAssignment).then((isRepeat) => {
        if (!isSubscribed) return;
        if (isRepeat) {
          setIsRepeating(true);
          setSelectedDays(assignedDays.length > 0 ? assignedDays : [editingAssignment.dayOfWeek]);
        } else {
          setIsRepeating(false);
          setSelectedDays([editingAssignment.dayOfWeek]);
        }
      });

      return () => {
        isSubscribed = false;
      };
    } else {
      if (defaultEmployeeId) {
        setEmployeeId(defaultEmployeeId);
      } else if (employees.length > 0) {
        setEmployeeId(employees[0].id);
      }
      if (defaultDayOfWeek) {
        setSelectedDays([defaultDayOfWeek]);
      } else {
        setSelectedDays(['T2']);
      }
      setIsRepeating(true);
      setSelectedShiftId(activeShifts[0]?.id || '');
      setApplyToOthers(false);
      setSelectedOtherEmpIds([]);
    }
    // Chỉ khởi tạo lại form khi mở modal hoặc chuyển đổi ca cần chỉnh sửa / mặc định
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingAssignment, defaultEmployeeId, defaultDayOfWeek]);

  // Thông tin ca hiện tại đang chọn
  const currentSelectedShift = useMemo(() => {
    return activeShifts.find((s) => s.id === selectedShiftId);
  }, [activeShifts, selectedShiftId]);

  const filteredShiftsList = useMemo(() => {
    return activeShifts
      .filter(
        (s) =>
          s.name.toLowerCase().includes(shiftSearchKeyword.toLowerCase()) ||
          s.startTime.includes(shiftSearchKeyword) ||
          s.endTime.includes(shiftSearchKeyword)
      );
  }, [activeShifts, shiftSearchKeyword]);

  // Ngày hiển thị trong popup xác nhận
  const displayDateFormatted = useMemo(() => {
    if (editingAssignment?.workDate) {
      const d = new Date(editingAssignment.workDate);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
      }
    }
    if (!editingAssignment?.dateStr) return '16/10/2026';
    const str = editingAssignment.dateStr;
    if (str.split('/').length === 3) return str;
    return `${str}/${getVietnamToday().getFullYear()}`;
  }, [editingAssignment]);

  // Tên ngày hiện tại hiển thị ở subtitle
  const currentDayInfo = useMemo(() => {
    const activeKey = selectedDays[0] || defaultDayOfWeek || 'T2';
    const dayItem = activeDaysList.find((d) => d.key === activeKey);
    if (dayItem) {
      const datePart = dayItem.date.includes('/') && dayItem.date.split('/').length === 3
        ? dayItem.date
        : dayItem.dateIso
          ? dayItem.dateIso.split('-').reverse().join('/')
          : `${dayItem.date}/${getVietnamToday().getFullYear()}`;
      return `${dayItem.label}, ${datePart}`;
    }
    return 'Thứ 2';
  }, [selectedDays, defaultDayOfWeek, activeDaysList]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp) return;

    if (currentEmp.startDate) {
      const empStartStr = currentEmp.startDate.slice(0, 10);
      if (calculatedStartDate && calculatedStartDate < empStartStr) {
        setSubmitError(
          `Không thể phân ca cho nhân viên "${currentEmp.fullName}" vào ngày ${calculatedStartDate} trước ngày bắt đầu làm việc (${empStartStr}).`
        );
        return;
      }
    }

    // Xác định thông tin ca
    const currentShift = currentSelectedShift || activeShifts.find((s) => s.id === selectedShiftId);
    if (!currentShift) {
      setSubmitError('Vui lòng chọn một ca làm việc.');
      return;
    }

    const shiftName = currentShift.name;
    const shiftTime = `${currentShift.startTime} - ${currentShift.endTime}`;
    const shiftColor = currentShift.color || '#0F766E';
    const shiftIdFinal = currentShift.id;
    const rawStartTime = currentShift.startTime || '08:00';
    const rawEndTime = currentShift.endTime || '17:00';

    const branchNameFinal =
      currentEmp?.workingBranchNames?.[0] ||
      currentEmp?.salaryBranchName ||
      branches.find((b) => b.id === currentEmpBranchId)?.name ||
      branches[0]?.name ||
      'Chi nhánh trung tâm';

    // Nếu đang ở chế độ Cập nhật ca cụ thể
    if (isEditMode && editingAssignment) {
      if (hasEndDate && !endDate) {
        setSubmitError('Vui lòng chọn ngày kết thúc khi tích chọn Có ngày kết thúc.');
        return;
      }

      if (hasEndDate && endDate && endDate < calculatedStartDate) {
        setSubmitError('Ngày kết thúc không được nhỏ hơn ngày bắt đầu.');
        return;
      }

      const activeDay = selectedDays[0] || editingAssignment.dayOfWeek;
      const dayObj = activeDaysList.find((item) => item.key === activeDay);

      // Kiểm tra trùng ca / trùng giờ / vượt 12h mỗi ngày trên tuần hiện tại trước khi cập nhật
      const daysToCheckEdit = isRepeating
        ? (selectedDays.length > 0 ? selectedDays : [activeDay])
        : [activeDay];
      const [newStartMin, newEndMin] = getShiftIntervalMinutes(rawStartTime, rawEndTime);
      const newShiftHours = currentShift.totalHours || Math.round(((newEndMin - newStartMin) / 60) * 100) / 100;

      for (const dow of daysToCheckEdit) {
        const existingOnDay = (weekAssignments || []).filter(
          (a) =>
            a.employeeId === currentEmp.id &&
            a.id !== editingAssignment.id &&
            a.status?.toLowerCase() !== 'cancelled' &&
            getScheduleDayOfWeek(a) === dow &&
            !(isRepeating && (a.shiftId === editingAssignment.shiftId || a.shiftName.toLowerCase().trim() === editingAssignment.shiftName.toLowerCase().trim()))
        );

        let totalHoursOnDay = newShiftHours;
        const dayLabel = activeDaysList.find((d) => d.key === dow)?.label || dow;

        for (const ex of existingOnDay) {
          const isSameShift =
            ex.shiftId === shiftIdFinal ||
            ex.shiftName.toLowerCase().trim() === shiftName.toLowerCase().trim();
          if (isSameShift) {
            setSubmitError(
              `Nhân viên "${currentEmp.fullName}" đã được phân ca "${ex.shiftName}" vào ${dayLabel}, không thể cập nhật trùng cùng một ca.`
            );
            return;
          }

          if (ex.shiftTime && ex.shiftTime.includes('-')) {
            const [exSt, exEt] = ex.shiftTime.split('-').map((x) => x.trim());
            const [exStartMin, exEndMin] = getShiftIntervalMinutes(exSt, exEt);
            if (newStartMin < exEndMin && newEndMin > exStartMin) {
              setSubmitError(
                `Nhân viên "${currentEmp.fullName}" bị trùng khung giờ làm việc vào ${dayLabel} giữa ca "${shiftName} (${shiftTime})" và ca "${ex.shiftName} (${ex.shiftTime})".`
              );
              return;
            }
          }

          totalHoursOnDay += getAssignmentDurationHours(ex, activeShifts);
        }

        if (totalHoursOnDay > 12) {
          setSubmitError(
            `Tổng thời gian làm việc các ca trong ${dayLabel} của nhân viên "${currentEmp.fullName}" là ${totalHoursOnDay}h, vượt quá giới hạn tối đa 12h/ngày.`
          );
          return;
        }
      }

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

      // CẬP NHẬT TRỰC TIẾP, KHÔNG HIỂN THỊ ScheduleScopeConfirmModal NỮA
      try {
        setIsSubmitting(true);
        setSubmitError(null);

        // 1. Cập nhật ca hiện tại
        if (onUpdate) {
          await onUpdate(updatedItem);
        } else if (onSave) {
          onSave([updatedItem]);
        }

        // 2. Nếu bật "Lặp lại hàng tuần", cập nhật tiếp các ca khác của nhân viên trong dải ngày
        if (isRepeating) {
          const daysToUpdate = selectedDays.length > 0 ? selectedDays : [updatedItem.dayOfWeek];

          // Xác định ngày kết thúc dải ngày:
          // Nếu có endDate cụ thể thì dùng endDate, ngược lại mặc định đến hết tháng sau
          let toDateFinal = endDate;
          if (!hasEndDate || !toDateFinal) {
            const d = new Date(calculatedStartDate);
            if (!isNaN(d.getTime())) {
              const nextMonthLastDay = new Date(d.getFullYear(), d.getMonth() + 2, 0);
              const dd = String(nextMonthLastDay.getDate()).padStart(2, '0');
              const mm = String(nextMonthLastDay.getMonth() + 1).padStart(2, '0');
              toDateFinal = `${nextMonthLastDay.getFullYear()}-${mm}-${dd}`;
            } else {
              toDateFinal = calculatedStartDate;
            }
          }

          try {
            const schedulesInRange = await scheduleApi.getSchedules({
              employeeId: currentEmp.id,
              branchId: currentEmpBranchId || undefined,
              fromDate: calculatedStartDate,
              toDate: toDateFinal,
              pageSize: 1000,
            });

            const targetShiftId = editingAssignment.shiftId;
            const targetShiftName = editingAssignment.shiftName?.toLowerCase().trim();

            const matchingOtherSchedules = schedulesInRange.filter((s) => {
              if (s.id === editingAssignment.id) return false;
              const dow = getScheduleDayOfWeek(s);
              const matchesDow = daysToUpdate.includes(dow);
              const matchesShift =
                !targetShiftId ||
                s.shiftId === targetShiftId ||
                (s.shiftName && s.shiftName.toLowerCase().trim() === targetShiftName);
              return matchesDow && matchesShift;
            });

            if (matchingOtherSchedules.length > 0) {
              const formattedStart = rawStartTime ? (rawStartTime.length === 5 ? `${rawStartTime}:00` : rawStartTime) : undefined;
              const formattedEnd = rawEndTime ? (rawEndTime.length === 5 ? `${rawEndTime}:00` : rawEndTime) : undefined;

              await Promise.allSettled(
                matchingOtherSchedules.map((s) =>
                  scheduleApi.updateSchedule(s.id, {
                    shiftName,
                    shiftConfigId: shiftIdFinal,
                    shiftCode: currentSelectedShift?.code,
                    plannedStartTime: formattedStart,
                    plannedEndTime: formattedEnd,
                  })
                )
              );
            }
          } catch (rangeErr) {
            console.warn('Lỗi khi cập nhật các ca cùng dải ngày kết thúc:', rangeErr);
          }
        }

        if (onSuccess) {
          await onSuccess('update');
        }

        onClose();
      } catch (err: any) {
        console.error('Lỗi khi cập nhật ca làm việc:', err);
        setSubmitError(err?.response?.data?.message || err?.message || 'Cập nhật ca làm việc thất bại.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Tập hợp tất cả nhân viên được áp dụng
    const targetEmpIds = [currentEmp.id];
    if (applyToOthers && selectedOtherEmpIds.length > 0) {
      targetEmpIds.push(...selectedOtherEmpIds);
    }

    if (hasEndDate && !endDate) {
      setSubmitError('Vui lòng chọn ngày kết thúc khi tích chọn Có ngày kết thúc.');
      return;
    }

    if (hasEndDate && endDate) {
      if (endDate < calculatedStartDate) {
        setSubmitError('Ngày kết thúc không được nhỏ hơn ngày bắt đầu.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const isSingleShift = !isRepeating;
      const targetRepeatDays = isSingleShift ? [selectedDays[0] || defaultDayOfWeek || 'T2'] : selectedDays;

      // Kiểm tra trùng ca, trùng khung giờ và tổng thời gian trong ngày (tối đa 12h/ngày) cho tất cả nhân viên được chọn
      const [newStartMin, newEndMin] = getShiftIntervalMinutes(rawStartTime, rawEndTime);
      const newShiftHours = currentShift.totalHours || Math.round(((newEndMin - newStartMin) / 60) * 100) / 100;

      for (const empIdToCheck of targetEmpIds) {
        const empObj = employees.find((e) => e.id === empIdToCheck) || currentEmp;
        for (const dow of targetRepeatDays) {
          const existingOnDay = (weekAssignments || []).filter(
            (a) =>
              a.employeeId === empIdToCheck &&
              a.status?.toLowerCase() !== 'cancelled' &&
              getScheduleDayOfWeek(a) === dow
          );

          let totalHoursOnDay = newShiftHours;
          const dayInfoObj = activeDaysList.find((d) => d.key === dow);
          const dayLabel = dayInfoObj ? `${dayInfoObj.label} (${dayInfoObj.date})` : dow;

          for (const ex of existingOnDay) {
            const isSameShift =
              ex.shiftId === shiftIdFinal ||
              ex.shiftName.toLowerCase().trim() === shiftName.toLowerCase().trim();
            if (isSameShift) {
              setSubmitError(
                `Nhân viên "${empObj.fullName}" đã có ca "${ex.shiftName}" vào ${dayLabel}, không thể thêm trùng cùng một ca.`
              );
              setIsSubmitting(false);
              return;
            }

            if (ex.shiftTime && ex.shiftTime.includes('-')) {
              const [exSt, exEt] = ex.shiftTime.split('-').map((x) => x.trim());
              const [exStartMin, exEndMin] = getShiftIntervalMinutes(exSt, exEt);
              if (newStartMin < exEndMin && newEndMin > exStartMin) {
                setSubmitError(
                  `Nhân viên "${empObj.fullName}" bị trùng khung giờ làm việc vào ${dayLabel} giữa ca "${shiftName} (${shiftTime})" và ca "${ex.shiftName} (${ex.shiftTime})".`
                );
                setIsSubmitting(false);
                return;
              }
            }

            totalHoursOnDay += getAssignmentDurationHours(ex, activeShifts);
          }

          if (totalHoursOnDay > 12) {
            setSubmitError(
              `Tổng thời gian các ca trong ngày ${dayLabel} của nhân viên "${empObj.fullName}" là ${totalHoursOnDay}h, vượt quá giới hạn tối đa 12h/ngày.`
            );
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Gọi API khởi tạo ca làm việc từ Backend (khi tắt lặp lại -> hasEndDate=true và endDate=startDate để chỉ tạo đúng 1 ca)
      const payload: CreateRecurringSchedulePayload = {
        employeeId: currentEmp.id,
        branchId: currentEmpBranchId || branches[0]?.id || '',
        startDate: calculatedStartDate,
        hasEndDate: isSingleShift ? true : (hasEndDate && !!endDate),
        endDate: isSingleShift ? calculatedStartDate : (hasEndDate && endDate ? endDate : null),
        repeatDays: targetRepeatDays,
        additionalEmployeeIds: applyToOthers && selectedOtherEmpIds.length > 0 ? selectedOtherEmpIds : [],
        shiftConfigId: shiftIdFinal,
        shiftCode: currentShift.code,
        shiftName: shiftName,
        plannedStartTime: rawStartTime ? (rawStartTime.length === 5 ? `${rawStartTime}:00` : rawStartTime) : undefined,
        plannedEndTime: rawEndTime ? (rawEndTime.length === 5 ? `${rawEndTime}:00` : rawEndTime) : undefined,
        durationHours: currentShift.totalHours,
        isCheckInNextDay: rawEndTime <= rawStartTime,
      };

      const resultAssignments = await scheduleApi.createRecurringSchedule(payload);

      if (onSuccess) {
        await onSuccess();
      }
      if (onSave) {
        onSave(resultAssignments);
      }

      onClose();
    } catch (err: any) {
      console.error('Lỗi khởi tạo ca làm việc:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể khởi tạo ca làm việc. Vui lòng kiểm tra lại thời gian ca.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
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
              {!isEditMode ? (
                <select
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    setSubmitError(null);
                  }}
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

                    {currentSelectedShift ? (
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
                        Tìm thấy {filteredShiftsList.length} ca làm việc
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

                      {!filteredShiftsList.length && (
                        <div style={{ padding: '16px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                          Không tìm thấy ca làm việc nào phù hợp
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (!checked) {
                        setSelectedDays([selectedDays[0] || defaultDayOfWeek || 'T2']);
                        setHasEndDate(false);
                        setEndDate('');
                      }
                    }}
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
              <div style={{ fontSize: 12, color: isRepeating ? '#64748B' : '#0F766E', marginTop: 2, fontWeight: isRepeating ? 400 : 600 }}>
                {isRepeating
                  ? isEditMode
                    ? 'Lịch làm việc sẽ được cập nhật lặp lại vào các ngày được chọn từ tuần này trở đi'
                    : 'Lịch làm việc sẽ được tự động lặp lại vào các ngày trong tuần'
                  : isEditMode
                    ? '✓ Chỉ cập nhật duy nhất ca làm việc này (không ảnh hưởng các tuần sau)'
                    : '✓ Chế độ chỉ tạo 1 ca duy nhất vào ngày được chọn'}
              </div>

              {isRepeating && (
                <div style={{ marginTop: 14 }}>
                  {/* Danh sách các nút ngày */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {activeDaysList.map((d) => {
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
                      {selectedDays.length === activeDaysList.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: '#475569', marginTop: 8, fontStyle: 'italic' }}>
                    {repeatSummaryText}
                  </div>

                  {/* Tùy chọn Có ngày kết thúc */}
                  <div
                    style={{
                      marginTop: 14,
                      padding: '12px 14px',
                      background: '#F8FAFC',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={hasEndDate}
                          onChange={(e) => {
                            setHasEndDate(e.target.checked);
                            if (!e.target.checked) setEndDate('');
                          }}
                          style={{ width: 16, height: 16, accentColor: '#0F766E', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                          Có ngày kết thúc
                        </span>
                      </label>

                      {hasEndDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, color: '#64748B' }}>Đến ngày:</span>
                          <input
                            type="date"
                            value={endDate}
                            min={calculatedStartDate}
                            onChange={(e) => {
                              setEndDate(e.target.value);
                              setSubmitError(null);
                            }}
                            className="emp-form-input"
                            style={{ height: 32, width: 150, fontSize: 13 }}
                            required={hasEndDate}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, lineHeight: '18px' }}>
                      {hasEndDate && endDate ? (
                        <div style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                          Có ngày kết thúc: Hệ thống sẽ tạo lịch đến ngày <strong>{endDate.split('-').reverse().join('/')}</strong>.
                        </div>
                      ) : (
                        <div style={{ color: '#0F766E', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F766E', display: 'inline-block' }} />
                          Không kết thúc: Hệ thống sẽ tự động tạo lịch đến hết tháng hiện tại và tháng sau (đến ngày <strong>{endOfNextMonthDisplay}</strong>).
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── SECTION 3: THÊM LỊCH TƯƠNG TỰ CHO NHÂN VIÊN KHÁC (Chỉ hiển thị khi thêm mới, không hiển thị khi cập nhật) ─── */}
            {!isEditMode && (
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
            )}

            {/* Hiển thị lỗi nếu có từ backend */}
            {submitError && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <span>{submitError}</span>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#991B1B',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  &times;
                </button>
              </div>
            )}
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
            {isEditMode && onDelete && (!editingAssignment || !isLeaveSchedule(editingAssignment)) && (
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
                disabled={isSubmitting}
                style={{ minWidth: 80, height: 36, fontSize: 13 }}
              >
                Bỏ qua
              </button>
              <button
                type="submit"
                className="emp-btn emp-btn-primary"
                disabled={isSubmitting}
                style={{
                  minWidth: 80,
                  height: 36,
                  fontSize: 13,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Lưu'}
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
        employeeId={currentEmp?.id || editingAssignment?.employeeId}
        branchId={currentEmpBranchId || editingAssignment?.branchId}
        shiftId={editingAssignment?.shiftId}
        shiftName={editingAssignment?.shiftName}
        dayOfWeek={editingAssignment?.dayOfWeek}
        dateStr={displayDateFormatted}
        startDateStr={displayDateFormatted}
        selectedDays={isRepeating ? selectedDays : [selectedDays[0] || (editingAssignment?.dayOfWeek || 'T2')]}
        onConfirm={async (scope, dateRange) => {
          if (editingAssignment) {
            try {
              setIsSubmitting(true);
              setSubmitError(null);

              if (onDelete) {
                await onDelete(editingAssignment.id, scope, dateRange);
              } else {
                if (scope === 'entire') {
                  const rawList = await scheduleApi.getRawSchedules({
                    employeeId: editingAssignment.employeeId,
                    pageSize: 1000,
                  });

                  const deletable = rawList.filter((s) => isScheduleDeletable(s));

                  if (deletable.length > 0) {
                    await Promise.allSettled(
                      deletable.map((s) => scheduleApi.deleteSchedule(s.id))
                    );
                  }
                } else {
                  // 1. Xóa ca hiện tại nếu không phải ca nghỉ phép / đã chấm công
                  if (isScheduleDeletable(editingAssignment)) {
                    await scheduleApi.deleteSchedule(editingAssignment.id);
                  }

                  // 2. Nếu chọn scope Following hoặc All: xóa các ca khớp phạm vi (bỏ qua ca nghỉ phép và đã chấm công)
                  if ((scope === 'following' || scope === 'all') && dateRange?.fromDate && dateRange?.toDate) {
                    const daysToDelete = isRepeating ? selectedDays : [selectedDays[0] || editingAssignment.dayOfWeek];
                    const targetShiftNameLower = (editingAssignment.shiftName || '').toLowerCase().trim();

                    const schedulesInRange = await scheduleApi.getSchedules({
                      employeeId: editingAssignment.employeeId,
                      fromDate: dateRange.fromDate,
                      toDate: dateRange.toDate,
                      pageSize: 1000,
                    });

                    const matchingOther = schedulesInRange.filter((s) => {
                      if (s.id === editingAssignment.id) return false;
                      if (!isScheduleDeletable(s)) return false;
                      const dow = getScheduleDayOfWeek(s);
                      const matchesDow = !daysToDelete.length || daysToDelete.includes(dow);
                      const matchesShift =
                        !targetShiftNameLower ||
                        (s.shiftName && s.shiftName.toLowerCase().trim() === targetShiftNameLower) ||
                        s.shiftId === editingAssignment.shiftId;
                      return matchesDow && matchesShift;
                    });

                    if (matchingOther.length > 0) {
                      await Promise.allSettled(
                        matchingOther.map((s) => scheduleApi.deleteSchedule(s.id))
                      );
                    }
                  }
                }

                if (onSuccess) {
                  await onSuccess('delete');
                }
              }

              setShowScopeModal(false);
              onClose();
            } catch (err: any) {
              console.error('Lỗi khi xóa ca theo phạm vi:', err);
              setSubmitError(err?.response?.data?.message || err?.message || 'Xóa ca làm việc thất bại.');
            } finally {
              setIsSubmitting(false);
            }
          }
          setShowScopeModal(false);
        }}
      />
    </div>
  );
};
