import React, { useState, useEffect } from 'react';
import { Printer, CreditCard, Loader2, AlertCircle, Banknote } from 'lucide-react';
import type { PayslipDetailedRecord } from '../../types';
import {
  payslipApi,
  mapBackendDetailToDetailedRecord,
  extractErrorMessage,
} from '../../api/payslipApi';
import { scheduleApi, type ScheduleResponse } from '../../api/scheduleApi';
import { cashbookService } from '../../../cashbook/services/cashbookService';
import type { LedgerTransaction } from '../../../cashbook/types/cashbook.types';

interface PayslipDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslipId?: string | null;
  payslip?: PayslipDetailedRecord | null;
  canManage?: boolean;
  onAdvance?: (payslip: PayslipDetailedRecord) => void;
  onPayNow: (payslip: PayslipDetailedRecord) => void;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({
  isOpen,
  onClose,
  payslipId,
  payslip: initialPayslip,
  canManage = true,
  onAdvance,
  onPayNow,
}) => {
  const [detail, setDetail] = useState<PayslipDetailedRecord | null>(initialPayslip || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payment' | 'attendance' | 'history'>('payment');
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState<boolean>(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<LedgerTransaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setActiveTab('payment');
      setSchedules([]);
      setScheduleError(null);
      setPaymentHistory([]);
      setHistoryError(null);
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

  const effectivePayslip = detail || initialPayslip;

  useEffect(() => {
    if (!isOpen || activeTab !== 'history' || !effectivePayslip?.id) {
      return;
    }

    let cancelled = false;
    setIsLoadingHistory(true);
    setHistoryError(null);

    cashbookService
      .getTransactions(
        {
          branchId: effectivePayslip.branchId || undefined,
          searchQuery: effectivePayslip.payslipCode || effectivePayslip.id,
        },
        1,
        50
      )
      .then((res) => {
        if (cancelled) return;
        const matched = (res.items || [])
          .filter(
            (tx) =>
              tx.sourceId === effectivePayslip.id ||
              (effectivePayslip.payslipCode && tx.referenceDocId === effectivePayslip.payslipCode)
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPaymentHistory(matched);
      })
      .catch((err) => {
        if (!cancelled) {
          setHistoryError(extractErrorMessage(err, 'Không thể tải lịch sử thanh toán.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, effectivePayslip?.id, effectivePayslip?.branchId, effectivePayslip?.payslipCode]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'attendance' || !effectivePayslip?.periodMonth) {
      return;
    }

    const [yStr, mStr] = effectivePayslip.periodMonth.split('-');
    const yearNum = Number(yStr);
    const monthNum = Number(mStr);
    if (!yearNum || !monthNum) return;

    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const mm = String(monthNum).padStart(2, '0');
    const fromDate = `${yearNum}-${mm}-01`;
    const toDate = `${yearNum}-${mm}-${String(lastDay).padStart(2, '0')}`;

    let cancelled = false;
    setIsLoadingSchedules(true);
    setScheduleError(null);

    const request = canManage
      ? scheduleApi.getRawSchedules({
          employeeId: effectivePayslip.employeeId,
          branchId: effectivePayslip.branchId,
          fromDate,
          toDate,
          pageSize: 200,
        })
      : scheduleApi.getRawMySchedules(fromDate, toDate);

    request
      .then((list) => {
        if (!cancelled) {
          const sorted = [...list].sort((a, b) => a.workDate.localeCompare(b.workDate));
          setSchedules(sorted);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setScheduleError(extractErrorMessage(err, 'Không thể tải dữ liệu chấm công chi tiết.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSchedules(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, effectivePayslip?.employeeId, effectivePayslip?.branchId, effectivePayslip?.periodMonth, canManage]);

  if (!isOpen) return null;

  const isPaid = effectivePayslip?.status === 'PAID';
  const formatAmount = (num?: number) => Math.round(num || 0).toLocaleString('en-US');

  const totalAllowanceAmount = effectivePayslip?.totalAllowance ?? 0;

  const periodParts = (effectivePayslip?.periodMonth || '').split('-');
  const periodYearNum = Number(periodParts[0]);
  const periodMonthNum = Number(periodParts[1]);
  const workPeriodRange =
    periodYearNum && periodMonthNum
      ? (() => {
          const lastDay = new Date(periodYearNum, periodMonthNum, 0).getDate();
          const mm = String(periodMonthNum).padStart(2, '0');
          return `01/${mm}/${periodYearNum} - ${String(lastDay).padStart(2, '0')}/${mm}/${periodYearNum}`;
        })()
      : '—';

  const statusText = isPaid ? 'Đã thanh toán' : 'Chưa thanh toán';

  const primarySalaryTypeLabel =
    effectivePayslip?.salaryType === 'HOURLY'
      ? 'Theo giờ làm việc'
      : effectivePayslip?.salaryType === 'SHIFT'
        ? 'Theo ca làm việc'
        : 'Theo ngày công chuẩn';

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 860, width: '100%' }}>
        {/* Header */}
        <div
          className="emp-modal-header"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
              Phiếu lương cá nhân {effectivePayslip ? (effectivePayslip.payslipCode || `#${effectivePayslip.id.substring(0, 8)}`) : ''}
            </h3>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            padding: '0 24px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            style={{
              padding: '11px 2px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'payment' ? '2px solid var(--blue-primary, #0F766E)' : '2px solid transparent',
              color: activeTab === 'payment' ? 'var(--blue-primary, #0F766E)' : 'var(--text-muted, #4B5563)',
              fontWeight: activeTab === 'payment' ? 600 : 500,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            Thanh toán
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '11px 2px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'attendance' ? '2px solid var(--blue-primary, #0F766E)' : '2px solid transparent',
              color: activeTab === 'attendance' ? 'var(--blue-primary, #0F766E)' : 'var(--text-muted, #4B5563)',
              fontWeight: activeTab === 'attendance' ? 600 : 500,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            Chấm công chi tiết
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '11px 2px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid var(--blue-primary, #0F766E)' : '2px solid transparent',
              color: activeTab === 'history' ? 'var(--blue-primary, #0F766E)' : 'var(--text-muted, #4B5563)',
              fontWeight: activeTab === 'history' ? 600 : 500,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            Lịch sử thanh toán
          </button>
        </div>

        {/* Body */}
        <div className="emp-modal-body" style={{ padding: '22px 26px', background: '#FFFFFF' }}>
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
          ) : !effectivePayslip ? null : activeTab === 'history' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isLoadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', gap: 8, color: '#64748B', fontSize: 13 }}>
                  <Loader2 size={20} className="animate-spin" color="#0F766E" />
                  <span>Đang tải lịch sử thanh toán...</span>
                </div>
              ) : historyError ? (
                <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#991B1B', fontSize: 13 }}>
                  {historyError}
                </div>
              ) : paymentHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted, #4B5563)', fontSize: 13 }}>
                  Chưa có giao dịch thanh toán hoặc tạm ứng nào cho phiếu lương này.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle, #E5EDF8)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--blue-light, #F0FDFA)', borderBottom: '1px solid var(--border-subtle, #E5EDF8)', color: 'var(--text-muted, #4B5563)' }}>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600 }}>Mã phiếu chi</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600 }}>Thời gian</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600 }}>Loại giao dịch</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600 }}>Nguồn quỹ</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>Số tiền</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600 }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((tx) => {
                        const dt = tx.createdAt ? new Date(tx.createdAt) : null;
                        const timeDisplay = dt && !Number.isNaN(dt.getTime())
                          ? `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
                          : '—';
                        const isAdvance = tx.sourceType === 'SALARY_ADVANCE';
                        return (
                          <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light, #EDF2F9)', color: 'var(--text-main, #111827)' }}>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--blue-primary, #0F766E)', whiteSpace: 'nowrap' }}>
                              {tx.transactionCode}
                            </td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted, #4B5563)', whiteSpace: 'nowrap' }}>
                              {timeDisplay}
                            </td>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: isAdvance ? 'var(--orange-accent, #FF9500)' : 'var(--blue-primary, #0F766E)',
                                }}
                              >
                                {isAdvance ? 'Tạm ứng lương' : 'Thanh toán lương'}
                              </span>
                            </td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-main, #111827)' }}>
                              {tx.accountName || '—'}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-main, #111827)', whiteSpace: 'nowrap' }}>
                              {formatAmount(tx.amount)} đ
                            </td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted, #4B5563)' }}>
                              {tx.description || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'attendance' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isLoadingSchedules ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', gap: 8, color: '#64748B', fontSize: 13 }}>
                  <Loader2 size={20} className="animate-spin" color="#0F766E" />
                  <span>Đang tải dữ liệu chấm công...</span>
                </div>
              ) : scheduleError ? (
                <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#991B1B', fontSize: 13 }}>
                  {scheduleError}
                </div>
              ) : schedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B', fontSize: 13 }}>
                  Không có dữ liệu ca làm việc nào trong kỳ {effectivePayslip.periodMonth}.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '9px 12px', fontWeight: 600 }}>Ngày</th>
                        <th style={{ padding: '9px 12px', fontWeight: 600 }}>Ca làm việc</th>
                        <th style={{ padding: '9px 12px', fontWeight: 600 }}>Vào / Ra</th>
                        <th style={{ padding: '9px 12px', fontWeight: 600, textAlign: 'right' }}>Giờ công</th>
                        <th style={{ padding: '9px 12px', fontWeight: 600, textAlign: 'right' }}>OT (phút)</th>
                        <th style={{ padding: '9px 12px', fontWeight: 600, textAlign: 'right' }}>Muộn / Sớm</th>
                        <th style={{ padding: '9px 12px', fontWeight: 600 }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((s) => {
                        const fmtTime = (t?: string | null) => {
                          if (!t) return '—';
                          if (t.includes('T')) return t.split('T')[1].substring(0, 5);
                          if (t.includes(' ')) return t.split(' ')[1].substring(0, 5);
                          return t.substring(0, 5);
                        };
                        const statusMap: Record<string, { label: string; color: string }> = {
                          Completed: { label: 'Hoàn thành', color: '#059669' },
                          CheckedIn: { label: 'Đang làm', color: 'var(--blue-primary, #0F766E)' },
                          Absent: { label: 'Vắng mặt', color: '#DC2626' },
                          LeaveApproved: { label: 'Nghỉ phép', color: '#D97706' },
                          Scheduled: { label: 'Đã xếp ca', color: '#64748B' },
                        };
                        const st = statusMap[s.status] || { label: s.status, color: '#475569' };
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 12px', color: '#0F172A', whiteSpace: 'nowrap' }}>
                              {s.workDate.split('T')[0].split('-').reverse().join('/')}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#1E293B' }}>
                              <div style={{ fontWeight: 500 }}>{s.shiftName}</div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>
                                {fmtTime(s.plannedStartTime)} - {fmtTime(s.plannedEndTime)}
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#334155', whiteSpace: 'nowrap' }}>
                              {fmtTime(s.checkInTime)} → {fmtTime(s.checkOutTime)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>
                              {s.actualWorkHours ?? 0}h
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: s.overtimeMinutes > 0 ? '#0F766E' : '#64748B' }}>
                              {s.overtimeMinutes || 0}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: s.lateMinutes > 0 || s.earlyLeaveMinutes > 0 ? '#DC2626' : '#64748B' }}>
                              {s.lateMinutes || 0}p / {s.earlyLeaveMinutes || 0}p
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: st.color }}>
                              {st.label}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '16px 56px',
                }}
              >
                {/* Cột trái: Thông tin nhân viên & kỳ lương */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15, fontSize: 13.5 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>{effectivePayslip.employeeCode} :</span>
                    <strong style={{ color: '#0F172A' }}>{effectivePayslip.employeeName}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Chi nhánh :</span>
                    <span style={{ color: '#1E293B' }}>{effectivePayslip.branchName || '—'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Loại lương chính :</span>
                    <span style={{ color: '#1E293B' }}>{primarySalaryTypeLabel}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Trạng thái :</span>
                    <span
                      style={{
                        color: isPaid ? 'var(--green-money)' : 'var(--orange-accent)',
                        fontWeight: 600,
                      }}
                    >
                      {statusText}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Kỳ làm việc :</span>
                    <span style={{ color: '#1E293B' }}>{workPeriodRange}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>
                      {effectivePayslip.salaryType === 'HOURLY' ? 'Tổng giờ làm :' : 'Ngày công chuẩn :'}
                    </span>
                    <strong style={{ color: '#0F172A' }}>
                      {effectivePayslip.salaryType === 'HOURLY'
                        ? `${effectivePayslip.totalWorkHours || 0} giờ`
                        : effectivePayslip.standardDays}
                    </strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Công thực tế :</span>
                    <span style={{ color: '#1E293B' }}>
                      {effectivePayslip.salaryType !== 'HOURLY' ? `${effectivePayslip.workedDays} công · ` : ''}
                      {effectivePayslip.totalWorkHours || 0} giờ
                      {effectivePayslip.salaryType === 'SHIFT' ? ` · ${effectivePayslip.totalShifts || 0} ca` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Làm thêm (OT) :</span>
                    <span style={{ color: '#1E293B' }}>{effectivePayslip.otHours} giờ</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Đi muộn :</span>
                    <span style={{ color: (effectivePayslip.totalLateMinutes || 0) > 0 ? '#DC2626' : '#1E293B', fontWeight: (effectivePayslip.totalLateMinutes || 0) > 0 ? 600 : 400 }}>
                      {effectivePayslip.totalLateMinutes || 0} phút
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Về sớm :</span>
                    <span style={{ color: (effectivePayslip.totalEarlyLeaveMinutes || 0) > 0 ? '#DC2626' : '#1E293B', fontWeight: (effectivePayslip.totalEarlyLeaveMinutes || 0) > 0 ? 600 : 400 }}>
                      {effectivePayslip.totalEarlyLeaveMinutes || 0} phút
                    </span>
                  </div>

                  {effectivePayslip.salaryType !== 'HOURLY' && (effectivePayslip.unpaidLeaveDays || 0) > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                      <span style={{ color: '#475569' }}>Nghỉ không lương :</span>
                      <span style={{ color: '#D97706', fontWeight: 600 }}>
                        {effectivePayslip.unpaidLeaveDays} ngày
                      </span>
                    </div>
                  )}

                  {isPaid && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
                      <span style={{ color: '#475569' }}>Phiếu chi :</span>
                      <span style={{ color: 'var(--blue-primary, #0F766E)', fontWeight: 600, fontSize: 12.5 }}>
                        {effectivePayslip.cashbookVoucherCode || 'PC-CHUA-TAO'} · {effectivePayslip.paidAt || '—'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Cột phải: Chi tiết thu nhập & khấu trừ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15, fontSize: 13.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Lương chính :</span>
                    <span style={{ color: 'var(--blue-primary, #0F766E)', fontWeight: 500 }}>{formatAmount(effectivePayslip.baseSalaryEarned)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Làm thêm :</span>
                    <span style={{ color: 'var(--blue-primary, #0F766E)', fontWeight: 500 }}>{formatAmount(effectivePayslip.overtimePay)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Phụ cấp :</span>
                    <span style={{ color: 'var(--blue-primary, #0F766E)', fontWeight: 500 }}>{formatAmount(totalAllowanceAmount)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 2 }}>
                    <strong style={{ color: '#0F172A' }}>Tổng thu nhập (I) :</strong>
                    <strong style={{ color: '#0F172A' }}>{formatAmount(effectivePayslip.totalEarnings)}</strong>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: '#475569' }}>Giảm trừ / Tạm ứng (II) :</span>
                      <span style={{ color: 'var(--blue-primary, #0F766E)', fontWeight: 500 }}>{formatAmount(effectivePayslip.advanceDeduction)}</span>
                    </div>
                    {effectivePayslip.remainingDebt !== undefined && effectivePayslip.remainingDebt > 0 && (
                      <div style={{ fontSize: 11.5, color: '#B45309', marginTop: 2 }}>
                        Dư nợ tạm ứng còn lại: {formatAmount(effectivePayslip.remainingDebt)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Bảo hiểm bắt buộc (III) :</span>
                    <span style={{ color: '#1E293B', fontWeight: 500 }}>{formatAmount(effectivePayslip.socialInsurance)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 2 }}>
                    <div>
                      <div style={{ color: '#0F172A', fontWeight: 500 }}>Lương thực nhận (IV) :</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>(IV) = (I) - (II) - (III)</div>
                    </div>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{formatAmount(effectivePayslip.netSalary)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#475569' }}>Đã trả nhân viên :</span>
                    <span style={{ color: '#1E293B', fontWeight: 500 }}>
                      {formatAmount(isPaid ? effectivePayslip.netSalary : 0)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ color: '#0F172A' }}>Còn cần trả :</strong>
                    <strong style={{ color: '#0F172A' }}>
                      {formatAmount(isPaid ? 0 : effectivePayslip.netSalary)}
                    </strong>
                  </div>
                </div>
              </div>
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

          {!isPaid && effectivePayslip && canManage && onAdvance && (
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              disabled={isActionLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 13,
                color: '#B45309',
                borderColor: '#FCD34D',
                background: '#FFFBEB',
              }}
              onClick={() => onAdvance(effectivePayslip)}
            >
              <Banknote size={15} />
              <span>Tạm ứng</span>
            </button>
          )}

          {!isPaid && effectivePayslip && (
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              disabled={isActionLoading}
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
