import { type FC, useState } from 'react';
import { CloseIcon, ExportIcon } from '../../admin/components';

interface BillPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title: string;
}

export const BillPreviewModal: FC<BillPreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="expense-modal-backdrop" onClick={onClose}>
      <div
        className="expense-modal-dialog"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="expense-modal-header">
          <div className="expense-modal-title">
            <h3 style={{ maxWidth: '480px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="action-icon-btn"
              title="Mở ảnh trong tab mới"
            >
              <ExportIcon size={14} color="currentColor" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="modal-close-btn"
              title="Đóng cửa sổ"
            >
              <CloseIcon size={16} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div
          style={{
            padding: '24px',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '320px',
            maxHeight: '65vh',
            overflow: 'auto',
          }}
        >
          {hasError ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  background: '#fef2f2',
                  color: '#ef4444',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <CloseIcon size={24} color="#ef4444" />
              </div>
              <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0' }}>
                Không thể tải ảnh hóa đơn chứng từ
              </p>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, maxWidth: '360px' }}>
                Đường dẫn liên kết không tồn tại hoặc đã hết hạn truy cập. Bạn có thể mở liên kết ngoài bằng nút mở rộng phía trên.
              </p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Hóa đơn chứng từ chi phí"
              onError={() => setHasError(true)}
              style={{
                maxHeight: '58vh',
                maxWidth: '100%',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                objectFit: 'contain',
                border: '1px solid #e2e8f0',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="expense-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary-pill"
          >
            Đóng xem
          </button>
        </div>
      </div>
    </div>
  );
};
