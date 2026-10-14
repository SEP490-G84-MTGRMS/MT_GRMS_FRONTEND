import React, { useState } from 'react';
import { X, Search, Check, Save } from 'lucide-react';
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
  batches,
  selectedBatchNumber,
  onClose,
  onSelectBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Default sample batches if not provided or empty (khớp đúng 4 dòng mẫu trong Ảnh 4: Select batch)
  const defaultBatches: BatchItem[] = [
    {
      id: 'b-1',
      batchNumber: 'SX010525',
      expiryDate: '01/10/2025',
      onHand: 0.083,
      isExpired: true,
    },
    {
      id: 'b-2',
      batchNumber: 'SX010825',
      expiryDate: '31/01/2026',
      onHand: 2,
      isExpired: false,
    },
    {
      id: 'b-3',
      batchNumber: 'SX010925',
      expiryDate: '02/03/2026',
      onHand: 10,
      isExpired: false,
    },
    {
      id: 'b-4',
      batchNumber: 'SX011025',
      expiryDate: '31/03/2026',
      onHand: 20,
      isExpired: false,
    },
  ];

  const sourceBatches = batches && batches.length > 0 ? batches : defaultBatches;

  // Selected batch and quantities map
  const [chosenBatchId, setChosenBatchId] = useState<string>(
    sourceBatches.find((b) => b.batchNumber === selectedBatchNumber)?.id || 'b-3'
  );

  const [quantities, setQuantities] = useState<Record<string, number>>({
    'b-1': 0,
    'b-2': 0,
    'b-3': 10,
    'b-4': 0,
  });

  if (!isOpen) return null;

  const filteredBatches = sourceBatches.filter((b) =>
    b.batchNumber.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
    b.expiryDate.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleUpdateBatchQty = (batchId: string, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [batchId]: Math.max(0, val),
    }));
    setChosenBatchId(batchId);
  };

  const handleConfirm = () => {
    const active = sourceBatches.find((b) => b.id === chosenBatchId);
    if (!active || active.isExpired) return;
    const qty = quantities[active.id] || 1;
    onSelectBatch(active, qty);
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
              placeholder="🔍 Tìm lô, hạn sử dụng"
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
              const isExpired = b.isExpired;
              const qty = quantities[b.id] ?? 0;

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
                      {b.batchNumber} - {b.expiryDate} - Tồn: {b.onHand}
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
            style={{ padding: '5px 16px', borderRadius: 4, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={14} /> Lưu
          </button>
        </div>
      </div>
    </div>
  );
};
