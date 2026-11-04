import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface CancelTransferModalProps {
  isOpen: boolean;
  transferCode: string;
  onClose: () => void;
  onConfirmCancel: (reason: string) => void;
}

export const CancelTransferModal: React.FC<CancelTransferModalProps> = ({
  isOpen,
  transferCode,
  onClose,
  onConfirmCancel,
}) => {
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do hủy phiếu chuyển hàng.');
      return;
    }
    onConfirmCancel(reason.trim());
    onClose();
  };

  return (
    <div
      className="custom-modal-backdrop"
      style={{ zIndex: 1300, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
      onClick={onClose}
    >
      <div
        className="custom-modal-box"
        style={{ maxWidth: 500 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="custom-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} color="#dc2626" />
            <h3 style={{ color: '#0f172a' }}>Hủy phiếu chuyển hàng</h3>
          </div>
          <button type="button" className="custom-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="custom-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              Bạn có chắc chắn muốn hủy phiếu chuyển hàng <b>{transferCode}</b> không?
            </p>

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 12,
                fontSize: 12.5,
                color: '#92400e',
                lineHeight: 1.5,
              }}
            >
              💡 <b>Lưu ý quan trọng:</b> Tồn kho hàng hóa và số lô sẽ được tự động <b>hoàn tác 100% về kho gửi</b> (Rollback) đối với phiếu đang ở trạng thái <i>Đang chuyển (In-Transit)</i> theo quy tắc BR-TRF-05.
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                Lý do hủy phiếu <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="filter-input"
                rows={3}
                placeholder="Ví dụ: Xe tải vận chuyển gặp sự cố, điều phối nhầm kho nhận, hủy theo yêu cầu..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setErrorMsg('');
                }}
                required
                autoFocus
              />
              {errorMsg && (
                <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                  {errorMsg}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="custom-modal-footer">
            <button type="button" className="btn-secondary-white" onClick={onClose}>
              Bỏ qua
            </button>
            <button
              type="submit"
              className="btn-primary-teal"
              style={{ backgroundColor: '#dc2626' }}
            >
              Đồng ý hủy phiếu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
