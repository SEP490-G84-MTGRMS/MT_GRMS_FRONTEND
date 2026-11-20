import { useEffect, useRef } from 'react';
import { X, Printer, ReceiptText, CheckCircle2 } from 'lucide-react';
import type { BillingTransaction } from '../../types/billing.types';

interface InvoiceDetailModalProps {
  transaction: BillingTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onReconcile: (transaction: BillingTransaction) => void;
}

const paymentLabels = { VietQR: 'VietQR', WALLET: 'Ví gian hàng', BANK_TRANSFER: 'Chuyển khoản ngân hàng', CREDIT_CARD: 'Thẻ tín dụng' };
const statusLabels = { SUCCESS: 'Đã thanh toán', PENDING: 'Chờ đối soát', FAILED: 'Thất bại', CANCELLED: 'Đã hủy' };

export const InvoiceDetailModal = ({ transaction, isOpen, onClose, onReconcile }: InvoiceDetailModalProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [isOpen]);
  if (!isOpen || !transaction) return null;
  const currency = (value: number) => value.toLocaleString('vi-VN') + ' đ';
  const date = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

  return (
    <div className="billing-modal-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="billing-modal invoice-modal-card admin-plans" role="dialog" aria-modal="true"
        aria-labelledby="billing-invoice-title" onKeyDown={event => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Tab') {
            const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <header className="billing-modal-header">
          <span className="plans-name-icon"><ReceiptText size={20} /></span>
          <div><h2 id="billing-invoice-title">Chi tiết hóa đơn SaaS</h2><small>{transaction.invoiceCode || transaction.transactionCode}</small></div>
          <button ref={closeRef} className="billing-close" aria-label="Đóng cửa sổ" onClick={onClose}><X size={19} /></button>
        </header>
        <div id="printableInvoice" className="billing-modal-body">
          <div className="billing-invoice-heading">
            <div><span className="billing-brand">THViet</span><h3>HÓA ĐƠN DỊCH VỤ SAAS</h3><p>{transaction.invoiceCode || 'Chưa có mã hóa đơn'}</p></div>
            <div><span className={'billing-status billing-status-' + transaction.status.toLowerCase()}>{statusLabels[transaction.status]}</span>
              <small>Ngày lập {date(transaction.createdAt)}</small></div>
          </div>
          <section className="billing-customer">
            <h3>Thông tin đơn vị thuê dịch vụ</h3>
            <dl className="billing-info-grid">
              <div><dt>Cửa hàng / Chuỗi</dt><dd>{transaction.tenantName}</dd></div>
              <div><dt>Chủ sở hữu</dt><dd>{transaction.ownerName || '—'}</dd></div>
              <div><dt>Email</dt><dd>{transaction.ownerEmail || '—'}</dd></div>
              <div><dt>Điện thoại</dt><dd>{transaction.ownerPhone || '—'}</dd></div>
              <div><dt>Mã số thuế</dt><dd>{transaction.taxCode || '—'}</dd></div>
              <div><dt>Địa chỉ</dt><dd>{transaction.address || '—'}</dd></div>
            </dl>
          </section>
          <section className="billing-service">
            <div><h3>{transaction.title}</h3>{transaction.description && <p>{transaction.description}</p>}</div>
            <strong className="billing-money">{currency(transaction.amount)}</strong>
          </section>
          <div className="billing-invoice-bottom">
            <section><h3>Thông tin thanh toán</h3>
              <dl className="billing-payment-info">
                <div><dt>Mã giao dịch</dt><dd>{transaction.transactionCode}</dd></div>
                <div><dt>Phương thức</dt><dd>{paymentLabels[transaction.paymentMethod]}</dd></div>
                {transaction.referenceCode && <div><dt>Mã tham chiếu</dt><dd>{transaction.referenceCode}</dd></div>}
                {transaction.bankName && <div><dt>Ngân hàng</dt><dd>{transaction.bankName}</dd></div>}
                {transaction.bankAccount && <div><dt>Tài khoản</dt><dd>{transaction.bankAccount}</dd></div>}
                {transaction.completedAt && <div><dt>Hoàn tất</dt><dd>{date(transaction.completedAt)}</dd></div>}
                {transaction.reconciledBy && <div><dt>Người đối soát</dt><dd>{transaction.reconciledBy}</dd></div>}
              </dl>
            </section>
            <section className="billing-totals">
              <div><span>Tiền dịch vụ</span><strong>{currency(transaction.amount)}</strong></div>
              <div><span>Tiền thuế GTGT</span><strong>{currency(transaction.vatAmount)}</strong></div>
              <div className="billing-total"><span>Tổng thanh toán</span><strong>{currency(transaction.totalAmount)}</strong></div>
            </section>
          </div>
          {transaction.note && <div className="billing-note"><h3>Ghi chú</h3><p>{transaction.note}</p></div>}
        </div>
        <footer className="billing-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={() => window.print()}><Printer size={15} /> In hóa đơn</button>
          <div>
            <button className="admin-btn admin-btn-secondary" onClick={onClose}>Đóng</button>
            {transaction.status === 'PENDING' && <button className="admin-btn admin-btn-primary"
              onClick={() => { onClose(); onReconcile(transaction); }}><CheckCircle2 size={15} /> Duyệt đối soát</button>}
          </div>
        </footer>
      </section>
    </div>
  );
};
