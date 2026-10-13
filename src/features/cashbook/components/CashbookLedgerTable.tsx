import type { FC } from 'react';
import type { LedgerTransaction } from '../types/cashbook.types';
import { TablePagination } from '../../../components/common/TablePagination/TablePagination';

interface CashbookLedgerTableProps {
  transactions: LedgerTransaction[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const CashbookLedgerTable: FC<CashbookLedgerTableProps> = ({
  transactions,
  totalItems,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
}) => {
  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="cashbook-table-container" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
        <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--text-main)' }}>
          Chưa có giao dịch sổ quỹ nào
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
          Không tìm thấy bút toán phát sinh trong khoảng thời gian hoặc bộ lọc đã chọn.
        </p>
      </div>
    );
  }

  return (
    <div className="cashbook-table-container">
      <div style={{ overflowX: 'auto' }}>
        <table className="cashbook-table">
          <thead>
            <tr>
              <th>MÃ GIAO DỊCH</th>
              <th>THỜI GIAN</th>
              <th>TÀI KHOẢN</th>
              <th>LOẠI BÚT TOÁN</th>
              <th>ĐỐI TƯỢNG / DIỄN GIẢI</th>
              <th style={{ textAlign: 'right' }}>PHÁT SINH THU (+)</th>
              <th style={{ textAlign: 'right' }}>PHÁT SINH CHI (-)</th>
              <th style={{ textAlign: 'right' }}>SỐ DƯ SAU GD</th>
              <th style={{ textAlign: 'center' }}>NGUỒN & QUYỀN</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const isReceipt = tx.transactionType === 'RECEIPT';
              const isPayment = tx.transactionType === 'PAYMENT';
              const isAdj = tx.transactionType === 'ADJUSTMENT';

              return (
                <tr key={tx.id}>
                  <td className="tx-code-cell">{tx.transactionCode}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                    <br />
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                      {new Date(tx.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td>
                    <strong>{tx.accountName}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                      {tx.category}
                    </div>
                  </td>
                  <td>
                    {isReceipt && <span className="tx-type-badge receipt">🟢 Thu tiền</span>}
                    {isPayment && <span className="tx-type-badge payment">🔴 Chi tiền</span>}
                    {isAdj && <span className="tx-type-badge adjustment">🟠 Điều chỉnh</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {tx.counterpartyName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '280px' }}>
                      {tx.description}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isReceipt || (isAdj && tx.amount > 0) ? (
                      <span className="amount-num receipt">
                        +{Math.abs(tx.amount).toLocaleString('vi-VN')} đ
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isPayment || (isAdj && tx.amount < 0) ? (
                      <span className="amount-num payment">
                        -{Math.abs(tx.amount).toLocaleString('vi-VN')} đ
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="amount-num balance">
                      {tx.balanceAfter.toLocaleString('vi-VN')} đ
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {tx.isAutomated ? (
                      <span
                        className="automated-badge"
                        title="Giao dịch sinh tự động từ POS hoặc Kho vận. Quy tắc GBR-CSH-01 khóa sửa/xóa."
                      >
                        🔒 Hệ thống
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--blue-primary)',
                          background: 'var(--blue-light)',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        ✏️ Thủ công
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        pageSizeOptions={[10, 20, 50]}
        itemLabel="giao dịch"
        isLoading={isLoading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};
