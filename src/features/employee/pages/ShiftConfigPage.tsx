import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Clock,
  Edit2,
  Trash2,
  RotateCw,
  Building2,
  ChevronDown,
  Check,
  X,
  AlertTriangle,
  Calendar,
  Users,
  Info,
} from 'lucide-react';
import type { Branch } from '../types';
import { employeeApi } from '../api/employeeApi';
import {
  shiftConfigApi,
  type ShiftConfigDto,
  type CreateShiftConfigPayload,
  type UpdateShiftConfigPayload,
} from '../api/shiftConfigApi';
import '../employee.css';

// Helper format HH:mm:ss -> HH:mm
const formatTime = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  return timeStr.slice(0, 5);
};

// Helper tính khoảng cách giờ (hỗ trợ ca qua đêm)
const calculateHoursText = (start: string, end: string): { hours: number; text: string } => {
  try {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return { hours: 4, text: '4h' };
    let diffMinutes = eh * 60 + em - (sh * 60 + sm);
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Ca đêm qua 24h
    }
    const h = Math.round((diffMinutes / 60) * 100) / 100;
    return { hours: h, text: `${h}h` };
  } catch {
    return { hours: 4, text: '4h' };
  }
};

export const ShiftConfigPage: React.FC = () => {
  const navigate = useNavigate();

  // State danh sách
  const [shifts, setShifts] = useState<ShiftConfigDto[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  // Branch multi-select dropdown states trong filter bar
  const [isFilterBranchDropdownOpen, setIsFilterBranchDropdownOpen] = useState(false);
  const [filterBranchSearch, setFilterBranchSearch] = useState('');
  const filterBranchDropdownRef = useRef<HTMLDivElement>(null);

  // Phân trang nội bộ
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modal Thêm / Sửa
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftConfigDto | null>(null);

  // Modal Xóa
  const [deletingShift, setDeletingShift] = useState<ShiftConfigDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states bên trong Modal
  const [formShiftName, setFormShiftName] = useState('Tối');
  const [formStartTime, setFormStartTime] = useState('17:00');
  const [formEndTime, setFormEndTime] = useState('21:00');
  const [formCheckInStart, setFormCheckInStart] = useState('14:00');
  const [formCheckInEnd, setFormCheckInEnd] = useState('00:00');
  const [formBranchIds, setFormBranchIds] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State dropdown chọn chi nhánh trong Modal
  const [isModalBranchDropdownOpen, setIsModalBranchDropdownOpen] = useState(false);
  const [modalBranchSearch, setModalBranchSearch] = useState('');
  const modalBranchDropdownRef = useRef<HTMLDivElement>(null);

  // Tải danh sách chi nhánh
  useEffect(() => {
    employeeApi
      .getBranches()
      .then((bList) => {
        setBranches(bList || []);
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách chi nhánh:', err);
      });
  }, []);

  // Đóng dropdown bộ lọc chi nhánh khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterBranchDropdownRef.current &&
        !filterBranchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterBranchDropdownOpen(false);
      }
      if (
        modalBranchDropdownRef.current &&
        !modalBranchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsModalBranchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Tải danh sách cấu hình ca
  const fetchShifts = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const branchIdParam = selectedBranchIds.length === 1 ? selectedBranchIds[0] : undefined;
      const statusParam =
        filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined;

      const data = await shiftConfigApi.getShiftConfigsByBranch(branchIdParam, statusParam);
      setShifts(data || []);
    } catch (err: any) {
      console.error('Lỗi tải ca làm việc:', err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Không thể tải danh sách cấu hình ca làm việc.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchIds, filterStatus]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Bộ lọc danh sách ca
  const filteredShifts = shifts.filter((s) => {
    if (searchTerm.trim()) {
      const kw = searchTerm.trim().toLowerCase();
      const nameMatch = s.shiftName?.toLowerCase().includes(kw);
      const codeMatch = s.shiftCode?.toLowerCase().includes(kw);
      if (!nameMatch && !codeMatch) return false;
    }

    if (selectedBranchIds.length > 0) {
      const shiftBranchList = s.branchIds && s.branchIds.length > 0 ? s.branchIds : [s.branchId];
      const hasMatch = selectedBranchIds.some((bId) => shiftBranchList.includes(bId));
      if (!hasMatch) return false;
    }

    if (filterStatus === 'active' && !s.isActive) return false;
    if (filterStatus === 'inactive' && s.isActive) return false;

    return true;
  });

  // Phân trang
  const totalPages = Math.ceil(filteredShifts.length / pageSize) || 1;
  const paginatedShifts = filteredShifts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Mở modal Thêm mới ca
  const handleOpenCreate = () => {
    setEditingShift(null);
    setFormShiftName('');
    setFormStartTime('17:00');
    setFormEndTime('21:00');
    setFormCheckInStart('14:00');
    setFormCheckInEnd('00:00');
    setFormIsActive(true);

    if (selectedBranchIds.length > 0) {
      setFormBranchIds([...selectedBranchIds]);
    } else if (branches.length > 0) {
      setFormBranchIds([branches[0].id]);
    } else {
      setFormBranchIds([]);
    }

    setFormError(null);
    setIsModalBranchDropdownOpen(false);
    setShowFormModal(true);
  };

  // Mở modal Sửa ca
  const handleOpenEdit = (s: ShiftConfigDto) => {
    setEditingShift(s);
    setFormShiftName(s.shiftName || '');
    setFormStartTime(formatTime(s.startTime));
    setFormEndTime(formatTime(s.endTime));
    setFormCheckInStart(formatTime(s.allowedCheckInStart));
    setFormCheckInEnd(formatTime(s.allowedCheckInEnd));
    setFormIsActive(s.isActive ?? true);

    if (s.branchIds && s.branchIds.length > 0) {
      setFormBranchIds([...s.branchIds]);
    } else if (s.branchId) {
      setFormBranchIds([s.branchId]);
    } else {
      setFormBranchIds([]);
    }

    setFormError(null);
    setIsModalBranchDropdownOpen(false);
    setShowFormModal(true);
  };

  // Kiểm tra check-in có kéo dài sang hôm sau
  const isNextDayCheckIn = (startStr: string, endStr: string, workStartStr: string): boolean => {
    try {
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);
      const [wsh] = workStartStr.split(':').map(Number);
      if (eh * 60 + em <= sh * 60 + sm) return true;
      if (eh * 60 + em < wsh * 60) return true;
      return false;
    } catch {
      return false;
    }
  };

  // Toggle trạng thái hoạt động trực tiếp trên dòng
  const handleToggleStatus = async (s: ShiftConfigDto) => {
    try {
      const nextStatus = !s.isActive;
      await shiftConfigApi.updateShiftConfigStatus(s.id, nextStatus);
      setShifts((prev) =>
        prev.map((item) => (item.id === s.id ? { ...item, isActive: nextStatus } : item))
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái ca.');
    }
  };

  // Submit Modal Form (Tạo mới hoặc Sửa)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formShiftName.trim()) {
      setFormError('Vui lòng nhập tên ca làm việc.');
      return;
    }

    if (formBranchIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất một chi nhánh trong phạm vi áp dụng.');
      return;
    }

    const durationInfo = calculateHoursText(formStartTime, formEndTime);
    const isNextDay = isNextDayCheckIn(formCheckInStart, formCheckInEnd, formStartTime);

    try {
      setIsSubmitting(true);

      if (editingShift) {
        const payload: UpdateShiftConfigPayload = {
          shiftName: formShiftName.trim(),
          startTime: formStartTime.length === 5 ? `${formStartTime}:00` : formStartTime,
          endTime: formEndTime.length === 5 ? `${formEndTime}:00` : formEndTime,
          durationHours: durationInfo.hours,
          allowedCheckInStart:
            formCheckInStart.length === 5 ? `${formCheckInStart}:00` : formCheckInStart,
          allowedCheckInEnd:
            formCheckInEnd.length === 5 ? `${formCheckInEnd}:00` : formCheckInEnd,
          isCheckInNextDay: isNextDay,
          branchIds: formBranchIds,
          branchId: formBranchIds[0],
          isActive: formIsActive,
        };

        const updated = await shiftConfigApi.updateShiftConfig(editingShift.id, payload);
        setShifts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const payload: CreateShiftConfigPayload = {
          shiftName: formShiftName.trim(),
          startTime: formStartTime.length === 5 ? `${formStartTime}:00` : formStartTime,
          endTime: formEndTime.length === 5 ? `${formEndTime}:00` : formEndTime,
          durationHours: durationInfo.hours,
          allowedCheckInStart:
            formCheckInStart.length === 5 ? `${formCheckInStart}:00` : formCheckInStart,
          allowedCheckInEnd:
            formCheckInEnd.length === 5 ? `${formCheckInEnd}:00` : formCheckInEnd,
          isCheckInNextDay: isNextDay,
          branchIds: formBranchIds,
          branchId: formBranchIds[0],
          isActive: formIsActive,
        };

        const created = await shiftConfigApi.createShiftConfig(payload);
        setShifts((prev) => [created, ...prev]);
      }

      setShowFormModal(false);
      setEditingShift(null);
    } catch (err: any) {
      console.error('Lỗi lưu ca làm việc:', err);
      setFormError(
        err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu ca làm việc.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xác nhận xóa ca làm việc
  const handleConfirmDelete = async () => {
    if (!deletingShift) return;
    try {
      setIsDeleting(true);
      await shiftConfigApi.deleteShiftConfig(deletingShift.id);
      setShifts((prev) => prev.filter((item) => item.id !== deletingShift.id));
      setDeletingShift(null);
    } catch (err: any) {
      console.error('Lỗi xóa ca làm việc:', err);
      alert(err?.response?.data?.message || err?.message || 'Không thể xóa ca làm việc.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Lấy danh sách tên chi nhánh hiển thị
  const getBranchNamesDisplay = (shift: ShiftConfigDto): string[] => {
    const ids = shift.branchIds && shift.branchIds.length > 0 ? shift.branchIds : [shift.branchId];
    return ids.map((id) => {
      const b = branches.find((item) => item.id === id);
      return b ? b.name : 'Chi nhánh';
    });
  };

  const formDurationInfo = calculateHoursText(formStartTime, formEndTime);
  const formIsNextDay = isNextDayCheckIn(formCheckInStart, formCheckInEnd, formStartTime);

  return (
    <div className="emp-page-container">
      {/* ─── HEADER TIÊU ĐỀ TRANG ─── */}
      <div className="emp-page-header">
        <h2 className="emp-header-title">
          <span>Cấu hình ca làm việc</span>
          <span className="count-badge">{filteredShifts.length}</span>
        </h2>
      </div>

      {/* ─── THANH CÔNG CỤ & BỘ LỌC ─── */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          {/* 1. Tìm kiếm */}
          <div className="emp-search-box" style={{ width: 280, position: 'relative' }}>
            <span className="emp-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo ca làm việc..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingRight: searchTerm ? 36 : 16 }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Xóa tìm kiếm"
              >
                &times;
              </button>
            )}
          </div>

          {/* 2. Lọc Chi nhánh làm việc */}
          <div ref={filterBranchDropdownRef} style={{ position: 'relative', minWidth: 230, maxWidth: 360 }}>
            <div
              onClick={() => setIsFilterBranchDropdownOpen((prev) => !prev)}
              style={{
                height: 40,
                padding: '4px 10px',
                border: `1px solid ${isFilterBranchDropdownOpen ? 'var(--blue-primary, #0F766E)' : '#CBD5E1'}`,
                borderRadius: 8,
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1 }}>
                <Building2 size={16} color="#64748B" style={{ flexShrink: 0 }} />
                {selectedBranchIds.length === 0 ? (
                  <span style={{ color: '#475569', fontSize: 13, whiteSpace: 'nowrap' }}>
                    Tất cả chi nhánh ({branches.length})
                  </span>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-primary, #0F766E)' }}>
                    Đã chọn {selectedBranchIds.length} chi nhánh
                  </span>
                )}
              </div>
              <ChevronDown size={16} color="#64748B" />
            </div>

            {isFilterBranchDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 6,
                  width: 300,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                  <input
                    type="text"
                    value={filterBranchSearch}
                    onChange={(e) => setFilterBranchSearch(e.target.value)}
                    placeholder="Tìm tên chi nhánh..."
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontSize: 12,
                      outline: 'none',
                    }}
                    autoFocus
                  />
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {branches
                    .filter((b) => b.name.toLowerCase().includes(filterBranchSearch.toLowerCase().trim()))
                    .map((b) => {
                      const isChecked = selectedBranchIds.includes(b.id);
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBranchIds((prev) =>
                              prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                            );
                            setCurrentPage(1);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            background: isChecked ? 'var(--blue-light, #F0FDFA)' : 'transparent',
                            fontSize: 13,
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{ accentColor: 'var(--blue-primary, #0F766E)', width: 15, height: 15 }}
                            />
                            <span>{b.name}</span>
                          </label>
                          {isChecked && <Check size={14} color="var(--blue-primary, #0F766E)" />}
                        </div>
                      );
                    })}
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    background: '#F8FAFC',
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranchIds([]);
                      setCurrentPage(1);
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}
                  >
                    Bỏ chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilterBranchDropdownOpen(false)}
                    style={{
                      border: 'none',
                      background: 'var(--blue-primary, #0F766E)',
                      color: '#FFF',
                      padding: '3px 10px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Lọc trạng thái */}
          <div style={{ minWidth: 150 }}>
            <select
              className="emp-form-select"
              style={{ height: 40, padding: '0 12px', fontSize: 13, background: '#F8FAFC' }}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả hoạt động</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>

          {/* 4. Nút Đặt lại bộ lọc */}
          {(searchTerm || selectedBranchIds.length > 0 || filterStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setSelectedBranchIds([]);
                setCurrentPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                color: '#EF4444',
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <RotateCw size={12} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* Nút Thao tác */}
        <div className="emp-header-actions">
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={() => navigate('/store-owner/employees/schedule')}
          >
            <Calendar size={16} />
            <span>Lịch làm việc</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={() => navigate('/store-owner/employees')}
          >
            <Users size={16} />
            <span>Nhân viên</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-primary"
            onClick={handleOpenCreate}
            style={{ background: 'var(--blue-primary, #0F766E)', borderColor: 'var(--blue-primary, #0F766E)' }}
          >
            <Plus size={16} />
            <span>Thêm ca làm việc</span>
          </button>
        </div>
      </div>

      {/* ─── THÔNG BÁO LỖI (NẾU CÓ) ─── */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
            color: '#B91C1C',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchShifts}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              color: '#B91C1C',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ─── BẢNG DANH SÁCH CA LÀM VIỆC (ĐÚNG CÁC CỘT THEO ẢNH) ─── */}
      <div className="emp-table-container">
        {isLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
            <RotateCw size={32} className="spin-icon" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <div>Đang tải danh sách ca làm việc...</div>
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="emp-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Clock size={48} color="#94A3B8" style={{ margin: '0 auto 12px', strokeWidth: 1.5 }} />
            <h4 style={{ margin: '0 0 6px', color: '#1E293B', fontSize: 16 }}>
              Không tìm thấy ca làm việc nào
            </h4>
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              onClick={handleOpenCreate}
              style={{ marginTop: 12, background: 'var(--blue-primary, #0F766E)', borderColor: 'var(--blue-primary, #0F766E)' }}
            >
              <Plus size={16} />
              <span>Thêm ca làm việc</span>
            </button>
          </div>
        ) : (
          <table className="emp-table">
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: 'center' }}>STT</th>
                <th style={{ minWidth: 150 }}>Ca làm việc</th>
                <th style={{ width: 160 }}>Thời gian</th>
                <th style={{ width: 140 }}>Tổng giờ làm việc</th>
                <th style={{ minWidth: 220 }}>Chi nhánh làm việc</th>
                <th style={{ width: 120, textAlign: 'center' }}>Hoạt động</th>
                <th className="align-right" style={{ width: 110 }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedShifts.map((s, index) => {
                const stt = (currentPage - 1) * pageSize + index + 1;
                const branchNames = getBranchNamesDisplay(s);
                const durText = `${s.durationHours || calculateHoursText(s.startTime, s.endTime).hours}h`;

                return (
                  <tr key={s.id} onClick={() => handleOpenEdit(s)}>
                    {/* 1. STT */}
                    <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                      {stt}
                    </td>

                    {/* 2. Ca làm việc */}
                    <td>
                      <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>
                        {s.shiftName}
                      </span>
                    </td>

                    {/* 3. Thời gian */}
                    <td>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 500,
                          color: '#0F172A',
                          fontSize: 13,
                        }}
                      >
                        <Clock size={14} color="#64748B" />
                        <span>
                          {formatTime(s.startTime)} - {formatTime(s.endTime)}
                        </span>
                      </div>
                    </td>

                    {/* 4. Tổng giờ làm việc */}
                    <td>
                      <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
                        {durText}
                      </span>
                    </td>

                    {/* 5. Chi nhánh làm việc */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        {branchNames.map((name, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'var(--blue-primary, #0F766E)',
                              color: '#FFFFFF',
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* 6. Hoạt động (Switch / Toggle) */}
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <label
                        style={{
                          position: 'relative',
                          display: 'inline-block',
                          width: 38,
                          height: 22,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={s.isActive}
                          onChange={() => handleToggleStatus(s)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: s.isActive ? 'var(--blue-primary, #0F766E)' : '#CBD5E1',
                            transition: '0.2s',
                            borderRadius: 22,
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              content: '""',
                              height: 16,
                              width: 16,
                              left: s.isActive ? 19 : 3,
                              bottom: 3,
                              backgroundColor: '#FFFFFF',
                              transition: '0.2s',
                              borderRadius: '50%',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
                          />
                        </span>
                      </label>
                    </td>

                    {/* 7. Thao tác */}
                    <td className="align-right" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '5px 8px',
                            cursor: 'pointer',
                            color: 'var(--blue-primary, #0F766E)',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Chỉnh sửa ca"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingShift(s)}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '5px 8px',
                            cursor: 'pointer',
                            color: '#DC2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Xóa ca"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ─── PHÂN TRANG FOOTER ─── */}
        {!isLoading && filteredShifts.length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
              fontSize: 13,
              color: '#64748B',
            }}
          >
            <div>
              Hiển thị{' '}
              <span style={{ fontWeight: 600, color: '#1E293B' }}>
                {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, filteredShifts.length)}
              </span>{' '}
              trong tổng số{' '}
              <span style={{ fontWeight: 600, color: '#1E293B' }}>{filteredShifts.length}</span> ca làm
              việc
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontSize: 12,
                  }}
                >
                  Trước
                </button>
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    fontSize: 12,
                  }}
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL TẠO MỚI / CHỈNH SỬA (CHUẨN FORM THEO ẢNH USER GỬI) ─── */}
      {showFormModal && (
        <div className="emp-modal-overlay" style={{ zIndex: 1200 }}>
          <div
            className="emp-modal-card"
            style={{
              maxWidth: 580,
              borderRadius: 16,
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
              overflow: 'visible',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px 14px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
                {editingShift ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                disabled={isSubmitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  fontSize: 18,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} style={{ overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'visible' }}>
                {formError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: 8,
                      color: '#DC2626',
                      fontSize: 13,
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Hàng 1: Tên */}
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                    Tên
                  </label>
                  <div>
                    <input
                      type="text"
                      placeholder="VD: Tối, Sáng, Chiều..."
                      value={formShiftName}
                      onChange={(e) => setFormShiftName(e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 14,
                        color: '#1E293B',
                        outline: 'none',
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Hàng 2: Giờ làm việc ⓘ */}
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                      Giờ làm việc
                    </span>
                    <span title="Khung giờ nhân viên làm việc trong ca" style={{ cursor: 'pointer', display: 'flex' }}>
                      <Info size={15} color="#94A3B8" />
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', width: 110 }}>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#1E293B',
                          background: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Đến</span>

                    <div style={{ position: 'relative', width: 110 }}>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#1E293B',
                          background: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#334155',
                        marginLeft: 6,
                      }}
                    >
                      {formDurationInfo.text}
                    </span>
                  </div>
                </div>

                {/* Hàng 3: Giờ cho phép chấm công ⓘ */}
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                      Giờ cho phép chấm công
                    </span>
                    <span title="Khoảng thời gian cho phép nhân viên điểm danh" style={{ cursor: 'pointer', display: 'flex' }}>
                      <Info size={15} color="#94A3B8" />
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', width: 110 }}>
                      <input
                        type="time"
                        value={formCheckInStart}
                        onChange={(e) => setFormCheckInStart(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#1E293B',
                          background: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Đến</span>

                    <div style={{ position: 'relative', width: 110 }}>
                      <input
                        type="time"
                        value={formCheckInEnd}
                        onChange={(e) => setFormCheckInEnd(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#1E293B',
                          background: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {formIsNextDay && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#475569',
                          marginLeft: 6,
                        }}
                      >
                        hôm sau
                      </span>
                    )}
                  </div>
                </div>

                {/* Hàng 4: Phạm vi áp dụng (Multi-select Chips) */}
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', gap: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', paddingTop: 6 }}>
                    Phạm vi áp dụng
                  </label>

                  <div ref={modalBranchDropdownRef} style={{ position: 'relative', width: '100%' }}>
                    <div
                      onClick={() => setIsModalBranchDropdownOpen((prev) => !prev)}
                      style={{
                        minHeight: 42,
                        padding: '4px 8px',
                        borderRadius: 8,
                        border: `1px solid ${isModalBranchDropdownOpen ? 'var(--blue-primary, #0F766E)' : '#CBD5E1'}`,
                        boxShadow: isModalBranchDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.15)' : 'none',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {formBranchIds.length === 0 ? (
                        <span style={{ color: '#94A3B8', fontSize: 13, padding: '4px 6px' }}>
                          Chọn chi nhánh áp dụng...
                        </span>
                      ) : (
                        formBranchIds.map((bId) => {
                          const branch = branches.find((b) => b.id === bId);
                          const name = branch ? branch.name : 'Chi nhánh';
                          return (
                            <span
                              key={bId}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'var(--blue-primary, #0F766E)',
                                color: '#FFFFFF',
                                fontSize: 13,
                                fontWeight: 600,
                                padding: '4px 10px',
                                borderRadius: 8,
                              }}
                            >
                              <span>{name}</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormBranchIds((prev) => prev.filter((id) => id !== bId));
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  borderRadius: '50%',
                                  width: 16,
                                  height: 16,
                                  fontSize: 13,
                                  fontWeight: 700,
                                }}
                                title="Xóa chi nhánh"
                              >
                                ✕
                              </span>
                            </span>
                          );
                        })
                      )}

                      <div style={{ marginLeft: 'auto', paddingRight: 4, color: '#94A3B8' }}>
                        <ChevronDown
                          size={16}
                          style={{
                            transform: isModalBranchDropdownOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Dropdown Menu để chọn chi nhánh */}
                    {isModalBranchDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 6px)',
                          left: 0,
                          right: 0,
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 10,
                          boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.18), 0 -4px 10px -4px rgba(0, 0, 0, 0.1)',
                          zIndex: 2000,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                          <input
                            type="text"
                            placeholder="Tìm chi nhánh..."
                            value={modalBranchSearch}
                            onChange={(e) => setModalBranchSearch(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              fontSize: 12,
                              outline: 'none',
                            }}
                            autoFocus
                          />
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            background: '#F8FAFC',
                            borderBottom: '1px solid #F1F5F9',
                            fontSize: 12,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setFormBranchIds(branches.map((b) => b.id))}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--blue-primary, #0F766E)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Chọn tất cả ({branches.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormBranchIds([])}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Bỏ chọn tất cả
                          </button>
                        </div>

                        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                          {branches
                            .filter((b) => b.name.toLowerCase().includes(modalBranchSearch.toLowerCase().trim()))
                            .map((b) => {
                              const isChecked = formBranchIds.includes(b.id);
                              return (
                                <div
                                  key={b.id}
                                  onClick={() => {
                                    setFormBranchIds((prev) =>
                                      prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                                    );
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    background: isChecked ? 'var(--blue-light, #F0FDFA)' : 'transparent',
                                    fontSize: 13,
                                  }}
                                >
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      style={{ accentColor: 'var(--blue-primary, #0F766E)', width: 15, height: 15 }}
                                    />
                                    <span style={{ fontWeight: isChecked ? 600 : 400, color: '#1E293B' }}>
                                      {b.name}
                                    </span>
                                  </label>
                                  {isChecked && <Check size={14} color="var(--blue-primary, #0F766E)" />}
                                </div>
                              );
                            })}
                        </div>

                        <div
                          style={{
                            padding: '6px 12px',
                            background: '#F8FAFC',
                            borderTop: '1px solid #F1F5F9',
                            display: 'flex',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setIsModalBranchDropdownOpen(false)}
                            style={{
                              padding: '4px 12px',
                              fontSize: 12,
                              background: 'var(--blue-primary, #0F766E)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Xong
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '14px 24px',
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  background: '#F8FAFC',
                  borderRadius: '0 0 16px 16px',
                }}
              >
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => setShowFormModal(false)}
                  disabled={isSubmitting}
                  style={{ padding: '0 18px', height: 38 }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="emp-btn emp-btn-primary"
                  disabled={isSubmitting}
                  style={{
                    padding: '0 24px',
                    height: 38,
                    background: 'var(--blue-primary, #0F766E)',
                    borderColor: 'var(--blue-primary, #0F766E)',
                    fontWeight: 600,
                  }}
                >
                  {isSubmitting ? 'Đang lưu...' : editingShift ? 'Lưu thay đổi' : 'Thêm ca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL XÁC NHẬN XÓA CA ─── */}
      {deletingShift && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ maxWidth: 440 }}>
            <div className="emp-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} />
                <span>Xác nhận xóa ca làm việc</span>
              </h3>
              <button
                type="button"
                className="emp-modal-close-btn"
                onClick={() => setDeletingShift(null)}
                disabled={isDeleting}
              >
                &times;
              </button>
            </div>

            <div className="emp-modal-body" style={{ padding: '16px 20px', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa ca làm việc{' '}
              <strong style={{ color: '#0F172A' }}>{deletingShift.shiftName}</strong>?
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 6,
                  color: '#991B1B',
                  fontSize: 12,
                }}
              >
                Lưu ý: Ca làm việc sau khi xóa sẽ không còn hiển thị khi xếp lịch mới.
              </div>
            </div>

            <div className="emp-modal-footer">
              <button
                type="button"
                className="emp-btn emp-btn-secondary"
                onClick={() => setDeletingShift(null)}
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="emp-btn"
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  borderColor: '#DC2626',
                  minWidth: 100,
                }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa ca'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
