import { useState } from 'react';
import type { FC } from 'react';
import { QrCode, Download, Copy, Check, Eye } from 'lucide-react';
import { getVietQrUrl } from '../../lib/vietQrHelper';

interface Props {
  bankName?: string;
  accountNo: string;
  accountHolder?: string;
  amount?: number;
  description?: string;
  compact?: boolean;
}

export const SupplierVietQrCard: FC<Props> = ({
  bankName,
  accountNo,
  accountHolder,
  amount,
  description,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!accountNo || accountNo.trim().length < 3) {
    return null;
  }

  const qrUrl = getVietQrUrl({
    bankName,
    accountNo,
    accountHolder,
    amount,
    description,
    template: 'compact2',
  });

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(accountNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `VietQR_${bankName || 'Bank'}_${accountNo}.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div className={`supplier-vietqr-card ${compact ? 'supplier-vietqr-card--compact' : ''}`}>
        {/* Header Badge */}
        <div className="supplier-vietqr-header">
          <div className="supplier-vietqr-badge">
            <QrCode size={14} className="text-emerald-600" />
            <span>VietQR • Napas 247</span>
          </div>
          <span className="supplier-vietqr-subtitle">Tự động nhận diện tài khoản</span>
        </div>

        {/* QR Image Box */}
        <div className="supplier-vietqr-image-wrapper">
          {!imageLoaded && (
            <div className="supplier-vietqr-skeleton">
              <span className="animate-spin text-blue-600">⏳</span>
              <span>Đang tạo mã VietQR...</span>
            </div>
          )}
          <img
            src={qrUrl}
            alt={`Mã VietQR chuyển khoản ${accountNo}`}
            className={`supplier-vietqr-img ${imageLoaded ? 'loaded' : 'loading'}`}
            onLoad={() => setImageLoaded(true)}
            onClick={() => setIsZoomed(true)}
            title="Bấm để phóng to mã QR"
          />
        </div>

        {/* Action Buttons */}
        <div className="supplier-vietqr-actions">
          <button
            type="button"
            onClick={handleCopyAccount}
            className="supplier-vietqr-btn"
            title="Sao chép số tài khoản"
          >
            {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
            <span>{copied ? 'Đã chép STK' : 'Chép STK'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            className="supplier-vietqr-btn"
            title="Xem phóng to mã QR"
          >
            <Eye size={13} />
            <span>Phóng to</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadQr}
            className="supplier-vietqr-btn supplier-vietqr-btn--primary"
            title="Tải ảnh QR về máy"
          >
            <Download size={13} />
            <span>Tải QR</span>
          </button>
        </div>

        <div className="supplier-vietqr-hint">
          Quét bằng ứng dụng ngân hàng bất kỳ để chuyển khoản chính xác 100%
        </div>
      </div>

      {/* Modal phóng to QR */}
      {isZoomed && (
        <div className="supplier-qr-modal-backdrop" onClick={() => setIsZoomed(false)}>
          <div className="supplier-qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="supplier-qr-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={18} color="#0066FF" />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                  Mã VietQR Chuyển Khoản — {bankName || 'Ngân hàng'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="supplier-qr-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="supplier-qr-modal-body">
              <img src={qrUrl} alt="VietQR Zoom" style={{ width: '100%', maxWidth: 360, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
              <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: '#475569' }}>
                <div><strong>Ngân hàng:</strong> {bankName || 'N/A'}</div>
                <div><strong>Số tài khoản:</strong> <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0066FF' }}>{accountNo}</span></div>
                {accountHolder && <div><strong>Chủ tài khoản:</strong> {accountHolder.toUpperCase()}</div>}
              </div>
            </div>
            <div className="supplier-qr-modal-footer">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="admin-btn admin-btn-primary"
                style={{ height: 36, padding: '0 18px', gap: 6 }}
              >
                <Download size={14} />
                <span>Tải ảnh QR</span>
              </button>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="admin-btn admin-btn-secondary"
                style={{ height: 36, padding: '0 16px' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
