import React, { useState } from 'react';
import type { Branch, PayslipDetailedRecord } from '../types';
import { MOCK_BRANCHES } from '../services/mockData';

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
  const [standardDays, setStandardDays] = useState(26);
  const [autoAttendance, setAutoAttendance] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [autoInsurance, setAutoInsurance] = useState(true);
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
          jobTitle: 'Nhân viên',
          branchName: bName,
          periodMonth,
          standardDays,
          workedDays: 24,
          otHours: 4,
          contractBaseSalary: 7500000,
          baseSalaryEarned: 6923077,
          overtimePay: 216346,
          lunchAllowance: 650000,
          travelAllowance: 300000,
          bonus: 200000,
          totalEarnings: 8289423,
          advanceDeduction: 0,
          socialInsurance: 787500,
          violationDeduction: 0,
          totalDeductions: 787500,
          netSalary: 7501923,
          status: 'UNPAID',
          bankName: 'Vietcombank',
          bankAccountNumber: '0987654321',
          bankAccountName: 'NHAN VIEN MOI',
        });
      }

      onClose();
    }, 700);
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="emp-modal-header">
          <h3>Khởi tạo phiếu lương hàng loạt theo kỳ tháng</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
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
                  onChange={(e) => setBranchId(e.target.value)}
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

            <div className="emp-grid-2">
              <div className="emp-form-group">
                <label className="emp-form-label">Ngày công chuẩn trong tháng</label>
                <input
                  type="number"
                  min={20}
                  max={31}
                  className="emp-form-input"
                  value={standardDays}
                  onChange={(e) => setStandardDays(Number(e.target.value))}
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-form-label">Trạng thái khởi tạo</label>
                <div style={{ paddingTop: 8 }}>
                  <span
                    className="emp-status-pill"
                    style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}
                  >
                    Unpaid (Chưa thanh toán)
                  </span>
                </div>
              </div>
            </div>

            {/* Tùy chọn cấu hình */}
            <div className="emp-section-card" style={{ marginTop: 12 }}>
              <div className="emp-section-title">Quy tắc tổng hợp tự động</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoAttendance}
                    onChange={(e) => setAutoAttendance(e.target.checked)}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span>Tự động tổng hợp ngày công và giờ OT từ bảng phân ca và chấm công thực tế</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span>Tự động cấn trừ các khoản tạm ứng lương đã chi trong kỳ từ Sổ quỹ CashBook</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoInsurance}
                    onChange={(e) => setAutoInsurance(e.target.checked)}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span>Tự động trích nộp 10.5% BHXH, BHYT, BHTN cho nhân viên chính thức</span>
                </label>
              </div>
            </div>

            {/* Thống kê preview */}
            <div
              style={{
                background: '#F0FDFA',
                border: '1px solid #99F6E4',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: '#0F766E', fontWeight: 600 }}>DỰ KIẾN KHỞI TẠO</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#134E4A' }}>
                  Kỳ lương: {periodMonth} &bull; 8 nhân sự hợp lệ
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#0F766E' }}>
                Hệ thống sẽ sinh tự động mã phiếu <b>PL004xxx</b>
              </span>
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
    </div>
  );
};
