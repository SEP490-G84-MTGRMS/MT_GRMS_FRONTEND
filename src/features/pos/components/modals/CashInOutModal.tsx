import { useState } from 'react';
import type { FC } from 'react';
import { ArrowLeftRight, Save, X } from 'lucide-react';
import type { CashInOutTransaction } from '../../types/pos.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: CashInOutTransaction) => void;
}

export const CashInOutModal: FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [type, setType] = useState<'in' | 'out'>('out');
  const [amount, setAmount] = useState<number>(500000);
  const [reason, setReason] = useState('Nộp bớt tiền mặt về két sắt lớn an toàn');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ (> 0)!');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newTx: CashInOutTransaction = {
      id: `tx-${Date.now()}`,
      code: `PTC${String(Math.floor(100 + Math.random() * 900))}`,
      time: timeStr,
      type,
      typeLabel: type === 'in' ? '[+] Thu vào két' : '[-] Chi khỏi két',
      reason,
      amount,
      note: note.trim() || undefined,
    };

    onSave(newTx);
    onClose();
  };

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div
        className="pos-modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-modal-header">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-teal-700" />
            <h2 className="pos-modal-title">Lập Phiếu Thu / Chi Tiền Mặt Tại Két</h2>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pos-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="modal-form-group">
              <label className="modal-label">Loại phiếu giao dịch (*):</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'in' | 'out')}
                className="modal-select"
              >
                <option value="out">[-] Chi tiền khỏi két (Cash Out)</option>
                <option value="in">[+] Thu tiền vào két (Cash In)</option>
              </select>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Số tiền (VNĐ) (*):</label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={amount === 0 ? '' : amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="Nhập số tiền..."
                className="modal-input font-mono tabular-nums font-semibold"
                autoFocus
                required
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Lý do phát sinh:</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="modal-select"
              >
                <option value="Nộp bớt tiền mặt về két sắt lớn an toàn">
                  Nộp bớt tiền mặt về két sắt lớn an toàn
                </option>
                <option value="Mua vật tư cuộn giấy in K80, văn phòng phẩm">
                  Mua vật tư cuộn giấy in K80, văn phòng phẩm
                </option>
                <option value="Đổi tiền lẻ phục vụ ca">Đổi tiền lẻ phục vụ ca</option>
                <option value="Thu tiền cọc hoặc thanh toán bổ sung">
                  Thu tiền cọc hoặc thanh toán bổ sung
                </option>
                <option value="Khác">Khác (Chi tiết trong ghi chú)</option>
              </select>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Ghi chú chi tiết:</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập thông tin ghi chú kèm theo nếu có..."
                className="modal-textarea"
              />
            </div>
          </div>

          <div className="pos-modal-footer">
            <button
              type="button"
              className="pos-btn-secondary-pill"
              onClick={onClose}
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              className="pos-btn-primary-pill"
            >
              <Save size={15} />
              <span>Lưu Phiếu Thu / Chi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
