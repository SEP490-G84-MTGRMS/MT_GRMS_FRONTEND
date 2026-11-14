import React, { useState, useMemo } from 'react';
import { Pencil, Download, Banknote, Loader2 } from 'lucide-react';
import type { Employee, DebtTransaction } from '../../types';
import { employeeApi } from '../../api/employeeApi';
import { CreateUserModal } from './CreateUserModal';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit: (employee: Employee) => void;
  onToggleStatus: (employeeId: string) => void;
  onDelete?: (employeeId: string) => void;
  onAddPayment: (employeeId: string, payment: DebtTransaction) => void;
  initialTab?: 'info' | 'schedule' | 'salary' | 'payslip' | 'debt';
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  onClose,
  employee: initialEmployee,
  onEdit,
  onToggleStatus,
  onDelete,
  onAddPayment,
  initialTab = 'info',
}) => {
  const [detail, setDetail] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchDetail = React.useCallback(async (id: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await employeeApi.getEmployeeById(id);
      setDetail(data);
    } catch (err: any) {
      console.error('Lỗi khi tải chi tiết nhân viên từ backend:', err);
      setLoadError(err?.message || 'Không thể tải thông tin chi tiết từ hệ thống.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen && initialEmployee?.id) {
      setDetail(initialEmployee);
      fetchDetail(initialEmployee.id);
    } else if (!isOpen) {
      setDetail(null);
      setLoadError(null);
    }
  }, [isOpen, initialEmployee?.id, fetchDetail]);

  const employee = detail || initialEmployee;

  const [activeTab, setActiveTab] = useState<'info' | 'salary'>(
    initialTab === 'salary' ? 'salary' : 'info'
  );

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab === 'salary' ? 'salary' : 'info');
    }
  }, [isOpen, initialTab]);
  const [scheduleView, setScheduleView] = useState<'table' | 'list'>('table');
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Schedule Filter State (Chỉ theo tuần)
  const [scheduleWeek, setScheduleWeek] = useState<number>(1);
  const [scheduleMonth, setScheduleMonth] = useState<number>(10);
  const [scheduleYear, setScheduleYear] = useState<number>(2026);

  const handlePrevSchedule = () => {
    if (scheduleWeek > 1) {
      setScheduleWeek(scheduleWeek - 1);
    } else {
      if (scheduleMonth === 1) {
        setScheduleMonth(12);
        setScheduleYear((prev) => prev - 1);
      } else {
        setScheduleMonth((prev) => prev - 1);
      }
      setScheduleWeek(4);
    }
  };

  const handleNextSchedule = () => {
    if (scheduleWeek < 4) {
      setScheduleWeek(scheduleWeek + 1);
    } else {
      if (scheduleMonth === 12) {
        setScheduleMonth(1);
        setScheduleYear((prev) => prev + 1);
      } else {
        setScheduleMonth((prev) => prev + 1);
      }
      setScheduleWeek(1);
    }
  };

  const schedulePeriodLabel = useMemo(() => {
    return `Tuần ${scheduleWeek} - Th. ${scheduleMonth} ${scheduleYear}`;
  }, [scheduleWeek, scheduleMonth, scheduleYear]);

  // Payslip Filter State (Lọc theo trạng thái)
  const [payslipStatusFilter, setPayslipStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  const filteredPayslips = useMemo(() => {
    if (!employee?.payslips) return [];
    if (payslipStatusFilter === 'all') return employee.payslips;
    return employee.payslips.filter((ps) => ps.status === payslipStatusFilter);
  }, [employee?.payslips, payslipStatusFilter]);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'transfer' | 'cash'>('transfer');
  const [payNote, setPayNote] = useState('');

  if (!isOpen || !employee) return null;

  const handleOpenPayment = () => {
    setPayAmount(employee.debtAmount > 0 ? employee.debtAmount : 5000000);
    setPayNote(
      employee.debtAmount > 0
        ? `Thanh toán nợ lương cho nhân viên ${employee.fullName}`
        : `Tạm ứng lương tháng cho nhân viên ${employee.fullName}`
    );
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      alert('Vui lòng nhập số tiền chi lớn hơn 0!');
      return;
    }

    const isAdvance = employee.debtAmount === 0;
    const newTransaction: DebtTransaction = {
      id: `pc_${Date.now()}`,
      code: `PC${String(Math.floor(Math.random() * 90000) + 10000)}`,
      date: new Date().toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: isAdvance ? 'advance_payment' : 'salary_payment',
      amount: payAmount,
      method: payMethod,
      accountNumber:
        payMethod === 'transfer'
          ? `${employee.bankAccountNumber || 'Chưa có STK'} (${employee.bankName || 'NH'})`
          : undefined,
      note: payNote,
      remainingDebtAfter: Math.max(0, employee.debtAmount - payAmount),
    };

    onAddPayment(employee.id, newTransaction);
    setShowPaymentModal(false);
  };

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 ₫';
    return `${num.toLocaleString('vi-VN')} ₫`;
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'Chưa cập nhật';
    try {
      const clean = dateStr.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="emp-modal-overlay">
        <div className="emp-modal-card">
          {/* Header Bar */}
          <div className="emp-modal-header" style={{ background: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="emp-avatar-cell" style={{ width: 44, height: 44, fontSize: 20 }}>
                {employee.avatarUrl ? (
                  <img src={employee.avatarUrl} alt={employee.fullName} />
                ) : (
                  <span>{employee.fullName.charAt(0)}</span>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{employee.fullName}</h3>
                  <span
                    className={`emp-status-pill ${employee.status === 'active' ? 'active' : 'inactive'}`}
                  >
                    {employee.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>Mã NV: <b>{employee.employeeCode}</b></span>
                  <span>&bull;</span>
                  <span>SĐT: <b>{employee.phone}</b></span>
                  <span>&bull;</span>
                  <span>Chi nhánh: <b>{employee.workingBranchNames?.join(', ') || 'Chưa phân bổ'}</b></span>
                  {isLoading && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0F766E', fontSize: 12, fontWeight: 500, marginLeft: 6 }}>
                      <Loader2 size={13} className="animate-spin" /> Đang đồng bộ từ hệ thống...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right', marginRight: 12 }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>NỢ & TẠM ỨNG</div>
                <div className={`emp-debt-value ${employee.debtAmount === 0 ? 'zero' : ''}`} style={{ fontSize: 16 }}>
                  {formatVND(employee.debtAmount)}
                </div>
              </div>
              <button type="button" className="emp-modal-close-btn" onClick={onClose}>
                &times;
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
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

          {/* Body Content */}
          <div className="emp-modal-body">
            {loadError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  color: '#DC2626',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={() => initialEmployee?.id && fetchDetail(initialEmployee.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#DC2626',
                    cursor: 'pointer',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* TAB 1: THÔNG TIN */}
            {activeTab === 'info' && (
              <div className="emp-grid-3">
                {/* Cột 1: Liên hệ & Cá nhân */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin liên hệ & Cá nhân</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Số điện thoại:</span>
                      <div style={{ fontWeight: 600 }}>{employee.phone}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Email:</span>
                      <div style={{ fontWeight: 600 }}>{employee.email || 'Chưa cập nhật'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Giới tính:</span>
                      <div style={{ fontWeight: 600 }}>
                        {employee.gender === 'female' ? 'Nữ' : employee.gender === 'male' ? 'Nam' : 'Chưa cập nhật'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Ngày sinh:</span>
                      <div style={{ fontWeight: 600 }}>{formatDateDisplay(employee.dateOfBirth)}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>CMND / CCCD:</span>
                      <div style={{ fontWeight: 600 }}>{employee.citizenId || 'Chưa cập nhật'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Địa chỉ thường trú:</span>
                      <div style={{ fontWeight: 600 }}>
                        {employee.address || 'Chưa cập nhật'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột 2: Công việc */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin công việc</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Chi nhánh làm việc:</span>
                      <div style={{ fontWeight: 600 }}>
                        {employee.workingBranchNames?.join(', ') || 'Chưa phân bổ'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Ngày bắt đầu làm:</span>
                      <div style={{ fontWeight: 600 }}>{formatDateDisplay(employee.startDate)}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Tài khoản phần mềm:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontWeight: 600 }}>{employee.userName || 'Chưa cấp tài khoản'}</span>
                        {!employee.userName && (
                          <button
                            type="button"
                            onClick={() => setShowCreateUser(true)}
                            style={{
                              background: '#F0FDFA',
                              border: '1px solid #99F6E4',
                              color: '#0F766E',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            + Cấp tài khoản
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột 3: Ngân hàng & Ghi chú */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Tài khoản thanh toán & Ghi chú</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Số tài khoản:</span>
                      <div style={{ fontWeight: 600, letterSpacing: 0.5 }}>
                        {employee.bankAccountNumber || 'Chưa cập nhật'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Ngân hàng:</span>
                      <div style={{ fontWeight: 600 }}>{employee.bankName || 'Chưa cập nhật'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Chủ tài khoản:</span>
                      <div style={{ fontWeight: 600 }}>{employee.bankAccountHolder || employee.fullName}</div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{ color: '#64748B' }}>Ghi chú nhân sự:</span>
                      <div style={{ fontStyle: employee.note ? 'normal' : 'italic', color: '#475569' }}>
                        {employee.note || 'Không có ghi chú.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: THIẾT LẬP LƯƠNG */}
            {activeTab === 'salary' && (
              <div>
                <div className="emp-section-card">
                  <div className="emp-section-title">
                    <span>Mức lương chính hiện hành</span>
                    <button
                      type="button"
                      className="emp-btn emp-btn-outline-teal"
                      style={{ height: 32, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => onEdit(employee)}
                    >
                      <Pencil size={13} />
                      <span>Điều chỉnh mức lương</span>
                    </button>
                  </div>
                  <div className="emp-grid-2" style={{ fontSize: 14 }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Hình thức tính lương:</span>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        {employee.salaryConfig?.salaryType === 'monthly'
                          ? 'Cố định hàng tháng'
                          : employee.salaryConfig?.salaryType === 'hourly'
                            ? 'Theo giờ làm việc'
                            : 'Theo ca làm việc'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Mức lương cơ bản:</span>
                      <div style={{ fontWeight: 700, fontSize: 18, color: '#0F766E', marginTop: 4 }}>
                        {formatVND(employee.salaryConfig?.baseSalary)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="emp-section-card">
                  <div className="emp-section-title">Hệ số làm thêm giờ (OT)</div>
                  <div className="emp-grid-2">
                    <div>
                      <span style={{ color: '#64748B', fontSize: 12 }}>Ngày thường:</span>
                      <div style={{ fontWeight: 600 }}>{employee.salaryConfig?.otWeekday || '150%'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontSize: 12 }}>Chủ nhật / Nghỉ tuần:</span>
                      <div style={{ fontWeight: 600 }}>{employee.salaryConfig?.otSunday || '200%'}</div>
                    </div>
                  </div>
                </div>

                <div className="emp-section-card">
                  <div className="emp-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Các khoản phụ cấp áp dụng</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F766E' }}>
                      Tổng:{' '}
                      {formatVND(
                        (employee.salaryConfig?.allowances || [])
                          .filter((a) => a.enabled)
                          .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
                      )}{' '}
                      đ
                    </span>
                  </div>
                  <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <thead>
                      <tr>
                        <th>Tên phụ cấp</th>
                        <th className="align-right" style={{ width: 220 }}>Mức phụ cấp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.salaryConfig?.allowances?.filter((a) => a.enabled).length ? (
                        employee.salaryConfig.allowances
                          .filter((a) => a.enabled)
                          .map((a, idx) => (
                            <tr key={a.id || idx}>
                              <td style={{ fontWeight: 600 }}>{a.name}</td>
                              <td className="align-right" style={{ fontWeight: 600, color: '#0F766E' }}>
                                {formatVND(a.amount)} đ
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', color: '#94A3B8', padding: 24 }}>
                            Không có phụ cấp nào đang áp dụng cho nhân viên này
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="emp-modal-footer">
            {onDelete && (
              <button
                type="button"
                className="emp-btn emp-btn-danger-outline"
                style={{ marginRight: 'auto' }}
                onClick={() => {
                  onDelete(employee.id);
                }}
              >
                Xóa nhân viên
              </button>
            )}
            <button
              type="button"
              className={`emp-btn ${employee.status === 'active' ? 'emp-btn-danger-outline' : 'emp-btn-secondary'
                }`}
              onClick={() => onToggleStatus(employee.id)}
            >
              {employee.status === 'active' ? 'Ngừng làm việc' : 'Kích hoạt lại'}
            </button>
            <button
              type="button"
              className="emp-btn emp-btn-outline-teal"
              onClick={() => onEdit(employee)}
            >
              Cập nhật
            </button>
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
              Đóng chi tiết
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Modal Thanh Toán Lương / Tạm Ứng */}
      {showPaymentModal && (
        <div className="emp-modal-overlay" style={{ zIndex: 1200 }}>
          <div className="emp-modal-card">
            <div className="emp-modal-header">
              <h3>
                {employee.debtAmount > 0
                  ? 'Thanh toán nợ lương nhân viên'
                  : 'Tạo phiếu tạm ứng lương'}
              </h3>
              <button
                type="button"
                className="emp-modal-close-btn"
                onClick={() => setShowPaymentModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmPayment}>
              <div className="emp-modal-body">
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#64748B' }}>Nhân viên thụ hưởng:</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                    {employee.fullName} ({employee.employeeCode})
                  </div>
                </div>

                <div className="emp-form-group">
                  <label className="emp-form-label">
                    Số tiền chi trả (VNĐ) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    step={100000}
                    className="emp-form-input"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    required
                  />
                  <small style={{ color: '#64748B', fontSize: 11 }}>
                    {employee.debtAmount > 0
                      ? `Nợ hiện tại: ${formatVND(employee.debtAmount)}`
                      : 'Công nợ hiện tại = 0 (Khoản này sẽ được hạch toán vào Tạm ứng kỳ tới)'}
                  </small>
                </div>

                <div className="emp-form-group">
                  <label className="emp-form-label">Phương thức thanh toán</label>
                  <select
                    className="emp-form-select"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as 'transfer' | 'cash')}
                  >
                    <option value="transfer">Chuyển khoản ngân hàng</option>
                    <option value="cash">Tiền mặt tại quỹ</option>
                  </select>
                </div>

                {payMethod === 'transfer' && (
                  <div className="emp-form-group">
                    <label className="emp-form-label">Tài khoản nhận tiền</label>
                    <input
                      type="text"
                      className="emp-form-input"
                      readOnly
                      style={{ background: '#F8FAFC' }}
                      value={`${employee.bankAccountNumber || 'Chưa có'} - ${employee.bankName || 'Ngân hàng'}`}
                    />
                  </div>
                )}

                <div className="emp-form-group">
                  <label className="emp-form-label">Nội dung / Ghi chú</label>
                  <input
                    type="text"
                    className="emp-form-input"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="emp-modal-footer">
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="emp-btn emp-btn-primary">
                  Tạo phiếu chi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {employee && (
        <CreateUserModal
          isOpen={showCreateUser}
          onClose={() => setShowCreateUser(false)}
          employeeId={employee.id}
          employeeName={employee.fullName}
          employeeCode={employee.employeeCode}
          phone={employee.phone}
          initialUsername={employee.userName}
          branchName={employee.salaryBranchName}
          onSuccess={(u) => {
            setDetail((prev) => (prev ? { ...prev, userId: u.id, userName: u.username } : prev));
            setShowCreateUser(false);
          }}
        />
      )}
    </>
  );
};
