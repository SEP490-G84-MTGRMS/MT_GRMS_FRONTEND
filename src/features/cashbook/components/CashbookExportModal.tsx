import { useState } from 'react';
import type { FC } from 'react';
import type { LedgerTransaction, CashAccount } from '../types/cashbook.types';
import { cashbookService } from '../services/cashbookService';

interface CashbookExportModalProps {
  isOpen: boolean;
  transactions: LedgerTransaction[];
  selectedAccount?: CashAccount;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const CashbookExportModal: FC<CashbookExportModalProps> = ({
  isOpen,
  transactions,
  selectedAccount,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'print'>('csv');

  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    try {
      const csvContent = cashbookService.exportCashbookToCSV(transactions);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `So_Quy_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowToast('Đã tải xuống file CSV Sổ quỹ thành công', 'success');
      onClose();
    } catch {
      onShowToast('Không thể xuất file CSV', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div
        className="cb-modal-container"
        style={{ maxWidth: activeTab === 'print' ? '780px' : '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cb-modal-header">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className={`pill-filter-btn ${activeTab === 'csv' ? 'active' : ''}`}
              onClick={() => setActiveTab('csv')}
            >
              📥 Xuất File Excel (CSV)
            </button>
            <button
              type="button"
              className={`pill-filter-btn ${activeTab === 'print' ? 'active' : ''}`}
              onClick={() => setActiveTab('print')}
            >
              🖨️ Xem Trước & In A4
            </button>
          </div>
          <button type="button" className="cb-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cb-modal-body">
          {activeTab === 'csv' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>📊</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--text-main)' }}>
                Xuất {transactions.length} dòng dữ liệu Sổ quỹ
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                File CSV được mã hóa UTF-8 BOM chuẩn Kế toán, mở trực tiếp trên Microsoft Excel
                không bị lỗi phông chữ tiếng Việt.
              </p>
              <button type="button" className="cb-btn cb-btn-primary" onClick={handleDownloadCSV}>
                ⬇️ Tải Xuống File .CSV Ngay
              </button>
            </div>
          ) : (
            <div
              className="printable-a4-sheet"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '24px',
                borderRadius: '8px',
                fontFamily: 'serif',
                color: '#000',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  HỆ THỐNG CỬA HÀNG BÁN LẺ MT-GRMS
                </div>
                <div style={{ fontSize: '12px' }}>
                  {selectedAccount ? selectedAccount.branchName : 'Toàn Hệ Thống'}
                </div>
                <h2 style={{ margin: '14px 0 4px', fontSize: '20px', textTransform: 'uppercase' }}>
                  SỔ QUỸ TIỀN MẶT & DÒNG TIỀN
                </h2>
                <div style={{ fontSize: '12px', fontStyle: 'italic' }}>
                  Ngày lập: {new Date().toLocaleDateString('vi-VN')}
                </div>
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  marginBottom: '28px',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                    <th style={{ padding: '6px 4px', textAlign: 'left' }}>Mã GD</th>
                    <th style={{ padding: '6px 4px', textAlign: 'left' }}>Ngày ghi</th>
                    <th style={{ padding: '6px 4px', textAlign: 'left' }}>Đối tượng / Diễn giải</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Thu (+)</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Chi (-)</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Số dư sau</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 15).map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px dotted #ccc' }}>
                      <td style={{ padding: '6px 4px' }}>{tx.transactionCode}</td>
                      <td style={{ padding: '6px 4px' }}>
                        {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        {tx.counterpartyName} - {tx.description}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                        {tx.transactionType === 'RECEIPT'
                          ? tx.amount.toLocaleString('vi-VN')
                          : '-'}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                        {tx.transactionType === 'PAYMENT'
                          ? tx.amount.toLocaleString('vi-VN')
                          : '-'}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                        {tx.balanceAfter.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '40px',
                  textAlign: 'center',
                  fontSize: '13px',
                }}
              >
                <div>
                  <strong>Người lập biểu</strong>
                  <br />
                  <span style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký, họ tên)</span>
                </div>
                <div>
                  <strong>Thủ quỹ</strong>
                  <br />
                  <span style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký, họ tên)</span>
                </div>
                <div>
                  <strong>Kế toán trưởng</strong>
                  <br />
                  <span style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký, họ tên)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="cb-modal-footer">
          <button type="button" className="cb-btn cb-btn-outline" onClick={onClose}>
            Đóng
          </button>
          {activeTab === 'print' && (
            <button type="button" className="cb-btn cb-btn-primary" onClick={handlePrint}>
              🖨️ In Khổ A4 Ngay
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
