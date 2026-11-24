import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { LedgerTransaction } from '../types/cashbook.types';
import { formatMoney } from '../../finance/utils/formatters';

interface ReverseTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: LedgerTransaction | null;
  onConfirm: (reason: string) => Promise<void>;
}

export const ReverseTransactionModal: FC<ReverseTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setReason('');
    setError('');
  }, [isOpen, transaction?.id]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do gạch bỏ phiếu để tiếp tục');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      setError('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gạch bỏ phiếu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }}>
      <div className="cb-modal-container" role="dialog" aria-modal="true" aria-labelledby="cb-reverse-title"
        onClick={(event) => event.stopPropagation()}>
        <div className="cb-modal-header cb-modal-header--payment">
          <div className="cb-modal-heading">
            <div className="cb-modal-icon"><AlertTriangle size={18} /></div>
            <h3 className="cb-modal-title" id="cb-reverse-title">Gạch bỏ phiếu [{transaction.transactionCode}]</h3>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="cb-modal-close-btn" aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="cb-modal-body">
          <p className="cb-modal-subtitle">
            Hệ thống sẽ tạo bút toán bù trừ {formatMoney(Math.abs(transaction.amount))} và lưu phiếu gốc trong sổ quỹ.
          </p>
          <div className="cb-form-group">
            <label className="cb-form-label" htmlFor="cb-reverse-reason">Lý do gạch bỏ *</label>
            <textarea id="cb-reverse-reason" className="cb-form-textarea" value={reason} rows={3}
              aria-invalid={Boolean(error)} disabled={isSubmitting}
              onChange={(event) => { setReason(event.target.value); setError(''); }}
              placeholder="Ví dụ: Nhập nhầm tài khoản" autoFocus />
            {error && <p className="cb-overdraft-alert" role="alert">{error}</p>}
          </div>
        </div>

        <div className="cb-modal-footer">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="cb-btn cb-btn-outline">Hủy bỏ</button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="cb-btn cb-btn-payment">
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận gạch bỏ'}
          </button>
        </div>
      </div>
    </div>
  );
};
