import type { FC } from 'react';
import { Printer, X } from 'lucide-react';
import type { GrnItemDetail } from '../../types/grn.types';

interface GrnPrintPreviewModalProps {
  isOpen: boolean;
  grnNo: string;
  items: GrnItemDetail[];
  onClose: () => void;
  onPrint: () => void;
}

export const GrnPrintPreviewModal: FC<GrnPrintPreviewModalProps> = ({
  isOpen,
  grnNo,
  items,
  onClose,
  onPrint,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 10,
          width: '100%',
          maxWidth: 640,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#f0fdfa',
            borderBottom: '1px solid #ccfbf1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={18} color="#0d9488" />
            <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0f766e' }}>
              Xem trước tem nhãn mã vạch & Lô hàng ({grnNo})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#0f766e',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content: Tem nhãn mẫu */}
        <div style={{ padding: '16px 20px', maxHeight: 380, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            Hệ thống sinh tem dán kích thước chuẩn (50x30mm) cho <b>{items.length}</b> mặt hàng vừa nhập:
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 6,
                  padding: '10px 12px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 11,
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12, lineHeight: 1.3 }}>
                  {it.productName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>SKU: <b>{it.productCode}</b></span>
                  <span>ĐVT: <b>{it.unit}</b></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f766e', fontWeight: 600 }}>
                  <span>Lô: {it.batchCode || 'N/A'}</span>
                  <span>HSD: {it.expiryDate || 'N/A'}</span>
                </div>
                {/* Mock Barcode Graphic */}
                <div
                  style={{
                    marginTop: 4,
                    height: 24,
                    backgroundColor: '#f1f5f9',
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    letterSpacing: 2,
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  ||||| {it.productCode} |||||
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onPrint}
            style={{
              height: 32,
              padding: '0 18px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Printer size={14} />
            <span>In {items.length} bộ tem</span>
          </button>
        </div>
      </div>
    </div>
  );
};
