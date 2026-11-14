import type { FC } from 'react';
import {
  X,
  FileText,
  Calendar,
  Building2,
  ClipboardCheck,
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
  onStocktakeClick?: (batch: BatchItem) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
};

export const BatchDetailDrawer: FC<BatchDetailDrawerProps> = ({
  isOpen,
  batch,
  onClose,
  onUpdateLocation: _onUpdateLocation,
  onDiscountClick: _onDiscountClick,
  onWriteOffClick: _onWriteOffClick,
  onViewGrn,
  onStocktakeClick,
}) => {
  if (!isOpen || !batch) return null;

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
                      color:
                        batch.daysLeft >= 9999 || batch.expiryDate === '—'
                          ? '#94a3b8'
                          : batch.daysLeft < 0
                          ? '#e11d48'
                          : batch.daysLeft <= 3
                          ? '#d97706'
                          : '#0d9488',
                    }}
                  >
                    {batch.daysLeft >= 9999 || batch.expiryDate === '—' ? '—' : `${batch.daysLeft} ngày`}
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
                  <span style={{ color: '#64748b' }}>Khả dụng / Cách ly / Giữ trả:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                    <span style={{ color: '#15803d' }}>{batch.qtyAvailable}</span>
                    {' / '}
                    <span style={{ color: '#d97706' }}>{batch.qtyQuarantined || 0}</span>
                    {' / '}
                    <span style={{ color: '#2563eb' }}>{batch.qtyReserved || 0}</span>
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

          {/* Action Toolbar — ẩn sửa kệ / markdown / xuất hủy stub */}
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

            {onStocktakeClick && (
              <button
                type="button"
                onClick={() => onStocktakeClick(batch)}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #0d9488',
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <ClipboardCheck size={13} />
                <span>
                  {batch.status === 'Expired' || batch.status === 'Critical'
                    ? 'Kiểm kê / xuất hủy'
                    : 'Kiểm kê lô này'}
                </span>
              </button>
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 12.5, color: '#64748b' }}>
            Chưa hỗ trợ thẻ kho / lịch sử luân chuyển lô.
          </div>
        </div>
      </div>
    </div>
  );
};
