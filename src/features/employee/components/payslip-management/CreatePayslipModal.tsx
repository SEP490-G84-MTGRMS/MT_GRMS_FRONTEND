import React, { useState, useEffect } from 'react';
import { Settings, Sliders, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Branch } from '../../types';
import { MOCK_BRANCHES } from '../../services/mockData';
import { AttendanceConfigModal } from '../shift-config/AttendanceConfigModal';
import { payslipApi, extractErrorMessage } from '../../api/payslipApi';
import { scheduleApi } from '../../api/scheduleApi';

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
  const [periodMonth, setPeriodMonth] = useState(initialPeriodMonth || '2026-11');
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
      <div className="emp-modal-card" style={{ maxWidth: 650 }}>
        {/* Header */}
        <div className="emp-modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Khởi tạo phiếu lương hàng loạt theo kỳ tháng</h3>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Áp dụng chính sách chấm công & cấu hình lương tự động cho nhân viên
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            {submitError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 8,
                  color: '#991B1B',
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

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
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Tự động tổng hợp ngày công, tổng giờ và giờ OT từ bảng phân ca và chấm công thực tế</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Tự động nạp danh sách phụ cấp định kỳ (ăn trưa, trách nhiệm...) từ hồ sơ nhân viên</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Tự động cấn trừ các khoản tạm ứng lương đã chi trong kỳ và cập nhật công nợ còn lại</span>
                </label>
              </div>
            </div>

            {/* Ghi chú chung đợt tính lương */}
            <div className="emp-form-group" style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="emp-form-label" style={{ marginBottom: 0 }}>Ghi chú đợt khởi tạo bảng lương</label>
                <span style={{ fontSize: 11, color: batchNote.length > 500 ? '#EF4444' : '#94A3B8' }}>
                  {batchNote.length}/500
                </span>
              </div>
              <input
                type="text"
                className="emp-form-input"
                maxLength={500}
                placeholder="Ví dụ: Bảng lương tháng 11/2026 - Quyết toán kỳ chuẩn"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                style={{ borderColor: batchNote.length > 500 ? '#EF4444' : undefined }}
              />
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
              <span>{isSubmitting ? 'Đang tính toán...' : 'Bắt đầu tính toán'}</span>
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
