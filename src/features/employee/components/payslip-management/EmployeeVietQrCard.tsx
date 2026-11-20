import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { QrCode, Download, Copy, Check, Eye, AlertCircle } from 'lucide-react';
import { getVietQrUrl } from '../../../supplier/lib/vietQrHelper';

interface EmployeeVietQrCardProps {
  bankName?: string;
  accountNo: string;
  accountHolder?: string;
  amount?: number;
  description?: string;
  compact?: boolean;
}

export const EmployeeVietQrCard: FC<EmployeeVietQrCardProps> = ({
  bankName,
  accountNo,
  accountHolder,
  amount,
  description,
  compact = false,
}) => {
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const trimmedAccountNo = accountNo.trim();
  const qrUrl = getVietQrUrl({
    bankName,
    accountNo: trimmedAccountNo,
    accountHolder,
    amount,
    description,
    template: 'compact2',
  });

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [qrUrl]);

  if (!trimmedAccountNo || trimmedAccountNo.length < 3) {
    return null;
  }

  const handleCopy = (value: string, target: 'acc' | 'desc') => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    if (target === 'acc') {
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    } else {
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `VietQR_${bankName || 'Bank'}_${trimmedAccountNo}.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formattedAmount = amount && amount > 0 ? `${Math.round(amount).toLocaleString('en-US')} đ` : '0 đ';

  return (
    <>
      <div
        data-testid="employee-vietqr-card"
        style={{
          marginTop: 12,
          padding: compact ? '12px 14px' : '16px 18px',
          background: 'var(--blue-light, #F0FDFA)',
          border: '1px solid var(--blue-border, #99F6E4)',
          borderRadius: 10,
        }}
      >
        {/* Header Badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 999,
              background: '#CCFBF1',
              color: '#0F766E',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <QrCode size={14} />
            <span>VietQR • Napas 247</span>
          </div>
          <span style={{ fontSize: 12, color: '#475569' }}>Tự động nhận diện tài khoản</span>
        </div>

        {/* Main Content: QR + Transfer Info */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* QR Image Box */}
          <div
            style={{
              width: compact ? 148 : 172,
              minHeight: compact ? 148 : 172,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {!imageLoaded && !imageError && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11.5,
                  color: '#64748B',
                  textAlign: 'center',
                  padding: 8,
                }}
              >
                Đang tạo mã VietQR...
              </div>
            )}
            {imageError ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  color: '#DC2626',
                  textAlign: 'center',
                  padding: 8,
                }}
              >
                <AlertCircle size={18} />
                <span>Không tải được ảnh QR</span>
              </div>
            ) : (
              <img
                src={qrUrl}
                alt={`Mã VietQR chuyển khoản ${trimmedAccountNo}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                onClick={() => setIsZoomed(true)}
                title="Bấm để phóng to mã QR"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 6,
                  cursor: 'pointer',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.15s ease',
                }}
              />
            )}
          </div>

          {/* Transfer Details & Quick Actions */}
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
            <div>
              <span style={{ color: '#64748B' }}>Ngân hàng: </span>
              <strong style={{ color: '#0F172A' }}>{bankName || 'Chưa xác định'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Số tài khoản: </span>
              <strong style={{ color: '#0F766E', fontFamily: 'monospace' }}>{trimmedAccountNo}</strong>
            </div>
            {accountHolder && (
              <div>
                <span style={{ color: '#64748B' }}>Chủ tài khoản: </span>
                <strong style={{ color: '#0F172A' }}>{accountHolder.toUpperCase()}</strong>
              </div>
            )}
            <div>
              <span style={{ color: '#64748B' }}>Số tiền: </span>
              <strong style={{ color: '#0F172A' }}>{formattedAmount}</strong>
            </div>
            {description && (
              <div>
                <span style={{ color: '#64748B' }}>Nội dung CK: </span>
                <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{description}</strong>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => handleCopy(trimmedAccountNo, 'acc')}
                className="emp-btn emp-btn-secondary"
                style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {copiedAcc ? <Check size={13} color="#16A34A" /> : <Copy size={13} />}
                <span>{copiedAcc ? 'Đã sao chép STK' : 'Sao chép STK'}</span>
              </button>

              {description && (
                <button
                  type="button"
                  onClick={() => handleCopy(description, 'desc')}
                  className="emp-btn emp-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {copiedDesc ? <Check size={13} color="#16A34A" /> : <Copy size={13} />}
                  <span>{copiedDesc ? 'Đã sao chép ND' : 'Sao chép ND'}</span>
                </button>
              )}

              {!imageError && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsZoomed(true)}
                    className="emp-btn emp-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Eye size={13} />
                    <span>Phóng to</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="emp-btn emp-btn-primary"
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'var(--blue-primary, #0F766E)',
                      borderColor: 'var(--blue-primary, #0F766E)',
                    }}
                  >
                    <Download size={13} />
                    <span>Tải QR</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal phóng to QR */}
      {isZoomed && (
        <div
          className="emp-modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="emp-modal-card"
            style={{ maxWidth: 420, width: '100%', padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#0F172A' }}>
                <QrCode size={18} color="#0F766E" />
                <span>VietQR • Napas 247 — {bankName || 'Ngân hàng'}</span>
              </div>
              <button type="button" className="emp-modal-close-btn" onClick={() => setIsZoomed(false)}>
                &times;
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <img
                src={qrUrl}
                alt={`VietQR Zoom ${trimmedAccountNo}`}
                style={{ width: '100%', maxWidth: 340, borderRadius: 10, border: '1px solid #E2E8F0' }}
              />
              <div style={{ marginTop: 10, fontSize: 13, color: '#475569' }}>
                <div><strong>STK:</strong> {trimmedAccountNo}</div>
                {accountHolder && <div><strong>Chủ TK:</strong> {accountHolder.toUpperCase()}</div>}
                <div><strong>Số tiền:</strong> {formattedAmount}</div>
                {description && <div><strong>Nội dung:</strong> {description}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
