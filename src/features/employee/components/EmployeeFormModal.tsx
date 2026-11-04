import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, Search, ChevronDown, X, Check, Building2, AlertTriangle } from 'lucide-react';
import type {
  Employee,
  Branch,
  AllowanceItem,
  SalaryType,
} from '../types';
import { CreateUserModal } from './CreateUserModal';
import { CreateAllowanceModal } from './CreateAllowanceModal';
import { employeeApi } from '../api/employeeApi';
import { mapFormToCreatePayload } from '../lib/employeeMapper';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSave: (employee: Employee, isAddNew?: boolean) => void;
  branches: Branch[];
}

const PREDEFINED_BANKS = [
  { value: 'Techcombank', label: 'Techcombank (TCB)' },
  { value: 'Vietcombank', label: 'Vietcombank (VCB)' },
  { value: 'MB Bank', label: 'MB Bank (MB)' },
  { value: 'BIDV', label: 'BIDV' },
  { value: 'VietinBank', label: 'VietinBank (CTG)' },
  { value: 'Agribank', label: 'Agribank' },
  { value: 'ACB', label: 'ACB' },
  { value: 'VPBank', label: 'VPBank' },
  { value: 'TPBank', label: 'TPBank' },
  { value: 'Sacombank', label: 'Sacombank' },
  { value: 'HDBank', label: 'HDBank' },
  { value: 'VIB', label: 'VIB' },
  { value: 'SHB', label: 'SHB' },
  { value: 'MSB', label: 'MSB' },
  { value: 'OCB', label: 'OCB' },
  { value: 'SeABank', label: 'SeABank' },
];

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states - Tab 1: Thông tin
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [citizenId, setCitizenId] = useState('');
  const [address, setAddress] = useState('');

  // Work info
  const [startDate, setStartDate] = useState('');
  const [workingBranchIds, setWorkingBranchIds] = useState<string[]>([]);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [note, setNote] = useState('');

  // Bank info
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankSelect, setBankSelect] = useState('Techcombank');
  const [customBankName, setCustomBankName] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  // Tab 2: Lương
  const [salaryType, setSalaryType] = useState<SalaryType>('monthly');
  const [baseSalary, setBaseSalary] = useState<number | ''>('');
  const [otWeekday, setOtWeekday] = useState('');
  const [otSunday, setOtSunday] = useState('');
  const [otDayOff, setOtDayOff] = useState('');
  const [otHoliday, setOtHoliday] = useState('300%');
  const [enableAllowance, setEnableAllowance] = useState(false);
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);

  // Sync when opening or editing
  useEffect(() => {
    if (employee) {
      setFullName(employee.fullName || '');
      setEmployeeCode(employee.employeeCode || '');
      setPhone(employee.phone || '');
      setEmail(employee.email || '');
      setAvatarUrl(employee.avatarUrl || '');
      setGender(employee.gender || 'male');
      setDateOfBirth(employee.dateOfBirth || '');
      setCitizenId(employee.citizenId || '');
      setAddress(employee.address || '');

      setStartDate(employee.startDate || '');
      setWorkingBranchIds(employee.workingBranchIds || [branches[0]?.id || '']);
      setUserId(employee.userId || '');
      setUserName(employee.userName || '');
      setNote(employee.note || '');

      setBankAccountNumber(employee.bankAccountNumber || '');
      const empBank = employee.bankName || '';
      if (empBank && PREDEFINED_BANKS.some((b) => b.value === empBank)) {
        setBankSelect(empBank);
        setCustomBankName('');
      } else if (empBank) {
        setBankSelect('OTHER');
        setCustomBankName(empBank);
      } else {
        setBankSelect('Techcombank');
        setCustomBankName('');
      }
      setBankAccountHolder(employee.bankAccountHolder || '');

      if (employee.salaryConfig) {
        setSalaryType(employee.salaryConfig.salaryType);
        setBaseSalary(employee.salaryConfig.baseSalary ?? '');
        setOtWeekday(employee.salaryConfig.otWeekday || '');
        setOtSunday(employee.salaryConfig.otSunday || '');
        setOtDayOff(employee.salaryConfig.otDayOff || '');
        setOtHoliday(employee.salaryConfig.otHoliday);
        const empAllowances = employee.salaryConfig.allowances || [];
        setAllowances(empAllowances);
        setEnableAllowance(empAllowances.length > 0);
      }
    } else {
      // Default reset for creation
      setFullName('');
      setEmployeeCode('');
      setPhone('');
      setEmail('');
      setAvatarUrl('');
      setGender('male');
      setDateOfBirth('');
      setCitizenId('');
      setAddress('');

      setStartDate(new Date().toISOString().split('T')[0]);
      setWorkingBranchIds([branches[0]?.id || '']);
      setUserId('');
      setUserName('');
      setNote('');

      setBankAccountNumber('');
      setBankSelect('Techcombank');
      setCustomBankName('');
      setBankAccountHolder('');

      setSalaryType('monthly');
      setBaseSalary('');
      setOtWeekday('');
      setOtSunday('');
      setOtDayOff('');
      setAllowances([]);
      setEnableAllowance(false);
    }
    setFormError(null);
    setIsSubmitting(false);
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

  const handleAllowanceNameChange = (id: string, name: string) => {
    setAllowances(
      allowances.map((item) => (item.id === id ? { ...item, name } : item))
    );
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

  const handleAddAllowanceRow = () => {
    setEnableAllowance(true);
    const newAl: AllowanceItem = {
      id: `al_${Date.now()}`,
      name: '',
      type: 'monthly',
      amount: 0,
      enabled: true,
    };
    setAllowances((prev) => [...prev, newAl]);
  };

  const totalAllowances = enableAllowance
    ? allowances
      .filter((a) => a.enabled)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
    : 0;

  const handleAddAllowanceSuccess = (newAl: AllowanceItem) => {
    setAllowances([...allowances, newAl]);
  };

  const handleCreateUserSuccess = (user: { id: string; username: string }) => {
    setUserId(user.id);
    setUserName(user.username);
  };

  const handleSave = async (isAddNew: boolean = false) => {
    setFormError(null);
    if (!fullName.trim()) {
      setFormError('Vui lòng nhập Họ và tên nhân viên!');
      return;
    }
    if (!phone.trim()) {
      setFormError('Vui lòng nhập Số điện thoại!');
      return;
    }
    if (!citizenId.trim()) {
      setFormError('Vui lòng nhập Số CMND / CCCD (12 chữ số)!');
      return;
    }
    if (!/^\d{12}$/.test(citizenId.trim())) {
      setFormError('Số CMND / CCCD phải bao gồm đúng 12 chữ số!');
      return;
    }

    if (bankSelect === 'OTHER' && !customBankName.trim()) {
      setFormError('Vui lòng nhập tên ngân hàng khác!');
      return;
    }
    const effectiveBankName = bankSelect === 'OTHER' ? customBankName.trim() : bankSelect;

    const targetBranchId = workingBranchIds[0] || (branches[0] ? branches[0].id : '');
    if (!targetBranchId) {
      setFormError('Vui lòng chọn ít nhất 1 chi nhánh làm việc!');
      return;
    }

    const payload = mapFormToCreatePayload(
      {
        fullName,
        citizenId,
        phone,
        email,
        address,
        startDate,
        note,
        gender,
        dateOfBirth,
        bankAccountNumber,
        bankName: effectiveBankName,
        bankAccountHolder,
        avatarUrl,
        salaryBranchId: targetBranchId,
      },
      {
        salaryType,
        baseSalary: Number(baseSalary) || 0,
        otWeekday: otWeekday || '150%',
        otSunday: otSunday || '200%',
        otDayOff: otDayOff || '200%',
        otHoliday,
        allowances: enableAllowance ? allowances : [],
      },
      targetBranchId
    );

    setIsSubmitting(true);
    try {
      let savedEmp: Employee;
      if (employee?.id) {
        savedEmp = await employeeApi.updateEmployee(employee.id, payload);
      } else {
        savedEmp = await employeeApi.createEmployee(payload);
      }

      onSave(savedEmp, isAddNew);
      if (!isAddNew) {
        onClose();
      } else {
        // Reset for next employee
        setFullName('');
        setEmployeeCode('');
        setPhone('');
        setEmail('');
        setCitizenId('');
        setDateOfBirth('');
        setFormError(null);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Lưu thông tin thất bại. Vui lòng kiểm tra lại.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
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
            <button
              type="button"
              className="emp-modal-close-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              &times;
            </button>
          </div>

          {formError && (
            <div
              style={{
                margin: '12px 24px 0',
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                borderRadius: 6,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}

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
                  <div className="emp-form-group">
                    <label className="emp-form-label">Ngày bắt đầu làm việc</label>
                    <input
                      type="date"
                      className="emp-form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
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
                                      onChange={() => { }} // Đã xử lý ở cấp row onClick
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
                        value={bankSelect}
                        onChange={(e) => setBankSelect(e.target.value)}
                      >
                        {PREDEFINED_BANKS.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                        <option value="OTHER">Ngân hàng khác...</option>
                      </select>
                    </div>
                  </div>

                  {bankSelect === 'OTHER' && (
                    <div className="emp-form-group" style={{ marginTop: 12 }}>
                      <label className="emp-form-label" style={{ color: '#0F766E', fontWeight: 600 }}>
                        Tên ngân hàng khác <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Nhập tên ngân hàng (VD: Shinhan Bank, Woori Bank...)"
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}

                  <div className="emp-form-group" style={{ marginTop: 12 }}>
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

                  <div className="emp-form-group" style={{ marginTop: 12 }}>
                    <label className="emp-form-label">Địa chỉ</label>
                    <input
                      type="text"
                      className="emp-form-input"
                      placeholder="Số nhà, đường phố, phường/xã, quận/huyện, tỉnh/thành..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
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
                        step="50000"
                        className="emp-form-input"
                        placeholder={
                          salaryType === 'monthly'
                            ? 'VD: 7,500,000'
                            : salaryType === 'hourly'
                              ? 'VD: 30,000'
                              : 'VD: 250,000'
                        }
                        value={baseSalary === '' ? '' : baseSalary}
                        onChange={(e) => setBaseSalary(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* OT Config */}
                <div className="emp-section-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div className="emp-section-title" style={{ marginBottom: 2 }}>Hệ số làm thêm giờ (OT)</div>
                    </div>
                  </div>

                  <div className="emp-grid-2">
                    {/* Tăng ca ngày thường */}
                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="emp-form-label" style={{ marginBottom: 0 }}>Ngày thường</label>
                        {otWeekday && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#0F766E' }}>
                            x{((parseInt(otWeekday.replace('%', '')) || 0) / 100).toFixed(1)} lương/giờ
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          min={100}
                          max={500}
                          step={10}
                          className="emp-form-input"
                          style={{ paddingRight: 36, fontWeight: 600 }}
                          value={otWeekday ? otWeekday.replace('%', '') : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setOtWeekday(val ? `${val}%` : '');
                          }}
                          placeholder="150"
                        />
                        <span style={{ position: 'absolute', right: 12, color: '#64748B', fontWeight: 600, pointerEvents: 'none' }}>
                          %
                        </span>
                      </div>
                    </div>

                    {/* Tăng ca Chủ nhật / Ngày nghỉ */}
                    <div className="emp-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="emp-form-label" style={{ marginBottom: 0 }}>Chủ nhật / Nghỉ tuần</label>
                        {otSunday && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#0F766E' }}>
                            x{((parseInt(otSunday.replace('%', '')) || 0) / 100).toFixed(1)} lương/giờ
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          min={100}
                          max={500}
                          step={10}
                          className="emp-form-input"
                          style={{ paddingRight: 36, fontWeight: 600 }}
                          value={otSunday ? otSunday.replace('%', '') : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setOtSunday(val ? `${val}%` : '');
                            setOtDayOff(val ? `${val}%` : '');
                          }}
                          placeholder="200"
                        />
                        <span style={{ position: 'absolute', right: 12, color: '#64748B', fontWeight: 600, pointerEvents: 'none' }}>
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phụ cấp */}
                <div className="emp-section-card">
                  <div className="emp-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>Phụ cấp lương</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400 }}>
                        <input
                          type="checkbox"
                          checked={enableAllowance}
                          onChange={(e) => setEnableAllowance(e.target.checked)}
                          style={{ accentColor: '#0F766E' }}
                        />
                        <span>Áp dụng phụ cấp</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      style={{
                        background: '#F0FDFA',
                        border: '1px solid #99F6E4',
                        color: '#0F766E',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                      onClick={handleAddAllowanceRow}
                    >
                      + Thêm khoản phụ cấp
                    </button>
                  </div>

                  {enableAllowance && (
                    <>
                      <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 8, marginTop: 8 }}>
                        <thead>
                          <tr>
                            <th style={{ width: 44, textAlign: 'center' }}>Bật</th>
                            <th>Tên khoản phụ cấp</th>
                            <th style={{ width: 220 }}>Số tiền (VNĐ)</th>
                            <th style={{ width: 44, textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {allowances.length > 0 ? (
                            allowances.map((al) => (
                              <tr key={al.id}>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={al.enabled}
                                    onChange={() => handleAllowanceToggle(al.id)}
                                    style={{ accentColor: '#0F766E' }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="emp-form-input"
                                    style={{ height: 32 }}
                                    placeholder="Tên khoản phụ cấp (VD: Ăn trưa, xăng xe, trách nhiệm...)"
                                    value={al.name}
                                    onChange={(e) => handleAllowanceNameChange(al.id, e.target.value)}
                                    disabled={!al.enabled}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="emp-form-input"
                                    style={{ height: 32 }}
                                    step="10000"
                                    min="0"
                                    placeholder="Số tiền (VD: 500,000)"
                                    value={!al.amount ? '' : al.amount}
                                    onChange={(e) =>
                                      handleAllowanceAmountChange(
                                        al.id,
                                        e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                                      )
                                    }
                                    disabled={!al.enabled}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
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
                                    title="Xóa phụ cấp này"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>
                                Chưa có khoản phụ cấp nào. Bấm "+ Thêm khoản phụ cấp" để tạo mới.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Total Allowance Summary */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: 12,
                          marginTop: 10,
                          padding: '8px 14px',
                          background: '#F8FAFC',
                          borderRadius: 6,
                          border: '1px solid #E2E8F0',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        <span>Tổng phụ cấp đang áp dụng:</span>
                        <span style={{ color: '#0F766E', fontSize: 15, fontWeight: 700 }}>
                          {totalAllowances.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="emp-modal-footer">
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Bỏ qua
            </button>
            {!employee && (
              <button
                type="button"
                className="emp-btn emp-btn-outline-teal"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu & Thêm mới'}
              </button>
            )}
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <CreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        employeeId={employee?.id}
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
