import { useState } from 'react';
import type { FC } from 'react';
import { Wallet, Save, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  currentFloat: number;
  onClose: () => void;
  onSave: (newFloat: number) => void;
}

export const EditFloatModal: FC<Props> = ({
  isOpen,
  currentFloat,
  onClose,
  onSave,
}) => {
  const [floatAmount, setFloatAmount] = useState<number>(currentFloat);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (floatAmount < 0) {
      alert('Số tiền đầu ca không được âm!');
      return;
    }
    onSave(floatAmount);
    onClose();
  };

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div
        className="pos-modal-dialog"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-modal-header">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-teal-700" />
            <h2 className="pos-modal-title">Khai Báo Tiền Mặt Đầu Ca (Mở Ca)</h2>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pos-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p className="text-xs text-slate-600" style={{ margin: 0 }}>
              Tiền mặt đầu ca (Float) là số tiền thối ban đầu có sẵn trong két khi mở ca làm việc.
            </p>

            <div className="modal-form-group">
              <label className="modal-label">Số tiền mặt mở ca (VNĐ) (*):</label>
              <input
                type="number"
                min={0}
                step={10000}
                value={floatAmount === 0 ? '' : floatAmount}
                onChange={(e) => setFloatAmount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="1.500.000"
                className="modal-input font-mono tabular-nums font-bold text-teal-800"
                autoFocus
                required
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500">
              <div>&bull; Định dạng: <b>{floatAmount.toLocaleString('vi-VN')} đ</b></div>
              <div>&bull; Khoản tiền này sẽ được dùng để tính tiền lý thuyết trong két cuối ca.</div>
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
              <span>Xác nhận tiền đầu ca</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
