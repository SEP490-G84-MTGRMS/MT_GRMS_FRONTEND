import React, { useState, useEffect } from 'react';
import type {
  Employee,
  Department,
  JobTitle,
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
  departments: Department[];
  jobTitles: JobTitle[];
  branches: Branch[];
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave,
  departments,
  jobTitles,
  branches,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'salary' | 'insurance'>('info');

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
  const [departmentId, setDepartmentId] = useState('');
  const [jobTitleId, setJobTitleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [salaryBranchId, setSalaryBranchId] = useState('');
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

      setDepartmentId(employee.departmentId || '');
      setJobTitleId(employee.jobTitleId || '');
      setStartDate(employee.startDate || '');
      setSalaryBranchId(employee.salaryBranchId || (branches[0]?.id || ''));
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

      setDepartmentId(departments[0]?.id || '');
      setJobTitleId(jobTitles[0]?.id || '');
      setStartDate(new Date().toISOString().split('T')[0]);
      setSalaryBranchId(branches[0]?.id || '');
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
  }, [employee, branches, departments, jobTitles, isOpen]);

  if (!isOpen) return null;

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
    if (!salaryBranchId) {
      alert('Vui lòng chọn Chi nhánh trả lương!');
      return;
    }

    const deptName = departments.find((d) => d.id === departmentId)?.name;
    const titleName = jobTitles.find((jt) => jt.id === jobTitleId)?.name;
    const sBranchName = branches.find((b) => b.id === salaryBranchId)?.name || 'Chi nhánh trung tâm';
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
      departmentId,
      departmentName: deptName,
      jobTitleId,
      jobTitleName: titleName,
      startDate,
      salaryBranchId,
      salaryBranchName: sBranchName,
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
            <button
              type="button"
              className={`emp-modal-tab-btn ${activeTab === 'insurance' ? 'active' : ''}`}
              onClick={() => setActiveTab('insurance')}
            >
              Thuế TNCN & BHXH
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
                            <div style={{ fontSize: 28, color: '#94A3B8' }}>📷</div>
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
                      <label className="emp-form-label">Phòng ban</label>
                      <select
                        className="emp-form-select"
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                      >
                        <option value="">Chọn phòng ban</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Chức danh</label>
                      <select
                        className="emp-form-select"
                        value={jobTitleId}
                        onChange={(e) => setJobTitleId(e.target.value)}
                      >
                        <option value="">Chọn chức danh</option>
                        {jobTitles.map((jt) => (
                          <option key={jt.id} value={jt.id}>
                            {jt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">
                        Chi nhánh trả lương <span className="required">*</span>
                      </label>
                      <select
                        className="emp-form-select"
                        value={salaryBranchId}
                        onChange={(e) => setSalaryBranchId(e.target.value)}
                        required
                      >
                        <option value="">Chọn chi nhánh trả lương</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Ngày bắt đầu làm việc</label>
                      <input
                        type="date"
                        className="emp-form-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="emp-form-group">
                    <label className="emp-form-label">Các chi nhánh làm việc</label>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '6px 0' }}>
                      {branches.map((b) => (
                        <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={workingBranchIds.includes(b.id)}
                            onChange={() => handleWorkingBranchToggle(b.id)}
                            style={{ accentColor: '#0F766E' }}
                          />
                          <span>{b.name}</span>
                        </label>
                      ))}
                    </div>
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
                                }}
                                onClick={() => handleDeleteAllowance(al.id)}
                                title="Xóa phụ cấp"
                              >
                                🗑️
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

            {/* TAB 3: THUẾ TNCN & BHXH */}
            {activeTab === 'insurance' && (
              <div>
                <div className="emp-section-card">
                  <div className="emp-section-title">Thuế thu nhập cá nhân (TNCN)</div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Mã số thuế cá nhân</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Nhập mã số thuế"
                      />
                    </div>
                    <div className="emp-form-group">
                      <label className="emp-form-label">Số người phụ thuộc giảm trừ</label>
                      <input
                        type="number"
                        defaultValue={0}
                        min={0}
                        className="emp-form-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="emp-section-card">
                  <div className="emp-section-title">Bảo hiểm xã hội & Y tế</div>
                  <div className="emp-grid-2">
                    <div className="emp-form-group">
                      <label className="emp-form-label">Mã số sổ BHXH</label>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Nhập mã số BHXH"
                      />
                    </div>
                    <div className="emp-form-group">
                      <label className="emp-form-label">Mức lương đóng BHXH (VNĐ)</label>
                      <input
                        type="number"
                        defaultValue={5000000}
                        step={500000}
                        className="emp-form-input"
                      />
                    </div>
                  </div>
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
