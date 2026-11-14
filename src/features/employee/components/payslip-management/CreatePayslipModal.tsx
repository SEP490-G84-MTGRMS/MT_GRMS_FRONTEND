import React, { useState, useEffect } from 'react';
import { Settings, Sliders, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Branch } from '../../types';
import { MOCK_BRANCHES } from '../../services/mockData';
import { AttendanceConfigModal } from '../shift-config/AttendanceConfigModal';
import { payslipApi, extractErrorMessage } from '../../api/payslipApi';
import { scheduleApi } from '../../api/scheduleApi';
import { getVietnamCurrentMonthIso } from '../../lib/vietnamTime';

interface CreatePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches?: Branch[];
  initialPeriodMonth?: string;
  onCalculationSuccess?: (resultCount: number) => void;
  onCreateSuccess?: (periodMonth: string, branchName: string) => void;
}

export const CreatePayslipModal: React.FC<CreatePayslipModalProps> = ({
  isOpen,
  onClose,
  branches = MOCK_BRANCHES,
  initialPeriodMonth,
  onCalculationSuccess,
  onCreateSuccess,
}) => {
  const [periodMonth, setPeriodMonth] = useState(() => initialPeriodMonth || getVietnamCurrentMonthIso());
  const [branchId, setBranchId] = useState('ALL');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState<'ALL' | 'MONTHLY' | 'SHIFT' | 'HOURLY'>('ALL');
  const [standardDayHours, setStandardDayHours] = useState(8.0);
  const [isAttendanceConfigOpen, setIsAttendanceConfigOpen] = useState(false);
  const [policyFeedback, setPolicyFeedback] = useState<string | null>(null);
  const [batchNote, setBatchNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPeriodMonth) {
      setPeriodMonth(initialPeriodMonth);
    }
    setSubmitError(null);
  }, [initialPeriodMonth, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth.trim())) {
      setSubmitError('Kỳ tính lương phải có định dạng yyyy-MM (Ví dụ: 2026-11).');
      return;
    }
    if (batchNote.length > 500) {
      setSubmitError('Ghi chú không được vượt quá 500 ký tự.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const [year, month] = periodMonth.trim().split('-').map(Number);
      const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const schedulesInMonth = await scheduleApi.getRawSchedules({
        branchId: branchId !== 'ALL' ? branchId : undefined,
        fromDate,
        toDate,
        pageSize: 1000,
      });

      const validSchedules = schedulesInMonth.filter(
        (s) => (s.status || '').toLowerCase() !== 'cancelled' || (s.approvalType || '').toUpperCase() === 'UNPAID_LEAVE'
      );

      if (validSchedules.length === 0) {
        setSubmitError(
          `Không có nhân viên nào có ca làm việc trong kỳ ${String(month).padStart(2, '0')}/${year}. Chỉ nhân viên có ca làm việc trong tháng mới được khởi tạo bảng lương.`
        );
        setIsSubmitting(false);
        return;
      }

      let typeFilterNum: number | undefined = undefined;
      if (salaryTypeFilter === 'MONTHLY') typeFilterNum = 1;
      else if (salaryTypeFilter === 'HOURLY') typeFilterNum = 2;
      else if (salaryTypeFilter === 'SHIFT') typeFilterNum = 3;

      const createdList = await payslipApi.generateMonthlyPayroll({
        periodMonth,
        branchId: branchId !== 'ALL' ? branchId : undefined,
        salaryTypeFilter: typeFilterNum,
        note: batchNote.trim() || undefined,
      });

      const bName =
        branchId === 'ALL'
          ? 'Tất cả chi nhánh'
          : branches.find((b) => b.id === branchId)?.name || 'Chi nhánh đã chọn';

      if (onCreateSuccess) {
        onCreateSuccess(periodMonth, bName);
      }

      if (onCalculationSuccess) {
        onCalculationSuccess(createdList.length);
      } else {
        alert(`Đã tính toán và khởi tạo thành công ${createdList.length} phiếu lương cho kỳ ${periodMonth}!`);
        onClose();
      }
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Lỗi khi tính toán bảng lương.');
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 680, width: '100%' }}>
        {/* Header */}
        <div className="emp-modal-header">
          <h3 style={{ margin: 0 }}>Khởi tạo bảng lương</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {submitError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 8,
                  color: '#991B1B',
                  fontSize: 13,
                }}
              >
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Hàng 1: Kỳ tháng & Chi nhánh */}
            <div className="emp-grid-2">
              <div className="emp-form-group" style={{ marginBottom: 0 }}>
                <label className="emp-form-label">
                  Kỳ lương <span className="required">*</span>
                </label>
                <input
                  type="month"
                  className="emp-form-input"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  required
                />
              </div>

              <div className="emp-form-group" style={{ marginBottom: 0 }}>
                <label className="emp-form-label">Chi nhánh</label>
                <select
                  className="emp-form-select"
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setPolicyFeedback(null);
                  }}
                >
                  <option value="ALL">Tất cả chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hình thức lương (chọn nhanh 1 chạm) */}
            <div className="emp-form-group" style={{ marginBottom: 0 }}>
              <label className="emp-form-label">Hình thức lương</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(
                  [
                    { value: 'ALL', label: 'Tất cả' },
                    { value: 'MONTHLY', label: 'Theo tháng' },
                    { value: 'SHIFT', label: 'Theo ca' },
                    { value: 'HOURLY', label: 'Theo giờ' },
                  ] as const
                ).map((opt) => {
                  const active = salaryTypeFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSalaryTypeFilter(opt.value)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: active ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
                        background: active ? '#F0FDFA' : '#FFFFFF',
                        color: active ? '#0F766E' : '#475569',
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thanh cấu hình chính sách gọn */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '9px 12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 13, color: '#334155' }}>
                <Sliders size={15} color="#0F766E" style={{ flexShrink: 0 }} />
                {policyFeedback ? (
                  <span style={{ color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                    {policyFeedback}
                  </span>
                ) : (
                  <span>
                    Chuẩn công: <strong>{standardDayHours.toFixed(1)}h/ngày</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                className="emp-btn emp-btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  height: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onClick={() => setIsAttendanceConfigOpen(true)}
                title="Cấu hình giờ chuẩn, quy đổi công & OT"
              >
                <Settings size={13} />
                Cấu hình
              </button>
            </div>

            {/* Ghi chú */}
            <div className="emp-form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="emp-form-label" style={{ marginBottom: 0 }}>Ghi chú</label>
                {batchNote.length > 0 && (
                  <span style={{ fontSize: 11, color: batchNote.length > 500 ? '#EF4444' : '#94A3B8' }}>
                    {batchNote.length}/500
                  </span>
                )}
              </div>
              <input
                type="text"
                className="emp-form-input"
                maxLength={500}
                placeholder="Ghi chú kỳ lương (không bắt buộc)"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                style={{ borderColor: batchNote.length > 500 ? '#EF4444' : undefined }}
              />
            </div>

            <div style={{ fontSize: 12, color: '#64748B' }}>
              Tự động tổng hợp công, OT, phụ cấp và cấn trừ tạm ứng trong kỳ.
            </div>
          </div>

          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button
              type="submit"
              className="emp-btn emp-btn-primary"
              disabled={isSubmitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              <span>{isSubmitting ? 'Đang tính lương...' : 'Tính lương'}</span>
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
