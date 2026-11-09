import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import '../NotificationModal/NotificationModal.css';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message?: string | React.ReactNode;
  itemName?: string;
  itemCode?: string;
  itemCount?: number;
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemCode,
  itemCount,
  confirmText = 'Đồng ý xóa',
  cancelText = 'Hủy bỏ',
  loadingText = 'Đang xử lý...',
  variant = 'danger',
  isLoading = false,
}) => {
  // ESC key listener
  useEffect(() => {
    if (!isOpen || isLoading) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isBulk = itemCount !== undefined && itemCount >= 1;

  const renderIcon = () => {
    if (variant === 'danger') {
      return <Trash2 size={24} />;
    }
    return <AlertTriangle size={24} />;
  };

  return (
    <div
      className="common-modal-backdrop"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="common-confirm-title"
    >
      <div
        className="common-modal-box common-confirm-box"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="common-modal-close-btn"
          onClick={onClose}
          disabled={isLoading}
          title="Đóng"
        >
          <X size={18} />
        </button>

        <div className="common-modal-header-row">
          <div className={`common-modal-icon-badge ${variant}`}>
            {renderIcon()}
          </div>
          <div>
            <h4 id="common-confirm-title" className="common-modal-title">
              {isBulk ? `Xóa ${itemCount} mục đã chọn?` : title}
            </h4>
            {!isBulk && itemCode && (
              <p className="common-modal-code">
                Mã: <b>{itemCode}</b>
              </p>
            )}
          </div>
        </div>

        <div className="common-modal-content">
          {message ? (
            typeof message === 'string' ? <p>{message}</p> : message
          ) : isBulk ? (
            <p>
              Bạn có chắc chắn muốn xóa <b>{itemCount}</b> mục đã chọn? Thao tác này không thể hoàn tác.
            </p>
          ) : (
            <p>
              Bạn có chắc chắn muốn xóa <b>"{itemName || 'mục này'}"</b>? Thao tác này không thể hoàn tác.
            </p>
          )}
        </div>

        <div className="common-modal-actions">
          <button
            type="button"
            className="common-modal-btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`common-modal-btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {variant === 'danger' && !isLoading && <Trash2 size={15} />}
            <span>{isLoading ? loadingText : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

