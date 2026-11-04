import React from 'react';
import { Check, CreditCard, Printer, Download } from 'lucide-react';
import type { PayslipDetailedRecord } from '../types';

interface PayslipDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: PayslipDetailedRecord | null;
  onPayNow: (payslip: PayslipDetailedRecord) => void;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({
  isOpen,
  onClose,
  payslip,
  onPayNow,
}) => {
  if (!isOpen || !payslip) return null;

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 đ';
    return `${num.toLocaleString('vi-VN')} đ`;
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 880 }}>
        {/* Header */}
        <div className="emp-modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Chi tiết phiếu lương cá nhân ({payslip.id})</h3>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Kỳ tháng: <b>{payslip.periodMonth}</b> &bull; Nhân viên: <b>{payslip.employeeName}</b> ({payslip.employeeCode})
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="emp-modal-body">
          {/* Thông tin chung */}
          <div className="emp-section-card">
            <div className="emp-section-title">1. Thông tin hợp đồng & Ngày công</div>
            <div className="emp-grid-3" style={{ fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748B' }}>Lương cơ sở hợp đồng:</span>
                <div style={{ fontWeight: 700, color: '#0F766E' }}>{formatVND(payslip.contractBaseSalary)}</div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Ngày công chuẩn:</span>
                <div style={{ fontWeight: 600 }}>{payslip.standardDays} ngày</div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Ngày công thực tế:</span>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>{payslip.workedDays} ngày</div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Giờ làm thêm (OT):</span>
                <div style={{ fontWeight: 700, color: '#D97706' }}>{payslip.otHours} giờ</div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Chi nhánh chi trả:</span>
                <div style={{ fontWeight: 600 }}>{payslip.branchName}</div>
              </div>
            </div>
          </div>

          {/* Bố cục 2 cột: Thu nhập vs Khấu trừ */}
          <div className="emp-grid-2">
            {/* Cột 1: Thu nhập */}
            <div className="emp-section-card" style={{ borderColor: '#BBF7D0', background: '#F0FDF4' }}>
              <div className="emp-section-title" style={{ color: '#166534' }}>
                2. Các khoản thu nhập (Earnings)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lương ngày công:</span>
                  <b>{formatVND(payslip.baseSalaryEarned)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lương tăng ca OT:</span>
                  <b>{formatVND(payslip.overtimePay)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Phụ cấp ăn trưa:</span>
                  <b>{formatVND(payslip.lunchAllowance)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Phụ cấp đi lại:</span>
                  <b>{formatVND(payslip.travelAllowance)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Thưởng hiệu quả:</span>
                  <b>{formatVND(payslip.bonus)}</b>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #BBF7D0', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#15803D' }}>
                  <span>TỔNG THU NHẬP:</span>
                  <span>{formatVND(payslip.totalEarnings)}</span>
                </div>
              </div>
            </div>

            {/* Cột 2: Khấu trừ */}
            <div className="emp-section-card" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
              <div className="emp-section-title" style={{ color: '#991B1B' }}>
                3. Các khoản khấu trừ (Deductions)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Trừ tạm ứng lương:</span>
                  <b>-{formatVND(payslip.advanceDeduction)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>BHXH & BHYT (10.5%):</span>
                  <b>-{formatVND(payslip.socialInsurance)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Giảm trừ vi phạm / khác:</span>
                  <b>-{formatVND(payslip.violationDeduction)}</b>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #FECACA', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#DC2626' }}>
                  <span>TỔNG GIẢM TRỪ:</span>
                  <span>-{formatVND(payslip.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Thực lĩnh NetSalary */}
          <div
            style={{
              background: '#F0FDFA',
              border: '2px solid #0F766E',
              borderRadius: 14,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: '#0F766E', fontWeight: 600 }}>SỐ TIỀN THỰC LĨNH (NET SALARY)</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#134E4A', marginTop: 2 }}>
                {formatVND(payslip.netSalary)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                className={`emp-status-pill ${
                  payslip.status === 'PAID' ? 'active' : 'inactive'
                }`}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: payslip.status === 'PAID' ? '#059669' : '#B45309',
                }}
              >
                {payslip.status === 'PAID' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Check size={14} />
                    <span>Đã thanh toán</span>
                  </span>
                ) : (
                  'Chưa thanh toán'
                )}
              </span>

              {payslip.status === 'UNPAID' && (
                <button
                  type="button"
                  className="emp-btn emp-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => onPayNow(payslip)}
                >
                  <CreditCard size={15} />
                  <span>Thanh toán ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="emp-modal-footer">
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => window.print()}
          >
            <Printer size={14} />
            <span>In phiếu lương</span>
          </button>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => alert('Xuất phiếu lương ra file PDF thành công!')}
          >
            <Download size={14} />
            <span>Xuất PDF</span>
          </button>
          <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
