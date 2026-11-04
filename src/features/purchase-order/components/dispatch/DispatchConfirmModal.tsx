import type { FC } from 'react';
import { X, Send, Truck, Mail, Phone } from 'lucide-react';
import type { SupplierDispatchGroup } from '../../types/po.types';

interface DispatchConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetSuppliers: SupplierDispatchGroup[];
  isBatch?: boolean;
}

export const DispatchConfirmModal: FC<DispatchConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetSuppliers,
  isBatch = false,
}) => {
  if (!isOpen || targetSuppliers.length === 0) return null;

  const totalAmount = targetSuppliers.reduce(
    (sum, sup) => sum + sup.items.reduce((s, it) => s + it.qty * it.price, 0),
    0
  );
  const totalItemsCount = targetSuppliers.reduce(
    (sum, sup) => sum + sup.items.reduce((s, it) => s + it.qty, 0),
    0
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 10,
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={16} color="#0d9488" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {isBatch
                  ? `Xác Nhận Chốt Nhanh & Phát Hành ${targetSuppliers.length} Đơn Mua Hàng (PO)`
                  : `Xác Nhận Chốt Đơn & Tạo PO — ${targetSuppliers[0].name}`}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Vui lòng kiểm tra lại thông tin trước khi phát hành Purchase Order chính thức
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          {/* Summary Box */}
          <div
            style={{
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#0f766e', fontWeight: 600 }}>TỔNG GIÁ TRỊ PHÁT HÀNH</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f766e', marginTop: 2 }}>
                {totalAmount.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#134e4a' }}>
              <div>Số lượng NCC: <strong>{targetSuppliers.length}</strong></div>
              <div>Tổng sản phẩm: <strong>{totalItemsCount} món</strong></div>
            </div>
          </div>

          {/* Supplier List Breakdown */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>
              Chi tiết các đơn đặt hàng sẽ phát hành:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {targetSuppliers.map((sup) => {
                const supTotal = sup.items.reduce((s, it) => s + it.qty * it.price, 0);
                const supQty = sup.items.reduce((s, it) => s + it.qty, 0);

                return (
                  <div
                    key={sup.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '10px 14px',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '1px 6px',
                            background: '#f1f5f9',
                            borderRadius: 4,
                            color: '#475569',
                          }}
                        >
                          {sup.code}
                        </span>
                        <strong style={{ fontSize: 13, color: '#1e293b' }}>{sup.name}</strong>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0d9488' }}>
                        {supTotal.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Truck size={12} color="#0d9488" /> Giao: {sup.expectedDelivery}
                      </span>
                      <span>•</span>
                      <span>{sup.items.length} SKU ({supQty} món)</span>
                      <span>•</span>
                      <span>Cutoff: {sup.cutoffTimeStr}</span>
                    </div>

                    {sup.note && (
                      <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                        Ghi chú: "{sup.note}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispatch Channel Info */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '10px 14px',
              fontSize: 12,
              color: '#475569',
            }}
          >
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
              Kênh phát hành đơn hàng tự động:
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Mail size={13} color="#0d9488" /> Email Nhà Cung Cấp
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={13} color="#0d9488" /> Zalo OA / Tin nhắn B2B
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            background: '#f8fafc',
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
              background: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              height: 34,
              padding: '0 20px',
              borderRadius: 6,
              border: 'none',
              background: '#0d9488',
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
            }}
          >
            <Send size={14} />
            <span>Xác nhận & Phát hành Purchase Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};
