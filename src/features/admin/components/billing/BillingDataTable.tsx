import { useState } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { TablePagination } from '../../../../components/common';
import type { BillingTransaction } from '../../types/billing.types';

interface BillingDataTableProps {
  transactions: BillingTransaction[];
  isLoading?: boolean;
  onViewInvoice: (transaction: BillingTransaction) => void;
  onReconcile: (transaction: BillingTransaction) => void;
}

const typeLabels = { PURCHASE_PLAN: 'Gói dịch vụ', TOPUP: 'Nạp ví', PURCHASE_ADDON: 'Tiện ích mở rộng', REFUND: 'Hoàn tiền' };
const statusLabels = { SUCCESS: 'Thành công', PENDING: 'Chờ đối soát', FAILED: 'Thất bại', CANCELLED: 'Đã hủy' };
const channelLabels = { VietQR: 'VietQR', WALLET: 'Ví gian hàng', BANK_TRANSFER: 'Chuyển khoản', CREDIT_CARD: 'Thẻ tín dụng' };

export const BillingDataTable = ({ transactions, isLoading = false, onViewInvoice, onReconcile }: BillingDataTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const safePage = Math.min(currentPage, Math.max(1, Math.ceil(transactions.length / pageSize)));
  const items = transactions.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="plans-table-card billing-table-card" aria-busy={isLoading}>
      <div className="plans-table-summary">Lịch sử giao dịch <strong>({transactions.length})</strong></div>
      <div className="plans-table-scroll">
        <table className="plans-table billing-table">
          <thead><tr>
            <th>Giao dịch</th><th>Khách hàng</th><th>Dịch vụ</th>
            <th className="billing-align-right">Tổng thanh toán</th><th>Trạng thái</th><th>Thao tác</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="plans-empty">Đang tải giao dịch...</td></tr> : !items.length ? (
              <tr><td colSpan={6} className="plans-empty">Không có giao dịch phù hợp với bộ lọc.</td></tr>
            ) : items.map(transaction => (
              <tr key={transaction.id}>
                <td>
                  <button className="plans-name-link billing-code" onClick={() => onViewInvoice(transaction)}>{transaction.transactionCode}</button>
                  <small>{new Date(transaction.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</small>
                  <small>{transaction.invoiceCode || 'Chưa có mã hóa đơn'}</small>
                </td>
                <td><strong>{transaction.tenantName}</strong><small>{transaction.tenantSubdomain || '—'}</small>
                  <small>{transaction.ownerName}</small></td>
                <td><strong>{transaction.title}</strong><small>{typeLabels[transaction.type]}</small>
                  <small>{channelLabels[transaction.paymentMethod]}</small></td>
                <td className="billing-align-right"><strong className="billing-money">
                  {transaction.type === 'REFUND' ? '−' : ''}{Math.abs(transaction.totalAmount).toLocaleString('vi-VN')} đ
                </strong>{transaction.vatAmount > 0 && <small>Thuế {transaction.vatAmount.toLocaleString('vi-VN')} đ</small>}</td>
                <td><span className={'billing-status billing-status-' + transaction.status.toLowerCase()}>{statusLabels[transaction.status]}</span></td>
                <td><div className="billing-row-actions">
                  <button type="button" className="billing-action" onClick={() => onViewInvoice(transaction)}
                    title="Xem hóa đơn" aria-label={'Hóa đơn ' + transaction.transactionCode}><FileText size={15} /><span>Hóa đơn</span></button>
                  {transaction.status === 'PENDING' && <button type="button" className="billing-action billing-action-primary"
                    onClick={() => onReconcile(transaction)} title="Duyệt đối soát" aria-label={'Duyệt ' + transaction.transactionCode}><CheckCircle2 size={15} /></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination currentPage={safePage} pageSize={pageSize} totalItems={transactions.length}
        itemLabel="giao dịch" onPageChange={setCurrentPage} isLoading={isLoading}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </section>
  );
};
