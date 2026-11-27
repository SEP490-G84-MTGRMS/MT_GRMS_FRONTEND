import React, { useState } from 'react';
import { X, Search, Check, Save } from 'lucide-react';
import type { BatchItem } from '../types';
import { formatDateVN, isBatchExpired } from '../utils/transferDate';

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
  batches,
  selectedBatchNumber,
  onClose,
  onSelectBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const sourceBatches = batches.map((b) => ({
    ...b,
    isExpired: Boolean(b.isExpired || isBatchExpired(b.expiryDate)),
  }));

  const defaultBatch =
    sourceBatches.find((b) => b.batchNumber === selectedBatchNumber && !b.isExpired) ||
    sourceBatches.find((b) => !b.isExpired && b.onHand > 0) ||
    sourceBatches[0];

  const [chosenBatchId, setChosenBatchId] = useState<string>(defaultBatch?.id || '');

  const [quantities, setQuantities] = useState<Record<string, number>>({
    ...(defaultBatch && !defaultBatch.isExpired ? { [defaultBatch.id]: Math.min(1, defaultBatch.onHand) } : {}),
  });

  if (!isOpen) return null;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBatches = sourceBatches.filter((b) =>
    b.batchNumber.toLowerCase().includes(normalizedSearch) ||
    b.expiryDate.toLowerCase().includes(normalizedSearch) ||
    formatDateVN(b.expiryDate, '').toLowerCase().includes(normalizedSearch)
  );

  const handleUpdateBatchQty = (batchId: string, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [batchId]: Math.max(0, val),
    }));
    setChosenBatchId(batchId);
  };

  const activeBatch = sourceBatches.find((b) => b.id === chosenBatchId);

  const handleConfirm = () => {
    if (!activeBatch || activeBatch.isExpired) return;
    const qty = quantities[activeBatch.id] || 0;
    if (qty <= 0 || qty > activeBatch.onHand) return;
    onSelectBatch(activeBatch, qty);
    onClose();
  };

  return (
    <div className="custom-modal-backdrop" style={{ zIndex: 1200 }}>
      <div
        className="custom-modal-box"
        style={{
          maxWidth: 520,
          borderRadius: 16,
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header: Chọn lô, hạn sử dụng & nút [x] */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Chọn lô, hạn sử dụng
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              padding: '2px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} color="#334155" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Ô tìm kiếm lô */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: 32, borderRadius: 6, fontSize: 13 }}
              placeholder="Tìm lô, hạn sử dụng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
          </div>

          {/* Bảng danh sách các dòng lô */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {filteredBatches.map((b) => {
              const isSelected = b.id === chosenBatchId;
              const isExpired = Boolean(b.isExpired);
              const qty = quantities[b.id] ?? 0;
              const formattedExpiry = formatDateVN(b.expiryDate, 'Không HSD');

              return (
                <div
                  key={b.id}
                  onClick={() => {
                    if (!isExpired) {
                      setChosenBatchId(b.id);
                      setQuantities((prev) => ({
                        ...prev,
                        [b.id]: prev[b.id] && prev[b.id] > 0 ? prev[b.id] : Math.min(1, b.onHand),
                      }));
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isSelected && !isExpired ? '#eff6ff' : '#ffffff',
                    cursor: isExpired ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {/* Thông tin lô: Tên - HSD - Tồn */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: isExpired ? '#ef4444' : isSelected ? '#1d4ed8' : '#0f172a',
                      }}
                    >
                      {b.batchNumber || '(Không mã lô)'} - HSD: {formattedExpiry} - Tồn: {b.onHand}
                    </span>

                    {isExpired && (
                      <span style={{ fontSize: 11.5, color: '#ef4444', fontStyle: 'italic', fontWeight: 500 }}>
                        (Đã hết hạn)
                      </span>
                    )}

                    {isSelected && !isExpired && (
                      <Check size={14} color="#1d4ed8" style={{ strokeWidth: 3 }} />
                    )}
                  </div>

                  {/* Ô nhập số lượng */}
                  <div style={{ width: 65 }}>
                    <input
                      type="number"
                      className="filter-input"
                      disabled={isExpired}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '3px 6px',
                        fontSize: 13,
                        borderRadius: 4,
                        border: '1px solid #cbd5e1',
                        backgroundColor: isExpired ? '#f1f5f9' : '#ffffff',
                      }}
                      value={qty}
                      onChange={(e) => handleUpdateBatchQty(b.id, Number(e.target.value))}
                      min={0}
                      max={b.onHand}
                    />
                  </div>
                </div>
              );
            })}

            {filteredBatches.length === 0 && (
              <div style={{ padding: 18, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Không tìm thấy lô phù hợp.
              </div>
            )}
          </div>
        </div>

        {/* Footer: Bỏ qua & Lưu */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            className="btn-secondary-white"
            onClick={onClose}
            style={{ padding: '5px 14px', borderRadius: 4, fontSize: 13 }}
          >
            Bỏ qua
          </button>

          <button
            type="button"
            className="btn-primary-teal"
            onClick={handleConfirm}
            disabled={
              !activeBatch ||
              Boolean(activeBatch.isExpired) ||
              (quantities[activeBatch.id] ?? 0) <= 0 ||
              (quantities[activeBatch.id] ?? 0) > activeBatch.onHand
            }
            style={{ padding: '5px 16px', borderRadius: 4, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={14} /> Lưu
          </button>
        </div>
      </div>
    </div>
  );
};
