import type { FC } from 'react';
import { X, Printer } from 'lucide-react';
import type { LedgerTransaction } from '../types/cashbook.types';
import { formatMoney } from '../../finance/utils/formatters';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: LedgerTransaction | null;
}

export const PrintReceiptModal: FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const isReceipt = transaction.transactionType === 'RECEIPT';
  const isPayment = transaction.transactionType === 'PAYMENT';
  const title = isReceipt ? 'PHIẾU THU TIỀN' : isPayment ? 'PHIẾU CHI TIỀN' : 'PHIẾU ĐIỀU CHỈNH';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: 620,
          width: '100%',
          padding: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Controls (hidden on print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: 10,
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
            Xem trước chứng từ in &bull; Mã: <strong style={{ color: '#0F766E' }}>{transaction.transactionCode}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: 4,
            }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Voucher Card — Marked with .printable-a4-sheet for @media print visibility */}
        <div
          className="printable-a4-sheet"
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: 20,
            backgroundColor: '#FFFFFF',
            marginBottom: 16,
            fontSize: '13px',
            color: '#0F172A',
            lineHeight: 1.6,
          }}
        >
          {/* Company & Branch Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#334155' }}>
                HỆ THỐNG CỬA HÀNG BÁN LẺ MT-GRMS
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {transaction.accountName}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
              <div>Mẫu số: <strong>01-TT</strong></div>
              <div>Số: <strong style={{ color: '#0F766E' }}>{transaction.transactionCode}</strong></div>
            </div>
          </div>

          {/* Voucher Title */}
          <div style={{ textAlign: 'center', margin: '14px 0 16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.04em', color: '#0F172A' }}>
              {title}
            </h2>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2, fontStyle: 'italic' }}>
              Ngày {new Date(transaction.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>

          {/* Voucher Details Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '6px 12px', fontSize: '12.5px' }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>{isReceipt ? 'Người nộp tiền:' : 'Người nhận tiền:'}</span>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>
              {transaction.counterpartyName || 'Khách vãng lai'} {transaction.counterpartyType && `(${transaction.counterpartyType})`}
            </span>

            <span style={{ color: '#64748B', fontWeight: 600 }}>Tài khoản quỹ:</span>
            <span style={{ fontWeight: 700, color: '#0F766E' }}>
              {transaction.accountName}
            </span>

            <span style={{ color: '#64748B', fontWeight: 600 }}>Lý do {isReceipt ? 'thu' : 'chi'}:</span>
            <span style={{ color: '#334155' }}>
              {transaction.category} {transaction.description ? `— ${transaction.description}` : ''}
            </span>

            {transaction.referenceDocId && (
              <>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Chứng từ gốc kèm theo:</span>
                <span style={{ fontWeight: 700, color: '#0284C7' }}>
                  {transaction.referenceDocId} ({transaction.referenceDocType || 'Hóa đơn'})
                </span>
              </>
            )}

            <span style={{ color: '#64748B', fontWeight: 600 }}>Số tiền {isReceipt ? 'thu' : 'chi'}:</span>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: isReceipt ? '#059669' : '#DC2626',
              }}
            >
              {isReceipt ? '+' : '-'}{formatMoney(Math.abs(transaction.amount))}
            </span>

            <span style={{ color: '#64748B', fontWeight: 600 }}>Người lập phiếu:</span>
            <span style={{ color: '#334155', fontWeight: 600 }}>
              {transaction.createdBy || 'Hệ thống'}
            </span>
          </div>

          {/* Signatures Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              textAlign: 'center',
              marginTop: 24,
              paddingTop: 12,
              borderTop: '1px dashed #E2E8F0',
              fontSize: '11.5px',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#334155' }}>Thủ trưởng / Chủ tiệm</div>
              <div style={{ color: '#94A3B8', fontSize: '10.5px', marginTop: 2 }}>(Ký, họ tên)</div>
              <div style={{ height: 42 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#334155' }}>Thủ quỹ / Kế toán</div>
              <div style={{ color: '#94A3B8', fontSize: '10.5px', marginTop: 2 }}>(Ký, họ tên)</div>
              <div style={{ height: 42 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#334155' }}>{isReceipt ? 'Người nộp tiền' : 'Người nhận tiền'}</div>
              <div style={{ color: '#94A3B8', fontSize: '10.5px', marginTop: 2 }}>(Ký, họ tên)</div>
              <div style={{ height: 42 }} />
            </div>
          </div>
        </div>

        {/* Footer Actions — hidden on physical print */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            className="po-btn po-btn-secondary"
            style={{ height: 34, padding: '0 16px', fontSize: 13 }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="po-btn po-btn-primary"
            style={{ height: 34, padding: '0 18px', fontSize: 13 }}
          >
            <Printer size={15} />
            <span>In chứng từ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
