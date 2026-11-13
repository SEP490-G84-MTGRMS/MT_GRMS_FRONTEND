import React, { useState, useEffect } from 'react';
import { Printer, CreditCard, Receipt, Loader2, AlertCircle } from 'lucide-react';
import type { PayslipDetailedRecord } from '../../types';
import {
  payslipApi,
  mapBackendDetailToDetailedRecord,
  extractErrorMessage,
} from '../../api/payslipApi';

interface PayslipDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslipId?: string | null;
  payslip?: PayslipDetailedRecord | null;
  onPayNow: (payslip: PayslipDetailedRecord) => void;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({
  isOpen,
  onClose,
  payslipId,
  payslip: initialPayslip,
  onPayNow,
}) => {
  const [detail, setDetail] = useState<PayslipDetailedRecord | null>(initialPayslip || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      if (payslipId) {
        setIsLoading(true);
        setErrorMessage(null);
        payslipApi
          .getPayslipById(payslipId)
          .then((res) => {
            if (isMounted) {
              setDetail(mapBackendDetailToDetailedRecord(res));
            }
          })
          .catch((err) => {
            if (isMounted) {
              setErrorMessage(extractErrorMessage(err, 'Không thể tải chi tiết phiếu lương.'));
            }
          })
          .finally(() => {
            if (isMounted) {
              setIsLoading(false);
            }
          });
      } else if (initialPayslip) {
        setDetail(initialPayslip);
        setIsLoading(false);
        setErrorMessage(null);
      }
    } else {
      setDetail(null);
      setErrorMessage(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, payslipId, initialPayslip]);

  if (!isOpen) return null;

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 đ';
    return `${Math.round(num).toLocaleString('vi-VN')} đ`;
  };

  const effectivePayslip = detail || initialPayslip;

  // Xác định danh sách phụ cấp chi tiết từ snapshot
  let parsedAllowances: Array<{ name: string; amount: number }> = [];
  if (effectivePayslip?.allowances && effectivePayslip.allowances.length > 0) {
    parsedAllowances = effectivePayslip.allowances;
  } else if (effectivePayslip?.allowancesDetailJson) {
    try {
      parsedAllowances = JSON.parse(effectivePayslip.allowancesDetailJson);
    } catch {
      parsedAllowances = [];
    }
  }

  // Fallback tương thích dữ liệu cũ nếu không có JSON
  if (parsedAllowances.length === 0 && effectivePayslip) {
    if (effectivePayslip.lunchAllowance > 0) {
      parsedAllowances.push({ name: 'Phụ cấp ăn trưa', amount: effectivePayslip.lunchAllowance });
    }
    if (effectivePayslip.travelAllowance > 0) {
      parsedAllowances.push({ name: 'Phụ cấp đi lại', amount: effectivePayslip.travelAllowance });
    }
  }

  const effectiveBaseRate = effectivePayslip?.baseRate ?? effectivePayslip?.contractBaseSalary ?? 0;

  // Phân bổ bảo hiểm theo tỷ lệ chuẩn Luật BHXH Việt Nam: 8% (BHXH) - 1.5% (BHYT) - 1% (BHTN), tổng 10.5%
  const totalInsurance = effectivePayslip?.socialInsurance ?? 0;
  const bhxhAmount = effectivePayslip?.bhxh ?? (totalInsurance > 0 ? Math.round(totalInsurance * (8 / 10.5)) : 0);
  const bhytAmount = effectivePayslip?.bhyt ?? (totalInsurance > 0 ? Math.round(totalInsurance * (1.5 / 10.5)) : 0);
  const bhtnAmount =
    effectivePayslip?.bhtn ?? (totalInsurance > 0 ? totalInsurance - bhxhAmount - bhytAmount : 0);

  const salaryTypeLabel =
    effectivePayslip?.salaryType === 'HOURLY'
      ? 'Theo giờ'
      : effectivePayslip?.salaryType === 'SHIFT'
        ? 'Theo ca'
        : 'Theo tháng';

  const rateUnitLabel =
    effectivePayslip?.salaryType === 'HOURLY'
      ? 'đ/giờ'
      : effectivePayslip?.salaryType === 'SHIFT'
        ? 'đ/ca'
        : 'đ/tháng';

  const isPaid = effectivePayslip?.status === 'PAID';

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
                {effectivePayslip && (
                  <>
                    <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                      #{effectivePayslip.id.substring(0, 8)}
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
                      {isPaid ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN'}
                    </span>
                  </>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Kỳ lương: {effectivePayslip ? effectivePayslip.periodMonth : '...'} • {effectivePayslip?.branchName}
              </div>
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="emp-modal-body" style={{ padding: '20px 24px', background: '#F8FAFC' }}>
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                gap: 12,
              }}
            >
              <Loader2 size={36} className="animate-spin" color="#0F766E" />
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
                Đang tải chi tiết phiếu lương...
              </span>
            </div>
          ) : errorMessage ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '16px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                color: '#991B1B',
                fontSize: 13,
              }}
            >
              <AlertCircle size={18} color="#DC2626" />
              <span>{errorMessage}</span>
            </div>
          ) : !effectivePayslip ? null : (
            <>
              {/* Thẻ thông tin nhân viên & hình thức lương */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '16px 20px',
                  marginBottom: 16,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Mã nhân viên</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F766E', marginTop: 2 }}>
                    {effectivePayslip.employeeCode}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Họ và tên</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {effectivePayslip.employeeName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Chi nhánh làm việc</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {effectivePayslip.branchName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Hình thức trả lương</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {salaryTypeLabel}
                  </div>
                </div>
              </div>

              {/* Thông số chấm công & Công chuẩn */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '14px 20px',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F766E', marginBottom: 10 }}>
                  THÔNG SỐ CÔNG & CHẤM CÔNG THỰC TẾ
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span style={{ color: '#64748B' }}>Mức lương thỏa thuận: </span>
                    <strong style={{ color: '#0F172A' }}>
                      {formatVND(effectiveBaseRate)} {rateUnitLabel}
                    </strong>
                  </div>

                  {/* Nhân viên làm theo giờ (HOURLY) không hiển thị Công chuẩn và Công thực tế */}
                  {effectivePayslip.salaryType !== 'HOURLY' && (
                    <>
                      <div>
                        <span style={{ color: '#64748B' }}>Công chuẩn: </span>
                        <strong style={{ color: '#0F172A' }}>{effectivePayslip.standardDays} ngày</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Công thực tế: </span>
                        <strong style={{ color: '#0F766E' }}>{effectivePayslip.workedDays} ngày</strong>
                      </div>
                    </>
                  )}

                  <div>
                    <span style={{ color: '#64748B' }}>Tổng giờ làm: </span>
                    <strong style={{ color: '#0F172A' }}>{effectivePayslip.totalWorkHours || 0} giờ</strong>
                  </div>

                  {effectivePayslip.salaryType === 'SHIFT' && (
                    <div>
                      <span style={{ color: '#64748B' }}>Tổng số ca: </span>
                      <strong style={{ color: '#0F172A' }}>{effectivePayslip.totalShifts || 0} ca</strong>
                    </div>
                  )}

                  <div>
                    <span style={{ color: '#64748B' }}>Giờ làm thêm (OT): </span>
                    <strong style={{ color: effectivePayslip.otHours > 0 ? '#D97706' : '#64748B' }}>
                      {effectivePayslip.otHours} giờ
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748B' }}>% Lương OT: </span>
                    <strong style={{ color: '#0F766E' }}>
                      {effectivePayslip.otRateWeekday || '150%'} (Thường) / {effectivePayslip.otRateSunday || '200%'} (CN)
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748B' }}>Đi muộn: </span>
                    <strong style={{ color: (effectivePayslip.totalLateMinutes || 0) > 0 ? '#DC2626' : '#0F172A' }}>
                      {effectivePayslip.totalLateMinutes || 0} phút
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748B' }}>Về sớm: </span>
                    <strong style={{ color: (effectivePayslip.totalEarlyLeaveMinutes || 0) > 0 ? '#DC2626' : '#0F172A' }}>
                      {effectivePayslip.totalEarlyLeaveMinutes || 0} phút
                    </strong>
                  </div>

                  {effectivePayslip.salaryType !== 'HOURLY' && (
                    <div>
                      <span style={{ color: '#64748B' }}>Nghỉ không lương: </span>
                      <strong style={{ color: (effectivePayslip.unpaidLeaveDays || 0) > 0 ? '#D97706' : '#0F172A' }}>
                        {effectivePayslip.unpaidLeaveDays || 0} ngày
                      </strong>
                    </div>
                  )}

                  {effectivePayslip.salaryType !== 'HOURLY' && (effectivePayslip.paidLeaveDays || 0) > 0 && (
                    <div>
                      <span style={{ color: '#64748B' }}>Nghỉ có lương: </span>
                      <strong style={{ color: '#059669' }}>
                        {effectivePayslip.paidLeaveDays} ngày
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Bảng kê 2 cột: Thu nhập vs Khấu trừ */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                {/* Cột trái: Thu nhập (A) */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 16px',
                      background: '#F0FDFA',
                      borderBottom: '1px solid #CCFBF1',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0F766E',
                    }}
                  >
                    1. CÁC KHOẢN THU NHẬP (A)
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#475569' }}>Lương theo ngày công / giờ</span>
                      <strong style={{ color: '#0F172A' }}>{formatVND(effectivePayslip.baseSalaryEarned)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <div>
                        <span style={{ color: '#475569' }}>Lương làm thêm giờ (OT)</span>
                        {effectivePayslip.otHours > 0 && (
                          <span style={{ fontSize: 11.5, color: '#64748B', marginLeft: 6 }}>
                            ({effectivePayslip.otHours}h × {effectivePayslip.otRateWeekday || '150%'})
                          </span>
                        )}
                      </div>
                      <strong style={{ color: effectivePayslip.overtimePay > 0 ? '#0F766E' : '#64748B' }}>
                        {formatVND(effectivePayslip.overtimePay)}
                      </strong>
                    </div>

                    {parsedAllowances.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#475569' }}>{item.name}</span>
                        <strong style={{ color: '#0F172A' }}>{formatVND(item.amount)}</strong>
                      </div>
                    ))}

                    {effectivePayslip.bonus !== undefined && effectivePayslip.bonus > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#475569' }}>Thưởng doanh số / chuyên cần</span>
                        <strong style={{ color: '#059669' }}>{formatVND(effectivePayslip.bonus)}</strong>
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
                    <span>TỔNG THU NHẬP (A)</span>
                    <span style={{ fontSize: 14, color: '#0F766E' }}>
                      {formatVND(effectivePayslip.totalEarnings)}
                    </span>
                  </div>
                </div>

                {/* Cột phải: Các khoản giảm trừ (B) */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 16px',
                      background: '#FEF2F2',
                      borderBottom: '1px solid #FEE2E2',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#991B1B',
                    }}
                  >
                    2. CÁC KHOẢN GIẢM TRỪ (B)
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#475569' }}>Khấu trừ tạm ứng lương</span>
                      <span style={{ color: effectivePayslip.advanceDeduction > 0 ? '#DC2626' : '#64748B', fontWeight: 600 }}>
                        {effectivePayslip.advanceDeduction > 0 ? `-${formatVND(effectivePayslip.advanceDeduction)}` : '0 đ'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#475569' }}>BHXH (8%)</span>
                      <span style={{ color: bhxhAmount > 0 ? '#DC2626' : '#64748B' }}>
                        {bhxhAmount > 0 ? `-${formatVND(bhxhAmount)}` : '0 đ'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#475569' }}>BHYT (1.5%)</span>
                      <span style={{ color: bhytAmount > 0 ? '#DC2626' : '#64748B' }}>
                        {bhytAmount > 0 ? `-${formatVND(bhytAmount)}` : '0 đ'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#475569' }}>BHTN (1%)</span>
                      <span style={{ color: bhtnAmount > 0 ? '#DC2626' : '#64748B' }}>
                        {bhtnAmount > 0 ? `-${formatVND(bhtnAmount)}` : '0 đ'}
                      </span>
                    </div>

                    {effectivePayslip.remainingDebt !== undefined && effectivePayslip.remainingDebt > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#B45309' }}>
                        <span>Dư nợ tạm ứng còn lại sau kỳ</span>
                        <span>{formatVND(effectivePayslip.remainingDebt)}</span>
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
                      {effectivePayslip.totalDeductions > 0 ? `-${formatVND(effectivePayslip.totalDeductions)}` : '0 đ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dòng chốt Thực lĩnh (Net Salary) */}
              <div
                style={{
                  background: '#F0FDFA',
                  border: '1px solid #0D9488',
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Lương thực lĩnh (Net Salary)
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                      Tổng thu nhập ({formatVND(effectivePayslip.totalEarnings)}) − Tổng giảm trừ ({formatVND(effectivePayslip.totalDeductions)})
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0F766E', lineHeight: 1.1 }}>
                    {formatVND(effectivePayslip.netSalary)}
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
                  <strong style={{ color: '#1E293B' }}>{effectivePayslip.bankAccountName || effectivePayslip.employeeName}</strong>
                  <span style={{ margin: '0 8px', color: '#CBD5E1' }}>•</span>
                  <span>Ngân hàng: </span>
                  <strong style={{ color: '#1E293B' }}>{effectivePayslip.bankName || 'Techcombank'}</strong>
                  {effectivePayslip.bankAccountNumber && (
                    <>
                      <span style={{ margin: '0 8px', color: '#CBD5E1' }}>•</span>
                      <span>STK: </span>
                      <strong style={{ color: '#1E293B' }}>{effectivePayslip.bankAccountNumber}</strong>
                    </>
                  )}
                </div>

                {isPaid ? (
                  <div>
                    <span>Phiếu chi Sổ quỹ: </span>
                    <strong style={{ color: '#0284C7' }}>{effectivePayslip.cashbookVoucherCode || 'PC-CHUA-TAO'}</strong>
                    <span style={{ margin: '0 8px', color: '#CBD5E1' }}>•</span>
                    <span>Ngày chi: </span>
                    <strong style={{ color: '#1E293B' }}>{effectivePayslip.paidAt || '—'}</strong>
                  </div>
                ) : (
                  <div>
                    <span>Trạng thái: </span>
                    <span style={{ color: '#B45309', fontWeight: 600 }}>Chờ chi trả lương</span>
                  </div>
                )}
              </div>

              {effectivePayslip.note && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                  Ghi chú: {effectivePayslip.note}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="emp-modal-footer" style={{ padding: '14px 24px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onClick={() => window.print()}
            disabled={!effectivePayslip || isLoading}
          >
            <Printer size={15} />
            <span>In phiếu lương</span>
          </button>

          {!isPaid && effectivePayslip && (
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
              onClick={() => onPayNow(effectivePayslip)}
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
