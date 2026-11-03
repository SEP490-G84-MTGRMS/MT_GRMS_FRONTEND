import React, { useState, useRef } from 'react';

export type RiskLevel = 0 | 1 | 2 | 3;

export interface ConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  riskLevel?: RiskLevel;
  requiredReason?: boolean;
  reasonOptions?: string[];
  impactDetails?: { label: string; value: string; isNegative?: boolean }[];
  isSubmitting?: boolean;
}

export const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Quay lại',
  riskLevel = 1,
  requiredReason = false,
  reasonOptions = ['Nhập nhầm số tiền', 'Chọn nhầm két / tài khoản', 'Khách đổi ý', 'Khác'],
  impactDetails,
  isSubmitting = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(reasonOptions[0] || '');
  const [customReason, setCustomReason] = useState<string>('');
  
  // Hold-to-confirm state (for risk level 3)
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!isOpen) return null;

  const handleStartHold = () => {
    if (riskLevel !== 3) return;
    setHoldProgress(0);
    const startTime = Date.now();
    const duration = 2000; // 2 seconds

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        holdIntervalRef.current = null;
        triggerConfirm();
      }
    }, 50);
  };

  const handleStopHold = () => {
    if (riskLevel !== 3) return;
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldProgress(0);
  };

  const triggerConfirm = () => {
    const finalReason = selectedReason === 'Khác' ? customReason || 'Khác' : selectedReason;
    onConfirm(finalReason);
  };

  const isLevel3 = riskLevel === 3;
  const isLevel2 = riskLevel === 2;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: isLevel3 ? '#FEE2E2' : isLevel2 ? '#FEF3C7' : '#E0F2FE',
              color: isLevel3 ? '#DC2626' : isLevel2 ? '#D97706' : '#0284C7',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLevel3 ? '🛑' : isLevel2 ? '⚠️' : 'ℹ️'}
          </span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>{title}</h3>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#4B5563', lineHeight: 1.5 }}>
          {description}
        </p>

        {/* Impact Details Box */}
        {impactDetails && impactDetails.length > 0 && (
          <div
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              border: '1px solid #E5E7EB',
            }}
          >
            {impactDetails.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: idx < impactDetails.length - 1 ? '6px' : '0',
                }}
              >
                <span style={{ color: '#6B7280' }}>{item.label}:</span>
                <span style={{ fontWeight: 700, color: item.isNegative ? '#DC2626' : '#111827' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Reason Select (for risk level 2 & required reason) */}
        {(requiredReason || isLevel2) && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Lý do thực hiện (bắt buộc để lưu vết kiểm toán):
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {reasonOptions.map((opt) => (
                <label
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#1F2937',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="confirm_reason"
                    checked={selectedReason === opt}
                    onChange={() => setSelectedReason(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>

            {selectedReason === 'Khác' && (
              <input
                type="text"
                placeholder="Nhập lý do cụ thể..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>

          {isLevel3 ? (
            <button
              type="button"
              onMouseDown={handleStartHold}
              onMouseUp={handleStopHold}
              onMouseLeave={handleStopHold}
              onTouchStart={handleStartHold}
              onTouchEnd={handleStopHold}
              disabled={isSubmitting}
              style={{
                position: 'relative',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#DC2626',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: 'pointer',
                overflow: 'hidden',
                userSelect: 'none',
              }}
            >
              {/* Progress Fill */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${holdProgress}%`,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  transition: 'width 50ms linear',
                }}
              />
              <span style={{ position: 'relative', zIndex: 1 }}>
                {holdProgress > 0 ? `Đang giữ... (${Math.round(holdProgress)}%)` : `Giữ 2 giây để ${confirmLabel}`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={triggerConfirm}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isLevel2 ? '#D97706' : '#0F766E',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              {isSubmitting ? 'Đang xử lý...' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
