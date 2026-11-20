import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import type { BillingTransaction } from '../../types/billing.types';

interface ReconcileModalProps {
  transaction: BillingTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: BillingTransaction, note: string) => Promise<void>;
}

export const ReconcileModal = ({ transaction, isOpen, onClose, onSubmit }: ReconcileModalProps) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    noteRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [isOpen]);
  if (!isOpen || !transaction) return null;

  return (
    <div className="billing-modal-overlay" onClick={event => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <section className="billing-modal billing-reconcile admin-plans" role="dialog" aria-modal="true"
        aria-labelledby="billing-reconcile-title" onKeyDown={event => {
          if (event.key === 'Escape' && !isSubmitting) onClose();
          if (event.key === 'Tab') {
            const fields = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea');
            const first = fields[0], last = fields[fields.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <header className="billing-modal-header">
          <span className="plans-name-icon"><CheckCircle2 size={20} /></span>
          <div><h2 id="billing-reconcile-title">Duyệt đối soát giao dịch thủ công</h2><small>{transaction.transactionCode}</small></div>
          <button className="billing-close" aria-label="Đóng đối soát" disabled={isSubmitting} onClick={onClose}><X size={19} /></button>
        </header>
        <form onSubmit={async event => {
          event.preventDefault();
          if (isSubmitting) return;
          setIsSubmitting(true);
          setError('');
          try { await onSubmit(transaction, note.trim()); onClose(); }
          catch { setError('Chưa thể đối soát giao dịch. Vui lòng thử lại.'); }
          finally { setIsSubmitting(false); }
        }}>
          <div className="billing-modal-body">
            <div className="billing-reconcile-summary"><span>{transaction.tenantName}</span>
              <strong className="billing-money">{transaction.totalAmount.toLocaleString('vi-VN')} đ</strong>
              <small>{transaction.title}</small></div>
            <p className="billing-reconcile-instruction">Kiểm tra số tiền và mã tham chiếu trên sao kê trước khi xác nhận thanh toán.</p>
            <label className="billing-note-input">Ghi chú đối soát
              <textarea ref={noteRef} value={note} onChange={event => setNote(event.target.value)}
                maxLength={500} rows={4} disabled={isSubmitting}
                placeholder="Ví dụ: Đã kiểm tra sao kê và khớp mã tham chiếu..." /></label>
            {error && <p className="billing-error" role="alert">{error}</p>}
          </div>
          <footer className="billing-modal-footer"><span />
            <div><button type="button" className="admin-btn admin-btn-secondary" disabled={isSubmitting} onClick={onClose}>Hủy</button>
              <button className="admin-btn admin-btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Đang xác nhận...' : 'Xác nhận khớp tiền'}</button></div>
          </footer>
        </form>
      </section>
    </div>
  );
};
