import { cashbookService } from '../../cashbook/services/cashbookService';
import type { CashAccount } from '../../cashbook/types/cashbook.types';
import { type FC, useState, useEffect } from 'react';
import { CloseIcon, TrendingUpIcon } from '../../admin/components';
import {
  EXPENSE_CATEGORY_LABELS,
  type PayExpenseRequest,
  type ServiceExpenseDto,
} from '../types/expense.types';

interface PayExpenseModalProps {
  item: ServiceExpenseDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseId: string, data: PayExpenseRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const formatCurrency = (val?: number): string => {
  if (typeof val !== 'number') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

export const PayExpenseModal: FC<PayExpenseModalProps> = ({
  item,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'BankTransfer'>(
    'Cash'
  );
  const [createCashBookEntry, setCreateCashBookEntry] = useState(true);
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    if (isOpen) {
      void cashbookService.getCashAccounts().then((accounts) => {
        setCashAccounts(accounts);
        const filtered = accounts.filter((a) =>
          paymentMethod === 'Cash' ? a.accountType === 'CASH' : a.accountType === 'BANK'
        );
        if (filtered.length > 0) {
          setSelectedAccountId(filtered[0].id);
        } else if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
        }
      });
    }
  }, [isOpen, paymentMethod]);


  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      await onSubmit(item.expenseId, {
        paymentMethod,
        paidFromAccountId: selectedAccountId || undefined,
        createCashBookEntry,
        paymentDate,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Pay expense failed:', err);
    }
  };

  return (
    <div className="expense-modal-backdrop" onClick={onClose}>
      <div
        className="expense-modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="expense-modal-header">
          <div className="expense-modal-title">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUpIcon size={16} color="#059669" />
            </div>
            <h3>Xác nhận thanh toán chi phí</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            title="Đóng cửa sổ"
          >
            <CloseIcon size={16} color="currentColor" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="expense-modal-body">
            {/* Summary Box */}
            <div
              style={{
                padding: '16px',
                background: 'var(--bg-soft-blue, #f7faff)',
                borderRadius: '16px',
                border: '1px solid var(--blue-border, #dbe9fe)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Mã chi phí:</span>
                <span style={{ fontWeight: 700, color: 'var(--blue-primary, #0F766E)' }}>{item.expenseId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Danh mục:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Nhà cung cấp:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{item.vendorName}</span>
              </div>
              <div
                style={{
                  paddingTop: '8px',
                  marginTop: '4px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                  Số tiền thanh toán:
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--blue-primary, #0F766E)' }}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label">
                Phương thức thanh toán <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-pill, 9999px)',
                    fontSize: '0.83rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: paymentMethod === 'Cash' ? '1px solid var(--blue-primary, #0F766E)' : '1px solid #e2e8f0',
                    background: paymentMethod === 'Cash' ? 'var(--blue-light, #f0f6ff)' : '#ffffff',
                    color: paymentMethod === 'Cash' ? 'var(--blue-primary, #0F766E)' : '#475569',
                  }}
                >
                  Tiền mặt (Quỹ quầy)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BankTransfer')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-pill, 9999px)',
                    fontSize: '0.83rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: paymentMethod === 'BankTransfer' ? '1px solid var(--blue-primary, #0F766E)' : '1px solid #e2e8f0',
                    background: paymentMethod === 'BankTransfer' ? 'var(--blue-light, #f0f6ff)' : '#ffffff',
                    color: paymentMethod === 'BankTransfer' ? 'var(--blue-primary, #0F766E)' : '#475569',
                  }}
                >
                  Chuyển khoản NH
                </button>
              </div>
            </div>

                        {/* Cash Account Selector */}
            {createCashBookEntry && (
              <div className="form-group">
                <label className="form-label">
                  Tài khoản nguồn chi tiền <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="form-input"
                  style={{ fontWeight: 600, color: '#0F766E' }}
                >
                  {cashAccounts
                    .filter((a) => (paymentMethod === 'Cash' ? a.accountType === 'CASH' : a.accountType === 'BANK'))
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} (Khả dụng: {acc.currentBalance.toLocaleString('vi-VN')} đ)
                      </option>
                    ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4, display: 'block' }}>
                  ✓ Số dư tài khoản này sẽ tự động giảm và đồng bộ vào Sổ quỹ (FE-17)
                </span>
              </div>
            )}

            {/* Cashbook Integration Checkbox */}
            <div
              style={{
                padding: '12px 16px',
                background: '#f0fdf4',
                borderRadius: '16px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <input
                type="checkbox"
                id="cashbook-check"
                checked={createCashBookEntry}
                onChange={(e) => setCreateCashBookEntry(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="cashbook-check" style={{ fontSize: '0.8rem', color: '#166534', cursor: 'pointer', fontWeight: 500 }}>
                Tự động tạo phiếu chi trong Sổ quỹ (FE-17 Cashbook)
              </label>
            </div>

            {/* Payment Date */}
            <div className="form-group">
              <label className="form-label">
                Ngày chi tiền thực tế <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label">Ghi chú thanh toán</label>
              <textarea
                rows={2}
                placeholder="Nhập mã giao dịch ngân hàng hoặc ghi chú..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="form-textarea"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="expense-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary-pill"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary-pill"
            >
              <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
