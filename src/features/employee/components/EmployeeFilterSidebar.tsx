import React from 'react';
import type { Department, JobTitle, Branch, EmployeeFilterState } from '../types';

interface EmployeeFilterSidebarProps {
  filters: EmployeeFilterState;
  onFilterChange: (newFilters: EmployeeFilterState) => void;
  departments: Department[];
  jobTitles: JobTitle[];
  branches: Branch[];
  onOpenCreatePosition?: () => void;
  onResetFilters: () => void;
}

export const EmployeeFilterSidebar: React.FC<EmployeeFilterSidebarProps> = ({
  filters,
  onFilterChange,
  departments,
  jobTitles,
  branches,
  onOpenCreatePosition,
  onResetFilters,
}) => {
  const handleStatusChange = (status: 'all' | 'active' | 'inactive') => {
    onFilterChange({ ...filters, status });
  };

  const handleWorkingBranchChange = (branchId: string) => {
    onFilterChange({ ...filters, workingBranchId: branchId });
  };

  const handleSalaryBranchChange = (branchId: string) => {
    onFilterChange({ ...filters, salaryBranchId: branchId });
  };

  const handleDepartmentChange = (deptId: string) => {
    onFilterChange({ ...filters, departmentId: deptId });
  };

  const handleJobTitleChange = (jobTitleId: string) => {
    onFilterChange({ ...filters, jobTitleId });
  };

  const selectedBranchName = branches.find((b) => b.id === filters.workingBranchId)?.name;

  return (
    <aside className="emp-filter-sidebar">
      {/* 1. TRẠNG THÁI */}
      <div className="emp-filter-group">
        <div className="emp-filter-title">
          <span>Trạng thái</span>
        </div>
        <label className="emp-radio-label">
          <input
            type="radio"
            name="status"
            checked={filters.status === 'active'}
            onChange={() => handleStatusChange('active')}
          />
          <span>Đang làm việc</span>
        </label>
        <label className="emp-radio-label">
          <input
            type="radio"
            name="status"
            checked={filters.status === 'inactive'}
            onChange={() => handleStatusChange('inactive')}
          />
          <span>Đã nghỉ</span>
        </label>
        <label className="emp-radio-label">
          <input
            type="radio"
            name="status"
            checked={filters.status === 'all'}
            onChange={() => handleStatusChange('all')}
          />
          <span>Tất cả</span>
        </label>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

      {/* 2. CHI NHÁNH LÀM VIỆC */}
      <div className="emp-filter-group">
        <div className="emp-filter-title">
          <span>Chi nhánh làm việc</span>
        </div>
        {filters.workingBranchId ? (
          <div className="emp-branch-tag">
            <span>{selectedBranchName}</span>
            <button
              type="button"
              onClick={() => handleWorkingBranchChange('')}
              title="Bỏ chọn chi nhánh"
            >
              &times;
            </button>
          </div>
        ) : (
          <select
            className="emp-filter-select"
            value={filters.workingBranchId}
            onChange={(e) => handleWorkingBranchChange(e.target.value)}
          >
            <option value="">Tất cả chi nhánh làm việc</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

      {/* 3. CHI NHÁNH TRẢ LƯƠNG */}
      <div className="emp-filter-group">
        <div className="emp-filter-title">
          <span>Chi nhánh trả lương</span>
        </div>
        <select
          className="emp-filter-select"
          value={filters.salaryBranchId}
          onChange={(e) => handleSalaryBranchChange(e.target.value)}
        >
          <option value="">Tất cả chi nhánh trả lương</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

      {/* 4. PHÒNG BAN */}
      <div className="emp-filter-group">
        <div className="emp-filter-title">
          <span>Phòng ban</span>
        </div>
        <select
          className="emp-filter-select"
          value={filters.departmentId}
          onChange={(e) => handleDepartmentChange(e.target.value)}
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} {d.employeeCount ? `(${d.employeeCount})` : ''}
            </option>
          ))}
        </select>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

      {/* 5. CHỨC DANH */}
      <div className="emp-filter-group">
        <div className="emp-filter-title">
          <span>Chức danh</span>
          {onOpenCreatePosition && (
            <a
              href="#create_pos"
              onClick={(e) => {
                e.preventDefault();
                onOpenCreatePosition();
              }}
            >
              + Tạo mới
            </a>
          )}
        </div>
        <select
          className="emp-filter-select"
          value={filters.jobTitleId}
          onChange={(e) => handleJobTitleChange(e.target.value)}
        >
          <option value="">Tất cả chức danh</option>
          {jobTitles.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          className="emp-btn emp-btn-secondary"
          style={{ width: '100%', height: 34, fontSize: 12 }}
          onClick={onResetFilters}
        >
          Đặt lại bộ lọc
        </button>
      </div>
    </aside>
  );
};
