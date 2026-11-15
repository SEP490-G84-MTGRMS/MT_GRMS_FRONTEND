import { useState } from 'react';
import type { FC } from 'react';
import type { BillingTransaction } from '../../types/billing.types';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReconcileModalProps {
  transaction: BillingTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tx: BillingTransaction, note: string) => Promise<void>;
}

export const ReconcileModal: FC<ReconcileModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !transaction) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(transaction, note);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#EAF6F4',
                color: '#0F766E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
                Duyệt đối soát giao dịch thủ công
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Mã GD: {transaction.transactionCode}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px' }}>
          {/* Summary Box */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 16,
              fontSize: 12.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Cửa hàng:</span>
              <strong style={{ color: '#1E293B' }}>{transaction.tenantName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Dịch vụ:</span>
              <span style={{ fontWeight: 600 }}>{transaction.title}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B' }}>Số tiền cần khớp:</span>
              <strong
                style={{
                  fontSize: 16,
                  color: '#0F766E',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {formatCurrency(transaction.totalAmount)}
              </strong>
            </div>
            {transaction.referenceCode && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Mã tham chiếu:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
                  {transaction.referenceCode}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              background: '#FEF3C7',
              borderRadius: 8,
              color: '#92400E',
              fontSize: 12,
              lineHeight: 1.4,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Thao tác này sẽ chuyển trạng thái giao dịch sang <strong>THÀNH CÔNG</strong>, cập nhật ví/gói dịch vụ của khách thuê và lưu vết Audit Log.
            </span>
          </div>

          {/* Note Input */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Ghi chú đối soát (Số chuẩn chi / Sao kê ngân hàng) <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              required
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Đã kiểm tra sao kê MB Bank khớp 1.500.000đ lúc 15:45, nội dung LANANH NAP VI."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="admin-btn admin-btn-secondary"
              style={{
                padding: '7px 16px',
                borderRadius: 9999,
                fontSize: 12.5,
                fontWeight: 600,
                minHeight: 34,
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 18px',
                borderRadius: 9999,
                fontSize: 12.5,
                fontWeight: 700,
                background: '#0F766E',
                color: '#fff',
                border: 'none',
                cursor: isSubmitting || !note.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !note.trim() ? 0.6 : 1,
                boxShadow: '0 2px 4px rgba(15,118,110,0.25)',
              }}
            >
              {isSubmitting ? (
                <span>Đang duyệt...</span>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Xác nhận khớp tiền</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
