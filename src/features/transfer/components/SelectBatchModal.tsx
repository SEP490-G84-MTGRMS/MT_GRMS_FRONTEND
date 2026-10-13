import React, { useState } from 'react';
import { X, Search, Check, AlertTriangle } from 'lucide-react';
import type { BatchItem } from '../types';

interface SelectBatchModalProps {
  isOpen: boolean;
  productName: string;
  batches: BatchItem[];
  selectedBatchNumber?: string;
  onClose: () => void;
  onSelectBatch: (batch: BatchItem, qty: number) => void;
}

export const SelectBatchModal: React.FC<SelectBatchModalProps> = ({
  isOpen,
  productName,
  batches,
  selectedBatchNumber,
  onClose,
  onSelectBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [chosenBatchId, setChosenBatchId] = useState<string>(
    batches.find((b) => b.batchNumber === selectedBatchNumber)?.id || batches[0]?.id || ''
  );
  const [qty, setQty] = useState<number>(1);

  if (!isOpen) return null;

  const filteredBatches = batches.filter((b) =>
    b.batchNumber.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const activeBatch = batches.find((b) => b.id === chosenBatchId);

  const handleConfirm = () => {
    if (!activeBatch) return;
    onSelectBatch(activeBatch, qty);
    onClose();
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-box" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div className="custom-modal-header">
          <div>
            <h3>Chọn lô, hạn sử dụng</h3>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Sản phẩm: <b>{productName}</b>
            </div>
          </div>
          <button type="button" className="custom-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Ô tìm kiếm lô */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="filter-input"
              placeholder="🔍 Tìm lô, hạn sử dụng..."
              style={{ paddingLeft: 36 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          </div>

          {/* Danh sách các lô */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {filteredBatches.map((b) => {
              const isSelected = b.id === chosenBatchId;
              const isExpired = b.isExpired;

              return (
                <div
                  key={b.id}
                  onClick={() => {
                    if (!isExpired) {
                      setChosenBatchId(b.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: isSelected ? '2px solid #0F766E' : '1px solid #e2e8f0',
                    backgroundColor: isExpired ? '#fef2f2' : isSelected ? '#f0fdfa' : '#ffffff',
                    cursor: isExpired ? 'not-allowed' : 'pointer',
                    opacity: isExpired ? 0.65 : 1,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: isExpired ? '#dc2626' : '#0f172a' }}>
                        {b.batchNumber}
                      </span>
                      <span style={{ fontSize: 12.5, color: '#64748b' }}>
                        - HSD: <b>{b.expiryDate}</b>
                      </span>
                      {isExpired && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            color: '#dc2626',
                            fontWeight: 700,
                            background: '#fee2e2',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          <AlertTriangle size={12} /> Đã hết hạn
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                      Tồn kho khả dụng: <b>{b.onHand}</b>
                    </div>
                  </div>

                  {isSelected && !isExpired && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#0F766E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} />
                    </div>
                  )}
                </div>
              );
            })}

            {filteredBatches.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>
                Không tìm thấy số lô phù hợp.
              </div>
            )}
          </div>

          {/* Chọn số lượng xuất của lô */}
          {activeBatch && !activeBatch.isExpired && (
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                Số lượng xuất từ lô này:
              </span>
              <input
                type="number"
                className="filter-input"
                style={{ width: 100, textAlign: 'center' }}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(activeBatch.onHand, Number(e.target.value))))}
                min={1}
                max={activeBatch.onHand}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="custom-modal-footer">
          <button type="button" className="btn-secondary-white" onClick={onClose}>
            Bỏ qua
          </button>
          <button
            type="button"
            className="btn-primary-teal"
            disabled={!activeBatch || activeBatch.isExpired}
            onClick={handleConfirm}
          >
            Xác nhận chọn lô
          </button>
        </div>
      </div>
    </div>
  );
};
