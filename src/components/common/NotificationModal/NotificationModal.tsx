import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './NotificationModal.css';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: NotificationType;
  title: string;
  message: string | React.ReactNode;
  itemCode?: string;
  confirmText?: string;
  autoCloseMs?: number;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  type = 'success',
  title,
  message,
  itemCode,
  confirmText = 'Đã hiểu',
  autoCloseMs,
}) => {
  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Optional auto-close timer
  useEffect(() => {
    if (!isOpen || !autoCloseMs || autoCloseMs <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle size={26} />;
      case 'warning':
        return <AlertTriangle size={26} />;
      case 'info':
        return <Info size={26} />;
      case 'success':
      default:
        return <CheckCircle2 size={26} />;
    }
  };

  return (
    <div
      className="common-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="common-notification-title"
    >
      <div
        className="common-modal-box common-notification-box"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="common-modal-close-btn"
          onClick={onClose}
          title="Đóng"
        >
          <X size={18} />
        </button>

        <div className="common-modal-header-row">
          <div className={`common-modal-icon-badge ${type}`}>
            {renderIcon()}
          </div>
          <div>
            <h4 id="common-notification-title" className="common-modal-title">
              {title}
            </h4>
            {itemCode && (
              <p className="common-modal-code">
                Mã: <b>{itemCode}</b>
              </p>
            )}
          </div>
        </div>

        <div className="common-modal-content">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        <div className="common-modal-actions">
          <button
            type="button"
            className={`common-modal-btn ${type === 'error' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onClose}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

