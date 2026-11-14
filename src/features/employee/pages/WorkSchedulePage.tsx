import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  User,
  RefreshCw,
  RotateCw,
  Building2,
  CalendarX,
  ArrowLeftRight,
  Clock,
  History,
  Edit3,
  LogIn,
  LogOut,
  X,
} from 'lucide-react';
import type {
  Employee,
  EmployeeStatus,
  WorkShiftDefinition,
  ScheduleAssignment,
  DebtTransaction,
  Branch,
} from '../types';
import { AddScheduleModal } from '../components/work-schedule/AddScheduleModal';
import { EmployeeDetailModal } from '../components/employee-list/EmployeeDetailModal';
import { ShiftConfigModal } from '../components/shift-config/ShiftConfigModal';
import {
  ScheduleScopeConfirmModal,
  type ScheduleScopeType,
  type ScheduleScopeDateRange,
} from '../components/work-schedule/ScheduleScopeConfirmModal';
import { TablePagination, NotificationModal } from '../../../components/common';
import { CreateScheduleRequestModal } from '../components/approval-requests/CreateScheduleRequestModal';
import { ScheduleRequestsHistoryModal } from '../components/approval-requests/ScheduleRequestsHistoryModal';
import { ScheduleRequestType } from '../types/scheduleApprovalTypes';
import { employeeApi } from '../api/employeeApi';
import { shiftConfigApi, type ShiftConfigDto } from '../api/shiftConfigApi';
import { scheduleApi, getShiftColor, isLeaveSchedule, isScheduleDeletable } from '../api/scheduleApi';
import { getVietnamToday, matchesAnyVietnameseSearch } from '../lib/vietnamTime';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../employee.css';

const getWeekDates = (offsetWeeks: number) => {
  // Mốc mặc định: Thứ Hai của tuần hiện tại theo múi giờ Việt Nam (UTC+7)
  const now = getVietnamToday();
  const currentDay = now.getDay();
  const distanceToMonday = (currentDay + 6) % 7;
  const baseMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

  const monday = new Date(baseMonday);
  monday.setDate(baseMonday.getDate() + offsetWeeks * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fromDd = String(monday.getDate()).padStart(2, '0');
  const fromMm = String(monday.getMonth() + 1).padStart(2, '0');
  const fromYyyy = monday.getFullYear();

  const toDd = String(sunday.getDate()).padStart(2, '0');
  const toMm = String(sunday.getMonth() + 1).padStart(2, '0');
  const toYyyy = sunday.getFullYear();

  // Hiển thị dải ngày từ Thứ Hai đến Chủ Nhật trong tuần
  const label = `${fromDd}/${fromMm}/${fromYyyy} - ${toDd}/${toMm}/${toYyyy}`;

  const dayKeys: Array<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'> = [
    'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN',
  ];
  const dayNames = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];

  const days = dayKeys.map((key, index) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + index);
    const isToday =
      cur.getFullYear() === now.getFullYear() &&
      cur.getMonth() === now.getMonth() &&
      cur.getDate() === now.getDate();

    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const dateIso = `${yyyy}-${mm}-${dd}`;
    const dateDisplay = `${dd}/${mm}`;

    return {
      key,
      label: dayNames[index],
      date: cur.getDate(),
      dateStr: dateDisplay,
      dateIso,
      isToday,
      fullDate: cur,
    };
  });

  const fromDateIso = `${fromYyyy}-${fromMm}-${fromDd}`;
  const toDateIso = `${toYyyy}-${toMm}-${toDd}`;

  return { label, days, monday, sunday, fromDateIso, toDateIso };
};

const ACTIVE_BRANCH_STORAGE_KEY = 'mtgrms_active_branch';

export const WorkSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const location = useLocation();
  const roleUpper = (user?.role || '').toUpperCase();
  const isEmployeePortal = location.pathname.startsWith('/employee/') || location.pathname === '/employee';
  const isStoreOwnerOrAdmin =
    Boolean(user?.isAdmin) ||
    roleUpper === 'STORE_OWNER' ||
    roleUpper === 'STOREOWNER' ||
    roleUpper === 'ADMIN';

  const isEmployeeRole =
    isEmployeePortal ||
    (!isStoreOwnerOrAdmin && (roleUpper === 'STAFF' || roleUpper === 'EMPLOYEE' || roleUpper === 'CASHIER'));

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShiftDefinition[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Lắng nghe thay đổi chi nhánh từ StoreOwnerLayout (BranchSelectorDropdown)
  const [activeBranch, setActiveBranch] = useState<{ id: string; name: string } | null>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    const handleBranchChanged = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        setActiveBranch(customEvent.detail);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_BRANCH_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setActiveBranch(parsed);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleBranchChanged);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleBranchChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Mặc định: Nhân viên (Staff) xem theo ca ('by_shift'), Chủ cửa hàng xem theo nhân viên ('by_employee')
  const [viewMode, setViewMode] = useState<'by_employee' | 'by_shift'>(() =>
    isEmployeeRole ? 'by_shift' : 'by_employee'
  );

  useEffect(() => {
    if (isEmployeeRole) {
      setViewMode('by_shift');
    }
  }, [isEmployeeRole]);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [shiftCurrentPage, setShiftCurrentPage] = useState<number>(1);
  const [shiftPageSize, setShiftPageSize] = useState<number>(10);

  const weekData = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const DAYS_HEADER = weekData.days;

  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);
  const handleCurrentWeek = () => setWeekOffset(0);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [requestModalSchedule, setRequestModalSchedule] = useState<{
    id: string;
    workDate: string;
    shiftName: string;
    branchId: string;
    plannedStartTime: string;
    plannedEndTime: string;
    employeeId: string;
  } | null>(null);
  const [requestModalInitialType, setRequestModalInitialType] = useState<ScheduleRequestType>(ScheduleRequestType.LeaveRequest);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [historyModalScheduleId, setHistoryModalScheduleId] = useState<string | null>(null);
  const [historyModalTitle, setHistoryModalTitle] = useState<string>('');

  const handleOpenCreateRequest = (
    item: ScheduleAssignment,
    defaultType: ScheduleRequestType = ScheduleRequestType.LeaveRequest
  ) => {
    setRequestModalSchedule({
      id: item.id,
      workDate: item.workDate || item.dateStr || '',
      shiftName: item.shiftName,
      branchId: item.branchId || branches[0]?.id || '',
      plannedStartTime: item.shiftTime?.split('-')?.[0]?.trim() || '08:00',
      plannedEndTime: item.shiftTime?.split('-')?.[1]?.trim() || '12:00',
      employeeId: item.employeeId,
    });
    setRequestModalInitialType(defaultType);
    setShowCreateRequestModal(true);
  };

  const handleOpenHistory = (item: ScheduleAssignment) => {
    setHistoryModalScheduleId(item.id);
    setHistoryModalTitle(`${item.shiftName} (${item.shiftTime}) - ${item.employeeName}`);
  };

  const [openMenuScheduleId, setOpenMenuScheduleId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  } | null>(null);

  useEffect(() => {
    const handleGlobalClose = () => {
      setOpenMenuScheduleId(null);
      setMenuPosition(null);
    };
    window.addEventListener('click', handleGlobalClose);
    window.addEventListener('scroll', handleGlobalClose, true);
    window.addEventListener('resize', handleGlobalClose);
    return () => {
      window.removeEventListener('click', handleGlobalClose);
      window.removeEventListener('scroll', handleGlobalClose, true);
      window.removeEventListener('resize', handleGlobalClose);
    };
  }, []);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<ScheduleAssignment | null>(null);
  const [showShiftConfigModal, setShowShiftConfigModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>();
  const [selectedDay, setSelectedDay] = useState<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN' | undefined>();

  // State mở Modal chi tiết nhân viên (chuyên tab Lịch làm việc)
  const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<Employee | null>(null);

  // Thông báo NotificationModal
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  // 1. Tải danh mục Chi nhánh (chạy 1 lần khi trang được nạp)
  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      try {
        const branchList = await employeeApi.getBranches();
        if (isMounted) {
          setBranches(branchList || []);
        }
      } catch {
        if (isMounted) setBranches([]);
      }
    };
    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tải danh mục Nhân viên & Cấu hình ca làm việc theo Chi nhánh được chọn
  const fetchEmployeesAndShifts = useCallback(async () => {
    try {
      const branchParam =
        activeBranch && activeBranch.id !== 'ALL' ? activeBranch.id : undefined;

      const [empResult, shiftResult] = await Promise.allSettled([
        isEmployeeRole
          ? Promise.resolve({ items: [] })
          : employeeApi.getEmployeesPaged({
            branchId: branchParam,
            pageSize: 200,
          }),
        shiftConfigApi.getShiftConfigsPaged({
          branchId: branchParam,
          pageSize: 100,
          isActive: true,
        }),
      ]);

      if (isEmployeeRole) {
        let profile: Employee | null = null;
        try {
          profile = await employeeApi.getMyProfile();
        } catch {
          // ignore
        }

        if (profile) {
          setEmployees([profile]);
        } else {
          const myEmp: Employee = {
            id: user?.id || 'emp-me',
            employeeCode: user?.email ? user.email.split('@')[0].toUpperCase() : 'NV_ME',
            fullName: user?.fullName || 'Tôi',
            email: user?.email || '',
            phone: user?.phone || '',
            workingBranchIds: user?.branchId ? [user.branchId] : [],
            workingBranchNames: [],
            salaryBranchId: user?.branchId || '',
            status: 'active',
            debtAmount: 0,
          };
          setEmployees([myEmp]);
        }
      } else if (empResult.status === 'fulfilled' && (empResult.value as any)?.items) {
        setEmployees((empResult.value as any).items);
      } else {
        setEmployees([]);
      }

      if (shiftResult.status === 'fulfilled' && shiftResult.value?.items) {
        const mapped: WorkShiftDefinition[] = shiftResult.value.items.map((c: ShiftConfigDto) => ({
          id: c.id,
          name: c.shiftName,
          startTime: (c.startTime || '00:00').substring(0, 5),
          endTime: (c.endTime || '00:00').substring(0, 5),
          totalHours: c.durationHours,
          checkInAllowance: `${(c.startTime || '00:00').substring(0, 5)} - ${(c.endTime || '00:00').substring(0, 5)}`,
          color: getShiftColor(c.shiftName),
          status: c.isActive ? ('active' as const) : ('inactive' as const),
          branchId: c.branchId,
          branchName: c.branchName || undefined,
          branchIds: c.branchIds || (c.branchId ? [c.branchId] : []),
          branchNames: c.branchNames || (c.branchName ? [c.branchName] : []),
        }));
        setShifts(mapped);
      } else {
        setShifts([]);
      }
    } catch {
      setEmployees([]);
      setShifts([]);
    }
  }, [activeBranch, isEmployeeRole, user]);

  useEffect(() => {
    fetchEmployeesAndShifts();
  }, [fetchEmployeesAndShifts]);

  // 3. Tải lịch làm việc thực tế từ Backend theo dải ngày tuần và chi nhánh
  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchParam =
        activeBranch && activeBranch.id !== 'ALL' ? activeBranch.id : undefined;

      let data: ScheduleAssignment[] = [];
      if (isEmployeeRole) {
        data = await scheduleApi.getMySchedules(weekData.fromDateIso, weekData.toDateIso);
        if (data.length > 0 && data[0].employeeId) {
          const actualEmpId = data[0].employeeId;
          setEmployees((prev) => {
            if (prev.length === 1 && prev[0].id !== actualEmpId) {
              return [{
                ...prev[0],
                id: actualEmpId,
                employeeCode: data[0].employeeCode || prev[0].employeeCode,
                fullName: data[0].employeeName || prev[0].fullName,
              }];
            }
            return prev;
          });
        }

        // Tự động bổ sung các ca có trong lịch cá nhân nếu danh mục ca chưa có
        if (data.length > 0) {
          setShifts((prevShifts) => {
            const existingKeys = new Set(prevShifts.map((s) => s.id));
            const existingNames = new Set(prevShifts.map((s) => s.name.toLowerCase()));
            const newShifts: WorkShiftDefinition[] = [];

            data.forEach((item) => {
              const shiftKey = item.shiftId || item.shiftName;
              if (
                shiftKey &&
                !existingKeys.has(shiftKey) &&
                !existingNames.has(item.shiftName.toLowerCase())
              ) {
                const parts = (item.shiftTime || '').split('-');
                const startTime = parts[0]?.trim() || '00:00';
                const endTime = parts[1]?.trim() || '00:00';
                newShifts.push({
                  id: shiftKey,
                  name: item.shiftName || 'Ca làm việc',
                  startTime,
                  endTime,
                  totalHours: 8,
                  checkInAllowance: '15 phút',
                  color: item.shiftColor || getShiftColor(item.shiftName),
                  status: 'active',
                  branchId: item.branchId,
                  branchName: item.branchName,
                });
                existingKeys.add(shiftKey);
                existingNames.add(item.shiftName.toLowerCase());
              }
            });

            return newShifts.length > 0 ? [...prevShifts, ...newShifts] : prevShifts;
          });
        }
      } else {
        data = await scheduleApi.getSchedules({
          fromDate: weekData.fromDateIso,
          toDate: weekData.toDateIso,
          branchId: branchParam,
          pageSize: 500,
        });
      }

      const filteredData =
        !isEmployeeRole && activeBranch && activeBranch.id !== 'ALL'
          ? data.filter(
            (item) => item.branchId === activeBranch.id
          )
          : data;

      setAssignments(filteredData);
    } catch (err: any) {
      console.error('Lỗi tải lịch làm việc từ backend:', err);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  }, [weekData.fromDateIso, weekData.toDateIso, activeBranch, isEmployeeRole]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Xử lý làm mới toàn bộ dữ liệu theo chi nhánh và tuần hiện tại
  const handleRefresh = async () => {
    await Promise.allSettled([fetchEmployeesAndShifts(), fetchSchedules()]);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      // 1. Tìm kiếm theo từ khóa (tên hoặc mã nhân viên - không phân biệt dấu/hoa-thường)
      const matchesKeyword = matchesAnyVietnameseSearch(
        [e.fullName, e.employeeCode],
        searchEmployee
      );

      if (!matchesKeyword) return false;

      // 2. Lọc theo chi nhánh được chọn từ dropdown (chỉ áp dụng cho Owner)
      if (!isEmployeeRole && activeBranch && activeBranch.id !== 'ALL') {
        const matchesSalaryBranch =
          e.salaryBranchId && e.salaryBranchId === activeBranch.id;
        const matchesWorkingBranch =
          Array.isArray(e.workingBranchIds) &&
          e.workingBranchIds.includes(activeBranch.id);
        const hasAssignment = assignments.some(
          (a) =>
            a.employeeId === e.id &&
            (!a.branchId || a.branchId === activeBranch.id)
        );

        return matchesSalaryBranch || matchesWorkingBranch || hasAssignment;
      }

      return true;
    });
  }, [employees, searchEmployee, activeBranch, assignments, isEmployeeRole]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const filteredShifts = useMemo(() => {
    let list = shifts;
    if (!isEmployeeRole && activeBranch && activeBranch.id !== 'ALL') {
      list = list.filter((s) => {
        if (s.id === 'custom') return true;
        if (!s.branchId && (!s.branchIds || s.branchIds.length === 0)) return true;
        const shiftBranchIds =
          s.branchIds && s.branchIds.length > 0
            ? s.branchIds
            : s.branchId
              ? [s.branchId]
              : [];
        return shiftBranchIds.includes(activeBranch.id);
      });
    }
    if (searchEmployee.trim()) {
      list = list.filter((s) =>
        matchesAnyVietnameseSearch([s.name, s.code], searchEmployee)
      );
    }
    return list;
  }, [shifts, activeBranch, isEmployeeRole, searchEmployee]);

  const paginatedShifts = useMemo(() => {
    const start = (shiftCurrentPage - 1) * shiftPageSize;
    return filteredShifts.slice(start, start + shiftPageSize);
  }, [filteredShifts, shiftCurrentPage, shiftPageSize]);

  // Reset page khi tìm kiếm, đổi chi nhánh hoặc chuyển tuần
  useEffect(() => {
    setCurrentPage(1);
    setShiftCurrentPage(1);
  }, [searchEmployee, activeBranch, weekOffset]);

  const handleOpenCell = (empId: string, day: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN') => {
    if (isEmployeeRole) return;
    setSelectedEmpId(empId);
    setSelectedDay(day);
    setEditingAssignment(null);
    setShowAddModal(true);
  };

  const handleEditAssignment = (assignment: ScheduleAssignment) => {
    if (isEmployeeRole) return;
    setSelectedEmpId(assignment.employeeId);
    setSelectedDay(assignment.dayOfWeek);
    setEditingAssignment(assignment);
    setShowAddModal(true);
  };

  // 3. Làm mới danh sách phân ca sau khi thêm thành công
  const handleSaveAssignments = async (_newItems?: ScheduleAssignment[]) => {
    await fetchSchedules();
  };

  // 4. Cập nhật ca làm việc trên Backend
  const handleUpdateAssignment = async (updated: ScheduleAssignment) => {
    try {
      const parts = (updated.shiftTime || '').split('-');
      const rawStart = parts[0]?.trim();
      const rawEnd = parts[1]?.trim();
      const startTime = rawStart ? (rawStart.length === 5 ? `${rawStart}:00` : rawStart) : undefined;
      const endTime = rawEnd ? (rawEnd.length === 5 ? `${rawEnd}:00` : rawEnd) : undefined;

      const matchingShift = shifts.find(
        (s) => s.id === updated.shiftId || s.name.toLowerCase() === updated.shiftName.toLowerCase()
      );
      const shiftConfigId =
        matchingShift && matchingShift.id !== 'custom'
          ? matchingShift.id
          : updated.shiftId && updated.shiftId !== 'custom'
            ? updated.shiftId
            : undefined;

      await scheduleApi.updateSchedule(updated.id, {
        shiftName: updated.shiftName,
        shiftConfigId,
        plannedStartTime: startTime,
        plannedEndTime: endTime,
      });

      await fetchSchedules();
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: 'Cập nhật ca làm việc thành công.',
      });
    } catch (err: any) {
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi cập nhật',
        message: err?.response?.data?.message || err?.message || 'Cập nhật ca làm việc thất bại.',
      });
    }
  };

  const handleDeleteAssignment = (assignId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = assignments.find((a) => a.id === assignId);
    if (!item) return;
    if (isLeaveSchedule(item)) {
      setNotificationModal({
        isOpen: true,
        type: 'warning',
        title: 'Không thể xóa ca nghỉ phép',
        message: 'Ca làm việc đang ở trạng thái nghỉ phép (nghỉ phép có lương hoặc không lương) không được phép xóa.',
      });
      return;
    }
    setDeletingAssignment(item);
  };

  // 5. Hàm thực thi xóa ca làm việc trên Backend theo phạm vi
  const executeDeleteSchedule = async (
    target: ScheduleAssignment,
    scope?: ScheduleScopeType,
    dateRange?: ScheduleScopeDateRange
  ) => {
    try {
      setIsLoading(true);

      // TRƯỜNG HỢP 4: scope === 'entire' -> Xóa toàn bộ ca của nhân viên (trừ ca đã chấm công / nghỉ phép)
      if (scope === 'entire') {
        try {
          const rawList = await scheduleApi.getRawSchedules({
            employeeId: target.employeeId,
            pageSize: 1000,
          });

          // Lọc ra các ca chưa có dữ liệu chấm công, chưa hoàn thành và không phải ca nghỉ phép (có lương / không lương)
          const deletable = rawList.filter((s) => isScheduleDeletable(s));

          if (deletable.length > 0) {
            await Promise.allSettled(
              deletable.map((s) =>
                scheduleApi.deleteSchedule(s.id).catch((err) => {
                  console.warn(`Lỗi xóa ca ${s.id}:`, err);
                })
              )
            );
          }

          await fetchSchedules();
          setNotificationModal({
            isOpen: true,
            type: 'success',
            title: 'Thành công',
            message: `Đã xóa toàn bộ ${deletable.length} ca làm việc chưa chấm công của nhân viên. Các ca đã có dữ liệu chấm công hoặc nghỉ phép được giữ nguyên.`,
          });
          return true;
        } catch (entireErr: any) {
          console.error('Lỗi khi xóa toàn bộ ca:', entireErr);
          setNotificationModal({
            isOpen: true,
            type: 'error',
            title: 'Lỗi xóa ca',
            message: entireErr?.response?.data?.message || entireErr?.message || 'Không thể xóa toàn bộ ca làm việc.',
          });
          return false;
        }
      }

      // Chặn xóa ca hiện tại nếu là ca nghỉ phép (có lương hoặc không lương)
      if (isLeaveSchedule(target)) {
        if (!scope || scope === 'single') {
          setNotificationModal({
            isOpen: true,
            type: 'warning',
            title: 'Không thể xóa ca nghỉ phép',
            message: 'Ca làm việc đang ở trạng thái nghỉ phép (nghỉ phép có lương hoặc không lương) không được phép xóa.',
          });
          return false;
        }
      } else if (isScheduleDeletable(target)) {
        await scheduleApi.deleteSchedule(target.id);
      }

      // Nếu người dùng chọn Option 2 (following) hoặc Option 3 (all), fetch và xóa các ca cùng phạm vi (bỏ qua ca nghỉ phép và ca đã chấm công)
      if ((scope === 'following' || scope === 'all') && dateRange?.fromDate && dateRange?.toDate) {
        try {
          const schedulesInRange = await scheduleApi.getSchedules({
            employeeId: target.employeeId,
            fromDate: dateRange.fromDate,
            toDate: dateRange.toDate,
            pageSize: 1000,
          });

          const targetDow = target.dayOfWeek;
          const targetShiftId = target.shiftId;
          const targetShiftName = target.shiftName?.toLowerCase().trim();

          const DAY_MAP: Record<number, string> = {
            0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7'
          };

          const otherMatching = schedulesInRange.filter((s) => {
            if (s.id === target.id) return false;
            if (!isScheduleDeletable(s)) return false;
            const dow = s.dayOfWeek || (s.workDate ? DAY_MAP[new Date(s.workDate).getDay()] : undefined);
            const matchesDow = !targetDow || dow === targetDow;
            const matchesShift = !targetShiftId || s.shiftId === targetShiftId || (s.shiftName && s.shiftName.toLowerCase().trim() === targetShiftName);
            return matchesDow && matchesShift;
          });

          if (otherMatching.length > 0) {
            await Promise.allSettled(
              otherMatching.map((s) =>
                scheduleApi.deleteSchedule(s.id).catch((err) => {
                  console.warn(`Lỗi xóa ca ${s.id}:`, err);
                })
              )
            );
          }
        } catch (fetchErr) {
          console.warn('Lỗi khi fetch và xóa các ca theo phạm vi:', fetchErr);
        }
      }

      await fetchSchedules();
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: 'Đã xóa ca làm việc thành công.',
      });
      return true;
    } catch (err: any) {
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi xóa ca',
        message: err?.response?.data?.message || err?.message || 'Không thể xóa ca làm việc.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async (scope?: ScheduleScopeType, dateRange?: ScheduleScopeDateRange) => {
    if (!deletingAssignment) return;
    const target = deletingAssignment;
    setDeletingAssignment(null);
    await executeDeleteSchedule(target, scope, dateRange);
  };

  const handleDeleteFromModal = async (
    assignmentId: string,
    scope?: ScheduleScopeType,
    dateRange?: ScheduleScopeDateRange
  ) => {
    const target = editingAssignment || assignments.find((a) => a.id === assignmentId);
    if (target) {
      await executeDeleteSchedule(target, scope, dateRange);
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

  return (
    <div className="emp-page-container">
      {/* ─── HEADER BAR ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 className="emp-header-title" style={{ margin: 0 }}>
            <span>Lịch làm việc</span>
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Tải lại dữ liệu"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
            <span>Tải lại</span>
          </button>

          {!isEmployeeRole && (
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 12px',
                fontSize: 13,
                fontWeight: 600,
                color: '#0F766E',
                borderColor: '#99F6E4',
                backgroundColor: '#F0FDFA',
                cursor: 'pointer',
                borderRadius: 8,
                transition: 'all 0.15s ease',
              }}
              onClick={() => {
                const branchParam = activeBranch && activeBranch.id !== 'ALL' ? activeBranch.id : (branches[0]?.id || '');
                navigate(branchParam ? `/store-owner/shifts?branchId=${branchParam}` : '/store-owner/shifts');
              }}
              title="Xem nhật ký lịch sử ca bán hàng và bàn giao quầy thu ngân"
            >
              <Clock size={15} />
              <span>Lịch sử giao ca</span>
            </button>
          )}

          {!isEmployeeRole && (
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
              <Plus size={16} />
              <span>Phân ca</span>
            </button>
          )}
        </div>
      </div>
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* 1. Thanh tìm kiếm (Chỉ hiển thị cho Store Owner / Admin) */}
          {!isEmployeeRole && (
            <div className="emp-search-box" style={{ width: 280, position: 'relative' }}>
              <span className="emp-search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder={
                  viewMode === 'by_employee'
                    ? 'Tìm theo mã, tên NV...'
                    : 'Tìm theo tên, mã ca...'
                }
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                style={{ paddingRight: searchEmployee ? 36 : 16 }}
              />
              {searchEmployee && (
                <button
                  type="button"
                  onClick={() => setSearchEmployee('')}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 2,
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                  title="Xóa tìm kiếm"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Lọc Chi nhánh làm việc (Chỉ dành cho Quản lý / StoreOwner) */}
          {!isEmployeeRole && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 40,
                padding: '0 14px',
                borderRadius: 8,
                background: '#F0FDFA',
                border: '1px solid #99F6E4',
                color: '#0F766E',
                fontSize: 13,
                fontWeight: 500,
              }}
              title="Chi nhánh được đồng bộ trực tiếp từ bộ chọn chi nhánh của hệ thống ở thanh điều hướng trên cùng"
            >
              <Building2 size={16} color="#0F766E" />
              <span>
                Chi nhánh:{' '}
                <strong style={{ fontWeight: 600 }}>
                  {activeBranch?.name || 'Tất cả chi nhánh'}
                </strong>
              </span>
            </div>
          )}

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

          {/* Nút Tuần này */}
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={handleCurrentWeek}
            title="Quay về tuần hiện tại (Thứ Hai - Chủ Nhật)"
            style={{
              height: 36,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 500,
              color: weekOffset === 0 ? '#0F766E' : '#475569',
              borderColor: weekOffset === 0 ? '#0F766E' : '#CBD5E1',
              backgroundColor: weekOffset === 0 ? '#F0FDFA' : '#FFFFFF',
              boxShadow: weekOffset === 0 ? '0 0 0 1px rgba(15, 118, 110, 0.2)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Tuần này
          </button>

          {/* Nút Đặt lại bộ lọc */}
          {(() => {
            const hasActiveFilters =
              (!isEmployeeRole && Boolean(searchEmployee.trim())) || weekOffset !== 0;
            return (
              <button
                type="button"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearchEmployee('');
                  setWeekOffset(0);
                  setCurrentPage(1);
                  setShiftCurrentPage(1);
                }}
                title="Xóa toàn bộ bộ lọc và từ khóa"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 36,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: hasActiveFilters ? '#EF4444' : '#94A3B8',
                  background: hasActiveFilters ? '#FEE2E2' : '#F8FAFC',
                  border: `1px solid ${hasActiveFilters ? '#FECACA' : '#E2E8F0'}`,
                  borderRadius: 8,
                  cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
              >
                <RotateCw size={13} />
                <span>Đặt lại bộ lọc</span>
              </button>
            );
          })()}
        </div>

        <div className="emp-header-actions">
          {/* Switch View Mode */}
          <select
            className="emp-filter-select"
            style={{ width: 180 }}
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'by_employee' | 'by_shift')}
          >
            <option value="by_employee">Xem theo nhân viên</option>
            <option value="by_shift">Xem theo ca</option>
          </select>
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
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{d.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0', color: '#64748B' }}>
                    Không có nhân viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, empRowIndex) => {
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
                            flexDirection: 'column',
                            gap: 2,
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
                            style={{
                              fontWeight: 700,
                              color: '#0F766E',
                              fontSize: 13,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {emp.fullName}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                            {emp.employeeCode}
                          </div>
                        </div>
                      </td>

                      {/* 7 Ngày trong tuần */}
                      {DAYS_HEADER.map((day, dayIndex) => {
                        const isRightAligned = dayIndex >= 4;
                        const matched = assignments.filter(
                          (a) => a && (isEmployeeRole || a.employeeId === emp.id) && a.dayOfWeek === day.key
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
                              {matched.map((item) => {
                                const isOnLeave = isLeaveSchedule(item);
                                const isMenuOpen = openMenuScheduleId === item.id;
                                return (
                                  <div key={item.id} style={{ position: 'relative', width: '90%' }}>
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isEmployeeRole) {
                                          handleEditAssignment(item);
                                          return;
                                        }
                                        if (isMenuOpen) {
                                          setOpenMenuScheduleId(null);
                                          setMenuPosition(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const estimatedMenuHeight = isEmployeeRole ? 245 : 285;
                                          const isLastRow =
                                            paginatedEmployees.length > 1 &&
                                            empRowIndex === paginatedEmployees.length - 1;
                                          const openUpward =
                                            (isLastRow ||
                                              window.innerHeight - rect.bottom < estimatedMenuHeight + 16) &&
                                            rect.top > estimatedMenuHeight;
                                          setMenuPosition({
                                            top: openUpward ? undefined : rect.bottom + 4,
                                            bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
                                            left: isRightAligned ? undefined : Math.max(8, rect.left),
                                            right: isRightAligned
                                              ? Math.max(8, window.innerWidth - rect.right)
                                              : undefined,
                                          });
                                          setOpenMenuScheduleId(item.id);
                                        }
                                      }}
                                      style={{
                                        background: isOnLeave ? '#F3E8FF' : `${item.shiftColor}18`,
                                        border: isOnLeave ? '1px dashed #A855F7' : 'none',
                                        color: isOnLeave ? '#7E22CE' : item.shiftColor,
                                        borderRadius: 6,
                                        padding: '4px 8px',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        width: '100%',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                      }}
                                      title={!isEmployeeRole ? "Bấm để xem chi tiết và chỉnh sửa ca làm việc" : "Bấm để gửi yêu cầu hoặc thao tác ca làm"}
                                    >
                                      <span>{isOnLeave ? `[Nghỉ] ${item.shiftName}` : item.shiftName}</span>
                                      {!isEmployeeRole && !isOnLeave && (
                                        <button
                                          type="button"
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: isOnLeave ? '#7E22CE' : item.shiftColor,
                                            cursor: 'pointer',
                                            padding: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 22,
                                            height: 22,
                                            borderRadius: 4,
                                            transition: 'all 0.15s ease',
                                            flexShrink: 0,
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteAssignment(item.id, e);
                                          }}
                                          title="Hủy ca"
                                        >
                                          <X size={15} strokeWidth={2.5} />
                                        </button>
                                      )}
                                    </div>

                                    {isMenuOpen && menuPosition && (
                                      <div
                                        style={{
                                          position: 'fixed',
                                          top: menuPosition.top,
                                          bottom: menuPosition.bottom,
                                          left: menuPosition.left,
                                          right: menuPosition.right,
                                          zIndex: 9999,
                                          background: '#FFFFFF',
                                          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
                                          borderRadius: 8,
                                          border: '1px solid #E2E8F0',
                                          minWidth: 205,
                                          overflow: 'hidden',
                                          textAlign: 'left',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {/* Dropdown Header */}
                                        <div
                                          style={{
                                            padding: '8px 12px',
                                            background: '#F8FAFC',
                                            borderBottom: '1px solid #F1F5F9',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                          }}
                                        >
                                          <span>{item.shiftName}</span>
                                          {item.shiftTime && (
                                            <span style={{ color: '#0F766E', fontWeight: 700 }}>{item.shiftTime}</span>
                                          )}
                                        </div>

                                        <div style={{ padding: '4px 0' }}>
                                          <button
                                            type="button"
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              fontSize: 12.5,
                                              cursor: 'pointer',
                                              color: '#1E293B',
                                              background: 'none',
                                              border: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              textAlign: 'left',
                                              transition: 'background 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                              setOpenMenuScheduleId(null);
                                              handleOpenCreateRequest(item, ScheduleRequestType.LeaveRequest);
                                            }}
                                          >
                                            <CalendarX size={14} color="#0F766E" />
                                            <span>Xin nghỉ ca</span>
                                          </button>

                                          <button
                                            type="button"
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              fontSize: 12.5,
                                              cursor: 'pointer',
                                              color: '#1E293B',
                                              background: 'none',
                                              border: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              textAlign: 'left',
                                              transition: 'background 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                              setOpenMenuScheduleId(null);
                                              handleOpenCreateRequest(item, ScheduleRequestType.ShiftSwap);
                                            }}
                                          >
                                            <ArrowLeftRight size={14} color="#0F766E" />
                                            <span>Xin đổi ca làm việc</span>
                                          </button>

                                          <button
                                            type="button"
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              fontSize: 12.5,
                                              cursor: 'pointer',
                                              color: '#1E293B',
                                              background: 'none',
                                              border: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              textAlign: 'left',
                                              transition: 'background 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                              setOpenMenuScheduleId(null);
                                              handleOpenCreateRequest(item, ScheduleRequestType.CheckInIncident);
                                            }}
                                          >
                                            <LogIn size={14} color="#0F766E" />
                                            <span>Sự cố Check-in (Vào ca)</span>
                                          </button>

                                          <button
                                            type="button"
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              fontSize: 12.5,
                                              cursor: 'pointer',
                                              color: '#1E293B',
                                              background: 'none',
                                              border: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              textAlign: 'left',
                                              transition: 'background 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                              setOpenMenuScheduleId(null);
                                              handleOpenCreateRequest(item, ScheduleRequestType.CheckOutIncident);
                                            }}
                                          >
                                            <LogOut size={14} color="#D97706" />
                                            <span>Sự cố Check-out (Ra ca)</span>
                                          </button>

                                          <button
                                            type="button"
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              fontSize: 12.5,
                                              cursor: 'pointer',
                                              color: '#1E293B',
                                              background: 'none',
                                              border: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              textAlign: 'left',
                                              transition: 'background 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                              setOpenMenuScheduleId(null);
                                              handleOpenCreateRequest(item, ScheduleRequestType.Overtime);
                                            }}
                                          >
                                            <Clock size={14} color="#2563EB" />
                                            <span>Làm thêm giờ (OT)</span>
                                          </button>

                                          <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />

                                          <button
                                            type="button"
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              fontSize: 12.5,
                                              cursor: 'pointer',
                                              color: '#1E293B',
                                              background: 'none',
                                              border: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              textAlign: 'left',
                                              transition: 'background 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                              setOpenMenuScheduleId(null);
                                              handleOpenHistory(item);
                                            }}
                                          >
                                            <History size={14} color="#64748B" />
                                            <span>Lịch sử các yêu cầu</span>
                                          </button>

                                          {!isEmployeeRole && (
                                            <>
                                              <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />
                                              <button
                                                type="button"
                                                style={{
                                                  width: '100%',
                                                  padding: '8px 12px',
                                                  fontSize: 12.5,
                                                  cursor: 'pointer',
                                                  color: '#1E293B',
                                                  background: 'none',
                                                  border: 'none',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 8,
                                                  textAlign: 'left',
                                                  transition: 'background 0.12s ease',
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                onClick={() => {
                                                  setOpenMenuScheduleId(null);
                                                  handleEditAssignment(item);
                                                }}
                                              >
                                                <Edit3 size={14} color="#0F766E" />
                                                <span>Cập nhật ca làm</span>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

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
                    </tr>
                  );
                }))}
            </tbody>
          </table>

          {/* Enterprise Standard TablePagination */}
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredEmployees.length}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={(newPage) => setCurrentPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="nhân viên"
            isLoading={isLoading}
          />
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
                  <th
                    key={d.key}
                    style={{
                      background: d.isToday ? '#E0F2FE' : undefined,
                      color: d.isToday ? '#0369A1' : undefined,
                      textAlign: 'center',
                    }}
                  >
                    <div>{d.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{d.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0', color: '#64748B' }}>
                    Chưa có ca làm việc nào được cấu hình cho chi nhánh này.
                  </td>
                </tr>
              ) : (
                paginatedShifts.map((sh, shiftRowIndex) => (
                  <tr key={sh.id} style={{ height: 80 }}>
                    <td style={{ textAlign: 'left', verticalAlign: 'middle', padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                        {sh.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: 500 }}>
                        {sh.id === 'custom' ? 'Thời gian linh hoạt theo phân ca' : `${sh.startTime} - ${sh.endTime} (${sh.totalHours}h)`}
                      </div>
                    </td>

                    {DAYS_HEADER.map((day, dayIndex) => {
                      const isRightAligned = dayIndex >= 4;
                      const assignedEmps = assignments.filter(
                        (a) => a && (a.shiftId === sh.id || a.shiftName.toLowerCase() === sh.name.toLowerCase()) && a.dayOfWeek === day.key
                      );

                      return (
                        <td
                          key={day.key}
                          style={{
                            background: day.isToday ? '#F0F9FF' : undefined,
                            verticalAlign: 'middle',
                            padding: '8px 6px',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                            {assignedEmps.map((item) => {
                              if (!item) return null;
                              const isOnLeave = isLeaveSchedule(item);
                              const isMenuOpen = openMenuScheduleId === ('shift_' + item.id);
                              const isMyShift = !isEmployeeRole || (
                                (user?.id && item.employeeId === user.id) ||
                                (user?.fullName && item.employeeName?.trim().toLowerCase() === user.fullName.trim().toLowerCase()) ||
                                (user?.email && item.employeeCode?.trim().toLowerCase() === user.email.split('@')[0].trim().toLowerCase())
                              );

                              return (
                                <div key={item.id} style={{ position: 'relative', width: '92%', maxWidth: 165 }}>
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isEmployeeRole) {
                                        handleEditAssignment(item);
                                        return;
                                      }
                                      if (isMenuOpen) {
                                        setOpenMenuScheduleId(null);
                                        setMenuPosition(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const estimatedMenuHeight = isEmployeeRole ? 245 : 285;
                                        const isLastRow =
                                          paginatedShifts.length > 1 &&
                                          shiftRowIndex === paginatedShifts.length - 1;
                                        const openUpward =
                                          (isLastRow ||
                                            window.innerHeight - rect.bottom < estimatedMenuHeight + 16) &&
                                          rect.top > estimatedMenuHeight;
                                        setMenuPosition({
                                          top: openUpward ? undefined : rect.bottom + 4,
                                          bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
                                          left: isRightAligned ? undefined : Math.max(8, rect.left),
                                          right: isRightAligned
                                            ? Math.max(8, window.innerWidth - rect.right)
                                            : undefined,
                                        });
                                        setOpenMenuScheduleId('shift_' + item.id);
                                      }
                                    }}
                                    style={{
                                      background: isOnLeave ? '#F3E8FF' : '#F0FDFA',
                                      border: isOnLeave ? '1px dashed #A855F7' : '1px solid #99F6E4',
                                      borderRadius: 8,
                                      padding: '5px 8px',
                                      width: '100%',
                                      cursor: 'pointer',
                                      textAlign: 'center',
                                      transition: 'all 0.15s ease',
                                      boxShadow: '0 1px 2px rgba(15, 118, 110, 0.05)',
                                    }}
                                    title={!isEmployeeRole ? "Bấm để xem chi tiết và chỉnh sửa ca làm việc" : "Bấm để gửi yêu cầu hoặc thao tác ca làm"}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: isOnLeave ? '#7E22CE' : '#0F766E',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      <User size={13} color={isOnLeave ? '#7E22CE' : '#0F766E'} />
                                      <span>{isOnLeave ? `[Nghỉ] ${item.employeeName || ''}` : item.employeeName || ''}</span>
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

                                  {isMenuOpen && menuPosition && (
                                    <div
                                      style={{
                                        position: 'fixed',
                                        top: menuPosition.top,
                                        bottom: menuPosition.bottom,
                                        left: menuPosition.left,
                                        right: menuPosition.right,
                                        zIndex: 9999,
                                        background: '#FFFFFF',
                                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
                                        borderRadius: 8,
                                        border: '1px solid #E2E8F0',
                                        minWidth: 205,
                                        overflow: 'hidden',
                                        textAlign: 'left',
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* Dropdown Header */}
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          background: '#F8FAFC',
                                          borderBottom: '1px solid #F1F5F9',
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: '#475569',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                        }}
                                      >
                                        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {item.employeeName}
                                        </span>
                                        <span style={{ color: '#0F766E', fontWeight: 700 }}>
                                          {item.shiftTime || sh.startTime}
                                        </span>
                                      </div>

                                      <div style={{ padding: '4px 0' }}>
                                        {isMyShift ? (
                                          <>
                                            <button
                                              type="button"
                                              style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: 12.5,
                                                cursor: 'pointer',
                                                color: '#1E293B',
                                                background: 'none',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                textAlign: 'left',
                                                transition: 'background 0.12s ease',
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                              onClick={() => {
                                                setOpenMenuScheduleId(null);
                                                handleOpenCreateRequest(item, ScheduleRequestType.LeaveRequest);
                                              }}
                                            >
                                              <CalendarX size={14} color="#0F766E" />
                                              <span>Xin nghỉ ca</span>
                                            </button>

                                            <button
                                              type="button"
                                              style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: 12.5,
                                                cursor: 'pointer',
                                                color: '#1E293B',
                                                background: 'none',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                textAlign: 'left',
                                                transition: 'background 0.12s ease',
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                              onClick={() => {
                                                setOpenMenuScheduleId(null);
                                                handleOpenCreateRequest(item, ScheduleRequestType.ShiftSwap);
                                              }}
                                            >
                                              <ArrowLeftRight size={14} color="#0F766E" />
                                              <span>Xin đổi ca làm việc</span>
                                            </button>

                                            <button
                                              type="button"
                                              style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: 12.5,
                                                cursor: 'pointer',
                                                color: '#1E293B',
                                                background: 'none',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                textAlign: 'left',
                                                transition: 'background 0.12s ease',
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                              onClick={() => {
                                                setOpenMenuScheduleId(null);
                                                handleOpenCreateRequest(item, ScheduleRequestType.CheckInIncident);
                                              }}
                                            >
                                              <LogIn size={14} color="#0F766E" />
                                              <span>Sự cố Check-in (Vào ca)</span>
                                            </button>

                                            <button
                                              type="button"
                                              style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: 12.5,
                                                cursor: 'pointer',
                                                color: '#1E293B',
                                                background: 'none',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                textAlign: 'left',
                                                transition: 'background 0.12s ease',
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                              onClick={() => {
                                                setOpenMenuScheduleId(null);
                                                handleOpenCreateRequest(item, ScheduleRequestType.CheckOutIncident);
                                              }}
                                            >
                                              <LogOut size={14} color="#D97706" />
                                              <span>Sự cố Check-out (Ra ca)</span>
                                            </button>

                                            <button
                                              type="button"
                                              style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: 12.5,
                                                cursor: 'pointer',
                                                color: '#1E293B',
                                                background: 'none',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                textAlign: 'left',
                                                transition: 'background 0.12s ease',
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                              onClick={() => {
                                                setOpenMenuScheduleId(null);
                                                handleOpenCreateRequest(item, ScheduleRequestType.Overtime);
                                              }}
                                            >
                                              <Clock size={14} color="#2563EB" />
                                              <span>Làm thêm giờ (OT)</span>
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            type="button"
                                            style={{
                                              width: '100%',
                                              padding: '8px 12px',
                                              fontSize: 12.5,
                                              cursor: 'pointer',
                                              color: '#1E293B',
                                              background: 'none',
                                              border: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              textAlign: 'left',
                                              transition: 'background 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                              setOpenMenuScheduleId(null);
                                              handleOpenCreateRequest(item, ScheduleRequestType.ShiftSwap);
                                            }}
                                            title={`Đổi ca với ${item.employeeName}`}
                                          >
                                            <ArrowLeftRight size={14} color="#0F766E" />
                                            <span>Đổi ca với {item.employeeName?.split(' ').pop()}</span>
                                          </button>
                                        )}

                                        <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />

                                        <button
                                          type="button"
                                          style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            fontSize: 12.5,
                                            cursor: 'pointer',
                                            color: '#1E293B',
                                            background: 'none',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            textAlign: 'left',
                                            transition: 'background 0.12s ease',
                                          }}
                                          onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                          onClick={() => {
                                            setOpenMenuScheduleId(null);
                                            handleOpenHistory(item);
                                          }}
                                        >
                                          <History size={14} color="#64748B" />
                                          <span>Lịch sử các yêu cầu</span>
                                        </button>

                                        {!isEmployeeRole && (
                                          <>
                                            <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />
                                            <button
                                              type="button"
                                              style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: 12.5,
                                                cursor: 'pointer',
                                                color: '#1E293B',
                                                background: 'none',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                textAlign: 'left',
                                                transition: 'background 0.12s ease',
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                              onClick={() => {
                                                setOpenMenuScheduleId(null);
                                                handleEditAssignment(item);
                                              }}
                                            >
                                              <Edit3 size={14} color="#0F766E" />
                                              <span>Cập nhật ca làm</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
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
                )))}
            </tbody>
          </table>

          {/* Enterprise Standard TablePagination */}
          <TablePagination
            currentPage={shiftCurrentPage}
            pageSize={shiftPageSize}
            totalItems={filteredShifts.length}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={(newPage) => setShiftCurrentPage(newPage)}
            onPageSizeChange={(newSize) => {
              setShiftPageSize(newSize);
              setShiftCurrentPage(1);
            }}
            itemLabel="ca làm việc"
            isLoading={isLoading}
          />
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
        weekDays={weekData.days}
        weekAssignments={assignments}
        editingAssignment={editingAssignment}
        onSave={handleSaveAssignments}
        onSuccess={async (actionType) => {
          await fetchSchedules();
          if (actionType !== 'delete') {
            setNotificationModal({
              isOpen: true,
              type: 'success',
              title: 'Thành công',
              message: editingAssignment
                ? 'Đã cập nhật ca làm việc thành công.'
                : 'Đã khởi tạo ca làm việc thành công vào hệ thống.',
            });
          }
        }}
        onUpdate={handleUpdateAssignment}
        onDelete={handleDeleteFromModal}
      />

      {/* Modal Chi Tiết Lịch Làm Việc Của Nhân Viên (360 độ - tab Lịch làm việc) */}
      <EmployeeDetailModal
        isOpen={!!selectedDetailEmployee}
        onClose={() => setSelectedDetailEmployee(null)}
        employee={selectedDetailEmployee}
        initialTab="schedule"
        onEdit={() => { }}
        onToggleStatus={handleToggleEmployeeStatus}
        onAddPayment={handleAddPayment}
      />

      {/* Modal Quản lý Cấu hình Ca Làm Việc Chuẩn */}
      <ShiftConfigModal
        isOpen={showShiftConfigModal}
        onClose={() => {
          setShowShiftConfigModal(false);
          fetchSchedules();
          fetchEmployeesAndShifts();
        }}
        branchId={activeBranch && activeBranch.id !== 'ALL' ? activeBranch.id : branches[0]?.id || 'b1'}
        branchName={
          activeBranch && activeBranch.id !== 'ALL'
            ? activeBranch.name
            : branches[0]?.name || 'Chi nhánh mặc định'
        }
      />

      {/* Popup Áp dụng thay đổi này cho (khi hủy ca từ bảng lịch làm việc) */}
      <ScheduleScopeConfirmModal
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        actionType="delete"
        employeeId={deletingAssignment?.employeeId}
        branchId={deletingAssignment?.branchId}
        shiftId={deletingAssignment?.shiftId}
        shiftName={deletingAssignment?.shiftName}
        dayOfWeek={deletingAssignment?.dayOfWeek}
        selectedDays={deletingAssignment?.dayOfWeek ? [deletingAssignment.dayOfWeek] : undefined}
        dateStr={
          deletingAssignment?.workDate
            ? (() => {
              const d = new Date(deletingAssignment.workDate);
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              return `${dd}/${mm}/${d.getFullYear()}`;
            })()
            : deletingAssignment?.dateStr
              ? deletingAssignment.dateStr.includes('/2026')
                ? deletingAssignment.dateStr
                : `${deletingAssignment.dateStr}/2026`
              : '16/10/2026'
        }
        startDateStr={
          deletingAssignment?.workDate
            ? (() => {
              const d = new Date(deletingAssignment.workDate);
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              return `${dd}/${mm}/${d.getFullYear()}`;
            })()
            : deletingAssignment?.dateStr
              ? deletingAssignment.dateStr.includes('/2026')
                ? deletingAssignment.dateStr
                : `${deletingAssignment.dateStr}/2026`
              : '16/10/2026'
        }
        onConfirm={handleConfirmDelete}
      />

      {/* Modal Thông báo Kết quả / Lỗi */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal((prev) => ({ ...prev, isOpen: false }))}
        type={notificationModal.type}
        title={notificationModal.title}
        message={notificationModal.message}
      />

      {/* Modal Gửi phiếu yêu cầu (Xin nghỉ, Đổi ca, Sự cố FaceID, OT) */}
      <CreateScheduleRequestModal
        isOpen={showCreateRequestModal}
        onClose={() => {
          setShowCreateRequestModal(false);
          setRequestModalSchedule(null);
        }}
        schedule={requestModalSchedule}
        initialType={requestModalInitialType}
        onSuccess={fetchSchedules}
      />

      {/* Modal Lịch sử các yêu cầu đã gửi cho ca */}
      <ScheduleRequestsHistoryModal
        isOpen={!!historyModalScheduleId}
        onClose={() => {
          setHistoryModalScheduleId(null);
          setHistoryModalTitle('');
        }}
        scheduleId={historyModalScheduleId}
        shiftTitle={historyModalTitle}
        onChanged={fetchSchedules}
      />
    </div>
  );
};
