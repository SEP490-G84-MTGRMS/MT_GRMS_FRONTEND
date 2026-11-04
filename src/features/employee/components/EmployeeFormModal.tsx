import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, Search, ChevronDown, X, Check, Building2 } from 'lucide-react';
import type {
  Employee,
  Branch,
  AllowanceItem,
  SalaryType,
} from '../types';
import { MOCK_DEFAULT_ALLOWANCES } from '../services/mockData';
import { CreateUserModal } from './CreateUserModal';
import { CreateAllowanceModal } from './CreateAllowanceModal';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSave: (employee: Employee, isAddNew?: boolean) => void;
  branches: Branch[];
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave,
  branches,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'salary'>('info');

  // Sub-modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateAllowance, setShowCreateAllowance] = useState(false);

  // Form states - Tab 1: Thông tin
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [attendanceCode, setAttendanceCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [citizenId, setCitizenId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // Work info
  const [startDate, setStartDate] = useState('');
  const [workingBranchIds, setWorkingBranchIds] = useState<string[]>([]);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [note, setNote] = useState('');

  // Bank info
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('Techcombank');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  // Tab 2: Lương
  const [salaryType, setSalaryType] = useState<SalaryType>('monthly');
  const [baseSalary, setBaseSalary] = useState<number>(7500000);
  const [otWeekday, setOtWeekday] = useState('150%');
  const [otSunday, setOtSunday] = useState('200%');
  const [otDayOff, setOtDayOff] = useState('200%');
  const [otHoliday, setOtHoliday] = useState('300%');
  const [enableAllowance, setEnableAllowance] = useState(true);
  const [allowances, setAllowances] = useState<AllowanceItem[]>(MOCK_DEFAULT_ALLOWANCES);

  // Sync when opening or editing
  useEffect(() => {
    if (employee) {
      setFullName(employee.fullName || '');
      setEmployeeCode(employee.employeeCode || '');
      setAttendanceCode(employee.attendanceCode || '');
      setPhone(employee.phone || '');
      setEmail(employee.email || '');
      setAvatarUrl(employee.avatarUrl || '');
      setGender(employee.gender || 'male');
      setDateOfBirth(employee.dateOfBirth || '');
      setCitizenId(employee.citizenId || '');
      setAddress(employee.address || '');
      setCity(employee.city || '');

      setStartDate(employee.startDate || '');
      setWorkingBranchIds(employee.workingBranchIds || [branches[0]?.id || '']);
      setUserId(employee.userId || '');
      setUserName(employee.userName || '');
      setNote(employee.note || '');

      setBankAccountNumber(employee.bankAccountNumber || '');
      setBankName(employee.bankName || 'Techcombank');
      setBankAccountHolder(employee.bankAccountHolder || '');

      if (employee.salaryConfig) {
        setSalaryType(employee.salaryConfig.salaryType);
        setBaseSalary(employee.salaryConfig.baseSalary);
        setOtWeekday(employee.salaryConfig.otWeekday);
        setOtSunday(employee.salaryConfig.otSunday);
        setOtDayOff(employee.salaryConfig.otDayOff);
        setOtHoliday(employee.salaryConfig.otHoliday);
        setAllowances(employee.salaryConfig.allowances || MOCK_DEFAULT_ALLOWANCES);
      }
    } else {
      // Default reset for creation
      setFullName('');
      setEmployeeCode('');
      setAttendanceCode('');
      setPhone('');
      setEmail('');
      setAvatarUrl('');
      setGender('male');
      setDateOfBirth('');
      setCitizenId('');
      setAddress('');
      setCity('');

      setStartDate(new Date().toISOString().split('T')[0]);
      setWorkingBranchIds([branches[0]?.id || '']);
      setUserId('');
      setUserName('');
      setNote('');

      setBankAccountNumber('');
      setBankName('Techcombank');
      setBankAccountHolder('');

      setSalaryType('monthly');
      setBaseSalary(7500000);
      setAllowances(MOCK_DEFAULT_ALLOWANCES);
    }
  }, [employee, branches, isOpen]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearchKeyword, setBranchSearchKeyword] = useState('');
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown chi nhánh khi click bên ngoài
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

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(branchSearchKeyword.trim().toLowerCase())
  );

  const handleWorkingBranchToggle = (branchId: string) => {
    if (workingBranchIds.includes(branchId)) {
      if (workingBranchIds.length === 1) {
        alert('Nhân viên phải có ít nhất 1 chi nhánh làm việc!');
        return;
      }
      setWorkingBranchIds(workingBranchIds.filter((id) => id !== branchId));
    } else {
      setWorkingBranchIds([...workingBranchIds, branchId]);
    }
  };

  const handleSelectAllBranches = () => {
    setWorkingBranchIds(branches.map((b) => b.id));
  };

  const handleClearAllBranches = () => {
    if (branches.length > 0) {
      setWorkingBranchIds([branches[0].id]);
    }
  };

  const handleRemoveBranchTag = (e: React.MouseEvent, branchId: string) => {
    e.stopPropagation();
    if (workingBranchIds.length <= 1) {
      alert('Nhân viên phải có ít nhất 1 chi nhánh làm việc!');
      return;
    }
    setWorkingBranchIds(workingBranchIds.filter((id) => id !== branchId));
  };

  const handleAllowanceAmountChange = (id: string, amount: number) => {
    setAllowances(
      allowances.map((item) => (item.id === id ? { ...item, amount } : item))
    );
  };

  const handleAllowanceToggle = (id: string) => {
    setAllowances(
      allowances.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleDeleteAllowance = (id: string) => {
    setAllowances(allowances.filter((item) => item.id !== id));
  };

  const handleAddAllowanceSuccess = (newAl: AllowanceItem) => {
    setAllowances([...allowances, newAl]);
  };

  const handleCreateUserSuccess = (user: { id: string; username: string }) => {
    setUserId(user.id);
    setUserName(user.username);
  };

  const handleSave = (isAddNew: boolean = false) => {
    if (!fullName.trim()) {
      alert('Vui lòng nhập Tên nhân viên!');
      return;
    }
    if (!phone.trim()) {
      alert('Vui lòng nhập Số điện thoại!');
      return;
    }
    const wBranchNames = branches
      .filter((b) => workingBranchIds.includes(b.id))
      .map((b) => b.name);

    const generatedCode =
      employeeCode.trim() || `NV${String(Math.floor(Math.random() * 900000) + 100000)}`;

    const savedEmployee: Employee = {
      id: employee?.id || `emp-${Date.now()}`,
      employeeCode: generatedCode,
      attendanceCode: attendanceCode.trim() || `CC${generatedCode.replace(/\D/g, '')}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      avatarUrl,
      gender,
      dateOfBirth,
      citizenId,
      address,
      city,
      startDate,
      workingBranchIds,
      workingBranchNames: wBranchNames,
      userId,
      userName,
      note,
      status: employee?.status || 'active',
      debtAmount: employee?.debtAmount ?? 0,
      bankAccountNumber,
      bankName,
      bankAccountHolder: bankAccountHolder.toUpperCase(),
      salaryConfig: {
        salaryType,
        baseSalary,
        otWeekday,
        otSunday,
        otDayOff,
        otHoliday,
        allowances: enableAllowance ? allowances : [],
      },
      payslips: employee?.payslips || [],
      workSchedule: employee?.workSchedule || [],
      debtHistory: employee?.debtHistory || [],
    };

    onSave(savedEmployee, isAddNew);
    if (!isAddNew) {
      onClose();
    } else {
      // Reset for next employee
      setFullName('');
      setEmployeeCode('');
      setPhone('');
      setEmail('');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="emp-modal-overlay">
        <div className="emp-modal-card">
          {/* Header */}
          <div className="emp-modal-header">
            <h3>{employee ? `Cập nhật nhân viên: ${employee.fullName}` : 'Thêm mới nhân viên'}</h3>
            <button type="button" className="emp-modal-close-btn" onClick={onClose}>
              &times;
            </button>
          </div>

          {/* Tabs */}
          <div className="emp-modal-tabs">
            <button
              type="button"
              className={`emp-modal-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Thông tin
            </button>
            <button
              type="button"
              className={`emp-modal-tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
              onClick={() => setActiveTab('salary')}
            >
              Thiết lập lương
            </button>
          </div>

          {/* Body */}
          <div className="emp-modal-body">
            {/* TAB 1: THÔNG TIN */}
            {activeTab === 'info' && (
              <div>
                {/* 1. THÔNG TIN KHỞI TẠO */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin khởi tạo</div>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div className="emp-form-group">
                        <label className="emp-form-label">
                          Tên nhân viên <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          className="emp-form-input"
                          placeholder="Nhập họ và tên đầy đủ"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="emp-grid-2">
                        <div className="emp-form-group">
                          <label className="emp-form-label">Mã nhân viên</label>
                          <input
                            type="text"
                            className="emp-form-input"
                            placeholder="Tự sinh nếu bỏ trống"
                            value={employeeCode}
                            onChange={(e) => setEmployeeCode(e.target.value)}
                          />
                        </div>
                        <div className="emp-form-group">
                          <label className="emp-form-label">
                            Số điện thoại <span className="required">*</span>
                          </label>
                          <input
                            type="tel"
                            className="emp-form-input"
                            placeholder="Số điện thoại liên hệ"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="emp-form-group">
                        <label className="emp-form-label">Email</label>
                        <input
                          type="email"
                          className="emp-form-input"
                          placeholder="Địa chỉ hòm thư điện tử"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Upload Avatar */}
                    <div style={{ width: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="emp-avatar-upload-box">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" />
                        ) : (
                          <div style={{ textAlign: 'center', padding: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                              <Camera size={26} color="#94A3B8" />
                            </div>
                            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Tải ảnh đại diện</span>
                          </div>
                        )}
                      </div>
                      <small style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, textAlign: 'center' }}>
                        Tối đa 2MB
                      </small>
                    </div>
                  </div>
                </div>

                {/* 2. THÔNG TIN CÔNG VIỆC */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin công việc</div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Ngày bắt đầu làm việc</label>
                      <input
                        type="date"
                        className="emp-form-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Mã chấm công</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Mã máy chấm công (nếu có)"
                        value={attendanceCode}
                        onChange={(e) => setAttendanceCode(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Các chi nhánh làm việc - Searchable Multi-Select UI */}
                  <div className="emp-form-group" ref={branchDropdownRef} style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="emp-form-label" style={{ marginBottom: 0 }}>
                        Các chi nhánh làm việc <span className="required">*</span>
                      </label>
                      <span style={{ fontSize: 12, color: '#0F766E', fontWeight: 600 }}>
                        Đã chọn {workingBranchIds.length}/{branches.length} chi nhánh
                      </span>
                    </div>

                    {/* Selector Trigger Input */}
                    <div
                      onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                      style={{
                        minHeight: 40,
                        padding: '6px 12px',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                        <Building2 size={16} color="#64748B" style={{ flexShrink: 0 }} />

                        {workingBranchIds.length === 0 ? (
                          <span style={{ color: '#94A3B8', fontSize: 13 }}>Chọn các chi nhánh làm việc...</span>
                        ) : workingBranchIds.length === branches.length && branches.length > 2 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: '#F0FDFA',
                              color: '#0F766E',
                              border: '1px solid #99F6E4',
                            }}
                          >
                            Tất cả chi nhánh ({branches.length})
                          </span>
                        ) : (
                          <>
                            {branches
                              .filter((b) => workingBranchIds.includes(b.id))
                              .slice(0, 3)
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
                                  }}
                                >
                                  <span>{b.name}</span>
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
                                    }}
                                  >
                                    <X size={11} />
                                  </span>
                                </span>
                              ))}
                            {workingBranchIds.length > 3 && (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: '#F1F5F9',
                                  color: '#475569',
                                }}
                              >
                                +{workingBranchIds.length - 3} chi nhánh khác
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B' }}>
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
                              Mặc định (1 CN)
                            </button>
                          </div>
                        </div>

                        {/* Branches List */}
                        <div style={{ maxHeight: 210, overflowY: 'auto', padding: '4px 0' }}>
                          {filteredBranches.length ? (
                            filteredBranches.map((b) => {
                              const isChecked = workingBranchIds.includes(b.id);
                              return (
                                <div
                                  key={b.id}
                                  onClick={() => handleWorkingBranchToggle(b.id)}
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
                                      onChange={() => {}} // Đã xử lý ở cấp row onClick
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
                            Xong ({workingBranchIds.length})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="emp-form-label">Tài khoản đăng nhập</label>
                        <button
                          type="button"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#0F766E',
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                          onClick={() => setShowCreateUser(true)}
                        >
                          + Tạo tài khoản
                        </button>
                      </div>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Chưa liên kết tài khoản"
                        value={userName || (userId ? `ID: ${userId}` : '')}
                        readOnly
                        style={{ backgroundColor: '#F8FAFC' }}
                      />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Ghi chú</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Ghi chú nhân sự..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. THÔNG TIN NGÂN HÀNG */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin tài khoản ngân hàng</div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Số tài khoản</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Nhập số tài khoản"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                      />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Ngân hàng</label>
                      <select
                        className="emp-form-select"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      >
                        <option value="Techcombank">Techcombank (TCB)</option>
                        <option value="Vietcombank">Vietcombank (VCB)</option>
                        <option value="MB Bank">MB Bank</option>
                        <option value="BIDV">BIDV</option>
                        <option value="ACB">ACB</option>
                        <option value="VPBank">VPBank</option>
                      </select>
                    </div>
                  </div>

                  <div className="emp-form-group">
                    <label className="emp-form-label">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      className="emp-form-input"
                      placeholder="VD: NGUYEN VAN A"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                    />
                  </div>
                </div>

                {/* 4. THÔNG TIN CÁ NHÂN */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin cá nhân</div>
                  <div className="emp-grid-3">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Số CMND / CCCD</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Số căn cước công dân"
                        value={citizenId}
                        onChange={(e) => setCitizenId(e.target.value)}
                      />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Ngày sinh</label>
                      <input
                        type="date"
                        className="emp-form-input"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Giới tính</label>
                      <div style={{ display: 'flex', gap: 16, height: 40, alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input
                            type="radio"
                            name="gender"
                            checked={gender === 'male'}
                            onChange={() => setGender('male')}
                            style={{ accentColor: '#0F766E' }}
                          />
                          <span>Nam</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input
                            type="radio"
                            name="gender"
                            checked={gender === 'female'}
                            onChange={() => setGender('female')}
                            style={{ accentColor: '#0F766E' }}
                          />
                          <span>Nữ</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Địa chỉ</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Số nhà, đường phố..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Tỉnh / Thành phố</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="VD: Hà Nội, TP. Hồ Chí Minh"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: THIẾT LẬP LƯƠNG */}
            {activeTab === 'salary' && (
              <div>
                <div className="emp-section-card">
                  <div className="emp-section-title">Hình thức & Mức lương chính</div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Hình thức trả lương</label>
                      <select
                        className="emp-form-select"
                        value={salaryType}
                        onChange={(e) => setSalaryType(e.target.value as SalaryType)}
                      >
                        <option value="monthly">Lương cố định theo tháng</option>
                        <option value="hourly">Lương theo giờ làm việc</option>
                        <option value="shift">Lương theo ca làm việc</option>
                      </select>
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">
                        {salaryType === 'monthly'
                          ? 'Mức lương chính (VNĐ/tháng)'
                          : salaryType === 'hourly'
                          ? 'Mức lương chính (VNĐ/giờ)'
                          : 'Mức lương chính (VNĐ/ca)'}
                      </label>
                      <input
                        type="number"
                        step="500000"
                        className="emp-form-input"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* OT Config */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Hệ số làm thêm giờ (OT)</div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Tăng ca ngày thường</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        value={otWeekday}
                        onChange={(e) => setOtWeekday(e.target.value)}
                      />
                    </div>
                    <div className="emp-form-group">
                      <label className="emp-form-label">Tăng ca Chủ nhật / Ngày nghỉ</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        value={otSunday}
                        onChange={(e) => setOtSunday(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Tăng ca ngày Lễ / Tết</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        value={otHoliday}
                        onChange={(e) => setOtHoliday(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Phụ cấp */}
                <div className="emp-section-card">
                  <div className="emp-section-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>Phụ cấp hỗ trợ</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400 }}>
                        <input
                          type="checkbox"
                          checked={enableAllowance}
                          onChange={(e) => setEnableAllowance(e.target.checked)}
                          style={{ accentColor: '#0F766E' }}
                        />
                        <span>Kích hoạt phụ cấp</span>
                      </label>
                    </div>
                    {enableAllowance && (
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#0F766E',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                        onClick={() => setShowCreateAllowance(true)}
                      >
                        + Thêm loại phụ cấp
                      </button>
                    )}
                  </div>

                  {enableAllowance && (
                    <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 8 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>Bật</th>
                          <th>Tên phụ cấp</th>
                          <th>Loại phụ cấp</th>
                          <th style={{ width: 180 }}>Mức phụ cấp (VNĐ)</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {allowances.map((al) => (
                          <tr key={al.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={al.enabled}
                                onChange={() => handleAllowanceToggle(al.id)}
                                style={{ accentColor: '#0F766E' }}
                              />
                            </td>
                            <td style={{ fontWeight: 600 }}>{al.name}</td>
                            <td style={{ color: '#64748B' }}>{al.type}</td>
                            <td>
                              <input
                                type="number"
                                className="emp-form-input"
                                style={{ height: 32 }}
                                value={al.amount}
                                onChange={(e) => handleAllowanceAmountChange(al.id, Number(e.target.value))}
                                disabled={!al.enabled}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 4,
                                }}
                                onClick={() => handleDeleteAllowance(al.id)}
                                title="Xóa phụ cấp"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
              Bỏ qua
            </button>
            {!employee && (
              <button
                type="button"
                className="emp-btn emp-btn-outline-teal"
                onClick={() => handleSave(true)}
              >
                Lưu & Thêm mới
              </button>
            )}
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              onClick={() => handleSave(false)}
            >
              Lưu thông tin
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <CreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onSuccess={handleCreateUserSuccess}
      />
      <CreateAllowanceModal
        isOpen={showCreateAllowance}
        onClose={() => setShowCreateAllowance(false)}
        onSuccess={handleAddAllowanceSuccess}
      />
    </>
  );
};
