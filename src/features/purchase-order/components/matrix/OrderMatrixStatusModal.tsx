import type { FC } from 'react';
import type { GeneratedPO } from '../../types/po.types';
import { X, CheckCircle, Calendar, Package } from 'lucide-react';

interface OrderMatrixStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedPOs: GeneratedPO[];
  supplierName: string;
  branchName: string;
}

export const OrderMatrixStatusModal: FC<OrderMatrixStatusModalProps> = ({
  isOpen,
  onClose,
  generatedPOs,
  supplierName,
  branchName,
}) => {
  if (!isOpen) return null;

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
  const totalAmount = generatedPOs.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalQty = generatedPOs.reduce((sum, p) => sum + p.totalQuantity, 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.16)',
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-light)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-soft-blue)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: 'var(--green-light)',
                color: 'var(--green-money)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                Bóc Tách &amp; Phát Hành PO Thành Công
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Hệ thống đã tự động quét ma trận và bóc tách thành <b>{generatedPOs.length} đơn PO độc lập</b>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: 16,
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Nhà cung cấp:</span>{' '}
              <b>{supplierName === 'ALL' ? 'Tất cả nhà cung cấp' : supplierName}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Chi nhánh nhận:</span>{' '}
              <b>{branchName}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Tổng số lượng đặt:</span>{' '}
              <b style={{ fontFamily: 'var(--font-mono)' }}>{fmt(totalQty)}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Tổng giá trị phát hành:</span>{' '}
              <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue-primary)' }}>{fmt(totalAmount)} đ</b>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
              Danh sách các phiếu PO đã tạo theo ngày giao (1 PO = 1 NCC + 1 Chi nhánh + 1 Ngày giao):
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {generatedPOs.map((po, idx) => (
                <div
                  key={po.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: 'var(--bg-soft-blue)',
                        color: 'var(--blue-primary)',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-main)' }}>
                        {po.orderCode}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 2 }}>
                        <span>
                          <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                          Ngày giao: <b>{po.deliveryDate}</b>
                        </span>
                        <span>
                          <Package size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                          Số mặt hàng: <b>{po.itemCount}</b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue-primary)', fontSize: 13.5 }}>
                      {fmt(po.totalAmount)} đ
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: po.status === 'APPROVED' ? 'var(--green-light)' : '#fef9c3',
                        color: po.status === 'APPROVED' ? 'var(--green-money)' : '#854d0e',
                        marginTop: 3,
                      }}
                    >
                      ● {po.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="po-btn po-btn-primary"
            style={{ height: 36, padding: '0 20px' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
