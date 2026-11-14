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
      <div className="emp-modal-card" style={{ maxWidth: 780, width: '100%' }}>
        {/* Header */}
        <div
          className="emp-modal-header"
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#F0FDFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F766E',
                flexShrink: 0,
              }}
            >
              <Receipt size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Phiếu lương {effectivePayslip ? `· ${effectivePayslip.periodMonth}` : ''}
                </h3>
                {effectivePayslip && (
                  <>
                    <span style={{ fontSize: 12.5, color: '#64748B', fontWeight: 500 }}>
                      {effectivePayslip.payslipCode || `#${effectivePayslip.id.substring(0, 8)}`}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        color: isPaid ? 'var(--green-money)' : 'var(--orange-accent)',
                        fontWeight: 600,
                      }}
                    >
                      {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="emp-modal-body" style={{ padding: '16px 22px', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '50px 20px',
                gap: 10,
              }}
            >
              <Loader2 size={32} className="animate-spin" color="#0F766E" />
              <span style={{ fontSize: 13, color: '#64748B' }}>Đang tải...</span>
            </div>
          ) : errorMessage ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                color: '#991B1B',
                fontSize: 13,
              }}
            >
              <AlertCircle size={17} color="#DC2626" />
              <span>{errorMessage}</span>
            </div>
          ) : !effectivePayslip ? null : (
            <>
              {/* Thanh thông tin nhân viên gọn */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                    {effectivePayslip.employeeName}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0F766E',
                      background: '#F0FDFA',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {effectivePayslip.employeeCode}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#475569' }}>
                  <span>{effectivePayslip.branchName}</span>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{salaryTypeLabel}</span>
                </div>
              </div>

              {/* Thông số chấm công */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '12px 16px',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '10px 14px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Đơn giá</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {formatVND(effectiveBaseRate)} <span style={{ fontSize: 11.5, fontWeight: 500, color: '#64748B' }}>{rateUnitLabel}</span>
                    </div>
                  </div>

                  {effectivePayslip.salaryType !== 'HOURLY' && (
                    <>
                      <div>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>Ca được giao</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                          {effectivePayslip.standardDays} ca
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>Công thực tế</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F766E', marginTop: 2 }}>
                          {effectivePayslip.workedDays} ngày
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Tổng giờ</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {effectivePayslip.totalWorkHours || 0} giờ
                    </div>
                  </div>

                  {effectivePayslip.salaryType === 'SHIFT' && (
                    <div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>Số ca</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                        {effectivePayslip.totalShifts || 0} ca
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Giờ OT</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: effectivePayslip.otHours > 0 ? '#D97706' : '#64748B', marginTop: 2 }}>
                      {effectivePayslip.otHours} giờ
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>% Lương OT</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F766E', marginTop: 2 }}>
                      {effectivePayslip.otRateWeekday || '150%'} / {effectivePayslip.otRateSunday || '200%'} (CN)
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Đi muộn</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: (effectivePayslip.totalLateMinutes || 0) > 0 ? '#DC2626' : '#0F172A', marginTop: 2 }}>
                      {effectivePayslip.totalLateMinutes || 0} phút
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Về sớm</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: (effectivePayslip.totalEarlyLeaveMinutes || 0) > 0 ? '#DC2626' : '#0F172A', marginTop: 2 }}>
                      {effectivePayslip.totalEarlyLeaveMinutes || 0} phút
                    </div>
                  </div>

                  {effectivePayslip.salaryType !== 'HOURLY' && (
                    <div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>Nghỉ không lương</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: (effectivePayslip.unpaidLeaveDays || 0) > 0 ? '#D97706' : '#0F172A', marginTop: 2 }}>
                        {effectivePayslip.unpaidLeaveDays || 0} ngày
                      </div>
                    </div>
                  )}

                  {effectivePayslip.salaryType !== 'HOURLY' && (effectivePayslip.paidLeaveDays || 0) > 0 && (
                    <div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>Nghỉ có lương</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#059669', marginTop: 2 }}>
                        {effectivePayslip.paidLeaveDays} ngày
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bảng kê 2 cột: Thu nhập vs Khấu trừ */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                {/* Thu nhập */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 14px',
                      background: '#F0FDFA',
                      borderBottom: '1px solid #CCFBF1',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: '#0F766E',
                    }}
                  >
                    Thu nhập
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#475569' }}>Lương chính</span>
                      <strong style={{ color: '#0F172A' }}>{formatVND(effectivePayslip.baseSalaryEarned)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#475569' }}>
                        Lương OT
                        {effectivePayslip.otHours > 0 && (
                          <span style={{ fontSize: 11.5, color: '#64748B', marginLeft: 4 }}>
                            ({effectivePayslip.otHours}h)
                          </span>
                        )}
                      </span>
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
                        <span style={{ color: '#475569' }}>Thưởng</span>
                        <strong style={{ color: '#059669' }}>{formatVND(effectivePayslip.bonus)}</strong>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '8px 14px',
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
                    <span>Tổng thu nhập</span>
                    <span style={{ color: '#0F766E' }}>{formatVND(effectivePayslip.totalEarnings)}</span>
                  </div>
                </div>

                {/* Khấu trừ */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 14px',
                      background: '#FEF2F2',
                      borderBottom: '1px solid #FEE2E2',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: '#991B1B',
                    }}
                  >
                    Khấu trừ
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#475569' }}>Tạm ứng</span>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#B45309' }}>
                        <span>Dư nợ tạm ứng còn lại</span>
                        <span>{formatVND(effectivePayslip.remainingDebt)}</span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '8px 14px',
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
                    <span>Tổng khấu trừ</span>
                    <span style={{ color: '#DC2626' }}>
                      {effectivePayslip.totalDeductions > 0 ? `-${formatVND(effectivePayslip.totalDeductions)}` : '0 đ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thực lĩnh */}
              <div
                style={{
                  background: '#F0FDFA',
                  border: '1px solid #0D9488',
                  borderRadius: 10,
                  padding: '12px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F766E' }}>Thực lĩnh</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                    {formatVND(effectivePayslip.totalEarnings)} − {formatVND(effectivePayslip.totalDeductions)}
                  </div>
                </div>

                <div style={{ fontSize: 22, fontWeight: 800, color: '#0F766E' }}>
                  {formatVND(effectivePayslip.netSalary)}
                </div>
              </div>

              {/* Thông tin thanh toán & ghi chú */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#64748B',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div>
                  <strong style={{ color: '#1E293B' }}>{effectivePayslip.bankAccountName || effectivePayslip.employeeName}</strong>
                  <span style={{ margin: '0 6px', color: '#CBD5E1' }}>•</span>
                  <span>{effectivePayslip.bankName || 'Techcombank'}</span>
                  {effectivePayslip.bankAccountNumber && (
                    <>
                      <span style={{ margin: '0 6px', color: '#CBD5E1' }}>•</span>
                      <strong style={{ color: '#1E293B' }}>{effectivePayslip.bankAccountNumber}</strong>
                    </>
                  )}
                </div>

                {isPaid && (
                  <div>
                    <span>Phiếu chi: </span>
                    <strong style={{ color: '#0284C7' }}>{effectivePayslip.cashbookVoucherCode || 'PC-CHUA-TAO'}</strong>
                    <span style={{ margin: '0 6px', color: '#CBD5E1' }}>•</span>
                    <span>{effectivePayslip.paidAt || '—'}</span>
                  </div>
                )}
              </div>

              {effectivePayslip.note && (
                <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                  Ghi chú: {effectivePayslip.note}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="emp-modal-footer" style={{ padding: '12px 22px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onClick={() => window.print()}
            disabled={!effectivePayslip || isLoading}
          >
            <Printer size={15} />
            <span>In</span>
          </button>

          {!isPaid && effectivePayslip && (
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: 13,
              }}
              onClick={() => onPayNow(effectivePayslip)}
            >
              <CreditCard size={15} />
              <span>Thanh toán</span>
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
