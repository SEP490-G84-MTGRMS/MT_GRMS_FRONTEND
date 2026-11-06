import React from 'react';
import { Printer, CreditCard, Receipt } from 'lucide-react';
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
    return `${Math.round(num).toLocaleString('vi-VN')} đ`;
  };

  // Xác định danh sách phụ cấp chi tiết từ snapshot
  let parsedAllowances: Array<{ name: string; amount: number }> = [];
  if (payslip.allowances && payslip.allowances.length > 0) {
    parsedAllowances = payslip.allowances;
  } else if (payslip.allowancesDetailJson) {
    try {
      parsedAllowances = JSON.parse(payslip.allowancesDetailJson);
    } catch {
      parsedAllowances = [];
    }
  }

  // Fallback tương thích dữ liệu cũ nếu không có JSON
  if (parsedAllowances.length === 0) {
    if (payslip.lunchAllowance > 0) {
      parsedAllowances.push({ name: 'Phụ cấp ăn trưa', amount: payslip.lunchAllowance });
    }
    if (payslip.travelAllowance > 0) {
      parsedAllowances.push({ name: 'Phụ cấp đi lại', amount: payslip.travelAllowance });
    }
  }

  const effectiveBaseRate = payslip.baseRate ?? payslip.contractBaseSalary ?? 0;

  // Phân bổ 3 khoản bảo hiểm theo tỷ lệ chuẩn Luật BHXH Việt Nam: 8% (BHXH) - 1.5% (BHYT) - 1% (BHTN), tổng 10.5%
  const totalInsurance = payslip.socialInsurance ?? 0;
  const bhxhAmount = payslip.bhxh ?? (totalInsurance > 0 ? Math.round(totalInsurance * (8 / 10.5)) : 0);
  const bhytAmount = payslip.bhyt ?? (totalInsurance > 0 ? Math.round(totalInsurance * (1.5 / 10.5)) : 0);
  const bhtnAmount =
    payslip.bhtn ?? (totalInsurance > 0 ? totalInsurance - bhxhAmount - bhytAmount : 0);

  const salaryTypeLabel =
    payslip.salaryType === 'HOURLY'
      ? 'Theo giờ'
      : payslip.salaryType === 'SHIFT'
        ? 'Theo ca'
        : 'Theo tháng';

  const rateUnitLabel =
    payslip.salaryType === 'HOURLY'
      ? 'đ/giờ'
      : payslip.salaryType === 'SHIFT'
        ? 'đ/ca'
        : 'đ/tháng';

  const isPaid = payslip.status === 'PAID';

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 820 }}>
        {/* Header phiếu lương chứng từ */}
        <div
          className="emp-modal-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F766E',
                flexShrink: 0,
              }}
            >
              <Receipt size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                  Phiếu lương nhân viên
                </h3>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                  #{payslip.id}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: isPaid ? '#ECFDF5' : '#FFFBEB',
                    color: isPaid ? '#065F46' : '#92400E',
                    border: `1px solid ${isPaid ? '#A7F3D0' : '#FDE68A'}`,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isPaid ? '#10B981' : '#F59E0B',
                    }}
                  />
                  {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                Kỳ lương: <span style={{ fontWeight: 600, color: '#1E293B' }}>{payslip.periodMonth}</span>
                <span style={{ margin: '0 8px', color: '#CBD5E1' }}>|</span>
                Chi nhánh: <span style={{ fontWeight: 600, color: '#1E293B' }}>{payslip.branchName}</span>
              </div>
            </div>
          </div>

          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Thân phiếu lương */}
        <div className="emp-modal-body" style={{ padding: '20px 24px', background: '#FAFAFA' }}>
          {/* Thông tin nhân viên & hình thức lương */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 16,
              fontSize: 13,
            }}
          >
            <div>
              <div style={{ color: '#64748B', fontSize: 12 }}>Họ và tên nhân viên</div>
              <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                {payslip.employeeName}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Mã NV: {payslip.employeeCode}</div>
            </div>

            <div>
              <div style={{ color: '#64748B', fontSize: 12 }}>Hình thức trả lương</div>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 2 }}>
                {salaryTypeLabel}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Chuẩn: {payslip.standardDays} công ({payslip.standardDayHours ?? 8}h/ngày)
              </div>
            </div>

            <div>
              <div style={{ color: '#64748B', fontSize: 12 }}>Mức lương định mức</div>
              <div style={{ fontWeight: 700, color: '#0F766E', marginTop: 2 }}>
                {formatVND(effectiveBaseRate)}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{rateUnitLabel}</div>
            </div>

            <div>
              <div style={{ color: '#64748B', fontSize: 12 }}>Tài khoản nhận lương</div>
              <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 2 }}>
                {payslip.bankAccountNumber || 'Chưa cập nhật'}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{payslip.bankName || 'Tiền mặt'}</div>
            </div>
          </div>

          {/* Dữ liệu chấm công thực tế trong kỳ */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '12px 18px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 10,
              }}
            >
              Tổng hợp công và thời gian làm việc
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ padding: '8px 4px', background: '#F8FAFC', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Ngày công làm</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {payslip.workedDays}
                </div>
              </div>

              <div style={{ padding: '8px 4px', background: '#F8FAFC', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Tổng giờ làm</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {payslip.totalWorkHours ?? (payslip.workedDays * 8).toFixed(1)}h
                </div>
              </div>

              <div style={{ padding: '8px 4px', background: '#F8FAFC', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Số ca hoàn thành</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {payslip.totalShifts ?? Math.round(payslip.workedDays)}
                </div>
              </div>

              <div style={{ padding: '8px 4px', background: '#F8FAFC', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Làm thêm (OT)</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#D97706', marginTop: 2 }}>
                  {payslip.otHours > 0 ? `${payslip.otHours}h` : '-'}
                </div>
              </div>

              <div style={{ padding: '8px 4px', background: '#F8FAFC', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Đi trễ / Về sớm</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 3,
                    color:
                      (payslip.totalLateMinutes ?? 0) > 0 || (payslip.totalEarlyLeaveMinutes ?? 0) > 0
                        ? '#D97706'
                        : '#64748B',
                  }}
                >
                  {(payslip.totalLateMinutes ?? 0) > 0 || (payslip.totalEarlyLeaveMinutes ?? 0) > 0
                    ? `${payslip.totalLateMinutes ?? 0}p / ${payslip.totalEarlyLeaveMinutes ?? 0}p`
                    : 'Đúng giờ'}
                </div>
              </div>
            </div>
          </div>

          {/* Bảng chi tiết Lương & Khấu trừ (2 cột đối chiếu chuẩn kế toán) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 16,
            }}
          >
            {/* Cột A: Các khoản thu nhập */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Các khoản thu nhập (A)
              </div>

              <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Lương theo công / thời gian</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatVND(payslip.baseSalaryEarned)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Tiền làm thêm giờ (OT)</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatVND(payslip.overtimePay)}</span>
                </div>

                {parsedAllowances.map((al, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>{al.name}</span>
                    <span style={{ fontWeight: 500, color: '#334155' }}>{formatVND(al.amount)}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: '10px 16px',
                  background: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              >
                <span>TỔNG THU NHẬP (A)</span>
                <span style={{ fontSize: 14, color: '#0F766E' }}>{formatVND(payslip.totalEarnings)}</span>
              </div>
            </div>

            {/* Cột B: Các khoản giảm trừ */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Các khoản giảm trừ (B)
              </div>

              <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Khấu trừ tạm ứng lương</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {payslip.advanceDeduction > 0 ? `-${formatVND(payslip.advanceDeduction)}` : '0 đ'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Bảo hiểm xã hội (8%)</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>
                    {bhxhAmount > 0 ? `-${formatVND(bhxhAmount)}` : '0 đ'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Bảo hiểm y tế (1,5%)</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>
                    {bhytAmount > 0 ? `-${formatVND(bhytAmount)}` : '0 đ'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Bảo hiểm thất nghiệp (1%)</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>
                    {bhtnAmount > 0 ? `-${formatVND(bhtnAmount)}` : '0 đ'}
                  </span>
                </div>

                {payslip.remainingDebt !== undefined && payslip.remainingDebt > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#B45309' }}>
                    <span>Dư nợ tạm ứng còn lại sau kỳ</span>
                    <span>{formatVND(payslip.remainingDebt)}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '10px 16px',
                  background: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              >
                <span>TỔNG GIẢM TRỪ (B)</span>
                <span style={{ fontSize: 14, color: '#DC2626' }}>
                  {payslip.totalDeductions > 0 ? `-${formatVND(payslip.totalDeductions)}` : '0 đ'}
                </span>
              </div>
            </div>
          </div>

          {/* Dòng chốt Thực lĩnh (Net Salary) */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: 10,
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 4,
                  height: 38,
                  borderRadius: 2,
                  background: '#0D9488',
                }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Lương thực lĩnh
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                  Tổng thu nhập ({formatVND(payslip.totalEarnings)}) − Tổng giảm trừ ({formatVND(payslip.totalDeductions)})
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F766E', lineHeight: 1.1 }}>
                {formatVND(payslip.netSalary)}
              </div>
            </div>
          </div>

          {/* Thông tin chứng từ & Kế toán */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '12px 18px',
              fontSize: 12,
              color: '#64748B',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <span>Người thụ hưởng: </span>
              <strong style={{ color: '#1E293B' }}>{payslip.bankAccountName || payslip.employeeName}</strong>
              <span style={{ margin: '0 8px', color: '#CBD5E1' }}>•</span>
              <span>Ngân hàng: </span>
              <strong style={{ color: '#1E293B' }}>{payslip.bankName || 'Techcombank'}</strong>
            </div>

            {isPaid ? (
              <div>
                <span>Phiếu chi Sổ quỹ: </span>
                <strong style={{ color: '#0284C7' }}>{payslip.cashbookVoucherCode || 'PC-202610-001'}</strong>
                <span style={{ margin: '0 8px', color: '#CBD5E1' }}>•</span>
                <span>Ngày chi: </span>
                <strong style={{ color: '#1E293B' }}>{payslip.paidAt || '2026-10-05 09:30'}</strong>
              </div>
            ) : (
              <div>
                <span>Trạng thái: </span>
                <span style={{ color: '#B45309', fontWeight: 600 }}>Chờ chi trả lương</span>
              </div>
            )}
          </div>

          {payslip.note && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
              Ghi chú: {payslip.note}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="emp-modal-footer" style={{ padding: '14px 24px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>In phiếu lương</span>
          </button>

          {!isPaid && (
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                fontSize: 13,
              }}
              onClick={() => onPayNow(payslip)}
            >
              <CreditCard size={15} />
              <span>Thanh toán ngay</span>
            </button>
          )}

          <button type="button" className="emp-btn emp-btn-secondary" style={{ fontSize: 13 }} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
