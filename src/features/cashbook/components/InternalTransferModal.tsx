import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { CashAccount, FundTransferDTO } from '../types/cashbook.types';
import { ArrowRightLeft, ShieldCheck, X } from 'lucide-react';

interface InternalTransferModalProps {
  isOpen: boolean;
  accounts: CashAccount[];
  onClose: () => void;
  onSubmit: (dto: FundTransferDTO) => Promise<void>;
}

const MAX_NOTE_LENGTH = 255;

export const InternalTransferModal: FC<InternalTransferModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [transferFee, setTransferFee] = useState<number | ''>(0);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeAccounts = accounts.filter((a) => a.isActive);
      if (activeAccounts.length >= 2) {
        setFromAccountId(activeAccounts[0].id);
        setToAccountId(activeAccounts[1].id);
      } else if (activeAccounts.length === 1) {
        setFromAccountId(activeAccounts[0].id);
        setToAccountId('');
      }
      setAmount('');
      setTransferFee(0);
      setNote('Chuyển tiền nội bộ giữa các tài khoản quỹ');
      setErrorMessage(null);
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const selectedFromAccount = accounts.find((a) => a.id === fromAccountId);
  const selectedToAccount = accounts.find((a) => a.id === toAccountId);
  const availableBalance = selectedFromAccount ? selectedFromAccount.currentBalance : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = Number(amount);
    if (!fromAccountId || !toAccountId) {
      setErrorMessage('Vui lòng chọn cả tài khoản nguồn và tài khoản đích');
      return;
    }
    if (fromAccountId === toAccountId) {
      setErrorMessage('Tài khoản nguồn và tài khoản đích không được trùng nhau');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Số tiền chuyển quỹ phải lớn hơn 0');
      return;
    }
    if (numAmount > availableBalance) {
      setErrorMessage(
        `Số dư tài khoản nguồn không đủ (${availableBalance.toLocaleString('vi-VN')} đ < ${numAmount.toLocaleString('vi-VN')} đ)`
      );
      return;
    }
    if (note.trim().length > MAX_NOTE_LENGTH) {
      setErrorMessage(`Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        fromAccountId,
        toAccountId,
        amount: numAmount,
        transferFee: Number(transferFee) || 0,
        note: note.trim() || 'Chuyển tiền nội bộ',
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi thực hiện chuyển quỹ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div className="cb-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="cb-modal-header cb-modal-header--transfer">
          <div className="cb-modal-heading">
            <span className="cb-modal-icon"><ArrowRightLeft size={20} /></span>
            <div>
              <h2 className="cb-modal-title">Chuyển quỹ nội bộ</h2>
              <p className="cb-modal-subtitle">Điều chuyển giữa các tài khoản của cửa hàng</p>
            </div>
          </div>
          <button type="button" className="cb-modal-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              borderRadius: '8px',
              fontSize: '13px',
              border: '1px solid #FEE2E2',
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cb-modal-body cb-transfer-form">
          {/* Nguồn tiền */}
          <div className="cb-form-group">
            <label className="cb-form-label">Từ tài khoản *</label>
            <select
              className="cb-form-select"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} · {acc.currentBalance.toLocaleString('vi-VN')} đ
                </option>
              ))}
            </select>
            {selectedFromAccount && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Khả dụng: <strong style={{ color: availableBalance < 0 ? '#DC2626' : '#059669' }}>{availableBalance.toLocaleString('vi-VN')} đ</strong>
              </div>
            )}
          </div>

          {/* Đích đến */}
          <div className="cb-form-group">
            <label className="cb-form-label">Đến tài khoản *</label>
            <select
              className="cb-form-select"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              required
            >
              {accounts
                .filter((a) => a.id !== fromAccountId)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} · {acc.currentBalance.toLocaleString('vi-VN')} đ
                  </option>
                ))}
            </select>
            {selectedToAccount && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Số dư hiện tại: <strong>{selectedToAccount.currentBalance.toLocaleString('vi-VN')} đ</strong>
              </div>
            )}
          </div>

          {/* Số tiền */}
          <div className="cb-form-group">
            <label className="cb-form-label">Số tiền chuyển *</label>
            <input
              type="number"
              className="cb-form-input cb-amount-input"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              min="1000"
              step="1000"
              required
            />
            {Number(amount) > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--blue-primary)', marginTop: '4px', fontWeight: 600 }}>
                {Number(amount).toLocaleString('vi-VN')} đ
              </div>
            )}
          </div>

          {/* Phí chuyển khoản nếu có */}
          <div className="cb-form-group">
            <label className="cb-form-label">Phí ngân hàng</label>
            <input
              type="number"
              className="cb-form-input"
              placeholder="0"
              value={transferFee}
              onChange={(e) => setTransferFee(e.target.value === '' ? '' : Number(e.target.value))}
              min="0"
              step="1000"
            />
          </div>

          {/* Ghi chú */}
          <div className="cb-form-group">
            <label className="cb-form-label">Ghi chú</label>
            <textarea
              className="cb-form-textarea"
              rows={2}
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Nộp tiền mặt cuối ca vào tài khoản MB Bank..."
            />
            <span className="cb-character-count">{note.length}/{MAX_NOTE_LENGTH}</span>
          </div>

          {/* Quy tắc kế toán đối ứng callout */}
          <div className="cb-automation-note">
            <ShieldCheck size={16} /> <span>Hệ thống tự tạo cặp phiếu chi – thu đối ứng.</span>
          </div>

          <div className="cb-modal-footer">
            <button
              type="button"
              className="cb-btn cb-btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cb-btn cb-btn-primary"
              style={{ backgroundColor: '#6366F1', borderColor: '#6366F1', color: '#ffffff' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang chuyển...' : 'Xác nhận chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
