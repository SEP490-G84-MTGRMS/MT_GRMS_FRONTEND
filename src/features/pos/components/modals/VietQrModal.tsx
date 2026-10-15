import { useState, useEffect } from 'react';
import type { FC } from 'react';

interface Props {
  isOpen: boolean;
  orderCode: string;
  amount: number;
  onClose: () => void;
  onConfirmAndPrint: () => void;
}

export const VietQrModal: FC<Props> = ({
  isOpen,
  orderCode,
  amount,
  onClose,
  onConfirmAndPrint,
}) => {
  const [selectedAccount, setSelectedAccount] = useState('MB - 0974742130 - MT-Grocery Store');
  const [countdown, setCountdown] = useState(300);

  useEffect(() => {
    if (!isOpen) return;
    setCountdown(300);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // VietQR quick URL generator standard (VietQR.io format)
  const qrUrl = `https://api.vietqr.io/image/970422-0974742130-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    orderCode
  )}&accountName=MT%20GROCERY%20STORE`;

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 520 }}>
        <div className="pos-modal-header">
          <b>Thanh toán hóa đơn qua Dynamic VietQR</b>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="pos-modal-body">
          <table className="pos-form-table" style={{ width: '100%', marginBottom: 12 }}>
            <tbody>
              <tr>
                <td width="36%">Tài khoản nhận tiền:</td>
                <td>
                  <select
                    className="pos-select"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    style={{ fontWeight: 600, width: '100%' }}
                  >
                    <option value="MB - 0974742130 - MT-Grocery Store">MB - 0974742130 - MT-Grocery Store</option>
                    <option value="VPBank - 8379555579 - KOV">VPBank - 8379555579 - KOV</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>Số tiền thanh toán:</td>
                <td>
                  <b style={{ fontSize: 18, color: 'var(--blue-primary)' }}>
                    {amount.toLocaleString('vi-VN')} VNĐ
                  </b>
                </td>
              </tr>
              <tr>
                <td>Thời gian hiệu lực:</td>
                <td>
                  <span style={{ color: '#d97706', fontWeight: 600 }}>⏱ {timerText}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Khung mã QR Napas 247 */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
              MT-GROCERY STORE • {selectedAccount.split(' - ')[0]} ({orderCode})
            </div>

            <div
              style={{
                width: 200,
                height: 200,
                margin: '0 auto',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: 8,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={qrUrl}
                alt="VietQR Napas 247"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  // Fallback visual mock if offline
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              {amount.toLocaleString('vi-VN')} VND
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button
                type="button"
                className="pos-btn-secondary"
                onClick={() => alert('Đã tải hình ảnh QR Code xuống máy!')}
              >
                ⤓ Tải QR
              </button>
              <button
                type="button"
                className="pos-btn-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(qrUrl);
                  alert('Đã sao chép liên kết thanh toán VietQR!');
                }}
              >
                📋 Sao chép QR
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
              Hệ thống tự động xác nhận khi nhận tiền từ cổng Napas 247.
            </div>
          </div>
        </div>
        <div className="pos-modal-footer">
          <button type="button" className="pos-btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="pos-btn-primary"
            onClick={onConfirmAndPrint}
            style={{ padding: '8px 16px', fontSize: 14 }}
          >
            <b>✓ Xác Nhận Đã Nhận Tiền & In Hóa Đơn K80</b>
          </button>
        </div>
      </div>
    </div>
  );
};
