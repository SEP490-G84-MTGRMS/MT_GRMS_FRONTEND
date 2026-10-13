import { useState, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import type { CashAccount, CashReconciliationDTO } from '../types/cashbook.types';

interface CashReconciliationModalProps {
  isOpen: boolean;
  account: CashAccount | null;
  onClose: () => void;
  onSubmit: (dto: CashReconciliationDTO) => Promise<void>;
}

export const CashReconciliationModal: FC<CashReconciliationModalProps> = ({
  isOpen,
  account,
  onClose,
  onSubmit,
}) => {
  const [actualStr, setActualStr] = useState('');
  const [reason, setReason] = useState('');
  const [auditedBy, setAuditedBy] = useState('Nguyễn Trường An');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !account) return null;

  const systemBalance = account.currentBalance;
  const actualCounted = actualStr !== '' ? Number(actualStr.replace(/\D/g, '')) : systemBalance;
  const diff = actualCounted - systemBalance;
  const hasDiscrepancy = diff !== 0;

  const isFormValid = useMemo(() => {
    if (actualStr === '') return false;
    if (hasDiscrepancy && !reason.trim()) {
      return false; // Bắt buộc lý do theo Rule GBR-CSH-04
    }
    return true;
  }, [actualStr, hasDiscrepancy, reason]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (hasDiscrepancy && !reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do giải trình chênh lệch kiểm kê (GBR-CSH-04)');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        accountId: account.id,
        systemBalance,
        actualCountedBalance: actualCounted,
        differenceAmount: diff,
        reason: reason.trim(),
        auditedBy: auditedBy.trim() || 'Người kiểm kê',
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi chốt kiểm kê');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div className="cb-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cb-modal-header">
          <h2 className="cb-modal-title">
            <span>⚖️</span> Kiểm Kê & Đối Soát Két Tiền Mặt
          </h2>
          <button type="button" className="cb-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cb-modal-body">
            {errorMsg && (
              <div className="cb-overdraft-alert">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Két kiểm kê:</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                {account.accountName} ({account.branchName})
              </div>
            </div>

            <div className="cb-reconciliation-diff-box">
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Số dư sổ sách hệ thống
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue-primary)' }}>
                  {systemBalance.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chênh lệch đếm</div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: diff === 0 ? 'var(--green-money)' : 'var(--red-accent)',
                  }}
                >
                  {diff > 0 ? `+${diff.toLocaleString('vi-VN')}` : `${diff.toLocaleString('vi-VN')}`} đ
                </div>
              </div>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Số tiền thực tế đếm trong két (VNĐ) *</label>
              <input
                type="text"
                className="cb-form-input"
                placeholder="Nhập số tiền thực đếm..."
                value={actualStr ? Number(actualStr.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setActualStr(e.target.value)}
                required
              />
            </div>

            {hasDiscrepancy && (
              <div className="cb-form-group">
                <label className="cb-form-label" style={{ color: 'var(--red-accent)' }}>
                  Lý do giải trình chênh lệch * (Quy tắc GBR-CSH-04)
                </label>
                <textarea
                  className="cb-form-textarea"
                  rows={2}
                  style={{ borderColor: 'var(--red-border)' }}
                  placeholder="Bắt buộc nhập lý do thừa/thiếu tiền (Ví dụ: Thối nhầm tiền khách, chưa nộp tiền lẻ...)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="cb-form-group">
              <label className="cb-form-label">Người thực hiện kiểm kê</label>
              <input
                type="text"
                className="cb-form-input"
                value={auditedBy}
                onChange={(e) => setAuditedBy(e.target.value)}
              />
            </div>
          </div>

          <div className="cb-modal-footer">
            <button type="button" className="cb-btn cb-btn-outline" onClick={onClose}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="cb-btn cb-btn-primary"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Đang xử lý...' : '✓ Chốt Kiểm Kê'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
