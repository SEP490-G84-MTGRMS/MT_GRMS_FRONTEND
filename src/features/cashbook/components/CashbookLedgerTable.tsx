import type { FC } from 'react';
import { Ban } from 'lucide-react';
import type { LedgerTransaction, SourceModuleName } from '../types/cashbook.types';
import { TablePagination } from '../../../components/common/TablePagination/TablePagination';

interface CashbookLedgerTableProps {
  transactions: LedgerTransaction[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onVoidTransaction?: (transaction: LedgerTransaction) => void;
}

const renderSourceBadge = (source?: SourceModuleName, isAutomated?: boolean) => {
  switch (source) {
    case 'SERVICE_OPEX':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#E11D48',
            backgroundColor: '#FFE4E6',
            padding: '3px 8px',
            borderRadius: '9999px',
          }}
          title="Tự động đồng bộ từ Phân hệ Quản lý Chi phí"
        >
          Chi phí FE-07
        </span>
      );
    case 'CRM_DEBT':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#0D9488',
            backgroundColor: '#CCFBF1',
            padding: '3px 8px',
            borderRadius: '9999px',
          }}
          title="Tự động đồng bộ từ Thu nợ Khách hàng CRM & AR"
        >
          Thu nợ FE-08
        </span>
      );
    case 'TAX_SNAPSHOT':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#D97706',
            backgroundColor: '#FEF3C7',
            padding: '3px 8px',
            borderRadius: '9999px',
          }}
          title="Tự động đồng bộ từ Báo cáo Kê khai & Nộp thuế HKD"
        >
          Nộp thuế FE-19
        </span>
      );
    case 'INTERNAL_TRANSFER':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#6366F1',
            backgroundColor: '#EEF2FF',
            padding: '3px 8px',
            borderRadius: '9999px',
          }}
          title="Bút toán điều chuyển thanh khoản giữa các quỹ nội bộ"
        >
          Chuyển quỹ
        </span>
      );
    case 'POS_RETAIL':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#0284C7',
            backgroundColor: '#E0F2FE',
            padding: '3px 8px',
            borderRadius: '9999px',
          }}
          title="Đồng bộ tự động từ Quầy thu ngân POS"
        >
          Bán lẻ POS
        </span>
      );
    default:
      return isAutomated ? (
        <span
          className="automated-badge"
          title="Giao dịch sinh tự động từ hệ thống. Khóa sửa/xóa theo chuẩn GBR-CSH-01."
        >
          Hệ thống
        </span>
      ) : (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            backgroundColor: '#F1F5F9',
            padding: '3px 8px',
            borderRadius: '9999px',
          }}
        >
          Thủ công
        </span>
      );
  }
};

export const CashbookLedgerTable: FC<CashbookLedgerTableProps> = ({
  transactions,
  totalItems,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onVoidTransaction,
}) => {
  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="cashbook-table-container" style={{ padding: '48px 24px', textAlign: 'center' }}>
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
              <th style={{ textAlign: 'center' }}>NGUỒN / TRẠNG THÁI</th>
              <th style={{ textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const isReceipt = tx.transactionType === 'RECEIPT';
              const isPayment = tx.transactionType === 'PAYMENT';
              const isAdj = tx.transactionType === 'ADJUSTMENT';
              const isVoided = Boolean(tx.isVoided);
              const isComp = Boolean(tx.isCompensating);

              return (
                <tr
                  key={tx.id}
                  style={{
                    backgroundColor: isVoided ? '#F8FAFC' : isComp ? '#FFFBEB' : undefined,
                    opacity: isVoided ? 0.65 : 1,
                  }}
                >
                  <td className="tx-code-cell">
                    <div style={{ fontWeight: 700, textDecoration: isVoided ? 'line-through' : 'none' }}>
                      {tx.transactionCode}
                    </div>
                    {tx.linkedTransactionId && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#6366F1',
                          fontFamily: 'var(--font-mono, monospace)',
                          marginTop: '2px',
                        }}
                        title="Mã bút toán đối ứng nội bộ"
                      >
                        ⇄ Đối ứng: {tx.linkedTransactionId}
                      </div>
                    )}
                  </td>
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
                    {isReceipt && <span className="tx-type-badge receipt">Thu tiền</span>}
                    {isPayment && <span className="tx-type-badge payment">Chi tiền</span>}
                    {isAdj && <span className="tx-type-badge adjustment">Điều chỉnh</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', textDecoration: isVoided ? 'line-through' : 'none' }}>
                      {tx.counterpartyName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '280px' }}>
                      {tx.description}
                    </div>
                    {isVoided && tx.voidReason && (
                      <div style={{ fontSize: '11px', color: '#DC2626', marginTop: 2, fontStyle: 'italic' }}>
                        Lý do gạch bỏ: {tx.voidReason}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isReceipt || (isAdj && tx.amount > 0) ? (
                      <span
                        className="amount-num receipt"
                        style={{ textDecoration: isVoided ? 'line-through' : 'none' }}
                      >
                        +{Math.abs(tx.amount).toLocaleString('vi-VN')} đ
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isPayment || (isAdj && tx.amount < 0) ? (
                      <span
                        className="amount-num payment"
                        style={{ textDecoration: isVoided ? 'line-through' : 'none' }}
                      >
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
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      {isVoided ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#94A3B8',
                            backgroundColor: '#E2E8F0',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                          }}
                        >
                          ĐÃ GẠCH BỎ
                        </span>
                      ) : isComp ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#B45309',
                            backgroundColor: '#FEF3C7',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                          }}
                        >
                          PHIẾU BÙ TRỪ
                        </span>
                      ) : (
                        renderSourceBadge(tx.sourceModuleName, tx.isAutomated)
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!isVoided && !isComp && onVoidTransaction && (
                      <button
                        type="button"
                        onClick={() => onVoidTransaction(tx)}
                        style={{
                          background: 'none',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          borderRadius: 6,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Gạch bỏ phiếu này bằng bút toán bù trừ âm"
                      >
                        <Ban size={13} />
                        <span>Hủy phiếu</span>
                      </button>
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
