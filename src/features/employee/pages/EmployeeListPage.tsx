import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Banknote,
  ClipboardCheck,
  MoreHorizontal,
  Upload,
  Download,
  User,
  AlertTriangle,
} from 'lucide-react';
import type {
  Employee,
  EmployeeStatus,
  EmployeeFilterState,
  ApprovalRequest,
  DebtTransaction,
} from '../types';
import {
  MOCK_EMPLOYEES,
  MOCK_BRANCHES,
  MOCK_APPROVAL_REQUESTS,
} from '../services/mockData';
import { EmployeeFilterSidebar } from '../components/EmployeeFilterSidebar';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { EmployeeDetailModal } from '../components/EmployeeDetailModal';
import { ApprovalRequestsModal } from '../components/ApprovalRequestsModal';
import { ImportEmployeeModal } from '../components/ImportEmployeeModal';
import '../employee.css';

export const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();
  // State data
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [branches] = useState(MOCK_BRANCHES);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(MOCK_APPROVAL_REQUESTS);

  // Filters state
  const [filters, setFilters] = useState<EmployeeFilterState>({
    keyword: '',
    status: 'active',
    workingBranchId: '',
  });

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<Employee | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Keyword search (Code, Name, Phone)
      if (filters.keyword.trim()) {
        const kw = filters.keyword.toLowerCase().trim();
        const matchName = emp.fullName.toLowerCase().includes(kw);
        const matchCode = emp.employeeCode.toLowerCase().includes(kw);
        const matchPhone = emp.phone.includes(kw);
        if (!matchName && !matchCode && !matchPhone) return false;
      }

      // 2. Status
      if (filters.status !== 'all' && emp.status !== filters.status) {
        return false;
      }

      // 3. Working branch
      if (filters.workingBranchId && !emp.workingBranchIds.includes(filters.workingBranchId)) {
        return false;
      }

      return true;
    });
  }, [employees, filters]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmployees.map((e) => e.id));
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

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setShowFormModal(true);
  };

  const handleSaveEmployee = (savedEmp: Employee, isAddNew: boolean = false) => {
    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === savedEmp.id);
      if (exists) {
        return prev.map((e) => (e.id === savedEmp.id ? savedEmp : e));
      }
      return [savedEmp, ...prev];
    });

    if (selectedDetailEmployee?.id === savedEmp.id) {
      setSelectedDetailEmployee(savedEmp);
    }

    if (!isAddNew) {
      setShowFormModal(false);
      setEditingEmployee(null);
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
    alert(`Đang xuất danh sách ${filteredEmployees.length} nhân viên ra file Excel...`);
    setShowActionDropdown(false);
  };

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('vi-VN');
  };

  return (
    <div className="emp-page-container">
      {/* ─── HEADER BAR ─── */}
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 className="emp-header-title">
            <span>Danh sách nhân viên</span>
            <span className="count-badge">{filteredEmployees.length}</span>
          </h2>

          <div className="emp-search-box">
            <span className="emp-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã, tên, SĐT nhân viên..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            />
          </div>
        </div>

        <div className="emp-header-actions">
          <button type="button" className="emp-btn emp-btn-primary" onClick={handleCreateNew}>
            <Plus size={16} />
            <span>Nhân viên</span>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={() => navigate('/store-owner/employees/payroll')}
          >
            <Banknote size={16} />
            <span>Bảng tính lương</span>
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
          <div style={{ position: 'relative' }}>
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
                  zIndex: 200,
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT LAYOUT: SIDEBAR + TABLE ─── */}
      <div className="emp-main-layout">
        {/* Left Filter Sidebar */}
        <EmployeeFilterSidebar
          filters={filters}
          onFilterChange={setFilters}
          branches={branches}
          onResetFilters={() =>
            setFilters({
              keyword: '',
              status: 'all',
              workingBranchId: '',
            })
          }
        />

        {/* Right Data Table */}
        <div className="emp-table-container">
          <table className="emp-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredEmployees.length > 0 &&
                      selectedIds.length === filteredEmployees.length
                    }
                    style={{ accentColor: '#0F766E' }}
                  />
                </th>
                <th style={{ width: 44, textAlign: 'center' }}></th>
                <th style={{ width: 110 }}>Mã NV</th>
                <th style={{ width: 110 }}>Mã chấm công</th>
                <th>Tên nhân viên</th>
                <th>Số điện thoại</th>
                <th className="align-right">Nợ và tạm ứng</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length ? (
                filteredEmployees.map((emp) => (
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
                        onChange={() => {}}
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
                    <td style={{ color: '#64748B' }}>{emp.attendanceCode || '-'}</td>
                    <td>
                      <div className="emp-name-badge">
                        <span>{emp.fullName}</span>
                        {emp.hasWarning && (
                          <span className="emp-warning-icon" title="Có cảnh báo">
                            <AlertTriangle size={14} color="#F59E0B" />
                          </span>
                        )}
                      </div>
                    </td>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94A3B8', padding: 48 }}>
                    Không tìm thấy nhân viên nào phù hợp với bộ lọc hiện tại
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
        onImportSuccess={() => {}}
      />
    </div>
  );
};
