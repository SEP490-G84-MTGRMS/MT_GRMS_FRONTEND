import { useState, type FC } from 'react';
import { X, Award, Plus, Minus } from 'lucide-react';

export interface AdjustPointsFormData {
  customerPhone: string;
  adjustmentType: 'ADD' | 'SUB';
  points: number;
  reason: string;
}

interface AdjustPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: AdjustPointsFormData) => Promise<void>;
}

export const AdjustPointsModal: FC<AdjustPointsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [customerPhone, setCustomerPhone] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUB'>('ADD');
  const [points, setPoints] = useState(50);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^0\d{9}$/.test(customerPhone.trim())) {
      setError('Số điện thoại khách hàng phải gồm 10 chữ số và bắt đầu bằng 0.');
      return;
    }
    if (!Number.isInteger(points) || points <= 0 || !reason.trim()) {
      setError('Số điểm phải là số nguyên dương và lý do điều chỉnh là bắt buộc.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await onSave({ customerPhone: customerPhone.trim(), adjustmentType: adjustType, points, reason: reason.trim() });
      onClose();
    } catch {
      // Trang cha hiển thị thông báo lỗi từ máy chủ.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="promo-modal-overlay">
      <div className="promo-modal-dialog" style={{ maxWidth: 520 }}>
        <div className="promo-modal-header">
          <h3>
            <Award className="w-5 h-5 text-teal-700" />
            <span>Điều chỉnh điểm tích lũy thủ công</span>
          </h3>
          <button onClick={onClose} className="promo-modal-close" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="promo-modal-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label form-label-required">Số điện thoại</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="VD: 0988123456"
                  className="form-input"
                  required
                />
              </div>
            </div>

            {error && <div role="alert" className="promo-validation-summary">{error}</div>}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label form-label-required">Thao tác</label>
                <div className="btn-adjust-group">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={`btn-adjust-type type-add ${adjustType === 'ADD' ? 'active' : ''}`}
                  >
                    <Plus size={14} />
                    <span>Cộng điểm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('SUB')}
                    className={`btn-adjust-type type-sub ${adjustType === 'SUB' ? 'active' : ''}`}
                  >
                    <Minus size={14} />
                    <span>Trừ điểm</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Số điểm cần điều chỉnh</label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  min={1}
                  className="form-input font-bold text-lg text-center"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Lý do điều chỉnh</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Bù điểm cho khách do mạng chập chờn ngày hôm qua, tặng điểm sinh nhật đặc biệt..."
                rows={3}
                className="form-textarea"
                required
              />
            </div>
          </div>

          <div className="promo-modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary-pill">
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary-pill" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Xác nhận ghi nhận biến động'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
