import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { PayslipDetailedRecord } from '../../types';
import { payslipApi, extractErrorMessage } from '../../api/payslipApi';
import { employeeApi } from '../../api/employeeApi';
import { cashbookService } from '../../../cashbook/services/cashbookService';
import type { CashAccount } from '../../../cashbook/types/cashbook.types';
import { VIETNAM_BANKS } from '../../../supplier/lib/vietQrHelper';
import { EmployeeVietQrCard } from './EmployeeVietQrCard';

const isBankMatchedInVietnamBanks = (bankNameInput?: string): boolean => {
  if (!bankNameInput || !bankNameInput.trim()) return false;
  const input = bankNameInput.trim().toLowerCase();
  if (
    VIETNAM_BANKS.some(
      (b) =>
        b.code.toLowerCase() === input ||
        b.bin === input ||
        b.shortName.toLowerCase() === input ||
        b.name.toLowerCase() === input
    )
  ) {
    return true;
  }
  if (
    VIETNAM_BANKS.some(
      (b) =>
        input.includes(b.shortName.toLowerCase()) ||
        b.shortName.toLowerCase().includes(input) ||
        input.includes(b.name.toLowerCase()) ||
        b.name.toLowerCase().includes(input)
    )
  ) {
    return true;
  }
  const words = input.split(/[\s\-_,.]+/);
  return VIETNAM_BANKS.some((b) => words.includes(b.code.toLowerCase()));
};

const formatVietQrDescription = (raw: string): string =>
  raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);

const getLocalDateTimeInputValue = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface PayslipPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'pay' | 'advance';
  payslip?: PayslipDetailedRecord | null;
  batchPayslips?: PayslipDetailedRecord[] | null;
  onPaymentSuccess?: (mode: 'pay' | 'advance') => void;
  onConfirmPayment?: (payslipId: string, paymentMethod: 'VIETQR' | 'CASH', notes?: string) => void;
}

export const PayslipPaymentModal: React.FC<PayslipPaymentModalProps> = ({
  isOpen,
  onClose,
  mode = 'pay',
  payslip,
  batchPayslips,
  onPaymentSuccess,
  onConfirmPayment,
}) => {
  const isAdvanceMode = mode === 'advance';
  const [method, setMethod] = useState<'VIETQR' | 'CASH'>(isAdvanceMode ? 'CASH' : 'VIETQR');
  const [paymentTime, setPaymentTime] = useState<string>(getLocalDateTimeInputValue);
  const [amountInput, setAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [bankInfo, setBankInfo] = useState<{
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  } | null>(null);
  const [isLoadingBankInfo, setIsLoadingBankInfo] = useState<boolean>(false);
  const [manualBankCode, setManualBankCode] = useState<string>('');

  const isBatchMode = !isAdvanceMode && Array.isArray(batchPayslips) && batchPayslips.length > 0;

  const targetBranchId = useMemo(() => {
    if (isBatchMode && batchPayslips) {
      const uniqueBranchIds = Array.from(
        new Set(batchPayslips.map((p) => p.branchId).filter((id): id is string => Boolean(id)))
      );
      return uniqueBranchIds.length === 1 ? uniqueBranchIds[0] : undefined;
    }
    return payslip?.branchId;
  }, [isBatchMode, batchPayslips, payslip?.branchId]);

  const currentPayable = useMemo(() => {
    if (isBatchMode && batchPayslips) {
      return batchPayslips.reduce((acc, cur) => acc + cur.netSalary, 0);
    }
    return payslip?.netSalary || 0;
  }, [isBatchMode, batchPayslips, payslip?.netSalary]);

  useEffect(() => {
    if (!isOpen) return;
    setMethod(mode === 'advance' || isBatchMode ? 'CASH' : 'VIETQR');
    setPaymentTime(getLocalDateTimeInputValue());
    setAmountInput(currentPayable > 0 ? Math.round(currentPayable).toLocaleString('en-US') : '');
    setNotes('');
    setSubmitError(null);
    setSelectedAccountId('');
    setManualBankCode('');

    let cancelled = false;
    setIsLoadingAccounts(true);
    cashbookService
      .getCashAccounts(targetBranchId)
      .then((list) => {
        if (!cancelled) {
          setAccounts(list.filter((acc) => acc.isActive));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccounts([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAccounts(false);
        }
      });

    if (!isBatchMode && payslip?.id) {
      setBankInfo({
        bankName: payslip.bankName,
        bankAccountNumber: payslip.bankAccountNumber,
        bankAccountName: payslip.bankAccountName,
      });
      setIsLoadingBankInfo(true);

      Promise.allSettled([
        payslip.employeeId ? employeeApi.getEmployeeById(payslip.employeeId) : Promise.resolve(null),
        payslipApi.getPayslipById(payslip.id),
      ])
        .then(([empResult, detailResult]) => {
          if (cancelled) return;
          const emp = empResult.status === 'fulfilled' ? empResult.value : null;
          const detail = detailResult.status === 'fulfilled' ? detailResult.value : null;
          setBankInfo({
            bankName: emp?.bankName || detail?.bankName || payslip.bankName || undefined,
            bankAccountNumber:
              emp?.bankAccountNumber || detail?.bankAccountNumber || payslip.bankAccountNumber || undefined,
            bankAccountName:
              emp?.bankAccountHolder || detail?.bankAccountHolder || payslip.bankAccountName || undefined,
          });
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingBankInfo(false);
          }
        });
    } else {
      setBankInfo(null);
      setIsLoadingBankInfo(false);
    }

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    mode,
    targetBranchId,
    isBatchMode,
    currentPayable,
    payslip?.id,
    payslip?.employeeId,
    payslip?.bankName,
    payslip?.bankAccountNumber,
    payslip?.bankAccountName,
  ]);

  const effectiveMethod: 'VIETQR' | 'CASH' = isBatchMode ? 'CASH' : method;

  const filteredAccounts = useMemo(() => {
    if (effectiveMethod === 'VIETQR') {
      return accounts.filter((acc) => acc.accountType === 'BANK');
    }
    return accounts
      .filter((acc) => acc.accountType === 'CASH')
      .sort((a, b) => Number(Boolean(b.isSafeDeposit)) - Number(Boolean(a.isSafeDeposit)));
  }, [accounts, effectiveMethod]);

  useEffect(() => {
    if (filteredAccounts.length === 0) {
      setSelectedAccountId('');
      return;
    }
    if (!filteredAccounts.some((acc) => acc.id === selectedAccountId)) {
      setSelectedAccountId(filteredAccounts[0].id);
    }
  }, [filteredAccounts, selectedAccountId]);

  if (!isOpen || (!payslip && !isBatchMode)) return null;

  const parsedAmount = Number(amountInput.replace(/[^\d]/g, '')) || 0;
  const totalAmount = parsedAmount;
  const remainingAfter = Math.max(0, currentPayable - totalAmount);

  const selectedAccount = filteredAccounts.find((acc) => acc.id === selectedAccountId) || null;

  const formatAmount = (num?: number) => Math.round(num || 0).toLocaleString('en-US');

  const handleSubmit = async () => {
    if (parsedAmount <= 0) {
      setSubmitError(
        isAdvanceMode ? 'Vui lòng nhập số tiền tạm ứng lớn hơn 0.' : 'Vui lòng nhập số tiền chi lớn hơn 0.'
      );
      return;
    }

    if (isAdvanceMode) {
      if (currentPayable <= 0) {
        setSubmitError('Nhân viên chưa có tiền lương đã làm được khả dụng để tạm ứng.');
        return;
      }
      if (parsedAmount > currentPayable) {
        setSubmitError(
          `Số tiền tạm ứng (${formatAmount(parsedAmount)}đ) không được vượt quá tiền lương đã làm được còn lại (${formatAmount(currentPayable)}đ).`
        );
        return;
      }
    } else if (!isBatchMode && parsedAmount > currentPayable) {
      setSubmitError(
        `Số tiền chi (${formatAmount(parsedAmount)}đ) không được vượt quá số tiền trong phiếu lương (${formatAmount(currentPayable)}đ).`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const paidAtIso = paymentTime ? new Date(paymentTime).toISOString() : undefined;

      if (isAdvanceMode && payslip) {
        await payslipApi.advanceSalary(payslip.id, {
          amount: parsedAmount,
          paymentMethod: method,
          note: notes.trim() || undefined,
          cashbookAccountId: selectedAccountId || undefined,
          paidAt: paidAtIso,
        });
      } else if (isBatchMode && batchPayslips) {
        await payslipApi.batchPayPayslips({
          payslipIds: batchPayslips.map((p) => p.id),
          paymentMethod: 'CASH',
          note: notes.trim() || undefined,
          cashbookAccountId: selectedAccountId || undefined,
          paidAt: paidAtIso,
        });
      } else if (payslip) {
        await payslipApi.payPayslip(payslip.id, {
          paymentMethod: method,
          note: notes.trim() || undefined,
          cashbookAccountId: selectedAccountId || undefined,
          paidAt: paidAtIso,
        });

        if (onConfirmPayment) {
          onConfirmPayment(payslip.id, method, notes);
        }
      }

      if (onPaymentSuccess) {
        onPaymentSuccess(mode);
      } else {
        onClose();
      }
    } catch (err: any) {
      const msg = extractErrorMessage(
        err,
        isAdvanceMode ? 'Lỗi khi tạo phiếu chi tạm ứng lương.' : 'Lỗi khi tạo phiếu chi thanh toán lương.'
      );
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = isAdvanceMode && payslip
    ? `Tạo phiếu tạm ứng lương cho ${payslip.employeeName} (${payslip.employeeCode})`
    : isBatchMode && batchPayslips
      ? `Thanh toán lương hàng loạt (${batchPayslips.length} nhân viên)`
      : `Thanh toán lương cho ${payslip?.employeeName || ''} (${payslip?.employeeCode || ''})`;

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 880, width: '100%' }}>
        {/* Header */}
        <div
          className="emp-modal-header"
          style={{
            padding: '16px 24px 12px',
            borderBottom: 'none',
            background: 'var(--bg-card, #FFFFFF)',
          }}
        >
          <div style={{ width: '100%' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-main, #111827)' }}>
              {modalTitle}
            </h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted, #4B5563)', marginTop: 10 }}>
              {isBatchMode && batchPayslips ? (
                <span>
                  Chi trả đồng loạt cho <strong style={{ color: 'var(--blue-primary, #0F766E)' }}>{batchPayslips.length} nhân viên</strong>
                </span>
              ) : payslip ? (
                <span>
                  <strong style={{ color: 'var(--blue-primary, #0F766E)', fontWeight: 600 }}>{payslip.employeeName}</strong>
                  <span style={{ margin: '0 8px', color: 'var(--border-subtle, #E5EDF8)' }}>|</span>
                  <span>Chi nhánh: {payslip.branchName || '—'}</span>
                  <span style={{ margin: '0 8px', color: 'var(--border-subtle, #E5EDF8)' }}>|</span>
                  <span>Kỳ lương: {payslip.periodMonth}</span>
                </span>
              ) : null}
            </div>
          </div>

          <button type="button" className="emp-modal-close-btn" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle, #E5EDF8)' }} />

        {/* Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="emp-modal-body" style={{ padding: '18px 24px 20px', background: 'var(--bg-card, #FFFFFF)' }}>
            {submitError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'var(--red-light, #FFF0F0)',
                  border: '1px solid var(--red-border, #FFD6D6)',
                  borderRadius: 8,
                  color: 'var(--red-accent, #FF3B30)',
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                <AlertCircle size={16} color="var(--red-accent, #FF3B30)" style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 4fr) minmax(0, 6fr)',
                gap: 24,
                alignItems: 'start',
              }}
            >
              {/* Cột 1: Số tiền */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>
                    {isBatchMode ? 'Tổng cần trả:' : 'Còn cần trả:'}
                  </span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{formatAmount(currentPayable)}đ</span>
                </div>

                {!isBatchMode && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#334155', fontWeight: 600 }}>Số tiền:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="emp-form-input"
                        style={{
                          width: 140,
                          textAlign: 'right',
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontWeight: 600,
                          borderColor: parsedAmount > currentPayable ? 'var(--red-accent, #FF3B30)' : undefined,
                        }}
                        placeholder="0"
                        value={amountInput}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^\d]/g, '');
                          setAmountInput(digits ? Number(digits).toLocaleString('en-US') : '');
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#334155', fontWeight: 600 }}>Còn lại sau chi:</span>
                      <span style={{ color: '#0F172A', fontWeight: 500 }}>{formatAmount(remainingAfter)}đ</span>
                    </div>

                    {parsedAmount > currentPayable && (
                      <div
                        role="alert"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          padding: '8px 10px',
                          background: 'var(--red-light, #FFF0F0)',
                          border: '1px solid var(--red-border, #FFD6D6)',
                          borderRadius: 6,
                          color: 'var(--red-accent, #FF3B30)',
                          fontSize: 12,
                        }}
                      >
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>
                          Số tiền chi ({formatAmount(parsedAmount)}đ) đang vượt quá số tiền trong phiếu lương ({formatAmount(currentPayable)}đ).
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Cột 2: Thời gian, Phương thức, Nguồn quỹ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '105px minmax(0, 1fr)', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Thời gian:</span>
                  <input
                    type="datetime-local"
                    className="emp-form-input"
                    value={paymentTime}
                    onChange={(e) => setPaymentTime(e.target.value)}
                    style={{
                      width: '100%',
                      minWidth: 0,
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#1E293B',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '105px minmax(0, 1fr)', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Phương thức:</span>
                  <div>
                    <select
                      className="emp-form-input"
                      style={{ width: '100%', minWidth: 0, padding: '6px 10px', borderRadius: 6, fontSize: 13 }}
                      value={isBatchMode ? 'CASH' : method}
                      disabled={isBatchMode}
                      onChange={(e) => setMethod(e.target.value as 'VIETQR' | 'CASH')}
                    >
                      {!isBatchMode && <option value="VIETQR">Chuyển khoản</option>}
                      <option value="CASH">Tiền mặt</option>
                    </select>
                    {isBatchMode && (
                      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>
                        Thanh toán hàng loạt chỉ áp dụng cho Tiền mặt.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '105px minmax(0, 1fr)', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Nguồn quỹ:</span>
                  {isLoadingAccounts ? (
                    <span style={{ fontSize: 12, color: '#64748B' }}>Đang tải...</span>
                  ) : filteredAccounts.length > 0 ? (
                    <select
                      className="emp-form-input"
                      style={{
                        width: '100%',
                        minWidth: 0,
                        maxWidth: '100%',
                        padding: '6px 28px 6px 10px',
                        borderRadius: 6,
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={
                        selectedAccount
                          ? `${selectedAccount.accountName} (${formatAmount(selectedAccount.currentBalance)}đ)`
                          : undefined
                      }
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                    >
                      {filteredAccounts.map((acc) => {
                        const fullLabel = `${acc.accountName} (${formatAmount(acc.currentBalance)}đ)`;
                        const shortName =
                          acc.accountName.length > 30 ? `${acc.accountName.slice(0, 30)}...` : acc.accountName;
                        return (
                          <option key={acc.id} value={acc.id} title={fullLabel}>
                            {shortName} ({formatAmount(acc.currentBalance)}đ)
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      {method === 'VIETQR' ? 'Tài khoản ngân hàng mặc định' : 'Két sắt chi nhánh mặc định'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Danh sách số tiền chi riêng biệt từng nhân viên khi thanh toán hàng loạt */}
            {isBatchMode && batchPayslips && (
              <div
                data-testid="batch-payslip-breakdown"
                style={{
                  marginTop: 14,
                  border: '1px solid var(--border-subtle, #E5EDF8)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid var(--border-subtle, #E5EDF8)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Chi tiết số tiền chi từng nhân viên ({batchPayslips.length})</span>
                  <span>Tổng: {formatAmount(currentPayable)}đ</span>
                </div>
                <div style={{ maxHeight: 190, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', color: '#64748B', textAlign: 'left' }}>
                        <th style={{ padding: '6px 12px', fontWeight: 600 }}>Mã NV</th>
                        <th style={{ padding: '6px 12px', fontWeight: 600 }}>Nhân viên</th>
                        <th style={{ padding: '6px 12px', fontWeight: 600 }}>Kỳ lương</th>
                        <th style={{ padding: '6px 12px', fontWeight: 600, textAlign: 'right' }}>Số tiền chi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchPayslips.map((item) => (
                        <tr key={item.id} style={{ borderTop: '1px solid var(--border-subtle, #E5EDF8)' }}>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#475569' }}>
                            {item.employeeCode}
                          </td>
                          <td style={{ padding: '7px 12px', fontWeight: 600, color: '#0F172A' }}>
                            {item.employeeName}
                          </td>
                          <td style={{ padding: '7px 12px', color: '#475569' }}>{item.periodMonth}</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                            {formatAmount(item.netSalary)}đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Thông tin tài khoản nhận & VietQR Napas 247 (chuyển khoản đơn lẻ) */}
            {method === 'VIETQR' && !isBatchMode && payslip && (() => {
              const rawAccountNo = (bankInfo?.bankAccountNumber || payslip.bankAccountNumber || '').trim();
              const rawBankName = bankInfo?.bankName || payslip.bankName || '';
              const accountHolder =
                bankInfo?.bankAccountName || payslip.bankAccountName || payslip.employeeName || '';
              const isBankMatched = isBankMatchedInVietnamBanks(rawBankName);
              const effectiveBankName = manualBankCode || rawBankName;
              const transferDescription = formatVietQrDescription(
                isAdvanceMode
                  ? `TAM UNG ${payslip.employeeCode || payslip.employeeName}`
                  : `TRA LUONG ${payslip.payslipCode || payslip.employeeCode}`
              );

              if (isLoadingBankInfo) {
                return (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '10px 12px',
                      background: 'var(--blue-light, #F0FDFA)',
                      border: '1px solid var(--blue-border, #99F6E4)',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: 'var(--text-muted, #4B5563)',
                    }}
                  >
                    Đang tải thông tin TK nhận...
                  </div>
                );
              }

              if (!rawAccountNo) {
                return (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '10px 12px',
                      background: 'var(--orange-light, #FFF8EB)',
                      border: '1px solid var(--orange-border, #FFE8CC)',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: '#B45309',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>
                      Nhân viên chưa có số tài khoản ngân hàng — vui lòng cập nhật hồ sơ hoặc chuyển sang Tiền mặt.
                    </span>
                  </div>
                );
              }

              return (
                <div style={{ marginTop: 12 }}>
                  {!isBankMatched && (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: 'var(--orange-light, #FFF8EB)',
                        border: '1px solid var(--orange-border, #FFE8CC)',
                        borderRadius: 8,
                        fontSize: 12.5,
                        color: '#92400E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        Chưa tự nhận diện được ngân hàng{rawBankName ? ` "${rawBankName}"` : ''} — chọn nhanh ngân hàng Napas 247:
                      </span>
                      <select
                        aria-label="Chọn ngân hàng Napas 247"
                        className="emp-form-input"
                        style={{ minWidth: 200, padding: '4px 8px', borderRadius: 6, fontSize: 12.5 }}
                        value={manualBankCode}
                        onChange={(e) => setManualBankCode(e.target.value)}
                      >
                        <option value="">-- Chọn ngân hàng --</option>
                        {VIETNAM_BANKS.map((bank) => (
                          <option key={bank.code} value={bank.code}>
                            {bank.shortName} ({bank.code} · {bank.bin})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <EmployeeVietQrCard
                    bankName={effectiveBankName}
                    accountNo={rawAccountNo}
                    accountHolder={accountHolder}
                    amount={parsedAmount}
                    description={transferDescription}
                    compact
                  />
                </div>
              );
            })()}

            {/* Ghi chú bên dưới */}
            <div style={{ marginTop: 14 }}>
              <textarea
                className="emp-form-input"
                maxLength={500}
                rows={3}
                placeholder="Ghi chú..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  border: '1px solid var(--border-subtle, #E5EDF8)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--text-main, #111827)',
                  background: 'var(--bg-card, #FFFFFF)',
                }}
              />
            </div>

            {selectedAccount && selectedAccount.currentBalance < totalAmount && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: 'var(--orange-accent, #FF9500)',
                  background: 'var(--orange-light, #FFF8EB)',
                  border: '1px solid var(--orange-border, #FFE8CC)',
                  borderRadius: 6,
                  padding: '6px 10px',
                }}
              >
                Số dư tài khoản nguồn ({formatAmount(selectedAccount.currentBalance)}đ) đang thấp hơn số tiền cần chi ({formatAmount(totalAmount)}đ).
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="emp-modal-footer"
            style={{
              padding: '12px 24px',
              background: 'var(--bg-card, #FFFFFF)',
              borderTop: '1px solid var(--border-subtle, #E5EDF8)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Bỏ qua
            </button>
            <button
              type="submit"
              className="emp-btn emp-btn-primary"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--blue-primary, #0F766E)',
                borderColor: 'var(--blue-primary, #0F766E)',
              }}
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              <span>{isSubmitting ? 'Đang xử lý...' : 'Tạo phiếu chi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
