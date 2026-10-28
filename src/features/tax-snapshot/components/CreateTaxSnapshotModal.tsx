import React, { useState } from 'react';
import {
  X,
  Lock,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import {
  TaxCalculationMethod,
  TaxPeriodType,
  type HouseholdTaxSummaryDto,
  type CreateTaxSnapshotRequest,
} from '../types/taxSnapshot';
import { formatMoney } from '../../finance/utils/formatters';

interface CreateTaxSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: HouseholdTaxSummaryDto;
  calculationMethod: TaxCalculationMethod;
  applyVatReduction: boolean;
  onSubmit: (request: CreateTaxSnapshotRequest) => Promise<void>;
}

export const CreateTaxSnapshotModal: React.FC<CreateTaxSnapshotModalProps> = ({
  isOpen,
  onClose,
  summary,
  calculationMethod,
  applyVatReduction,
  onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pin, setPin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  if (!isOpen || !summary) return null;

  const periodLabel =
    summary.periodType === TaxPeriodType.Month
      ? `Tháng ${summary.periodNumber}/${summary.year}`
      : summary.periodType === TaxPeriodType.Quarter
      ? `Quý ${summary.periodNumber}/${summary.year}`
      : `Cả năm ${summary.year}`;

  const handleNextStep1 = () => {
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!isConfirmed) return;
    setStep(3);
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setPinError(null);
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleFinalSubmit = async () => {
    if (pin.length !== 4) {
      setPinError('Vui lòng nhập đầy đủ 4 số mã PIN.');
      return;
    }

    setIsSubmitting(true);
    setPinError(null);

    try {
      await onSubmit({
        year: summary.year,
        periodType: summary.periodType,
        periodNumber: summary.periodNumber,
        branchId: summary.branchId,
        calculationMethod,
        applyVatReduction2026: applyVatReduction,
        pin,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setPinError(err.message || 'Mã PIN không đúng hoặc đã vượt số lần thử.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tax-modal-backdrop">
      <div className="tax-modal-card" style={{ maxWidth: 540 }}>
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
              <FileCheck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Chốt Sổ Kỳ Tính Thuế {periodLabel}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Bước {step}/3: {step === 1 ? 'Xác nhận thông số' : step === 2 ? 'Cam kết trách nhiệm' : 'Nhập mã PIN xác thực'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="tax-drawer-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="tax-modal-body">
          {/* STEP 1: Verify Parameters */}
          {step === 1 && (
            <div>
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  marginBottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Kỳ tính thuế:</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{periodLabel}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Doanh thu phát sinh:</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                    {formatMoney(summary.taxableRevenueInPeriod)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Phương pháp áp dụng:</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0F766E' }}>
                    {calculationMethod === TaxCalculationMethod.DeclarationBased
                      ? 'Theo Kê khai (Doanh thu - Chi phí)'
                      : 'Theo tỷ lệ % doanh thu'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Chính sách giảm thuế GTGT:</span>
                  <strong style={{ fontSize: '0.85rem', color: applyVatReduction ? '#059669' : '#64748B' }}>
                    {applyVatReduction ? 'Đang bật (Giảm 20% GTGT)' : 'Tắt'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>Tổng thuế phát sinh:</span>
                  <strong style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F766E' }}>
                    {formatMoney(summary.totalTaxAmount)}
                  </strong>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Ghi chú chốt kỳ (Tùy chọn):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Đã đối soát hóa đơn đầu vào và doanh thu bán lẻ quầy..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
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
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleNextStep1}
                  className="btn-primary-pill"
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Legal Responsibility & Warning */}
          {step === 2 && (
            <div>
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  marginBottom: 20,
                  display: 'flex',
                  gap: 12,
                }}
              >
                <AlertTriangle size={24} style={{ color: '#D97706', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#92400E', display: 'block', marginBottom: 4 }}>
                    Lưu ý về tính bất biến của Snapshot kỳ thuế
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#B45309', lineHeight: 1.5 }}>
                    Sau khi chốt kỳ, toàn bộ số liệu doanh thu, thuế GTGT, thuế TNCN và các sổ kế toán sẽ được
                    <strong> khóa vĩnh viễn (Read-only)</strong> để phục vụ kê khai và thanh tra thuế. Bạn sẽ không thể
                    sửa đổi hoặc xóa bỏ bản ghi này.
                  </p>
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  background: isConfirmed ? '#F0FDF4' : '#ffffff',
                  cursor: 'pointer',
                  marginBottom: 24,
                }}
              >
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2, accentColor: '#0F766E', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 600, lineHeight: 1.5 }}>
                  Tôi đã rà soát kỹ bảng kê doanh thu và chi phí hợp lý. Tôi cam kết chịu trách nhiệm đối với số thuế
                  được khóa trong kỳ tính thuế này.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary-pill"
                >
                  Quay lại bước 1
                </button>
                <button
                  type="button"
                  disabled={!isConfirmed}
                  onClick={handleNextStep2}
                  className="btn-primary-pill"
                  style={{ opacity: !isConfirmed ? 0.6 : 1, cursor: !isConfirmed ? 'not-allowed' : 'pointer' }}
                >
                  Xác nhận: Nhập mã PIN
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Server-side PIN Entry */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Xác thực mã PIN bảo mật chủ tiệm
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  Nhập mã PIN 4 số của chủ tiệm để ký chốt dữ liệu
                </p>
              </div>

              {/* PIN Dots Display */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 16,
                  margin: '20px 0',
                }}
              >
                {[0, 1, 2, 3].map((index) => {
                  const hasDigit = pin.length > index;
                  return (
                    <div
                      key={index}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: '2px solid #0F766E',
                        background: hasDigit ? '#0F766E' : 'transparent',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  );
                })}
              </div>

              {/* Server Error Message */}
              {pinError && (
                <div
                  style={{
                    color: '#DC2626',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: '#FEF2F2',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 16,
                    border: '1px solid #FCA5A5',
                  }}
                >
                  {pinError}
                </div>
              )}

              {/* Numeric Keypad */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  maxWidth: 240,
                  margin: '0 auto 20px auto',
                }}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handlePinInput(digit)}
                    style={{
                      padding: '12px 0',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    {digit}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handlePinInput('0')}
                  style={{
                    padding: '12px 0',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePinBackspace}
                  style={{
                    padding: '12px 0',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#64748B',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Xóa
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep(2)}
                  className="btn-secondary-pill"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  disabled={pin.length !== 4 || isSubmitting}
                  onClick={handleFinalSubmit}
                  className="btn-primary-pill"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    opacity: pin.length !== 4 || isSubmitting ? 0.6 : 1,
                    cursor: pin.length !== 4 || isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Lock size={16} />
                  <span>{isSubmitting ? 'Đang xác thực & Chốt kỳ...' : 'Xác thực & Chốt kỳ ngay'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
