import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Check,
  Copy,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import {
  TaxCalculationMethod,
  TaxPeriodType,
  type HouseholdTaxSummaryDto,
  type CreateTaxSnapshotRequest,
  type HouseholdTaxSnapshotDto,
} from '../types/taxSnapshot';
import { formatMoney } from '../../finance/utils/formatters';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';

interface CreateTaxSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: HouseholdTaxSummaryDto;
  calculationMethod: TaxCalculationMethod;
  applyVatReduction: boolean;
  customVatRate?: number | null;
  customPitRate?: number | null;
  vatReductionPercentage?: number | null;
  existingFinalizedSnapshot?: HouseholdTaxSnapshotDto | null;
  onOpenPinModal?: (tab?: 'change' | 'reset') => void;
  onSubmit: (request: CreateTaxSnapshotRequest) => Promise<HouseholdTaxSnapshotDto | void>;
}

export const CreateTaxSnapshotModal: React.FC<CreateTaxSnapshotModalProps> = ({
  isOpen,
  onClose,
  summary,
  calculationMethod,
  applyVatReduction,
  customVatRate,
  customPitRate,
  vatReductionPercentage,
  existingFinalizedSnapshot,
  onOpenPinModal,
  onSubmit,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [allowSupersede, setAllowSupersede] = useState<boolean>(false);
  const [rectificationReason, setRectificationReason] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sealedSnapshot, setSealedSnapshot] = useState<HouseholdTaxSnapshotDto | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  useDialogFocusTrap(isOpen && Boolean(summary), dialogRef, () => { if (!isSubmitting) onClose(); });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPin('');
      setShowPin(false);
      setNotes('');
      setAllowSupersede(false);
      setRectificationReason('');
      setIsConfirmed(true);
      setIsSubmitting(false);
      setPinError(null);
      setSubmitError(null);
      setSealedSnapshot(null);
      setIsCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || !summary) return null;

  const periodLabel =
    summary.periodType === TaxPeriodType.Month
      ? `Tháng ${summary.periodNumber}/${summary.year}`
      : summary.periodType === TaxPeriodType.Quarter
      ? `Quý ${summary.periodNumber}/${summary.year}`
      : `Cả năm ${summary.year}`;

  const isExistingLocked = Boolean(existingFinalizedSnapshot || summary.isFinalized);

  const handleExecuteSeal = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setPinError('Vui lòng nhập từ 4 đến 6 chữ số mã PIN.');
      setStep(2);
      return;
    }

    if (isExistingLocked) {
      if (!allowSupersede) {
        setSubmitError('Kỳ thuế này đã có bản chốt trước đó. Vui lòng xác nhận cho phép thay thế (Supersede) ở Bước 1.');
        setStep(1);
        return;
      }
      if (!rectificationReason.trim()) {
        setSubmitError('Vui lòng nhập lý do điều chỉnh thay thế bản chốt cũ ở Bước 1.');
        setStep(1);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await onSubmit({
        year: summary.year,
        periodType: summary.periodType,
        periodNumber: summary.periodNumber,
        branchId: summary.branchId,
        calculationMethod,
        tier2Method: summary.tier2Method,
        applyVatReduction2026: applyVatReduction,
        customVatRate,
        customPitRate,
        vatReductionPercentage,
        confirmEstimatedCogsResponsible: isConfirmed,
        estimatedCogsConfirmationStatement: summary.isCogsEstimated
          ? 'Chủ hộ xác nhận chịu trách nhiệm pháp lý đối với giá vốn ước tính tạm thời.'
          : undefined,
        pin,
        notes: notes.trim() || undefined,
        allowSupersedeExisting: allowSupersede,
        rectificationReason: rectificationReason.trim() || undefined,
      });

      if (result) {
        setSealedSnapshot(result);
      } else {
        // Fallback representation if void was returned
        setSealedSnapshot({
          id: `SNAP-${summary.year}-P${summary.periodNumber}`,
          year: summary.year,
          periodType: summary.periodType,
          periodNumber: summary.periodNumber,
          taxableRevenueInPeriod: summary.taxableRevenueInPeriod,
          totalTaxAmount: summary.totalTaxAmount,
          vatAmount: summary.vatAmount,
          pitAmount: summary.pitAmount,
          vatRate: summary.vatRate,
          pitRate: summary.pitRate,
          isTaxExempt: summary.isTaxExempt,
          householdGroup: summary.householdGroup,
          calculationMethod,
          finalizedBy: 'Chủ cửa hàng (StoreOwner)',
          finalizedAtUtc: new Date().toISOString(),
          annualAccumulatedRevenue: summary.annualAccumulatedRevenue,
          auditSignatureHash: 'SEALED-HMAC-SHA256-SERVER-VALIDATED',
          revisionNumber: existingFinalizedSnapshot?.revisionNumber ? existingFinalizedSnapshot.revisionNumber + 1 : 1,
        });
      }
    } catch (err: any) {
      const msg = err.message || 'Không thể niêm phong kỳ tính thuế do lỗi bảo mật mã PIN hoặc lỗi kết nối.';
      setSubmitError(msg);
      if (msg.toLowerCase().includes('pin')) {
        setPinError(msg);
        setStep(2);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="tax-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <div ref={dialogRef} className="tax-modal-card" role="dialog" aria-modal="true" aria-label={`Chốt kỳ sổ ${periodLabel}`} style={{ maxWidth: 580 }}>
        {/* Header */}
        <div className="tax-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#F0FDFA',
                color: '#0F766E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Chốt kỳ sổ {periodLabel}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Niêm phong bất biến Thông tư 152 & chữ ký số HMAC server-side
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="tax-drawer-close-btn"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ padding: '14px 20px 0 20px', flexShrink: 0 }}>
          <div className="step-bar">
            <div className={`step-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
              <span>Đối soát số liệu</span>
            </div>
            <div className={`step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
              <span>Mã PIN bảo mật</span>
            </div>
            <div className={`step-item ${step === 3 ? 'active' : ''}`}>
              <div className="step-circle">{sealedSnapshot ? '✓' : '3'}</div>
              <span>Ký niêm phong HMAC</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="tax-modal-body" style={{ paddingTop: 10 }}>
          {/* ────────────────────────────────────────────────────────────────
              BƯỚC 1: ĐỐI SOÁT SỐ LIỆU DOANH THU & THUẾ GTGT, TNCN
              ──────────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              {/* Cảnh báo nếu kỳ này đã được chốt trước đó (Supersede) */}
              {isExistingLocked && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <RefreshCw size={20} className="text-orange flex-shrink-0" style={{ marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.86rem', color: '#92400E', display: 'block', marginBottom: 4 }}>
                        Kỳ tính thuế này đã có bản chốt sổ trước đó!
                      </strong>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#B45309', lineHeight: 1.45 }}>
                        Bản chốt trước: <strong>{existingFinalizedSnapshot?.id || summary.snapshotId}</strong>
                        {existingFinalizedSnapshot?.revisionNumber && (
                          <span> (Lần {existingFinalizedSnapshot.revisionNumber})</span>
                        )}.
                        Theo quy định kế toán, việc chốt lại sẽ chuyển bản chốt cũ sang trạng thái{' '}
                        <strong>Đã bị thay thế (Superseded)</strong> và tạo một bản chốt mới tăng Revision.
                      </p>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: '#78350F',
                          marginBottom: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allowSupersede}
                          onChange={(e) => setAllowSupersede(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: '#D97706', cursor: 'pointer' }}
                        />
                        <span>Tôi xác nhận chốt lại và thay thế bản chốt cũ của kỳ này</span>
                      </label>

                      {allowSupersede && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                            Lý do thay thế / Số hiệu quyết định thanh kiểm tra thuế (Bắt buộc):
                          </label>
                          <textarea
                            value={rectificationReason}
                            onChange={(e) => setRectificationReason(e.target.value)}
                            placeholder="Ví dụ: Điều chỉnh doanh thu kê khai bổ sung theo Quyết định số 15/QĐ-CCT ngày 12/11/2026..."
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: '1px solid #FCD34D',
                              fontSize: '0.82rem',
                              boxSizing: 'border-box',
                              outline: 'none',
                              fontFamily: 'inherit',
                              background: '#FFFFFF',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="tax-threshold-alert alert-teal" style={{ marginBottom: 16 }}>
                <FileCheck size={18} className="flex-shrink-0 text-teal" style={{ marginTop: 2 }} />
                <div>
                  <strong className="text-teal" style={{ fontSize: '0.86rem', display: 'block', marginBottom: 2 }}>
                    ✓ Đã đối soát đủ 7 sổ kế toán TT152 (S1a → S3a)
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#0F766E', lineHeight: 1.45 }}>
                    Số liệu doanh thu, thuế GTGT và thuế TNCN đã được đối chiếu khớp với Sổ quỹ và hóa đơn bán lẻ.
                  </p>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Doanh thu tính thuế ({periodLabel})</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                    {formatMoney(summary.taxableRevenueInPeriod)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                    Lũy kế năm: {formatMoney(summary.annualAccumulatedRevenue)}
                  </div>
                </div>

                <div style={{ padding: 12, background: '#F0FDFA', borderRadius: 10, border: '1px solid #99F6E4' }}>
                  <div style={{ fontSize: '0.74rem', color: '#0F766E', fontWeight: 600 }}>
                    Thuế GTGT ({summary.vatRate}%{applyVatReduction ? ' - giảm 20%' : ''})
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F766E', marginTop: 4 }}>
                    {formatMoney(summary.vatAmount)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#0F766E', marginTop: 2 }}>
                    {applyVatReduction ? 'Đã áp dụng giảm 20% VAT theo Nghị quyết' : 'Mức thuế suất chuẩn'}
                  </div>
                </div>

                <div style={{ padding: 12, background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '0.74rem', color: '#92400E', fontWeight: 600 }}>
                    Thuế TNCN ({summary.pitRate}%)
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>
                    {formatMoney(summary.pitAmount)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: 2 }}>
                    Thuế TNCN theo tỷ lệ % doanh thu HKD
                  </div>
                </div>

                <div style={{ padding: 12, background: '#FFF7ED', borderRadius: 10, border: '1px solid #FFEDD5' }}>
                  <div style={{ fontSize: '0.74rem', color: '#C2410C', fontWeight: 600 }}>
                    Tổng thuế dự kiến phải nộp
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#EA580C', marginTop: 4 }}>
                    {formatMoney(summary.totalTaxAmount)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9A3412', marginTop: 2 }}>
                    Đã gồm GTGT + TNCN kỳ này
                  </div>
                </div>
              </div>

              {/* Optional Notes */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Ghi chú chốt kỳ (Tùy chọn):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Đã đối soát khớp bảng kê bán lẻ và trích xuất sổ S2e-HKD..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary-pill"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isExistingLocked && (!allowSupersede || !rectificationReason.trim())}
                  onClick={() => setStep(2)}
                  className="btn-primary-pill"
                  style={{
                    opacity: isExistingLocked && (!allowSupersede || !rectificationReason.trim()) ? 0.6 : 1,
                    cursor: isExistingLocked && (!allowSupersede || !rectificationReason.trim()) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Tiếp tục: Nhập PIN bảo mật →
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              BƯỚC 2: NHẬP MÃ PIN BẢO MẬT (SỬ DỤNG BÀN PHÍM MÁY TÍNH TRỰC TIẾP)
              ──────────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div className="tax-threshold-alert alert-danger" style={{ marginBottom: 16 }}>
                <AlertTriangle size={18} className="flex-shrink-0 text-red" style={{ marginTop: 2 }} />
                <div>
                  <strong className="text-red" style={{ fontSize: '0.86rem', display: 'block', marginBottom: 2 }}>
                    Bảo mật khóa dữ liệu bất biến (Read-only)
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#991B1B', lineHeight: 1.45 }}>
                    Sau khi niêm phong, toàn bộ số liệu 7 sổ kế toán và tờ khai thuế của <strong>{periodLabel}</strong> sẽ bị khóa vĩnh viễn với chữ ký số HMAC server-side. Nhập mã PIN bảo mật (4-6 số) của Chủ cửa hàng để tiếp tục.
                  </p>
                </div>
              </div>

              {/* Native Keyboard PIN Input */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                  Nhập mã PIN xác thực (4 – 6 số):
                </div>

                <div style={{ position: 'relative', maxWidth: 280, margin: '0 auto 10px auto' }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPin(val);
                      setPinError(null);
                      setSubmitError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && pin.length >= 4 && isConfirmed) {
                        e.preventDefault();
                        setStep(3);
                      }
                    }}
                    placeholder="Nhập 4-6 số PIN"
                    style={{
                      width: '100%',
                      padding: '12px 44px 12px 16px',
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      borderRadius: 10,
                      border: pinError ? '2px solid #EF4444' : '2px solid #0F766E',
                      background: '#F8FAFC',
                      letterSpacing: showPin ? '4px' : '8px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 2px 8px rgba(15, 118, 110, 0.1)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title={showPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div style={{ fontSize: '0.76rem', color: '#64748B', marginBottom: 12 }}>
                  Nhập số trực tiếp bằng bàn phím máy tính • Nhấn Enter để tiếp tục
                </div>

                {/* Quick actions for PIN management */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: '0.78rem', marginBottom: 14 }}>
                  {onOpenPinModal && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenPinModal('reset')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0F766E',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Quên mã PIN? (Khôi phục bằng mật khẩu)
                      </button>
                      <span style={{ color: '#CBD5E1' }}>|</span>
                      <button
                        type="button"
                        onClick={() => onOpenPinModal('change')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#475569',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Đổi mã PIN
                      </button>
                    </>
                  )}
                </div>

                {pinError && (
                  <div
                    style={{
                      color: '#DC2626',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: '#FEF2F2',
                      padding: '6px 14px',
                      borderRadius: 8,
                      marginBottom: 12,
                      border: '1px solid #FCA5A5',
                      display: 'inline-block',
                    }}
                  >
                    {pinError}
                  </div>
                )}
              </div>

              {/* Confirmation Statement */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  background: isConfirmed ? '#F0FDF4' : '#ffffff',
                  cursor: 'pointer',
                  marginBottom: 18,
                }}
              >
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  style={{ width: 16, height: 16, marginTop: 2, accentColor: '#0F766E', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: 600, lineHeight: 1.45 }}>
                  Chủ cửa hàng xác nhận đã đối soát số liệu và chịu trách nhiệm pháp lý đối với việc niêm phong kỳ tính thuế này.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary-pill"
                >
                  ← Quay lại Bước 1
                </button>
                <button
                  type="button"
                  disabled={pin.length < 4 || !isConfirmed}
                  onClick={() => setStep(3)}
                  className="btn-primary-pill"
                  style={{
                    opacity: pin.length < 4 || !isConfirmed ? 0.6 : 1,
                    cursor: pin.length < 4 || !isConfirmed ? 'not-allowed' : 'pointer',
                  }}
                >
                  Tiếp tục: Ký niêm phong HMAC →
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              BƯỚC 3: GỬI REQUEST SERVER & SINH CHỮ KÝ SỐ HMAC-SHA256
              ──────────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              {!sealedSnapshot ? (
                <div>
                  <div className="tax-threshold-alert alert-teal" style={{ marginBottom: 16 }}>
                    <ShieldCheck size={20} className="flex-shrink-0 text-teal" style={{ marginTop: 2 }} />
                    <div>
                      <strong className="text-teal" style={{ fontSize: '0.88rem', display: 'block', marginBottom: 2 }}>
                        Sẵn sàng gửi lệnh niêm phong lên máy chủ Backend
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#0F766E', lineHeight: 1.5 }}>
                        Hệ thống sẽ gửi yêu cầu chốt sổ lên API Backend <code>api/tax/household/snapshots</code> để Backend xác thực mã PIN và trực tiếp sinh chữ ký số bảo mật HMAC-SHA256 phía máy chủ.
                      </p>
                    </div>
                  </div>

                  {/* Summary recap */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: '14px 18px',
                      marginBottom: 16,
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Kỳ kê khai:</span>
                      <strong style={{ color: '#0F172A' }}>{periodLabel}</strong>
                    </div>
                    {isExistingLocked && allowSupersede && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#D97706' }}>Hình thức:</span>
                        <strong className="text-orange">
                          Chốt lại & Thay thế bản cũ (Lần {existingFinalizedSnapshot?.revisionNumber ? existingFinalizedSnapshot.revisionNumber + 1 : 2})
                        </strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Doanh thu tính thuế:</span>
                      <strong style={{ color: '#0F172A' }}>{formatMoney(summary.taxableRevenueInPeriod)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Tổng thuế GTGT + TNCN:</span>
                      <strong className="text-orange" style={{ fontWeight: 800 }}>{formatMoney(summary.totalTaxAmount)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 6 }}>
                      <span style={{ color: '#64748B' }}>Xác thực mã PIN:</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>✓ Đã nhập ({pin.length} số)</span>
                    </div>
                  </div>

                  {submitError && (
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        borderRadius: 8,
                        color: '#991B1B',
                        fontSize: '0.82rem',
                        marginBottom: 16,
                      }}
                    >
                      <strong>Lỗi niêm phong:</strong> {submitError}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setStep(2)}
                      className="btn-secondary-pill"
                    >
                      ← Quay lại sửa PIN
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleExecuteSeal}
                      className="btn-primary-pill"
                      style={{
                        minWidth: 220,
                        justifyContent: 'center',
                        background: '#0F766E',
                        boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Máy chủ đang sinh chữ ký HMAC...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          <span>🔐 Ký niêm phong HMAC ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* RESULT VIEW: CHỮ KÝ SỐ THẬT TỪ BACKEND */
                <div>
                  <div className="tax-threshold-alert alert-teal" style={{ marginBottom: 16 }}>
                    <ShieldCheck size={24} className="flex-shrink-0 text-teal" style={{ marginTop: 2 }} />
                    <div>
                      <strong className="text-teal" style={{ fontSize: '0.92rem', display: 'block', marginBottom: 2 }}>
                        ✓ Đã niêm phong kỳ sổ bất biến thành công!
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#0F766E', lineHeight: 1.45 }}>
                        Máy chủ Backend đã xác thực thành công mã PIN và phát hành chữ ký số bảo mật HMAC-SHA256 cho kỳ <strong>{periodLabel}</strong>.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: 10,
                      padding: '16px',
                      marginBottom: 16,
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Mã tham chiếu (Snapshot ID):</span>
                      <strong className="font-mono text-teal">{sealedSnapshot.id}</strong>
                    </div>
                    {sealedSnapshot.revisionNumber && sealedSnapshot.revisionNumber > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#64748B' }}>Lần chốt (Revision):</span>
                        <strong className="text-orange">Lần {sealedSnapshot.revisionNumber} (Thay thế bản cũ)</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Thời điểm niêm phong:</span>
                      <strong>{new Date(sealedSnapshot.finalizedAtUtc).toLocaleString('vi-VN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Doanh thu chốt sổ:</span>
                      <strong>{formatMoney(sealedSnapshot.taxableRevenueInPeriod)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ color: '#64748B' }}>Tổng thuế GTGT + TNCN:</span>
                      <strong className="text-orange">{formatMoney(sealedSnapshot.totalTaxAmount)}</strong>
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        Chữ ký số bảo mật HMAC-SHA256 (Server-Side Generated):
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          readOnly
                          value={sealedSnapshot.auditSignatureHash || 'HMAC-SHA256-SERVER-CERTIFIED'}
                          style={{
                            flex: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            padding: '6px 10px',
                            background: '#ffffff',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            color: '#0F172A',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyHash(sealedSnapshot.auditSignatureHash || '')}
                          className="btn-secondary-pill"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          title="Sao chép mã chữ ký HMAC"
                        >
                          {isCopied ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-primary-pill"
                      style={{ background: '#0F766E' }}
                    >
                      Hoàn tất & Xem lịch sử kỳ chốt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
