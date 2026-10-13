import type { FC } from 'react';
import type { SupplierSummary, PurchaseOrderItem } from '../../types/supplier.types';
import { History } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  purchaseOrders: PurchaseOrderItem[];
}

const PO_STATUS_LABEL: Record<PurchaseOrderItem['status'], { text: string; bg: string; color: string; border: string }> = {
  PENDING: { text: 'Chờ duyệt', bg: '#fff8eb', color: '#b45309', border: '#fcd34d' },
  CONFIRMED: { text: 'Đã xác nhận', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  PARTIALLY_RECEIVED: { text: 'Đã nhận một phần', bg: '#fff8eb', color: '#d97706', border: '#fcd34d' },
  COMPLETED: { text: 'Hoàn tất', bg: '#e8f9ee', color: '#047857', border: '#a7f3d0' },
  CANCELLED: { text: 'Đã hủy', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};

export const SupplierHistoryTab: FC<Props> = ({ supplier, purchaseOrders }) => {
  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="supplier-detail-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--blue-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--blue-primary)',
          }}>
            <History size={20} />
          </div>
          <div>
            <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              Lịch Sử Giao Dịch & Đơn Mua Hàng ({purchaseOrders.length})
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Nhật ký toàn bộ các đơn mua hàng (Purchase Orders) phát sinh với NCC {supplier.name}.
            </div>
          </div>
        </div>

        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 150 }}>Mã Đơn PO</th>
                <th style={{ width: 120 }}>Ngày đặt</th>
                <th style={{ width: 120 }}>Ngày giao</th>
                <th>Chi nhánh nhận</th>
                <th style={{ width: 140, textAlign: 'right' }}>Giá trị đơn</th>
                <th style={{ width: 140, textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map((po) => {
                  const badgeStyle = PO_STATUS_LABEL[po.status] || PO_STATUS_LABEL.COMPLETED;
                  return (
                    <tr key={po.id}>
                      <td>
                        <span className="admin-subdomain-tag" style={{ fontFamily: 'var(--font-mono)' }}>
                          {po.code}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{po.orderDate}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{po.deliveryDate || '—'}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{po.branchName}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#111827' }}>
                        {fmt(po.totalAmount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className="admin-badge"
                          style={{
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                            padding: '3px 10px',
                            fontSize: 11.5,
                          }}
                        >
                          {badgeStyle.text}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Chưa có đơn hàng nào được ghi nhận.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
