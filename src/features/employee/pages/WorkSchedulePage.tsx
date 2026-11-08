import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, User, RefreshCw, Building2, ChevronDown, Check, X } from 'lucide-react';
import type {
  Employee,
  EmployeeStatus,
  WorkShiftDefinition,
  ScheduleAssignment,
  DebtTransaction,
  Branch,
} from '../types';
import { AddScheduleModal } from '../components/AddScheduleModal';
import { EmployeeDetailModal } from '../components/EmployeeDetailModal';
import { ShiftConfigModal } from '../components/ShiftConfigModal';
import {
  ScheduleScopeConfirmModal,
  type ScheduleScopeType,
  type ScheduleScopeDateRange,
} from '../components/ScheduleScopeConfirmModal';
import { TablePagination, NotificationModal } from '../../../components/common';
import { employeeApi } from '../api/employeeApi';
import { shiftConfigApi, type ShiftConfigDto } from '../api/shiftConfigApi';
import { scheduleApi, getShiftColor } from '../api/scheduleApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../employee.css';

const getWeekDates = (offsetWeeks: number) => {
  // Mốc mặc định: Thứ Hai của tuần hiện tại
  const now = new Date();
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

export const WorkSchedulePage: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const roleUpper = (user?.role || '').toUpperCase();
  const isEmployeeRole =
    location.pathname.startsWith('/employee') ||
    roleUpper === 'STAFF' ||
    roleUpper === 'EMPLOYEE' ||
    roleUpper === 'CASHIER' ||
    (!user?.isAdmin && roleUpper !== 'STORE_OWNER' && roleUpper !== 'ADMIN');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShiftDefinition[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  // Branch multi-select dropdown states (giống EmployeeListPage)
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearchKeyword, setBranchSearchKeyword] = useState('');
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close branch dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBranchDropdownOpen(false);
      }
    };

    if (isBranchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBranchDropdownOpen]);

  const filteredBranches = useMemo(() => {
    return branches.filter((b) =>
      b.name.toLowerCase().includes(branchSearchKeyword.toLowerCase())
    );
  }, [branches, branchSearchKeyword]);

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  const handleRemoveBranchTag = (e: React.MouseEvent, branchId: string) => {
    e.stopPropagation();
    setSelectedBranchIds((prev) => prev.filter((id) => id !== branchId));
  };

  const handleSelectAllBranches = () => {
    setSelectedBranchIds(branches.map((b) => b.id));
  };

  const handleClearAllBranches = () => {
    setSelectedBranchIds([]);
  };
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
        selectedBranchIds.length === 1 ? selectedBranchIds[0] : undefined;
      const branchIdsParam =
        selectedBranchIds.length > 0 ? selectedBranchIds : undefined;

      const [empResult, shiftResult] = await Promise.allSettled([
        isEmployeeRole
          ? Promise.resolve({ items: [] })
          : employeeApi.getEmployeesPaged({
            branchId: branchParam,
            branchIds: branchIdsParam,
            pageSize: 200,
          }),
        shiftConfigApi.getShiftConfigsPaged({
          branchId: branchParam,
          branchIds: branchIdsParam,
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
          checkInAllowance: `${(c.allowedCheckInStart || '00:00').substring(0, 5)} - ${(c.allowedCheckInEnd || '00:00').substring(0, 5)}`,
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
  }, [selectedBranchIds, isEmployeeRole, user]);

  useEffect(() => {
    fetchEmployeesAndShifts();
  }, [fetchEmployeesAndShifts]);

  // 3. Tải lịch làm việc thực tế từ Backend theo dải ngày tuần và chi nhánh
  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchParam =
        selectedBranchIds.length === 1 ? selectedBranchIds[0] : undefined;

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
        !isEmployeeRole && selectedBranchIds.length > 1
          ? data.filter(
            (item) => item.branchId && selectedBranchIds.includes(item.branchId)
          )
          : data;

      setAssignments(filteredData);
    } catch (err: any) {
      console.error('Lỗi tải lịch làm việc từ backend:', err);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  }, [weekData.fromDateIso, weekData.toDateIso, selectedBranchIds, isEmployeeRole]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Xử lý làm mới toàn bộ dữ liệu theo chi nhánh và tuần hiện tại
  const handleRefresh = async () => {
    await Promise.allSettled([fetchEmployeesAndShifts(), fetchSchedules()]);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      // 1. Tìm kiếm theo từ khóa (tên hoặc mã nhân viên)
      const keyword = searchEmployee.trim().toLowerCase();
      const matchesKeyword =
        !keyword ||
        e.fullName.toLowerCase().includes(keyword) ||
        e.employeeCode.toLowerCase().includes(keyword);

      if (!matchesKeyword) return false;

      // 2. Lọc theo chi nhánh được chọn từ dropdown (chỉ áp dụng cho Owner)
      if (!isEmployeeRole && selectedBranchIds.length > 0) {
        const matchesSalaryBranch =
          e.salaryBranchId && selectedBranchIds.includes(e.salaryBranchId);
        const matchesWorkingBranch =
          Array.isArray(e.workingBranchIds) &&
          e.workingBranchIds.some((bId) => selectedBranchIds.includes(bId));
        const hasAssignment = assignments.some(
          (a) =>
            a.employeeId === e.id &&
            (!a.branchId || selectedBranchIds.includes(a.branchId))
        );

        return matchesSalaryBranch || matchesWorkingBranch || hasAssignment;
      }

      return true;
    });
  }, [employees, searchEmployee, selectedBranchIds, assignments, isEmployeeRole]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const filteredShifts = useMemo(() => {
    let list = shifts;
    if (!isEmployeeRole && selectedBranchIds.length > 0) {
      list = list.filter((s) => {
        if (s.id === 'custom') return true;
        if (!s.branchId && (!s.branchIds || s.branchIds.length === 0)) return true;
        const shiftBranchIds =
          s.branchIds && s.branchIds.length > 0
            ? s.branchIds
            : s.branchId
              ? [s.branchId]
              : [];
        return selectedBranchIds.some((bId) => shiftBranchIds.includes(bId));
      });
    }
    if (searchEmployee.trim()) {
      const kw = searchEmployee.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          (s.code ? s.code.toLowerCase().includes(kw) : false)
      );
    }
    return list;
  }, [shifts, selectedBranchIds, isEmployeeRole, searchEmployee]);

  const paginatedShifts = useMemo(() => {
    const start = (shiftCurrentPage - 1) * shiftPageSize;
    return filteredShifts.slice(start, start + shiftPageSize);
  }, [filteredShifts, shiftCurrentPage, shiftPageSize]);

  // Reset page khi tìm kiếm, đổi chi nhánh hoặc chuyển tuần
  useEffect(() => {
    setCurrentPage(1);
    setShiftCurrentPage(1);
  }, [searchEmployee, selectedBranchIds, weekOffset]);

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
    if (item) {
      setDeletingAssignment(item);
    }
  };

  // 5. Xác nhận xóa ca trên Backend theo phạm vi
  const handleConfirmDelete = async (scope?: ScheduleScopeType, dateRange?: ScheduleScopeDateRange) => {
    if (!deletingAssignment) return;
    try {
      setIsLoading(true);

      // Luôn xóa ca hiện tại được bấm
      await scheduleApi.deleteSchedule(deletingAssignment.id);

      // Nếu người dùng chọn Option 2 (following) hoặc Option 3 (all), fetch và xóa các ca cùng phạm vi
      if ((scope === 'following' || scope === 'all') && dateRange?.fromDate && dateRange?.toDate) {
        try {
          const schedulesInRange = await scheduleApi.getSchedules({
            employeeId: deletingAssignment.employeeId,
            fromDate: dateRange.fromDate,
            toDate: dateRange.toDate,
            pageSize: 1000,
          });

          const targetDow = deletingAssignment.dayOfWeek;
          const targetShiftId = deletingAssignment.shiftId;
          const targetShiftName = deletingAssignment.shiftName?.toLowerCase().trim();

          const DAY_MAP: Record<number, string> = {
            0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7'
          };

          const otherMatching = schedulesInRange.filter((s) => {
            if (s.id === deletingAssignment.id) return false;
            const dow = s.dayOfWeek || (s.workDate ? DAY_MAP[new Date(s.workDate).getDay()] : undefined);
            const matchesDow = !targetDow || dow === targetDow;
            const matchesShift = !targetShiftId || s.shiftId === targetShiftId || (s.shiftName && s.shiftName.toLowerCase().trim() === targetShiftName);
            return matchesDow && matchesShift;
          });

          if (otherMatching.length > 0) {
            await Promise.all(
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

      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: 'Đã xóa ca làm việc thành công.',
      });
      await fetchSchedules();
    } catch (err: any) {
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi xóa ca',
        message: err?.response?.data?.message || err?.message || 'Không thể xóa ca làm việc.',
      });
    } finally {
      setIsLoading(false);
      setDeletingAssignment(null);
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
      {/* ─── HEADER BAR ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 className="emp-header-title" style={{ margin: 0 }}>
            <span>Lịch làm việc</span>
            <span className="count-badge">
              {viewMode === 'by_employee' ? filteredEmployees.length : filteredShifts.length}
            </span>
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
            <div ref={branchDropdownRef} style={{ position: 'relative', minWidth: 240, maxWidth: 360 }}>
              <div
                onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                style={{
                  height: 40,
                  padding: '4px 10px',
                  border: `1px solid ${isBranchDropdownOpen ? '#0F766E' : '#CBD5E1'}`,
                  borderRadius: 8,
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  boxShadow: isBranchDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden', flex: 1 }}>
                  <Building2 size={16} color="#64748B" style={{ flexShrink: 0 }} />

                  {selectedBranchIds.length === 0 ? (
                    <span style={{ color: '#475569', fontSize: 13, whiteSpace: 'nowrap' }}>
                      Tất cả chi nhánh ({branches.length})
                    </span>
                  ) : selectedBranchIds.length === branches.length && branches.length > 1 ? (
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
                      Tất cả chi nhánh ({branches.length})
                    </span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                      {branches
                        .filter((b) => selectedBranchIds.includes(b.id))
                        .slice(0, 1)
                        .map((b) => (
                          <span
                            key={b.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 500,
                              background: '#F0FDFA',
                              color: '#0F766E',
                              border: '1px solid #99F6E4',
                              whiteSpace: 'nowrap',
                              maxWidth: 150,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                            <span
                              onClick={(e) => handleRemoveBranchTag(e, b.id)}
                              title="Gỡ chi nhánh"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                borderRadius: '50%',
                                width: 14,
                                height: 14,
                                color: '#0F766E',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              <X size={11} />
                            </span>
                          </span>
                        ))}
                      {selectedBranchIds.length > 1 && (
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#F1F5F9',
                            color: '#475569',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          +{selectedBranchIds.length - 1} khác
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', flexShrink: 0 }}>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* Dropdown Panel */}
              {isBranchDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 6,
                    width: 320,
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
                        value={branchSearchKeyword}
                        onChange={(e) => setBranchSearchKeyword(e.target.value)}
                        placeholder="Tìm kiếm chi nhánh theo tên..."
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
                      {branchSearchKeyword && (
                        <button
                          type="button"
                          onClick={() => setBranchSearchKeyword('')}
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

                  {/* Quick Selection Actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 12px',
                      background: '#F8FAFC',
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: '#64748B' }}>
                      Tìm thấy {filteredBranches.length} chi nhánh
                    </span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        type="button"
                        onClick={handleSelectAllBranches}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#0F766E',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 12,
                        }}
                      >
                        Chọn tất cả ({branches.length})
                      </button>
                      <span style={{ color: '#CBD5E1' }}>|</span>
                      <button
                        type="button"
                        onClick={handleClearAllBranches}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#64748B',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 12,
                        }}
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>

                  {/* Branches List */}
                  <div style={{ maxHeight: 210, overflowY: 'auto', padding: '4px 0' }}>
                    {filteredBranches.length ? (
                      filteredBranches.map((b) => {
                        const isChecked = selectedBranchIds.includes(b.id);
                        return (
                          <div
                            key={b.id}
                            onClick={() => handleBranchToggle(b.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              background: isChecked ? '#F0FDFA' : 'transparent',
                              transition: 'background 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isChecked) e.currentTarget.style.background = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isChecked) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                cursor: 'pointer',
                                fontSize: 13,
                                width: '100%',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { }}
                                style={{ accentColor: '#0F766E', width: 16, height: 16 }}
                              />
                              <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? '#134E4A' : '#1E293B' }}>
                                {b.name}
                              </span>
                              {b.isMain && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: '#E2E8F0',
                                    color: '#475569',
                                    fontWeight: 600,
                                  }}
                                >
                                  Trụ sở
                                </span>
                              )}
                            </label>

                            {isChecked && <Check size={15} color="#0F766E" />}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '16px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                        Không tìm thấy chi nhánh nào phù hợp
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#F8FAFC',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      type="button"
                      className="emp-btn emp-btn-primary"
                      style={{ height: 28, padding: '0 14px', fontSize: 12 }}
                      onClick={() => setIsBranchDropdownOpen(false)}
                    >
                      Xong ({selectedBranchIds.length})
                    </button>
                  </div>
                </div>
              )}
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
                <th style={{ width: 140, textAlign: 'right' }}>Lương dự kiến</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px 0', color: '#64748B' }}>
                    Không có nhân viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const empAssignments = assignments.filter((a) => isEmployeeRole || a.employeeId === emp.id);
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
                      {DAYS_HEADER.map((day) => {
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
                paginatedShifts.map((sh) => (
                  <tr key={sh.id} style={{ height: 80 }}>
                    <td style={{ textAlign: 'left', verticalAlign: 'middle', padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                        {sh.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: 500 }}>
                        {sh.id === 'custom' ? 'Thời gian linh hoạt theo phân ca' : `${sh.startTime} - ${sh.endTime} (${sh.totalHours}h)`}
                      </div>
                    </td>

                    {DAYS_HEADER.map((day) => {
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
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => handleEditAssignment(item)}
                                  title={
                                    isEmployeeRole
                                      ? `Ca làm việc của bạn: ${item.shiftName} (${item.shiftTime || ''})`
                                      : `Nhấn để cập nhật ca làm của ${item.employeeName || ''}`
                                  }
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
        editingAssignment={editingAssignment}
        onSave={handleSaveAssignments}
        onSuccess={async () => {
          await fetchSchedules();
          setNotificationModal({
            isOpen: true,
            type: 'success',
            title: 'Thành công',
            message: 'Đã khởi tạo ca làm việc thành công vào hệ thống.',
          });
        }}
        onUpdate={handleUpdateAssignment}
        onDelete={handleDeleteAssignment}
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
        branchId={selectedBranchIds.length > 0 ? selectedBranchIds[0] : branches[0]?.id || 'b1'}
        branchName={
          selectedBranchIds.length > 0
            ? branches.find((b) => b.id === selectedBranchIds[0])?.name || 'Chi nhánh mặc định'
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
    </div>
  );
};
