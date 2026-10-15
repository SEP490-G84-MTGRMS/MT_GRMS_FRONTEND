import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { CashAccount, CreateReceiptDTO, CounterpartyType } from '../types/cashbook.types';

interface CreateReceiptModalProps {
  isOpen: boolean;
  accounts: CashAccount[];
  onClose: () => void;
  onSubmit: (dto: CreateReceiptDTO) => Promise<void>;
}

export const CreateReceiptModal: FC<CreateReceiptModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Thu bán lẻ khác');
  const [counterpartyType, setCounterpartyType] = useState<CounterpartyType>('CUSTOMER');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const categories = [
    'Thu bán lẻ khác',
    'Thu nợ khách hàng (FE-08)',
    'Hoàn ứng nội bộ',
    'Thu lãi tiền gửi ngân hàng',
    'Thu khác',
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = Number(amountStr.replace(/\D/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền thu lớn hơn 0');
      return;
    }

    if (!counterpartyName.trim()) {
      setErrorMsg('Vui lòng nhập tên người nộp tiền');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        accountId,
        amount: parsedAmount,
        category,
        counterpartyType,
        counterpartyName: counterpartyName.trim(),
        description: description.trim() || 'Thu tiền vào quỹ',
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu phiếu thu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div className="cb-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cb-modal-header">
          <h2 className="cb-modal-title">
            <span>🟢</span> Lập Phiếu Thu Tiền
          </h2>
          <button type="button" className="cb-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cb-modal-body">
            {errorMsg && (
              <div className="cb-overdraft-alert">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <div className="cb-form-group">
              <label className="cb-form-label">Tài khoản nhận tiền *</label>
              <select
                className="cb-form-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.currentBalance.toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Số tiền thu (VNĐ) *</label>
              <input
                type="text"
                className="cb-form-input"
                placeholder="Ví dụ: 1,500,000"
                value={amountStr ? Number(amountStr.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Danh mục thu *</label>
              <select
                className="cb-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Đối tượng nộp tiền *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="cb-form-select"
                  style={{ width: '130px' }}
                  value={counterpartyType}
                  onChange={(e) => setCounterpartyType(e.target.value as CounterpartyType)}
                >
                  <option value="CUSTOMER">Khách hàng</option>
                  <option value="EMPLOYEE">Nhân viên</option>
                  <option value="SUPPLIER">Nhà cung cấp</option>
                  <option value="OTHER">Khác</option>
                </select>
                <input
                  type="text"
                  className="cb-form-input"
                  placeholder="Nhập họ tên / đơn vị nộp..."
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Diễn giải lý do thu</label>
              <textarea
                className="cb-form-textarea"
                rows={2}
                placeholder="Ghi chú nội dung nộp tiền..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="cb-modal-footer">
            <button type="button" className="cb-btn cb-btn-outline" onClick={onClose}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="cb-btn cb-btn-receipt"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : '✓ Lưu Phiếu Thu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
