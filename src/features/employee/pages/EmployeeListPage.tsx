import React, { useState, useEffect, useCallback } from 'react';
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
  RotateCw,
  Trash2,
} from 'lucide-react';
import type {
  Employee,
  Branch,
  EmployeeStatus,
  EmployeeFilterState,
  ApprovalRequest,
  DebtTransaction,
} from '../types';
import { employeeApi } from '../api/employeeApi';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { EmployeeDetailModal } from '../components/EmployeeDetailModal';
import { ApprovalRequestsModal } from '../components/ApprovalRequestsModal';
import { ImportEmployeeModal } from '../components/ImportEmployeeModal';
import '../employee.css';

export const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();

  // State data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search input & Debounced filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<EmployeeFilterState>({
    keyword: '',
    status: 'all',
    workingBranchId: '',
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.keyword !== searchTerm) {
          return { ...prev, keyword: searchTerm };
        }
        return prev;
      });
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
      const res = await employeeApi.getEmployeesPaged({
        keyword: filters.keyword || undefined,
        branchId: filters.workingBranchId || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        page,
        pageSize,
      });
      setEmployees(res.items);
      setTotalItems(res.totalItems);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách nhân viên.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters.keyword, filters.workingBranchId, filters.status, page, pageSize]);

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

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setShowFormModal(true);
  };

  const handleSaveEmployee = (savedEmp: Employee, isAddNew: boolean = false) => {
    fetchEmployees();

    if (selectedDetailEmployee?.id === savedEmp.id) {
      setSelectedDetailEmployee(savedEmp);
    }

    if (!isAddNew) {
      setShowFormModal(false);
      setEditingEmployee(null);
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
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Cập nhật trạng thái nhân viên thất bại.');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await employeeApi.deleteEmployee(employeeId);
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
      setTotalItems((prev) => Math.max(0, prev - 1));
      setSelectedIds((prev) => prev.filter((id) => id !== employeeId));
      if (selectedDetailEmployee?.id === employeeId) {
        setSelectedDetailEmployee(null);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Xóa nhân viên thất bại.');
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

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="emp-page-container">
      {/* ─── TITLE & ACTION BAR ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 className="emp-header-title" style={{ margin: 0 }}>
          <span>Danh sách nhân viên</span>
          <span className="count-badge">{totalItems}</span>
        </h2>

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
                  setFilters((prev) => ({ ...prev, keyword: searchTerm }));
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
                  setFilters((prev) => ({ ...prev, keyword: '' }));
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

          {/* 2. Lọc Chi nhánh làm việc */}
          <div style={{ minWidth: 220 }}>
            <select
              className="emp-form-select"
              style={{ height: 40, padding: '0 12px', fontSize: 13, background: '#F8FAFC' }}
              value={filters.workingBranchId}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, workingBranchId: e.target.value }));
                setPage(1);
              }}
            >
              <option value="">Tất cả chi nhánh làm việc</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Lọc Trạng thái (Tabs/Pills) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#F1F5F9',
              padding: 3,
              borderRadius: 8,
            }}
          >
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'active', label: 'Đang làm việc' },
              { key: 'inactive', label: 'Đã nghỉ' },
            ].map((tab) => {
              const isSelected = filters.status === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, status: tab.key as any }));
                    setPage(1);
                  }}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 500,
                    borderRadius: 6,
                    border: 'none',
                    background: isSelected ? '#FFFFFF' : 'transparent',
                    color: isSelected ? '#0F766E' : '#64748B',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Nút Đặt lại bộ lọc */}
        {(searchTerm || filters.workingBranchId || filters.status !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilters({
                keyword: '',
                status: 'all',
                workingBranchId: '',
              });
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
                        onClick={() => {
                          if (
                            window.confirm(
                              `Bạn có chắc chắn muốn xóa nhân viên "${emp.fullName}" (${emp.employeeCode})?`
                            )
                          ) {
                            handleDeleteEmployee(emp.id);
                          }
                        }}
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

          {/* Pagination bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderTop: '1px solid #E2E8F0',
              fontSize: 13,
              color: '#64748B',
            }}
          >
            <div>
              Hiển thị {totalItems > 0 ? (page - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(page * pageSize, totalItems)} trên tổng số {totalItems} nhân viên
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                type="button"
                className="emp-btn emp-btn-secondary"
                style={{ padding: '4px 12px', height: 32 }}
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </button>
              <span style={{ padding: '0 8px', fontWeight: 600 }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="emp-btn emp-btn-secondary"
                style={{ padding: '4px 12px', height: 32 }}
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Trang sau
              </button>
            </div>
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
        onDelete={handleDeleteEmployee}
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
    </div>
  );
};
