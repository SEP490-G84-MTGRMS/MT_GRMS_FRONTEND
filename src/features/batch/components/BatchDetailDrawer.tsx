import { useState } from 'react';
import type { FC } from 'react';
import {
  X,
  MapPin,
  Trash2,
  Tag,
  FileText,
  Calendar,
  Check,
  Building2,
  Clock,
} from 'lucide-react';
import type { BatchItem } from '../types/batch.types';

interface BatchDetailDrawerProps {
  isOpen: boolean;
  batch: BatchItem | null;
  onClose: () => void;
  onUpdateLocation: (batchId: string, newLocation: string) => void;
  onDiscountClick: (batch: BatchItem) => void;
  onWriteOffClick: (batch: BatchItem) => void;
  onViewGrn: (grnNo: string) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
};

export const BatchDetailDrawer: FC<BatchDetailDrawerProps> = ({
  isOpen,
  batch,
  onClose,
  onUpdateLocation,
  onDiscountClick,
  onWriteOffClick,
  onViewGrn,
}) => {
  const [isEditingLoc, setIsEditingLoc] = useState(false);
  const [locInput, setLocInput] = useState('');

  if (!isOpen || !batch) return null;

  const handleStartEditLoc = () => {
    setLocInput(batch.shelfLocation);
    setIsEditingLoc(true);
  };

  const handleSaveLoc = () => {
    if (locInput.trim()) {
      onUpdateLocation(batch.id, locInput.trim());
    }
    setIsEditingLoc(false);
  };

  const renderBadge = () => {
    switch (batch.status) {
      case 'Expired':
        return (
          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, backgroundColor: '#ffe4e6', color: '#be123c', border: '1px solid #fecdd3' }}>
            ☠️ Expired (Quá hạn)
          </span>
        );
      case 'Critical':
        return (
          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
            🚨 Critical (Khẩn cấp)
          </span>
        );
      case 'Warning':
        return (
          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            ⚠️ Warning (Cận date)
          </span>
        );
      case 'Normal':
        return (
          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
            ✅ Normal (An toàn)
          </span>
        );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(2px)',
        transition: 'opacity 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {batch.productName}
              </span>
              {renderBadge()}
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
              Mã Lô: <b style={{ fontFamily: 'monospace', color: '#0f172a' }}>{batch.batchCode}</b> • SKU: <b>{batch.sku}</b> • Chi nhánh: <b>{batch.branchName}</b>
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
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Content Scroll Area ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Quick Info Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* Box 1: Thông tin Hạn sử dụng & Master */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: 6,
                }}
              >
                <Calendar size={14} color="#0d9488" />
                <span>Thông tin Lô & Hạn sử dụng</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Nhà cung cấp:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{batch.supplierName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Ngày sản xuất (NSX):</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{batch.mfgDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Hạn sử dụng (HSD):</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{batch.expiryDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Số ngày còn lại:</span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: batch.daysLeft < 0 ? '#e11d48' : batch.daysLeft <= 3 ? '#d97706' : '#0d9488',
                    }}
                  >
                    {batch.daysLeft} ngày
                  </span>
                </div>
                {batch.discountPercent && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#eff6ff', padding: '4px 6px', borderRadius: 4 }}>
                    <span style={{ color: '#1d4ed8', fontWeight: 600 }}>Chiết khấu FEFO:</span>
                    <span style={{ fontWeight: 800, color: '#1d4ed8' }}>-{batch.discountPercent}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Tồn kho & Vị trí quầy kệ */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: 6,
                }}
              >
                <Building2 size={14} color="#0d9488" />
                <span>Tồn kho & Vị trí quầy kệ</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Số lượng nhập gốc:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{batch.qtyInitial} {batch.unit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Tồn kho thực tế:</span>
                  <span style={{ fontWeight: 800, color: '#0d9488', fontSize: 13.5 }}>
                    {batch.qtyCurrent} {batch.unit}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Đơn giá vốn:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(batch.costPrice)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Tổng giá trị lô:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                    {formatCurrency(batch.totalValuation)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Vị trí lưu kho:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {batch.zoneArea} ({batch.shelfLocation})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            {isEditingLoc ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <input
                  type="text"
                  value={locInput}
                  onChange={(e) => setLocInput(e.target.value)}
                  placeholder="Nhập mã vị trí kệ mới (vd: C-B-05)..."
                  style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 5,
                    border: '1px solid #0d9488',
                    fontSize: 12.5,
                    outline: 'none',
                    flex: 1,
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveLoc}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 5,
                    border: 'none',
                    backgroundColor: '#0d9488',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Check size={14} />
                  <span>Lưu vị trí</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartEditLoc}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <MapPin size={13} color="#0d9488" />
                <span>Sửa vị trí kệ: {batch.shelfLocation}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onViewGrn(batch.originalGrnNo)}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0d9488',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Xem lại phiếu nhập kho gốc"
            >
              <FileText size={13} />
              <span>Xem GRN gốc: {batch.originalGrnNo}</span>
            </button>

            {batch.status !== 'Expired' && (
              <button
                type="button"
                onClick={() => onDiscountClick(batch)}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Tag size={13} />
                <span>Giảm giá FEFO</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onWriteOffClick(batch)}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                marginLeft: 'auto',
              }}
            >
              <Trash2 size={13} />
              <span>Xuất hủy (FE-06)</span>
            </button>
          </div>

          {/* Lịch sử di chuyển hàng của Lô (Movement History) */}
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Clock size={14} color="#0d9488" />
              <span>Lịch sử luân chuyển lượt hàng (Lot Movement Ledger)</span>
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', width: '22%' }}>Thời gian</th>
                    <th style={{ padding: '8px 10px', width: '25%' }}>Loại giao dịch</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '15%' }}>Số lượng</th>
                    <th style={{ padding: '8px 10px', width: '20%' }}>Mã chứng từ</th>
                    <th style={{ padding: '8px 10px', width: '18%' }}>Người thực hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px 10px', textAlign: 'center', color: '#94a3b8' }}>
                        Chưa ghi nhận biến động bổ sung ngoài phiếu nhập khởi tạo ban đầu.
                      </td>
                    </tr>
                  ) : (
                    batch.movements.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{m.timestamp}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                          <span
                            style={{
                              color:
                                m.type === 'RECEIPT'
                                  ? '#15803d'
                                  : m.type === 'POS_SALE'
                                  ? '#1d4ed8'
                                  : '#d97706',
                            }}
                          >
                            {m.typeLabel}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: m.quantity > 0 ? '#15803d' : '#dc2626',
                          }}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#0d9488' }}>
                          {m.documentCode}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{m.actor}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
