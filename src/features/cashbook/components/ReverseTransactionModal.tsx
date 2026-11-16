import { useState } from 'react';
import type { FC } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { LedgerTransaction } from '../types/cashbook.types';
import { formatMoney } from '../../finance/utils/formatters';

interface ReverseTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: LedgerTransaction | null;
  onConfirm: (reason: string) => Promise<void>;
}

export const ReverseTransactionModal: FC<ReverseTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do gạch bỏ phiếu để tiếp tục');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      setError('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gạch bỏ phiếu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: 480,
          width: '100%',
          padding: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
              Gạch bỏ phiếu [{transaction.transactionCode}]
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: 4,
            }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
          Xác nhận gạch bỏ phiếu <strong>{transaction.transactionCode}</strong> ({formatMoney(Math.abs(transaction.amount))}).
          Theo nguyên tắc Kế toán Bất biến (Immutable Ledger), hệ thống sẽ tạo tự động một bút toán đối ứng bù trừ, không xóa dữ liệu gốc.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
            Lý do gạch bỏ: <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            rows={3}
            placeholder="VD: Nhập nhầm tài khoản / khách hủy đơn hàng sau thanh toán..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: error ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
              fontSize: '0.88rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
          {error && (
            <p style={{ color: '#EF4444', fontSize: '0.8rem', margin: '4px 0 0', fontWeight: 600 }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#DC2626',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận gạch bỏ'}
          </button>
        </div>
      </div>
    </div>
  );
};
