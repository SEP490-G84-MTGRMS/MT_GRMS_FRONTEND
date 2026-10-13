import { useState } from 'react';
import type { FC } from 'react';
import { Copy, Check, QrCode } from 'lucide-react';
import type { VietQrConfig } from '../types/customer.types';

interface VietQrDisplayCardProps {
  config: VietQrConfig;
}

export const VietQrDisplayCard: FC<VietQrDisplayCardProps> = ({ config }) => {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  const copyToClipboard = (text: string, type: 'acc' | 'content') => {
    navigator.clipboard.writeText(text);
    if (type === 'acc') {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  return (
    <div className="vietqr-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--blue-primary, #0F766E)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '8px',
        }}
      >
        <QrCode className="w-4 h-4" />
        <span>Quét mã VietQR chuyển khoản nhanh 24/7</span>
      </div>

      {/* QR Code Image */}
      <div className="vietqr-image-box">
        <img
          src={config.qrDataUrl}
          alt="VietQR Chuyển khoản"
        />
        <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>
          Tự động điền số tiền & nội dung
        </p>
      </div>

      {/* Bank & Account Info */}
      <div className="vietqr-info-table">
        <div className="vietqr-info-row">
          <span style={{ color: '#64748b' }}>Ngân hàng:</span>
          <span style={{ fontWeight: 700, color: '#334155' }}>{config.bankName}</span>
        </div>

        <div className="vietqr-info-row">
          <span style={{ color: '#64748b' }}>Số tài khoản:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: 'var(--blue-primary, #0F766E)' }}>
              {config.accountNo}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(config.accountNo, 'acc')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
              title="Sao chép số tài khoản"
            >
              {copiedAccount ? <Check className="w-3.5 h-3.5" style={{ color: '#059669' }} /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="vietqr-info-row">
          <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
          <span style={{ fontWeight: 700, color: '#334155' }}>{config.accountName}</span>
        </div>

        <div className="vietqr-info-row">
          <span style={{ color: '#64748b' }}>Số tiền nợ thu:</span>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: '#DC2626', fontSize: '0.92rem' }}>
            {config.amount.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="vietqr-info-row" style={{ paddingTop: '6px', borderTop: '1px solid #CCFBF1' }}>
          <span style={{ color: '#64748b' }}>Nội dung CK:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                color: 'var(--blue-primary, #0F766E)',
                background: 'var(--blue-subtle, #CCFBF1)',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {config.description}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(config.description, 'content')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
              title="Sao chép nội dung chuyển khoản"
            >
              {copiedContent ? <Check className="w-3.5 h-3.5" style={{ color: '#059669' }} /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};