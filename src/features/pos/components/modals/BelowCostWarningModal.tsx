import { useState } from 'react';
import type { FC } from 'react';
import type { CartItem } from '../../types/pos.types';

interface Props {
  isOpen: boolean;
  item: CartItem | null;
  onClose: () => void;
  onApprove: (itemId: string) => void;
}

export const BelowCostWarningModal: FC<Props> = ({
  isOpen,
  item,
  onClose,
  onApprove,
}) => {
  const [pin, setPin] = useState('8888');
  const [reason, setReason] = useState('Xả hàng cận hạn sử dụng / Hàng thanh lý');

  if (!isOpen || !item) return null;

  const cost = item.product.costPrice;
  const selling = item.actualPrice;
  const deficit = cost - selling;

  const handleConfirmPin = () => {
    if (pin !== '8888') {
      alert('Mã PIN phê duyệt của Quản lý không chính xác! (Gợi ý mã mẫu: 8888)');
      return;
    }
    onApprove(item.id);
    onClose();
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 640 }}>
        <div className="pos-modal-header" style={{ backgroundColor: '#fff7ed', borderBottomColor: '#fed7aa' }}>
          <b style={{ color: '#c2410c' }}>⚠ Cảnh Báo Bán Dưới Giá Vốn Tại Quầy POS</b>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="pos-modal-body">
          <div
            style={{
              padding: 12,
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 14,
              fontSize: 13,
            }}
          >
            <div>
              Sản phẩm: <b>{item.product.name} ({item.product.sku})</b>
            </div>
            <div style={{ marginTop: 4 }}>
              Giá vốn (COGS): <b>{cost.toLocaleString('vi-VN')} đ</b> &bull; Giá bán vừa nhập: <b>{selling.toLocaleString('vi-VN')} đ</b> &bull; Thâm hụt:{' '}
              <b style={{ color: '#e11d48' }}>-{deficit.toLocaleString('vi-VN')} đ/{item.unit}</b>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 14 }}>
            <b>Kiểm soát phân quyền (Permission Control):</b> Thu ngân bị chặn bán dưới giá vốn. Cần Quản lý hoặc Cửa hàng trưởng nhập <b>Mã PIN phê duyệt</b> để mở khóa xuất đơn.
          </p>

          <table className="pos-form-table" style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td width="30%">Mã PIN Quản lý (*):</td>
                <td>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="pos-input"
                    style={{
                      width: 120,
                      textAlign: 'center',
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: 3,
                    }}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>(PIN Demo: 8888)</span>
                </td>
              </tr>
              <tr>
                <td>Lý do phê duyệt:</td>
                <td>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="pos-select"
                    style={{ width: '100%' }}
                  >
                    <option value="Xả hàng cận hạn sử dụng / Hàng thanh lý">
                      Xả hàng cận hạn sử dụng / Hàng thanh lý
                    </option>
                    <option value="Hàng lỗi đường may / Vết ố bao bì">
                      Hàng lỗi đường may / Vết ố bao bì
                    </option>
                    <option value="Chính sách bán buôn đặc biệt của Giám đốc">
                      Chính sách bán buôn đặc biệt của Giám đốc
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="pos-modal-footer">
          <button type="button" className="pos-btn-secondary" onClick={onClose}>
            Từ chối / Giữ nguyên giá cũ
          </button>
          <button
            type="button"
            className="pos-btn-danger"
            onClick={handleConfirmPin}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: '1px solid #b91c1c',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <b>✓ Quản Lý Xác Thực PIN & Cho Phép Xuất Đơn</b>
          </button>
        </div>
      </div>
    </div>
  );
};
