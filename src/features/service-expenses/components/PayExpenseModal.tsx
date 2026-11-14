import { cashbookService } from '../../cashbook/services/cashbookService';
import type { CashAccount } from '../../cashbook/types/cashbook.types';
import { type FC, useState, useEffect } from 'react';
import { CloseIcon, TrendingUpIcon, AlertTriangleIcon } from '../../admin/components';
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
  const [approvalReason, setApprovalReason] = useState('');
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setApprovalReason('');
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

  const selectedAccount =
    cashAccounts.find((a) => a.id === selectedAccountId) ||
    (cashAccounts.length > 0 ? cashAccounts[0] : null);

  // Business Rule GBR-CSH-03: Poka-yoke chống chi vượt số dư khả dụng
  const isInsufficientBalance = (item?.amount || 0) > (selectedAccount?.currentBalance || 0);
  const isCashOverdraft = paymentMethod === 'Cash' && isInsufficientBalance;
  const isBankOverdraft = paymentMethod === 'BankTransfer' && isInsufficientBalance;

  // Poka-yoke: Bắt buộc nhập lý do phê duyệt khi khoản chi bị gắn cờ Anti-Splitting
  const isApprovalReasonMissing = Boolean(
    item?.isFlaggedAsSuspiciousSplit && !approvalReason.trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isApprovalReasonMissing) {
      setErrorMessage(
        'Phiếu chi bị gắn cờ nghi vấn Anti-Splitting. Bắt buộc nhập lý do giải trình phê duyệt trước khi xuất quỹ.'
      );
      return;
    }

    if (isInsufficientBalance) {
      setErrorMessage(
        paymentMethod === 'Cash'
          ? `Số tiền chi (${formatCurrency(item.amount)}) vượt quá số dư két hiện có (${formatCurrency(selectedAccount?.currentBalance || 0)}). Không thể xuất quỹ âm tiền theo Rule GBR-CSH-03.`
          : `Số dư tài khoản ngân hàng (${formatCurrency(selectedAccount?.currentBalance || 0)}) không đủ để thanh toán khoản chi (${formatCurrency(item.amount)}).`
      );
      return;
    }

    try {
      setErrorMessage(null);
      await onSubmit(item.expenseId, {
        paymentMethod,
        paidFromAccountId: selectedAccountId || undefined,
        createCashBookEntry,
        paymentDate,
        note: note.trim() || undefined,
        approvalNote: item.isFlaggedAsSuspiciousSplit ? approvalReason.trim() : (note.trim() || undefined),
      });
      onClose();
    } catch (err: unknown) {
      console.error('Pay expense failed:', err);
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const serverMsg =
        errObj?.response?.data?.message ||
        errObj?.message ||
        'Không thể thực hiện xuất quỹ chi trả. Vui lòng kiểm tra lại.';
      setErrorMessage(serverMsg);
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

            {/* Poka-yoke: Anti-Splitting Flagged Expense Alert Banner */}
            {item.isFlaggedAsSuspiciousSplit && (
              <div
                style={{
                  padding: '12px 14px',
                  background: '#FFF7ED',
                  borderRadius: '12px',
                  border: '1px solid #FFEDD5',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  color: '#C2410C',
                  fontSize: '0.8rem',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  <AlertTriangleIcon size={16} color="#EA580C" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#9A3412', marginBottom: '2px' }}>
                    Cảnh báo: Khoản chi bị gắn cờ nghi vấn xé nhỏ hạn mức (Anti-Splitting)
                  </div>
                  <div>
                    {item.suspiciousReason || 'Phát hiện dấu hiệu chia nhỏ hóa đơn để né hạn mức phê duyệt chi.'}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#B45309' }}>
                    🛡️ Bắt buộc nhập lý do giải trình phê duyệt bên dưới để tiếp tục xuất quỹ.
                  </div>
                </div>
              </div>
            )}

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
                  ✓ Số dư tài khoản này sẽ tự động giảm và đồng bộ vào Sổ quỹ
                </span>
              </div>
            )}

            {/* Poka-yoke: Business Rule GBR-CSH-03 Alert Banner */}
            {isCashOverdraft && (
              <div
                style={{
                  padding: '12px 14px',
                  background: '#FEF2F2',
                  borderRadius: '12px',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  color: '#991B1B',
                  fontSize: '0.8rem',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  <AlertTriangleIcon size={16} color="#DC2626" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#B91C1C', marginBottom: '2px' }}>
                    Vi phạm Rule GBR-CSH-03 (Chống âm két tiền mặt)
                  </div>
                  <div>
                    Số tiền chi (<strong>{formatCurrency(item.amount)}</strong>) vượt quá số dư két tiền mặt hiện có (<strong>{formatCurrency(selectedAccount?.currentBalance || 0)}</strong>).
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#7F1D1D' }}>
                    💡 <strong>Giải pháp:</strong> Chuyển sang phương thức <strong>Chuyển khoản NH</strong> hoặc nạp thêm tiền vào két quầy trước khi thanh toán.
                  </div>
                </div>
              </div>
            )}

            {/* Bank Overdraft Alert Banner */}
            {isBankOverdraft && (
              <div
                style={{
                  padding: '12px 14px',
                  background: '#FEF2F2',
                  borderRadius: '12px',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  color: '#991B1B',
                  fontSize: '0.8rem',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  <AlertTriangleIcon size={16} color="#DC2626" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#B91C1C', marginBottom: '2px' }}>
                    Tài khoản ngân hàng không đủ số dư
                  </div>
                  <div>
                    Số tiền chi (<strong>{formatCurrency(item.amount)}</strong>) vượt quá số dư khả dụng của tài khoản ngân hàng (<strong>{formatCurrency(selectedAccount?.currentBalance || 0)}</strong>).
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#7F1D1D' }}>
                    💡 <strong>Giải pháp:</strong> Vui lòng nộp thêm tiền vào tài khoản ngân hàng hoặc chọn nguồn chi khác.
                  </div>
                </div>
              </div>
            )}

            {/* Backend Server Error Banner */}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  borderRadius: '8px',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangleIcon size={14} color="#DC2626" />
                <span>{errorMessage}</span>
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

            {/* Poka-yoke: Required Approval Reason for Suspicious Expense */}
            {item.isFlaggedAsSuspiciousSplit && (
              <div className="form-group">
                <label className="form-label" style={{ color: '#9A3412', fontWeight: 700 }}>
                  Lý do phê duyệt giải trình <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Bắt buộc nhập lý do phê duyệt (Ví dụ: Đã đối chiếu hợp đồng & hóa đơn thực tế hợp lệ)..."
                  value={approvalReason}
                  onChange={(e) => {
                    setApprovalReason(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="form-textarea"
                  style={{
                    borderColor: !approvalReason.trim() ? '#FB923C' : '#CBD5E1',
                    background: '#FFFDF9',
                  }}
                  required
                />
                {!approvalReason.trim() && (
                  <span style={{ fontSize: '0.72rem', color: '#EA580C', marginTop: 4, display: 'block' }}>
                    * Bắt buộc nhập lý do để phê duyệt chi phí nghi vấn trước khi xuất quỹ
                  </span>
                )}
              </div>
            )}
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
              disabled={isSubmitting || isInsufficientBalance || isApprovalReasonMissing}
              className="btn-primary-pill"
              style={
                isInsufficientBalance || isApprovalReasonMissing
                  ? {
                      opacity: 0.55,
                      cursor: 'not-allowed',
                      background: '#94A3B8',
                      boxShadow: 'none',
                    }
                  : undefined
              }
              title={
                isInsufficientBalance
                  ? 'Không thể thanh toán do tài khoản nguồn không đủ số dư'
                  : isApprovalReasonMissing
                  ? 'Bắt buộc nhập lý do phê duyệt giải trình cho phiếu chi nghi vấn'
                  : undefined
              }
            >
              <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
