import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { X, PauseCircle, CheckCircle2 } from 'lucide-react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';

interface AssignmentStatusModalProps {
  item: SupplierBranchAssignmentItem | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}

export const AssignmentStatusModal: FC<AssignmentStatusModalProps> = ({
  item,
  isSubmitting = false,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (item) {
      setReason('');
      setErrorMsg('');
    }
  }, [item]);

  if (!item) return null;

  const isDeactivating = item.status === 'Active';

  const handleConfirm = () => {
    if (isDeactivating && !reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do tạm ngưng.');
      return;
    }
    onConfirm(isDeactivating ? reason.trim() : undefined);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: 460,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: isDeactivating ? '#fffbeb' : '#f0fdfa',
                color: isDeactivating ? '#d97706' : '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDeactivating ? '1px solid #fde68a' : '1px solid #ccfbf1',
              }}
            >
              {isDeactivating ? <PauseCircle size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {isDeactivating ? 'Tạm ngưng phân bổ' : 'Kích hoạt phân bổ'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>
            {isDeactivating ? 'Tạm ngưng' : 'Kích hoạt lại'} nhà cung cấp{' '}
            <b style={{ color: '#0f172a' }}>{item.supplierName}</b>
            {' '}({item.supplierCode}) tại cửa hàng{' '}
            <b style={{ color: '#0f172a' }}>{item.branchName}</b>
            {' '}({item.branchCode}).
          </p>

          {isDeactivating && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                Lý do tạm ngưng <span style={{ color: '#dc2626' }}>*</span>
              </span>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                rows={3}
                placeholder="VD: Cửa hàng tạm đóng sửa chữa, ngừng lấy hàng tại chi nhánh..."
                style={{
                  width: '100%',
                  resize: 'vertical',
                  minHeight: 72,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${errorMsg ? '#fca5a5' : '#cbd5e1'}`,
                  fontSize: 13,
                  color: '#0f172a',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </label>
          )}

          {errorMsg && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 12.5,
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="po-btn po-btn-secondary"
            style={{ height: 34, padding: '0 16px' }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="po-btn"
            style={{
              height: 34,
              padding: '0 16px',
              backgroundColor: isDeactivating ? '#d97706' : '#0f766e',
              color: '#ffffff',
              border: `1px solid ${isDeactivating ? '#d97706' : '#0f766e'}`,
            }}
          >
            {isSubmitting
              ? 'Đang lưu...'
              : isDeactivating
                ? 'Tạm ngưng'
                : 'Kích hoạt'}
          </button>
        </div>
      </div>
    </div>
  );
};
