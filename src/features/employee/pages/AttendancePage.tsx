import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  ClipboardCheck,
  Check,
  Clock,
  RefreshCw,
  AlertCircle,
  Building2,
  ChevronDown,
  X,
  Eye,
  History,
  LogIn,
  LogOut,
  Camera,
} from 'lucide-react';
import type { AttendanceRecord, ApprovalRequest, Branch } from '../types';
import { scheduleApi, getShiftColor, type ScheduleResponse } from '../api/scheduleApi';
import { shiftConfigApi, type ShiftConfigDto } from '../api/shiftConfigApi';
import { employeeApi } from '../api/employeeApi';
import { AttendanceDetailModal } from '../components/AttendanceDetailModal';
import { ApprovalRequestsModal } from '../components/ApprovalRequestsModal';
import { CreateScheduleRequestModal } from '../components/CreateScheduleRequestModal';
import { ScheduleRequestsHistoryModal } from '../components/ScheduleRequestsHistoryModal';
import { FaceIdAttendanceModal } from '../components/FaceIdAttendanceModal';
import { ScheduleRequestType } from '../types/scheduleApprovalTypes';
import { getVietnamToday } from '../lib/vietnamTime';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../employee.css';

interface ShiftRowItem {
  id: string;
  code?: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

const DAY_KEYS: Array<'CN' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7'> = [
  'CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'
];

const getWeekDates = (offsetWeeks: number) => {
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

const formatTime = (isoOrTime?: string | null): string | undefined => {
  if (!isoOrTime) return undefined;
  if (isoOrTime.includes('T') || isoOrTime.includes(' ')) {
    const parts = isoOrTime.includes('T') ? isoOrTime.split('T')[1] : isoOrTime.split(' ')[1];
    if (parts) {
      const p = parts.split(':');
      if (p.length >= 2) {
        return `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`;
      }
      return parts.substring(0, 5);
    }
  }
  if (isoOrTime.includes(':')) {
    const parts = isoOrTime.trim().split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return isoOrTime.substring(0, 5);
  }
  return isoOrTime;
};

const mapScheduleToAttendanceRecord = (s: ScheduleResponse): AttendanceRecord => {
  const d = new Date(s.workDate);
  const dayOfWeek = DAY_KEYS[d.getDay()] || 'T2';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dateStr = `${dd}/${mm}`;

  const checkInTime = formatTime(s.checkInTime);
  const checkOutTime = formatTime(s.checkOutTime);

  // Status mapping
  let status: AttendanceRecord['status'] = 'not_checked';
  if (s.status === 'Cancelled') {
    status = 'absent';
  } else if (s.checkInTime && !s.checkOutTime) {
    const today = getVietnamToday();
    const scheduleDate = new Date(s.workDate);
    scheduleDate.setHours(0, 0, 0, 0);
    if (scheduleDate < today) {
      status = 'missing'; // Chấm công thiếu
    } else if (s.lateMinutes > 0) {
      status = 'late';
    } else {
      status = 'ontime';
    }
  } else if (s.lateMinutes > 0) {
    status = 'late';
  } else if (s.earlyLeaveMinutes > 0) {
    status = 'early';
  } else if (s.checkInTime) {
    status = 'ontime';
  } else {
    const today = getVietnamToday();
    const scheduleDate = new Date(s.workDate);
    scheduleDate.setHours(0, 0, 0, 0);
    if (scheduleDate < today) {
      status = 'absent';
    } else {
      status = 'not_checked';
    }
  }

  const workDateIso = s.workDate ? s.workDate.substring(0, 10) : '';

  return {
    id: s.id,
    employeeId: s.employeeId,
    employeeName: s.employeeName || 'Nhân viên',
    employeeCode: s.employeeCode || '',
    avatarUrl: s.employeeAvatarUrl || undefined,
    shiftId: s.shiftConfigId || s.shiftCode || s.shiftName,
    shiftConfigId: s.shiftConfigId || undefined,
    shiftCode: s.shiftCode || '',
    shiftName: s.shiftName || 'Ca làm việc',
    dayOfWeek,
    dateStr,
    workDateIso,
    branchId: s.branchId,
    branchName: s.branchName || 'Chi nhánh',
    checkInTime,
    checkOutTime,
    plannedStartTime: formatTime(s.plannedStartTime),
    plannedEndTime: formatTime(s.plannedEndTime),
    status,
    lateMinutes: s.lateMinutes || 0,
    workHours: s.actualWorkHours > 0 ? s.actualWorkHours : (s.durationHours || 0),
    gpsLocation: s.branchName || 'Chi nhánh',
    deviceInfo: s.checkInMethod || (s.checkInFaceImageUrl ? 'Khuôn mặt (FaceID)' : 'QR Code / GPS'),
    approvalStatus: String(s.approvalStatus ?? ''),
    note: s.approvalReason || undefined,
  };
};

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const roleUpper = (user?.role || '').toUpperCase();
  const isEmployeeRole =
    location.pathname.startsWith('/employee') ||
    roleUpper === 'STAFF' ||
    roleUpper === 'EMPLOYEE' ||
    roleUpper === 'CASHIER' ||
    (!user?.isAdmin && roleUpper !== 'STORE_OWNER' && roleUpper !== 'ADMIN');

  // Backend data states
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRowItem[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Branch multi-select dropdown states (giống WorkSchedulePage)
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

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Navigation
  const [searchEmployee, setSearchEmployee] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  const weekData = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const DAYS_HEADER = weekData.days;

  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);
  const handleCurrentWeek = () => setWeekOffset(0);

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [requestModalSchedule, setRequestModalSchedule] = useState<{
    id: string;
    workDate: string;
    shiftName: string;
    branchId: string;
    plannedStartTime: string;
    plannedEndTime: string;
    employeeId: string;
  } | null>(null);
  const [requestModalInitialType, setRequestModalInitialType] = useState<ScheduleRequestType>(ScheduleRequestType.CheckInIncident);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [historyModalScheduleId, setHistoryModalScheduleId] = useState<string | null>(null);
  const [historyModalTitle, setHistoryModalTitle] = useState<string>('');
  const [openMenuScheduleId, setOpenMenuScheduleId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  } | null>(null);
  const [isFaceIdModalOpen, setIsFaceIdModalOpen] = useState(false);

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

  const handleOpenCreateRequest = (
    att: AttendanceRecord,
    type: ScheduleRequestType
  ) => {
    setRequestModalSchedule({
      id: att.id,
      workDate: att.dateStr || '',
      shiftName: att.shiftName || 'Ca làm',
      branchId: att.branchId || branches[0]?.id || '',
      plannedStartTime: att.plannedStartTime?.substring(0, 5) || '08:00',
      plannedEndTime: att.plannedEndTime?.substring(0, 5) || '17:00',
      employeeId: att.employeeId,
    });
    setRequestModalInitialType(type);
    setShowCreateRequestModal(true);
  };

  // 1. Fetch danh sách chi nhánh (chạy 1 lần khi mount)
  useEffect(() => {
    let isMounted = true;
    employeeApi.getBranches().then((branchList) => {
      if (isMounted && branchList && branchList.length > 0) {
        setBranches(branchList);
      }
    }).catch(() => {
      // Ignored
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch ca làm việc (ShiftConfigs) và Lịch/Chấm công (Schedules) thực tế từ backend
  const fetchAttendanceData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Lấy danh sách cấu hình ca làm việc
      const shiftConfigsPromise = shiftConfigApi.getShiftConfigsPaged({
        page: 1,
        pageSize: 100,
        isActive: true,
        branchId: selectedBranchIds.length === 1 ? selectedBranchIds[0] : undefined,
        branchIds: selectedBranchIds.length > 1 ? selectedBranchIds : undefined,
      }).catch((err) => {
        console.warn('Lỗi khi tải cấu hình ca:', err);
        return { items: [] as ShiftConfigDto[], totalItems: 0, page: 1, pageSize: 100 };
      });

      // Lấy danh sách lịch & chấm công theo tuần (My-Schedules cho Employee, RawSchedules cho Owner)
      const schedulesPromise = isEmployeeRole
        ? scheduleApi.getRawMySchedules(weekData.fromDateIso, weekData.toDateIso)
        : scheduleApi.getRawSchedules({
          fromDate: weekData.fromDateIso,
          toDate: weekData.toDateIso,
          branchId: selectedBranchIds.length === 1 ? selectedBranchIds[0] : undefined,
          pageSize: 1000,
        });

      const [shiftRes, rawSchedulesData] = await Promise.all([shiftConfigsPromise, schedulesPromise]);

      let rawSchedules = rawSchedulesData;
      if (selectedBranchIds.length > 1) {
        rawSchedules = rawSchedules.filter((s) => selectedBranchIds.includes(s.branchId));
      }

      // Map danh sách ca làm việc
      const shiftRows: ShiftRowItem[] = (shiftRes.items || []).map((sc) => ({
        id: sc.id,
        code: sc.shiftCode,
        name: sc.shiftName,
        startTime: sc.startTime ? sc.startTime.substring(0, 5) : '00:00',
        endTime: sc.endTime ? sc.endTime.substring(0, 5) : '00:00',
        color: getShiftColor(sc.shiftName || sc.shiftCode),
      }));

      // Bổ sung các ca phát sinh từ schedules nếu chưa có trong danh sách cấu hình
      const existingShiftKeys = new Set(shiftRows.map((s) => s.id));
      rawSchedules.forEach((s) => {
        const key = s.shiftConfigId || s.shiftCode || s.shiftName;
        if (key && !existingShiftKeys.has(key) && !shiftRows.some((item) => item.name === s.shiftName)) {
          shiftRows.push({
            id: key,
            code: s.shiftCode,
            name: s.shiftName || 'Ca làm việc',
            startTime: s.plannedStartTime ? s.plannedStartTime.substring(0, 5) : '00:00',
            endTime: s.plannedEndTime ? s.plannedEndTime.substring(0, 5) : '00:00',
            color: getShiftColor(s.shiftName || s.shiftCode),
          });
          existingShiftKeys.add(key);
        }
      });

      setShifts(shiftRows);

      // Map danh sách chấm công
      const mappedRecords: AttendanceRecord[] = rawSchedules.map(mapScheduleToAttendanceRecord);
      setRecords(mappedRecords);

      // Map yêu cầu duyệt chấm công
      const pendingRequests: ApprovalRequest[] = rawSchedules
        .filter(
          (s) =>
            s.approvalStatus === 'Pending' ||
            (s.approvalStatus as unknown) === 1 ||
            String(s.approvalStatus).toLowerCase() === 'pending'
        )
        .map((s) => ({
          id: s.id,
          type: 'attendance',
          employeeId: s.employeeId,
          employeeName: s.employeeName || 'Nhân viên',
          avatarUrl: s.employeeAvatarUrl || undefined,
          branchName: s.branchName || 'Chi nhánh',
          title: s.approvalType || 'Yêu cầu duyệt công',
          description:
            s.approvalReason ||
            `Chấm công ca ${s.shiftName} (${s.workDate ? s.workDate.substring(0, 10) : ''})`,
          createdAt: s.createdAt || new Date().toISOString(),
          status: 'pending',
        }));
      setApprovalRequests(pendingRequests);
    } catch (error: any) {
      console.error('Lỗi khi tải dữ liệu chấm công từ backend:', error);
      setErrorMessage(
        error?.message || 'Không thể tải dữ liệu điểm danh từ máy chủ. Vui lòng kiểm tra kết nối API.'
      );
      setRecords([]);
      setShifts([]);
      setApprovalRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [weekData.fromDateIso, weekData.toDateIso, selectedBranchIds, isEmployeeRole]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Client-side filtering by employee name/code or shift name/date/note
  const filteredRecords = useMemo(() => {
    if (!searchEmployee.trim()) return records;
    const lower = searchEmployee.toLowerCase().trim();
    return records.filter((r) => {
      if (isEmployeeRole) {
        return (
          r.shiftName.toLowerCase().includes(lower) ||
          (r.shiftCode ? r.shiftCode.toLowerCase().includes(lower) : false) ||
          r.dateStr.toLowerCase().includes(lower) ||
          (r.note ? r.note.toLowerCase().includes(lower) : false)
        );
      }
      return (
        r.employeeName.toLowerCase().includes(lower) ||
        r.employeeCode.toLowerCase().includes(lower) ||
        r.shiftName.toLowerCase().includes(lower) ||
        (r.shiftCode ? r.shiftCode.toLowerCase().includes(lower) : false)
      );
    });
  }, [records, searchEmployee, isEmployeeRole]);

  // Cập nhật trạng thái thủ công từ modal chi tiết
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
    // Đồng bộ lại trạng thái của các record được duyệt
    setRecords((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: 'ontime' } : r))
    );
    alert(`Đã duyệt ${ids.length} yêu cầu chấm công thành công!`);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 className="emp-header-title" style={{ margin: 0 }}>
            <span>Bảng chấm công</span>
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="emp-btn emp-btn-primary"
            onClick={() => {
              if (!user) {
                alert('Vui lòng đăng nhập tài khoản cá nhân để thực hiện chấm công FaceID.');
                return;
              }
              setIsFaceIdModalOpen(true);
            }}
            title="Chấm công AI FaceID"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#0F766E', borderColor: '#0F766E' }}
          >
            <Camera size={16} />
            <span>Chấm công AI FaceID</span>
          </button>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={fetchAttendanceData}
            disabled={isLoading}
            title="Tải lại dữ liệu"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={isLoading ? 'emp-spin' : ''} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* ─── TOOLBAR & FILTERS ─── */}
      <div className="emp-header-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Thanh tìm kiếm (Chỉ hiển thị cho Store Owner / Admin) */}
          {!isEmployeeRole && (
            <div className="emp-search-box" style={{ width: 280, position: 'relative' }}>
              <span className="emp-search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Tìm theo mã, tên NV..."
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
            <span
              className="emp-date-navigator-label"
              onClick={handleCurrentWeek}
              style={{ cursor: 'pointer' }}
              title="Nhấn để về tuần hiện tại"
            >
              {weekData.label}
            </span>
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

        <div className="emp-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isEmployeeRole && (
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
          )}
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            color: '#B91C1C',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={fetchAttendanceData}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ─── MA TRẬN BẢNG CHẤM CÔNG THEO CA VÀ NGÀY ─── */}
      <div className="emp-table-container" style={{ overflowX: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={28} className="emp-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#0F766E' }} />
            <div style={{ fontWeight: 600 }}>Đang tải dữ liệu điểm danh thực tế từ máy chủ...</div>
          </div>
        ) : shifts.length === 0 && filteredRecords.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
            <Clock size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
              Không có dữ liệu ca làm việc hoặc chấm công
            </div>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Không tìm thấy ca làm việc nào trong tuần này ({weekData.label}). Hãy phân ca trước tại mục &quot;Lịch làm việc&quot;.
            </p>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{ marginTop: 12 }}
              onClick={fetchAttendanceData}
            >
              Tải lại trang
            </button>
          </div>
        ) : (
          <table className="emp-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: 1100 }}>
            <colgroup>
              <col style={{ width: 200 }} />
              {DAYS_HEADER.map((d) => (
                <col key={d.key} style={{ width: 'calc((100% - 200px) / 7)' }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: 200, textAlign: 'left' }}>Ca làm việc</th>
                {DAYS_HEADER.map((d) => (
                  <th
                    key={d.key}
                    style={{
                      width: 'calc((100% - 200px) / 7)',
                      textAlign: 'center',
                      background: d.isToday ? '#E0F2FE' : undefined,
                      color: d.isToday ? '#0369A1' : undefined,
                    }}
                  >
                    <div>{d.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{d.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map((sh, shiftIndex) => (
                <tr key={sh.id} style={{ minHeight: 90 }}>
                  {/* Cột thông tin Ca */}
                  <td style={{ verticalAlign: 'top', padding: 12 }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{sh.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      {sh.startTime} - {sh.endTime}
                    </div>
                  </td>

                  {/* 7 ngày trong tuần */}
                  {DAYS_HEADER.map((day, dayIndex) => {
                    const isRightAligned = dayIndex >= 4;
                    const dayRecords = filteredRecords.filter((r) => {
                      const matchDay = r.workDateIso ? r.workDateIso === day.dateIso : r.dayOfWeek === day.key;
                      const matchShift =
                        (r.shiftConfigId && r.shiftConfigId === sh.id) ||
                        (r.shiftCode && sh.code && r.shiftCode.toLowerCase() === sh.code.toLowerCase()) ||
                        (r.shiftName && sh.name && r.shiftName.toLowerCase() === sh.name.toLowerCase()) ||
                        r.shiftId === sh.id;
                      return matchDay && matchShift;
                    });

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
                          {dayRecords.map((att) => {
                            const isMenuOpen = openMenuScheduleId === att.id;
                            return (
                              <div key={att.id} style={{ position: 'relative', width: '100%' }}>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isMenuOpen) {
                                      setOpenMenuScheduleId(null);
                                      setMenuPosition(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const estimatedMenuHeight = 230;
                                      const isLastRow = shifts.length > 1 && shiftIndex === shifts.length - 1;
                                      const openUpward =
                                        (isLastRow || window.innerHeight - rect.bottom < estimatedMenuHeight + 16) &&
                                        rect.top > estimatedMenuHeight;
                                      setMenuPosition({
                                        top: openUpward ? undefined : rect.bottom + 4,
                                        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
                                        left: isRightAligned ? undefined : Math.max(8, rect.left),
                                        right: isRightAligned ? Math.max(8, window.innerWidth - rect.right) : undefined,
                                      });
                                      setOpenMenuScheduleId(att.id);
                                    }
                                  }}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 8,
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Bấm để xem chi tiết hoặc gửi yêu cầu"
                                >
                                  <div style={{ fontWeight: 600, fontSize: 12, color: '#0F172A' }}>
                                    {att.employeeName}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                    {att.checkInTime ? `${att.checkInTime} - ${att.checkOutTime || '...'}` : 'Chưa check-in'}
                                  </div>
                                  <div style={{ marginTop: 4 }}>
                                    {att.status === 'ontime' && (
                                      <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <Check size={9} strokeWidth={3} />
                                        </span>
                                        <span>Đúng giờ</span>
                                      </span>
                                    )}
                                    {(att.status === 'late' || att.status === 'early') && (
                                      <span style={{ fontSize: 11, color: '#9333EA', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#A855F7', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <Check size={9} strokeWidth={3} />
                                        </span>
                                        <span>{att.status === 'late' ? `Muộn ${att.lateMinutes}p` : 'Về sớm'}</span>
                                      </span>
                                    )}
                                    {att.status === 'missing' && (
                                      <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#EF4444', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <Check size={9} strokeWidth={3} />
                                        </span>
                                        <span>Chấm công thiếu</span>
                                      </span>
                                    )}
                                    {att.status === 'not_checked' && (
                                      <span style={{ fontSize: 11, color: '#EA580C', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#F97316', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <Check size={9} strokeWidth={3} />
                                        </span>
                                        <span>Chưa chấm công</span>
                                      </span>
                                    )}
                                    {att.status === 'absent' && (
                                      <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#94A3B8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <Check size={9} strokeWidth={3} />
                                        </span>
                                        <span>Nghỉ làm</span>
                                      </span>
                                    )}
                                  </div>
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
                                      minWidth: 210,
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
                                        {att.employeeName}
                                      </span>
                                      <span style={{ color: '#0F766E', fontWeight: 700 }}>
                                        {att.checkInTime || sh.startTime}
                                      </span>
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
                                          setSelectedRecord(att);
                                        }}
                                      >
                                        <Eye size={14} color="#0F766E" />
                                        <span>Xem chi tiết chấm công</span>
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
                                          handleOpenCreateRequest(att, ScheduleRequestType.CheckInIncident);
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
                                          handleOpenCreateRequest(att, ScheduleRequestType.CheckOutIncident);
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
                                          handleOpenCreateRequest(att, ScheduleRequestType.Overtime);
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
                                          setHistoryModalScheduleId(att.id);
                                          setHistoryModalTitle(`${att.shiftName} - ${att.employeeName}`);
                                        }}
                                      >
                                        <History size={14} color="#64748B" />
                                        <span>Lịch sử các yêu cầu của ca</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

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
        )}
      </div>

      {/* ─── CHÚ THÍCH TRẠNG THÁI CHẤM CÔNG (LEGEND) ─── */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 16 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 28,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 9999,
            padding: '8px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            fontSize: 13,
            color: '#334155',
            flexWrap: 'wrap',
          }}
        >
          {/* Đúng giờ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#1677FF',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 500 }}>Đúng giờ</span>
          </div>

          {/* Đi muộn / Về sớm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 17,
                height: 17,
                borderRadius: '50%',
                background: '#A855F7',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span style={{ fontWeight: 500 }}>Đi muộn / Về sớm</span>
          </div>

          {/* Chấm công thiếu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 17,
                height: 17,
                borderRadius: '50%',
                background: '#EF4444',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span style={{ fontWeight: 500 }}>Chấm công thiếu</span>
          </div>

          {/* Chưa chấm công */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 17,
                height: 17,
                borderRadius: '50%',
                background: '#F97316',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span style={{ fontWeight: 500 }}>Chưa chấm công</span>
          </div>

          {/* Nghỉ làm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 17,
                height: 17,
                borderRadius: '50%',
                background: '#94A3B8',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span style={{ fontWeight: 500 }}>Nghỉ làm</span>
          </div>
        </div>
      </div>

      {/* Modal chi tiết chấm công */}
      <AttendanceDetailModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        onUpdateStatus={handleUpdateRecordStatus}
        onSaved={fetchAttendanceData}
        isReadOnly={isEmployeeRole}
        onRequestIncident={(rec, type) => {
          setSelectedRecord(null);
          handleOpenCreateRequest(rec, type);
        }}
      />

      {/* Modal Duyệt chấm công */}
      <ApprovalRequestsModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        requests={approvalRequests}
        onApprove={handleApproveRequests}
        onReject={handleRejectRequests}
      />

      {/* Modal Tạo yêu cầu (Xin nghỉ, Đổi ca, Sự cố FaceID, Làm thêm giờ OT) */}
      {requestModalSchedule && (
        <CreateScheduleRequestModal
          isOpen={showCreateRequestModal}
          onClose={() => {
            setShowCreateRequestModal(false);
            setRequestModalSchedule(null);
          }}
          schedule={requestModalSchedule}
          initialType={requestModalInitialType}
          onSuccess={() => {
            fetchAttendanceData();
          }}
        />
      )}

      {/* Modal Lịch sử yêu cầu của ca */}
      {historyModalScheduleId && (
        <ScheduleRequestsHistoryModal
          isOpen={!!historyModalScheduleId}
          onClose={() => setHistoryModalScheduleId(null)}
          scheduleId={historyModalScheduleId}
          shiftTitle={historyModalTitle}
        />
      )}

      {/* Modal Chấm công AI FaceID quầy POS */}
      <FaceIdAttendanceModal
        isOpen={isFaceIdModalOpen}
        onClose={() => setIsFaceIdModalOpen(false)}
        branchId={(selectedBranchIds.length > 0 ? selectedBranchIds[0] : branches[0]?.id) || ''}
        branchName={branches.find((b) => b.id === (selectedBranchIds.length > 0 ? selectedBranchIds[0] : branches[0]?.id))?.name}
        onSuccess={() => {
          fetchAttendanceData();
        }}
      />
    </div>
  );
};
