import { useState, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import type { CashAccount, CreatePaymentDTO, CounterpartyType } from '../types/cashbook.types';

interface CreatePaymentModalProps {
  isOpen: boolean;
  accounts: CashAccount[];
  onClose: () => void;
  onSubmit: (dto: CreatePaymentDTO) => Promise<void>;
}

export const CreatePaymentModal: FC<CreatePaymentModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onSubmit,
}) => {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Chi phí vận hành (FE-07)');
  const [counterpartyType, setCounterpartyType] = useState<CounterpartyType>('SUPPLIER');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const categories = [
    'Chi phí vận hành (FE-07)',
    'Trả tiền hàng NCC (FE-06)',
    'Tạm ứng lương nhân viên',
    'Mua sắm trang thiết bị',
    'Chi khác',
  ];

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) || accounts[0],
    [accounts, accountId]
  );

  const parsedAmount = Number(amountStr.replace(/\D/g, '')) || 0;

  // Kiểm tra vi phạm Rule GBR-CSH-03 (Chống âm két tiền mặt)
  const isOverdraftViolation =
    selectedAccount?.accountType === 'CASH' && parsedAmount > selectedAccount.currentBalance;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (parsedAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền chi lớn hơn 0');
      return;
    }

    if (isOverdraftViolation) {
      setErrorMsg('Không thể chi vượt quá số dư hiện tại của két tiền mặt');
      return;
    }

    if (!counterpartyName.trim()) {
      setErrorMsg('Vui lòng nhập tên người nhận tiền');
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
        description: description.trim() || 'Chi tiền từ quỹ',
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu phiếu chi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div className="cb-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cb-modal-header">
          <h2 className="cb-modal-title">
            <span>🔴</span> Lập Phiếu Chi Tiền
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

            {isOverdraftViolation && (
              <div className="cb-overdraft-alert">
                <span>🚫</span>
                <div>
                  <strong>Cảnh báo Rule GBR-CSH-03:</strong> Số tiền chi (
                  {parsedAmount.toLocaleString('vi-VN')} đ) vượt quá số dư két hiện có (
                  {selectedAccount.currentBalance.toLocaleString('vi-VN')} đ). Nút xác nhận chi đã bị vô hiệu hóa!
                </div>
              </div>
            )}

            <div className="cb-form-group">
              <label className="cb-form-label">Tài khoản xuất tiền *</label>
              <select
                className="cb-form-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} (Hiện có: {acc.currentBalance.toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Số tiền chi (VNĐ) *</label>
              <input
                type="text"
                className="cb-form-input"
                placeholder="Ví dụ: 500,000"
                value={amountStr ? Number(amountStr.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Danh mục chi *</label>
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
              <label className="cb-form-label">Người nhận tiền *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="cb-form-select"
                  style={{ width: '130px' }}
                  value={counterpartyType}
                  onChange={(e) => setCounterpartyType(e.target.value as CounterpartyType)}
                >
                  <option value="SUPPLIER">Nhà cung cấp</option>
                  <option value="EMPLOYEE">Nhân viên</option>
                  <option value="CUSTOMER">Khách hàng</option>
                  <option value="OTHER">Khác</option>
                </select>
                <input
                  type="text"
                  className="cb-form-input"
                  placeholder="Nhập họ tên / đơn vị thụ hưởng..."
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Diễn giải lý do chi</label>
              <textarea
                className="cb-form-textarea"
                rows={2}
                placeholder="Ghi chú mục đích xuất chi..."
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
              className="cb-btn cb-btn-payment"
              disabled={isSubmitting || isOverdraftViolation || parsedAmount <= 0}
            >
              {isSubmitting ? 'Đang lưu...' : '✕ Xác Nhận Chi Tiền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
