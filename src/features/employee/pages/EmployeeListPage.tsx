import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  ClipboardCheck,
  MoreHorizontal,
  Upload,
  Download,
  User,
  AlertTriangle,
  RotateCw,
  Trash2,
  Building2,
  Clock,
} from 'lucide-react';
import type {
  Employee,
  Branch,
  EmployeeStatus,
  ApprovalRequest,
  DebtTransaction,
} from '../types';
import { employeeApi } from '../api/employeeApi';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { EmployeeDetailModal } from '../components/EmployeeDetailModal';
import { ApprovalRequestsModal } from '../components/ApprovalRequestsModal';
import { ImportEmployeeModal } from '../components/ImportEmployeeModal';
import { TablePagination, NotificationModal, ConfirmModal } from '../../../components/common';
import '../employee.css';

const ACTIVE_BRANCH_STORAGE_KEY = 'mtgrms_active_branch';

export const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();

  // State data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals confirmation & notification
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string | React.ReactNode;
    itemCode?: string;
  } | null>(null);

  // Search input & Debounced filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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

  // Lắng nghe thay đổi chi nhánh từ StoreOwnerLayout (BranchSelectorDropdown)
  useEffect(() => {
    const handleBranchChanged = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        setActiveBranch(customEvent.detail);
        setPage(1);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_BRANCH_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setActiveBranch(parsed);
          setPage(1);
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

  // Debounce search input
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load branches
  useEffect(() => {
    let isMounted = true;
    employeeApi.getBranches().then((bList) => {
      if (isMounted && bList && bList.length > 0) {
        setBranches(bList);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Chi nhánh được lấy từ StoreOwnerLayout (activeBranch)
      const currentBranchId =
        activeBranch && activeBranch.id && activeBranch.id !== 'ALL'
          ? activeBranch.id
          : undefined;

      const res = await employeeApi.getEmployeesPaged({
        keyword: debouncedKeyword || undefined,
        branchId: currentBranchId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        pageSize,
      });
      // Ưu tiên nhân viên đang làm việc (active) hiển thị lên đầu
      const sortedItems = [...res.items].sort((a, b) => {
        const aActive = a.status === 'active' ? 0 : 1;
        const bActive = b.status === 'active' ? 0 : 1;
        return aActive - bActive;
      });
      setEmployees(sortedItems);
      setTotalItems(res.totalItems);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách nhân viên.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedKeyword, activeBranch, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<Employee | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const actionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setShowActionDropdown(false);
      }
    };
    if (showActionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionDropdown]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(employees.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Actions
  const handleCreateNew = () => {
    setEditingEmployee(null);
    setShowFormModal(true);
  };

  const handleEdit = async (emp: Employee) => {
    setEditingEmployee(emp);
    setShowFormModal(true);
    try {
      const fullDetail = await employeeApi.getEmployeeById(emp.id);
      setEditingEmployee(fullDetail);
    } catch (err) {
      console.warn('Lỗi khi tải thông tin chi tiết nhân viên để sửa:', err);
    }
  };

  const handleSaveEmployee = (savedEmp: Employee, isAddNew: boolean = false) => {
    fetchEmployees();

    if (selectedDetailEmployee?.id === savedEmp.id) {
      setSelectedDetailEmployee(savedEmp);
    }

    if (!isAddNew) {
      setShowFormModal(false);
      setEditingEmployee(null);
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Cập nhật nhân viên thành công',
        message: `Thông tin nhân viên "${savedEmp.fullName}" đã được cập nhật thành công vào hệ thống.`,
        itemCode: savedEmp.employeeCode,
      });
    } else {
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Thêm mới nhân viên thành công',
        message: `Hồ sơ nhân viên "${savedEmp.fullName}" đã được tạo mới thành công.`,
        itemCode: savedEmp.employeeCode,
      });
    }
  };

  const handleToggleEmployeeStatus = async (employeeId: string) => {
    const currentEmp = employees.find((e) => e.id === employeeId) || selectedDetailEmployee;
    if (!currentEmp) return;
    const newStatus: EmployeeStatus = currentEmp.status === 'active' ? 'inactive' : 'active';
    try {
      await employeeApi.updateEmployeeStatus(employeeId, newStatus);
      setEmployees((prev) =>
        prev.map((e) => (e.id === employeeId ? { ...e, status: newStatus } : e))
      );
      if (selectedDetailEmployee?.id === employeeId) {
        setSelectedDetailEmployee({ ...selectedDetailEmployee, status: newStatus });
      }
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Cập nhật trạng thái thành công',
        message: `Trạng thái của nhân viên "${currentEmp.fullName}" đã chuyển sang ${newStatus === 'active' ? 'Đang làm việc' : 'Tạm dừng hoạt động'}.`,
        itemCode: currentEmp.employeeCode,
      });
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Cập nhật trạng thái thất bại',
        message: err?.response?.data?.message || err?.message || 'Cập nhật trạng thái nhân viên thất bại.',
      });
    }
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    const target = employeeToDelete;
    try {
      const result = await employeeApi.deleteEmployee(target.id);
      setEmployeeToDelete(null);

      if (result.action === 'deactivated') {
        // Nhân viên đã có lịch làm việc hoặc phiếu lương -> giữ lại trong danh sách với trạng thái "Đã nghỉ" (inactive)
        setEmployees((prev) =>
          prev.map((e) => (e.id === target.id ? { ...e, status: 'inactive' } : e))
        );
        if (selectedDetailEmployee?.id === target.id) {
          setSelectedDetailEmployee({ ...selectedDetailEmployee, status: 'inactive' });
        }
        await fetchEmployees();
        setNotification({
          isOpen: true,
          type: 'warning',
          title: 'Đã chuyển sang trạng thái Đã nghỉ',
          message:
            result.message ||
            `Nhân viên "${target.fullName}" đã có dữ liệu lịch làm việc hoặc phiếu lương nên hệ thống không xóa cứng, mà đã chuyển sang trạng thái "Đã nghỉ" (Ngừng làm việc).`,
          itemCode: target.employeeCode,
        });
      } else {
        // Nhân viên chưa có lịch làm việc / phiếu lương -> xóa khỏi danh sách
        setEmployees((prev) => prev.filter((e) => e.id !== target.id));
        setTotalItems((prev) => Math.max(0, prev - 1));
        setSelectedIds((prev) => prev.filter((id) => id !== target.id));
        if (selectedDetailEmployee?.id === target.id) {
          setSelectedDetailEmployee(null);
        }
        await fetchEmployees();
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Xóa nhân viên thành công',
          message: `Đã xóa nhân viên "${target.fullName}" khỏi hệ thống thành công.`,
          itemCode: target.employeeCode,
        });
      }
    } catch (err: any) {
      const errCode = err?.response?.data?.errorCode;
      if (errCode === 'EMPLOYEE_HAS_WORK_HISTORY') {
        // Fallback nếu backend trả về mã EMPLOYEE_HAS_WORK_HISTORY
        setEmployeeToDelete(null);
        setEmployees((prev) =>
          prev.map((e) => (e.id === target.id ? { ...e, status: 'inactive' } : e))
        );
        if (selectedDetailEmployee?.id === target.id) {
          setSelectedDetailEmployee({ ...selectedDetailEmployee, status: 'inactive' });
        }
        await fetchEmployees();
        setNotification({
          isOpen: true,
          type: 'warning',
          title: 'Đã chuyển sang trạng thái Đã nghỉ',
          message:
            err?.response?.data?.message ||
            `Nhân viên "${target.fullName}" đã có dữ liệu lịch làm việc hoặc phiếu lương nên đã được chuyển sang trạng thái "Đã nghỉ".`,
          itemCode: target.employeeCode,
        });
      } else {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'Xóa nhân viên thất bại',
          message: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xóa nhân viên.',
        });
      }
    } finally {
      setIsDeleting(false);
    }
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

  // Approval requests
  const pendingRequestCount = approvalRequests.filter((r) => r.status === 'pending').length;

  const handleApproveRequests = (ids: string[]) => {
    setApprovalRequests((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: 'approved' } : r))
    );
    alert(`Đã phê duyệt thành công ${ids.length} yêu cầu!`);
  };

  const handleRejectRequests = (ids: string[]) => {
    setApprovalRequests((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: 'rejected' } : r))
    );
    alert(`Đã từ chối ${ids.length} yêu cầu!`);
  };

  const handleExportExcel = () => {
    alert(`Đang xuất danh sách ${totalItems} nhân viên ra file Excel...`);
    setShowActionDropdown(false);
  };

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('vi-VN');
  };

  return (
    <div className="emp-page-container">
      {/* ─── TITLE BAR ─── */}
      <div style={{ marginBottom: 16 }}>
        <h2 className="emp-header-title" style={{ margin: 0 }}>
          <span>Danh sách nhân viên</span>
          <span className="count-badge">{totalItems}</span>
        </h2>
      </div>

      {/* ─── TOP FILTER BAR: TÌM KIẾM, CHI NHÁNH, TRẠNG THÁI (ĐÃ ĐƯA LÊN HEADER) ─── */}
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
          {/* 1. Thanh tìm kiếm */}
          <div className="emp-search-box" style={{ width: 320, position: 'relative' }}>
            <span className="emp-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã, tên, SĐT nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setDebouncedKeyword(searchTerm);
                  setPage(1);
                }
              }}
              style={{ paddingRight: searchTerm ? 36 : 16 }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedKeyword('');
                  setPage(1);
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

          {/* 2. Hiển thị Chi nhánh đang áp dụng từ StoreOwnerLayout */}
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

          {/* 3. Lọc Trạng thái (Dropdown) */}
          <div style={{ minWidth: 170 }}>
            <select
              className="emp-form-select"
              style={{ height: 40, padding: '0 12px', fontSize: 13, background: '#F8FAFC' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang làm việc</option>
              <option value="inactive">Đã nghỉ</option>
            </select>
          </div>

          {/* 4. Nút Đặt lại bộ lọc */}
          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedKeyword('');
                setStatusFilter('all');
                setPage(1);
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
              title="Xóa toàn bộ bộ lọc và từ khóa"
            >
              <RotateCw size={12} />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        {/* Actions (Chuyển xuống thanh công cụ) */}
        <div className="emp-header-actions">
          <button type="button" className="emp-btn emp-btn-primary" onClick={handleCreateNew}>
            <Plus size={16} />
            <span>Nhân viên</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary emp-approval-btn"
            onClick={() => setShowApprovalModal(true)}
          >
            <ClipboardCheck size={16} />
            <span>Duyệt yêu cầu</span>
            {pendingRequestCount > 0 && (
              <span className="emp-pending-badge">{pendingRequestCount}</span>
            )}
          </button>

          {/* Dropdown Action Menu */}
          <div ref={actionDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{ width: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowActionDropdown(!showActionDropdown)}
            >
              <MoreHorizontal size={18} />
            </button>

            {showActionDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 46,
                  right: 0,
                  background: '#FFFFFF',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid #E2E8F0',
                  minWidth: 180,
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => {
                    setShowImportModal(true);
                    setShowActionDropdown(false);
                  }}
                >
                  <Upload size={15} />
                  <span>Nhập file Excel</span>
                </button>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={handleExportExcel}
                >
                  <Download size={15} />
                  <span>Xuất file Excel</span>
                </button>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderTop: '1px solid #F1F5F9',
                  }}
                  onClick={() => {
                    navigate('/store-owner/employees/shifts');
                    setShowActionDropdown(false);
                  }}
                >
                  <Clock size={15} color="#0F766E" />
                  <span>Cấu hình ca</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert Banner if fetch fails */}
      {errorMessage && (
        <div
          style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchEmployees()}
            style={{
              background: '#FFFFFF',
              border: '1px solid #F87171',
              color: '#B91C1C',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RotateCw size={12} />
            Thử lại
          </button>
        </div>
      )}

      {/* ─── FULL-WIDTH TABLE CONTAINER ─── */}
      <div className="emp-table-container" style={{ width: '100%' }}>
          <table className="emp-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      employees.length > 0 &&
                      selectedIds.length === employees.length
                    }
                    style={{ accentColor: '#0F766E' }}
                  />
                </th>
                <th style={{ width: 44, textAlign: 'center' }}></th>
                <th style={{ width: 110 }}>Mã NV</th>
                                <th>Tên nhân viên</th>
                <th>Chi nhánh</th>
                <th>Số điện thoại</th>
                <th className="align-right">Nợ và tạm ứng</th>
                <th>Trạng thái</th>
                <th style={{ width: 60, textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <RotateCw className="emp-spin-icon" size={18} />
                      <span>Đang tải danh sách nhân viên từ máy chủ...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length ? (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedDetailEmployee(emp)}
                    title="Nhấn để xem chi tiết nhân viên 360 độ"
                  >
                    <td
                      style={{ textAlign: 'center' }}
                      onClick={(e) => handleToggleSelect(emp.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={() => { }}
                        style={{ accentColor: '#0F766E' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="emp-avatar-cell">
                        {emp.avatarUrl ? (
                          <img src={emp.avatarUrl} alt={emp.fullName} />
                        ) : (
                          <User size={18} color="#64748B" />
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0F766E' }}>{emp.employeeCode}</td>
                                        <td>
                      <div className="emp-name-badge">
                        <span>{emp.fullName}</span>
                        {emp.hasFaceId && (
                          <span
                            style={{
                              marginLeft: 6,
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontWeight: 600,
                              backgroundColor: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                            }}
                            title="Đã kích hoạt chấm công AI FaceID"
                          >
                            FaceID
                          </span>
                        )}
                        {emp.hasWarning && (
                          <span className="emp-warning-icon" title="Có cảnh báo">
                            <AlertTriangle size={14} color="#F59E0B" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: '#475569', fontSize: 13 }}>{emp.salaryBranchName || 'Chưa gán'}</td>
                    <td style={{ color: '#334155' }}>{emp.phone}</td>
                    <td className="align-right">
                      <span className={`emp-debt-value ${emp.debtAmount === 0 ? 'zero' : ''}`}>
                        {formatVND(emp.debtAmount)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`emp-status-pill ${
                          emp.status === 'active' ? 'active' : 'inactive'
                        }`}
                      >
                        {emp.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ'}
                      </span>
                    </td>
                    <td
                      style={{ textAlign: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: 4,
                          borderRadius: 4,
                        }}
                        title={`Xóa nhân viên ${emp.fullName}`}
                        onClick={() => setEmployeeToDelete(emp)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94A3B8', padding: 48 }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#475569' }}>
                      Không tìm thấy nhân viên nào phù hợp với bộ lọc hiện tại
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94A3B8' }}>
                      Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc chi nhánh / trạng thái.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Enterprise Standard TablePagination */}
          <TablePagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={totalItems}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel="nhân viên"
            isLoading={isLoading}
          />
      </div>

      {/* ─── MODALS ─── */}
      {/* 1. Modal Thêm mới / Cập nhật */}
      <EmployeeFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSave={handleSaveEmployee}
        branches={branches}
        existingEmployees={employees}
      />

      {/* 2. Modal Chi tiết nhân viên 360 */}
      <EmployeeDetailModal
        isOpen={!!selectedDetailEmployee}
        onClose={() => setSelectedDetailEmployee(null)}
        employee={selectedDetailEmployee}
        onEdit={(emp) => {
          setSelectedDetailEmployee(null);
          handleEdit(emp);
        }}
        onToggleStatus={handleToggleEmployeeStatus}
        onDelete={(empId) => {
          const target = employees.find((e) => e.id === empId) || selectedDetailEmployee;
          if (target) {
            setEmployeeToDelete(target);
          }
        }}
        onAddPayment={handleAddPayment}
      />

      {/* 3. Modal Duyệt yêu cầu */}
      <ApprovalRequestsModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        requests={approvalRequests}
        onApprove={handleApproveRequests}
        onReject={handleRejectRequests}
      />

      {/* 4. Modal Import Excel */}
      <ImportEmployeeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => { }}
      />

      {/* 5. Modal Xác nhận xóa nhân viên */}
      <ConfirmModal
        isOpen={Boolean(employeeToDelete)}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={handleConfirmDeleteEmployee}
        title="Xác nhận xóa nhân viên"
        itemName={employeeToDelete?.fullName}
        itemCode={employeeToDelete?.employeeCode}
        message={
          <>
            <p style={{ margin: 0 }}>
              Bạn có chắc chắn muốn xóa nhân viên <b>"{employeeToDelete?.fullName}"</b> khỏi hệ thống? Thao tác này sẽ ẩn nhân viên khỏi danh sách làm việc.
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#B45309', backgroundColor: '#FEF3C7', padding: '8px 12px', borderRadius: 6, lineHeight: 1.5 }}>
              ⚠️ <b>Lưu ý:</b> Nếu nhân viên đã phát sinh lịch làm việc hoặc phiếu lương, hệ thống sẽ <b>không xóa cứng</b> mà tự động chuyển trạng thái nhân viên sang <b>"Đã nghỉ" (Ngừng làm việc)</b> để bảo toàn lịch sử dữ liệu.
            </p>
          </>
        }
        isLoading={isDeleting}
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
      />

      {/* 6. Modal Thông báo thành công / lỗi */}
      {notification && (
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification(null)}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          itemCode={notification.itemCode}
        />
      )}
    </div>
  );
};
