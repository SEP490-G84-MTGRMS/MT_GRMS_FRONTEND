import { useState } from 'react';
import type { FC } from 'react';
import { X, Tag, AlertCircle, Check } from 'lucide-react';
import type { BatchItem } from '../types/batch.types';

interface BatchDiscountModalProps {
  isOpen: boolean;
  batch: BatchItem | null;
  onClose: () => void;
  onApplyDiscount: (batchId: string, discountPercent: number) => void;
}

export const BatchDiscountModal: FC<BatchDiscountModalProps> = ({
  isOpen,
  batch,
  onClose,
  onApplyDiscount,
}) => {
  const [percent, setPercent] = useState<number>(20);

  if (!isOpen || !batch) return null;

  const presetOptions = [10, 15, 20, 30, 50];

  const handleConfirm = () => {
    onApplyDiscount(batch.id, percent);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tag size={16} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Áp dụng Giảm giá FEFO Kích cầu
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Xả hàng cận date để giảm thiểu rủi ro quá hạn
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Target Item summary */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
              {batch.productName}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              Mã Lô: <b style={{ fontFamily: 'monospace' }}>{batch.batchCode}</b> • HSD: <b>{batch.expiryDate}</b> (Còn <b>{batch.daysLeft} ngày</b>)
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Tồn kho lô: <b>{batch.qtyCurrent} {batch.unit}</b> • Chi nhánh: <b>{batch.branchName}</b>
            </div>
          </div>

          {/* Discount presets */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Chọn mức chiết khấu áp dụng tại POS:
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {presetOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPercent(opt)}
                  style={{
                    flex: '1 1 60px',
                    height: 38,
                    borderRadius: 6,
                    border: percent === opt ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: percent === opt ? '#eff6ff' : '#ffffff',
                    color: percent === opt ? '#1d4ed8' : '#334155',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  -{opt}%
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
              Hoặc nhập tỷ lệ phần trăm tùy chỉnh (1% - 90%):
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="number"
                min={1}
                max={90}
                value={percent}
                onChange={(e) => setPercent(Math.min(90, Math.max(1, Number(e.target.value))))}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 32px 0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 700,
                  color: '#64748b',
                }}
              >
                %
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#eff6ff',
              borderRadius: 6,
              border: '1px solid #bfdbfe',
              display: 'flex',
              gap: 8,
              fontSize: 12,
              color: '#1e40af',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Khi xác nhận, hệ thống POS sẽ tự động áp dụng mức giảm <b>{percent}%</b> cho các lượt xuất bán thuộc lô hàng này cho đến khi hết hàng hoặc hết hạn.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              height: 34,
              padding: '0 18px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Check size={14} />
            <span>Áp dụng giảm {percent}%</span>
          </button>
        </div>
      </div>
    </div>
  );
};
