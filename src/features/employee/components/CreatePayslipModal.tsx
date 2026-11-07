import React, { useState } from 'react';
import { Settings, Sliders, CheckCircle2 } from 'lucide-react';
import type { Branch, PayslipDetailedRecord } from '../types';
import { MOCK_BRANCHES } from '../services/mockData';
import { AttendanceConfigModal } from './AttendanceConfigModal';

interface CreatePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches?: Branch[];
  onCreateSuccess?: (periodMonth: string, branchName: string) => void;
  onCreatePayslip?: (newSlip: PayslipDetailedRecord) => void;
}

export const CreatePayslipModal: React.FC<CreatePayslipModalProps> = ({
  isOpen,
  onClose,
  branches = MOCK_BRANCHES,
  onCreateSuccess,
  onCreatePayslip,
}) => {
  const [periodMonth, setPeriodMonth] = useState('2026-11');
  const [branchId, setBranchId] = useState('ALL');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState<'ALL' | 'MONTHLY' | 'SHIFT' | 'HOURLY'>('ALL');
  const standardDays = 26; // Mặc định chuẩn 26 ngày công
  const [standardDayHours, setStandardDayHours] = useState(8.0); // Chuẩn giờ/ngày công từ chính sách chi nhánh
  const [isAttendanceConfigOpen, setIsAttendanceConfigOpen] = useState(false);
  const [policyFeedback, setPolicyFeedback] = useState<string | null>(null);
  const [batchNote, setBatchNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const bName =
        branchId === 'ALL'
          ? 'Tất cả chi nhánh'
          : branches.find((b) => b.id === branchId)?.name || 'Chi nhánh trung tâm';

      if (onCreateSuccess) {
        onCreateSuccess(periodMonth, bName);
      }

      if (onCreatePayslip) {
        const sampleId = `PL${Math.floor(100000 + Math.random() * 900000)}`;
        onCreatePayslip({
          id: sampleId,
          employeeId: 'EMP-NEW',
          employeeCode: 'NV099',
          employeeName: 'Nhân viên Mới',
          branchName: bName,
          periodMonth,
          salaryType: salaryTypeFilter === 'ALL' ? 'MONTHLY' : salaryTypeFilter,
          baseRate: 10000000,
          standardDays,
          standardDayHours,
          workedDays: 24,
          totalWorkHours: 192,
          totalShifts: 24,
          totalLateMinutes: 20,
          totalEarlyLeaveMinutes: 0,
          otHours: 4,
          contractBaseSalary: 10000000,
          baseSalaryEarned: 9230769,
          overtimePay: 360577,
          totalAllowance: 1230000,
          allowances: [
            { name: 'Phụ cấp ăn trưa', amount: 730000 },
            { name: 'Phụ cấp trách nhiệm', amount: 500000 },
          ],
          allowancesDetailJson: JSON.stringify([
            { name: 'Phụ cấp ăn trưa', amount: 730000 },
            { name: 'Phụ cấp trách nhiệm', amount: 500000 },
          ]),
          lunchAllowance: 730000,
          travelAllowance: 500000,
          totalEarnings: 10821346,
          advanceDeduction: 0,
          remainingDebt: 0,
          socialInsurance: 1050000,
          bhxh: 800000,
          bhyt: 150000,
          bhtn: 100000,
          totalDeductions: 1050000,
          netSalary: 9771346,
          status: 'UNPAID',
          bankName: 'Techcombank',
          bankAccountNumber: '1903456789012',
          bankAccountName: 'NHAN VIEN MOI',
          note: batchNote || `Bảng lương khởi tạo kỳ ${periodMonth} - ${bName}`,
        });
      }

      onClose();
    }, 700);
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 650 }}>
        {/* Header */}
        <div className="emp-modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Khởi tạo phiếu lương hàng loạt theo kỳ tháng</h3>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Áp dụng chính sách chấm công & cấu hình lương tự động cho nhân viên
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            {/* Hàng 1: Kỳ tháng & Chi nhánh */}
            <div className="emp-grid-2">
              <div className="emp-form-group">
                <label className="emp-form-label">
                  Kỳ tháng tính lương <span className="required">*</span>
                </label>
                <input
                  type="month"
                  className="emp-form-input"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  required
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-form-label">Chi nhánh áp dụng</label>
                <select
                  className="emp-form-select"
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setPolicyFeedback(null);
                  }}
                >
                  <option value="ALL">-- Tất cả chi nhánh --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Banner trạng thái chính sách chấm công & nút cấu hình trực tiếp */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#F0FDFA',
                border: '1px solid #CCFBF1',
                borderRadius: 10,
                marginTop: -4,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#CCFBF1',
                    color: '#0F766E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sliders size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F766E' }}>
                    CHÍNH SÁCH CHẤM CÔNG & CẤU HÌNH LƯƠNG
                  </div>
                  <div style={{ fontSize: 12, color: '#334155', marginTop: 1 }}>
                    {policyFeedback ? (
                      <span style={{ color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} />
                        {policyFeedback}
                      </span>
                    ) : branchId === 'ALL' ? (
                      'Mặc định hệ thống: 8.0 giờ/công'
                    ) : (
                      `Chi nhánh: ${branches.find((b) => b.id === branchId)?.name || 'Chi nhánh'} • Chuẩn ${standardDayHours.toFixed(1)} giờ/công`
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="emp-btn emp-btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  height: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: '#0D9488',
                  color: '#0F766E',
                  background: '#FFFFFF',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
                onClick={() => setIsAttendanceConfigOpen(true)}
                title="Cấu hình số giờ chuẩn, quy đổi công, dung sai đi muộn & làm thêm giờ (OT)"
              >
                <Settings size={14} />
                {branchId === 'ALL' ? 'Cấu hình chính sách' : 'Cấu hình chi nhánh này'}
              </button>
            </div>

            {/* Hàng 2: Hình thức lương & Trạng thái */}
            <div className="emp-grid-2">
              <div className="emp-form-group">
                <label className="emp-form-label">Hình thức trả lương áp dụng</label>
                <select
                  className="emp-form-select"
                  value={salaryTypeFilter}
                  onChange={(e) => setSalaryTypeFilter(e.target.value as any)}
                >
                  <option value="ALL">Tất cả hình thức (Tháng, Ca, Giờ)</option>
                  <option value="MONTHLY">Lương cố định theo tháng (Monthly)</option>
                  <option value="SHIFT">Lương theo ca làm việc (Shift)</option>
                  <option value="HOURLY">Lương theo giờ làm việc (Hourly)</option>
                </select>
              </div>

              <div className="emp-form-group">
                <label className="emp-form-label">Trạng thái khởi tạo</label>
                <div style={{ paddingTop: 6 }}>
                  <span className="emp-status-pill warning" style={{ padding: '6px 12px', fontSize: 13 }}>
                    Unpaid (Chưa thanh toán)
                  </span>
                </div>
              </div>
            </div>

            {/* Tùy chọn cấu hình tự động */}
            <div className="emp-section-card" style={{ marginTop: 8 }}>
              <div className="emp-section-title" style={{ fontSize: 13, marginBottom: 8 }}>
                Quy tắc tính toán tự động
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <span>Tự động tổng hợp ngày công, tổng giờ và giờ OT từ bảng phân ca và chấm công thực tế</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <span>Tự động nạp danh sách phụ cấp định kỳ (ăn trưa, trách nhiệm...) từ hồ sơ nhân viên</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <span>Tự động cấn trừ các khoản tạm ứng lương đã chi trong kỳ và cập nhật công nợ còn lại</span>
                </label>
              </div>
            </div>

            {/* Ghi chú chung đợt tính lương */}
            <div className="emp-form-group" style={{ marginTop: 8 }}>
              <label className="emp-form-label">Ghi chú đợt khởi tạo bảng lương</label>
              <input
                type="text"
                className="emp-form-input"
                placeholder="Ví dụ: Bảng lương tháng 11/2026 - Quyết toán kỳ chuẩn"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
              />
            </div>
          </div>

          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="emp-btn emp-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang khởi tạo...' : 'Tạo bảng lương tháng'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Cấu hình chính sách chấm công chi nhánh */}
      <AttendanceConfigModal
        isOpen={isAttendanceConfigOpen}
        onClose={() => setIsAttendanceConfigOpen(false)}
        branches={branches}
        initialBranchId={branchId !== 'ALL' ? branchId : branches[0]?.id}
        onSaveSuccess={(savedBranchId, savedConfig) => {
          const bObj = branches.find((b) => b.id === savedBranchId);
          setStandardDayHours(savedConfig.standardDayHours);
          setPolicyFeedback(
            `Đã lưu cấu hình [${bObj?.name || 'Chi nhánh'}]: ${savedConfig.standardDayHours}h/công, ${savedConfig.conversionRules.length} mốc quy đổi`
          );
          setIsAttendanceConfigOpen(false);
        }}
      />
    </div>
  );
};
