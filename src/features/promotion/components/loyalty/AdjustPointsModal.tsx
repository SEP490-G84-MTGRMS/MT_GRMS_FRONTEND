import { useState, type FC } from 'react';
import { X, Award, Plus, Minus } from 'lucide-react';
import type { PointLedgerItem } from '../../types/promotion.types';

interface AdjustPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: PointLedgerItem) => void;
}

export const AdjustPointsModal: FC<AdjustPointsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUB'>('ADD');
  const [points, setPoints] = useState(50);
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !reason.trim()) {
      alert('Vui lòng điền đầy đủ thông tin khách hàng và lý do điều chỉnh!');
      return;
    }

    const changed = adjustType === 'ADD' ? Number(points) : -Number(points);

    const newLedgerItem: PointLedgerItem = {
      id: `pl-${Date.now()}`,
      transactionCode: `TX-ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 89)}`,
      customerId: `CUST-${Math.floor(100 + Math.random() * 900)}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      type: adjustType === 'ADD' ? 'MANUAL_ADJUST_ADD' : 'MANUAL_ADJUST_SUB',
      pointsChanged: changed,
      balanceAfter: 200 + changed,
      reason: reason.trim(),
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdBy: 'Store Owner (Admin)',
    };

    onSave(newLedgerItem);
    onClose();
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
                <label className="form-label form-label-required">Họ và tên khách hàng</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="VD: Trần Văn Bình..."
                  className="form-input"
                  required
                />
              </div>

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
            <button type="submit" className="btn-primary-pill">
              Xác nhận ghi nhận biến động
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
