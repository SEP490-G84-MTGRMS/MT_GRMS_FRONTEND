import React, { useState, useMemo } from 'react';
import { Pencil, Download, Printer, Banknote } from 'lucide-react';
import type { Employee, DebtTransaction } from '../types';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit: (employee: Employee) => void;
  onToggleStatus: (employeeId: string) => void;
  onAddPayment: (employeeId: string, payment: DebtTransaction) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEdit,
  onToggleStatus,
  onAddPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'salary' | 'payslip' | 'debt'>('info');
  const [scheduleView, setScheduleView] = useState<'table' | 'list'>('table');

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

  return (
    <>
      <div className="emp-modal-overlay">
        <div className="emp-modal-card" style={{ maxWidth: 1050 }}>
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
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  Mã NV: <b>{employee.employeeCode}</b> &bull; SĐT: <b>{employee.phone}</b> &bull; Chi nhánh:{' '}
                  <b>{employee.workingBranchNames?.join(', ') || 'Chưa phân bổ'}</b>
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
            <button
              type="button"
              className={`emp-modal-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              Lịch làm việc
            </button>

            <button
              type="button"
              className={`emp-modal-tab-btn ${activeTab === 'payslip' ? 'active' : ''}`}
              onClick={() => setActiveTab('payslip')}
            >
              Phiếu lương
            </button>
            <button
              type="button"
              className={`emp-modal-tab-btn ${activeTab === 'debt' ? 'active' : ''}`}
              onClick={() => setActiveTab('debt')}
            >
              Nợ và tạm ứng
            </button>
          </div>

          {/* Body Content */}
          <div className="emp-modal-body">
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
                      <div style={{ fontWeight: 600 }}>{employee.gender === 'male' ? 'Nam' : 'Nữ'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Ngày sinh:</span>
                      <div style={{ fontWeight: 600 }}>{employee.dateOfBirth || 'Chưa cập nhật'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>CMND / CCCD:</span>
                      <div style={{ fontWeight: 600 }}>{employee.citizenId || 'Chưa cập nhật'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Địa chỉ thường trú:</span>
                      <div style={{ fontWeight: 600 }}>
                        {employee.address ? `${employee.address}, ${employee.city || ''}` : 'Chưa cập nhật'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột 2: Công việc */}
                <div className="emp-section-card">
                  <div className="emp-section-title">Thông tin công việc</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Các chi nhánh làm việc:</span>
                      <div style={{ fontWeight: 600 }}>
                        {employee.workingBranchNames?.join(', ') || 'Chưa phân bổ'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Ngày bắt đầu làm:</span>
                      <div style={{ fontWeight: 600 }}>{employee.startDate || 'Chưa ghi nhận'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Tài khoản phần mềm:</span>
                      <div style={{ fontWeight: 600 }}>{employee.userName || 'Chưa cấp tài khoản'}</div>
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

            {/* TAB 2: LỊCH LÀM VIỆC */}
            {activeTab === 'schedule' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  {/* Bộ điều hướng tuần: [ < ] Tuần 1 - Th. 10 2026 [ > ] */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      padding: '2px 4px',
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: 4,
                        width: 24,
                        height: 24,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: '#334155',
                        fontSize: 12,
                      }}
                      onClick={handlePrevSchedule}
                      title="Tuần trước"
                    >
                      &lt;
                    </button>

                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', padding: '0 8px' }}>
                      {schedulePeriodLabel}
                    </span>

                    <button
                      type="button"
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: 4,
                        width: 24,
                        height: 24,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: '#334155',
                        fontSize: 12,
                      }}
                      onClick={handleNextSchedule}
                      title="Tuần sau"
                    >
                      &gt;
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={`emp-btn ${scheduleView === 'table' ? 'emp-btn-primary' : 'emp-btn-secondary'}`}
                      style={{ height: 32, padding: '0 12px' }}
                      onClick={() => setScheduleView('table')}
                    >
                      Bảng biểu
                    </button>
                    <button
                      type="button"
                      className={`emp-btn ${scheduleView === 'list' ? 'emp-btn-primary' : 'emp-btn-secondary'}`}
                      style={{ height: 32, padding: '0 12px' }}
                      onClick={() => setScheduleView('list')}
                    >
                      Danh sách
                    </button>
                  </div>
                </div>

                {scheduleView === 'table' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => {
                      const startDay = (scheduleWeek - 1) * 7 + 1;
                      const dayNumber = Math.min(startDay + idx, 31);
                      const shift = employee.workSchedule?.find((s) => s.dayOfWeek === day);
                      return (
                        <div
                          key={day}
                          style={{
                            background: shift ? '#F0FDFA' : '#F8FAFC',
                            border: `1px solid ${shift ? '#99F6E4' : '#E2E8F0'}`,
                            borderRadius: 12,
                            padding: 12,
                            minHeight: 120,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0F766E' }}>
                            {day} &bull; {dayNumber < 10 ? `0${dayNumber}` : dayNumber}/{scheduleMonth}
                          </div>
                          {shift ? (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#134E4A' }}>
                                {shift.shiftName}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                {shift.branchName}
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: 16, fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                              Nghỉ ca
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 12 }}>
                    <thead>
                      <tr>
                        <th>Thứ / Ngày</th>
                        <th>Ca làm việc</th>
                        <th>Chi nhánh</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.workSchedule?.length ? (
                        employee.workSchedule.map((s, idx) => {
                          const startDay = (scheduleWeek - 1) * 7 + 1;
                          const dayNumber = Math.min(startDay + idx, 31);
                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 600 }}>
                                {s.dayOfWeek} ({dayNumber < 10 ? `0${dayNumber}` : dayNumber}/{scheduleMonth})
                              </td>
                              <td style={{ color: '#0F766E', fontWeight: 600 }}>{s.shiftName}</td>
                              <td>{s.branchName}</td>
                              <td style={{ color: '#64748B' }}>{s.note || '-'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8' }}>
                            Chưa có lịch phân ca trong tuần này
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
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
                  <div className="emp-grid-3">
                    <div>
                      <span style={{ color: '#64748B', fontSize: 12 }}>Ngày thường:</span>
                      <div style={{ fontWeight: 600 }}>{employee.salaryConfig?.otWeekday || '150%'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontSize: 12 }}>Chủ nhật / Nghỉ tuần:</span>
                      <div style={{ fontWeight: 600 }}>{employee.salaryConfig?.otSunday || '200%'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontSize: 12 }}>Ngày Lễ / Tết:</span>
                      <div style={{ fontWeight: 600 }}>{employee.salaryConfig?.otHoliday || '300%'}</div>
                    </div>
                  </div>
                </div>

                <div className="emp-section-card">
                  <div className="emp-section-title">Các khoản phụ cấp áp dụng</div>
                  <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <thead>
                      <tr>
                        <th>Tên phụ cấp</th>
                        <th>Loại phụ cấp</th>
                        <th className="align-right">Mức phụ cấp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.salaryConfig?.allowances?.filter((a) => a.enabled).length ? (
                        employee.salaryConfig.allowances
                          .filter((a) => a.enabled)
                          .map((a) => (
                            <tr key={a.id}>
                              <td style={{ fontWeight: 600 }}>{a.name}</td>
                              <td style={{ color: '#64748B' }}>{a.type}</td>
                              <td className="align-right" style={{ fontWeight: 600, color: '#0F766E' }}>
                                {formatVND(a.amount)}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: '#94A3B8' }}>
                            Không có phụ cấp nào đang kích hoạt
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: PHIẾU LƯƠNG */}
            {activeTab === 'payslip' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Lịch sử phiếu lương cá nhân</div>
                    <select
                      className="emp-filter-select"
                      style={{ width: 150, height: 32, fontSize: 13 }}
                      value={payslipStatusFilter}
                      onChange={(e) => setPayslipStatusFilter(e.target.value as 'all' | 'paid' | 'partial' | 'unpaid')}
                    >
                      <option value="all">Tất cả</option>
                      <option value="paid">Đã chi trả</option>
                      <option value="partial">Chi 1 phần</option>
                      <option value="unpaid">Chưa trả</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="emp-btn emp-btn-secondary"
                      style={{ height: 32, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => alert('Xuất danh sách phiếu lương thành công!')}
                    >
                      <Download size={14} />
                      <span>Xuất file Excel</span>
                    </button>
                  </div>
                </div>

                <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 12 }}>
                  <thead>
                    <tr>
                      <th>Mã phiếu lương</th>
                      <th>Kỳ làm việc</th>
                      <th className="align-right">Lương chính</th>
                      <th className="align-right">Tổng lương</th>
                      <th className="align-right">Đã trả</th>
                      <th className="align-right">Còn cần trả</th>
                      <th>Trạng thái</th>

                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayslips.length ? (
                      filteredPayslips.map((ps) => (
                        <tr key={ps.id}>
                          <td style={{ fontWeight: 700, color: '#0F766E' }}>
                            {ps.code || ps.id.toUpperCase()}
                          </td>
                          <td style={{ fontWeight: 600 }}>{ps.period}</td>
                          <td className="align-right">{formatVND(ps.baseSalary)}</td>
                          <td className="align-right" style={{ fontWeight: 700, color: '#0F766E' }}>
                            {formatVND(ps.netSalary)}
                          </td>
                          <td className="align-right" style={{ fontWeight: 600, color: '#059669' }}>
                            {formatVND(ps.paidAmount)}
                          </td>
                          <td
                            className="align-right"
                            style={{
                              fontWeight: 600,
                              color: ps.remainingDebt > 0 ? '#DC2626' : '#64748B',
                            }}
                          >
                            {formatVND(ps.remainingDebt)}
                          </td>
                          <td>
                            <span
                              className={`emp-status-pill ${ps.status === 'paid'
                                ? 'active'
                                : ps.status === 'partial'
                                  ? 'warning'
                                  : 'inactive'
                                }`}
                            >
                              {ps.status === 'paid'
                                ? 'Đã chi trả'
                                : ps.status === 'partial'
                                  ? 'Chi 1 phần'
                                  : 'Chưa trả'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: '#94A3B8', padding: 24 }}>
                          {payslipStatusFilter === 'all'
                            ? 'Chưa có phiếu lương nào được chốt cho nhân viên này'
                            : 'Không có phiếu lương nào phù hợp với trạng thái đã chọn'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: NỢ VÀ TẠM ỨNG */}
            {activeTab === 'debt' && (
              <div>
                <div
                  style={{
                    background: '#F0FDFA',
                    border: '1px solid #99F6E4',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: '#0F766E', fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI VỚI NHÂN VIÊN</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#134E4A', marginTop: 4 }}>
                      {formatVND(employee.debtAmount)}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {employee.debtAmount > 0
                        ? 'Cửa hàng còn nợ lương cần chi trả'
                        : 'Không có nợ tồn đọng (Thao tác chi tiền sẽ tự động ghi nhận là Tạm ứng lương)'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="emp-btn emp-btn-primary"
                    style={{ height: 42, padding: '0 24px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    onClick={handleOpenPayment}
                  >
                    <Banknote size={16} />
                    <span>Thanh toán lương / Tạm ứng</span>
                  </button>
                </div>

                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Lịch sử các lần chi tiền</div>
                <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 12 }}>
                  <thead>
                    <tr>
                      <th>Mã phiếu chi</th>
                      <th>Thời gian</th>
                      <th>Loại giao dịch</th>
                      <th>Phương thức</th>
                      <th className="align-right">Số tiền chi</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.debtHistory?.length ? (
                      employee.debtHistory.map((tx) => (
                        <tr key={tx.id}>
                          <td style={{ fontWeight: 700, color: '#0F766E' }}>{tx.code}</td>
                          <td>{tx.date}</td>
                          <td>
                            <span
                              className={`emp-status-pill ${tx.type === 'salary_payment' ? 'active' : 'warning'
                                }`}
                            >
                              {tx.type === 'salary_payment' ? 'Thanh toán lương' : 'Tạm ứng lương'}
                            </span>
                          </td>
                          <td>{tx.method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</td>
                          <td className="align-right" style={{ fontWeight: 700, color: '#0F766E' }}>
                            {formatVND(tx.amount)}
                          </td>
                          <td style={{ color: '#64748B' }}>{tx.note || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>
                          Chưa có giao dịch chi lương hoặc tạm ứng nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="emp-modal-footer">
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
          <div className="emp-modal-card" style={{ maxWidth: 520 }}>
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
    </>
  );
};
