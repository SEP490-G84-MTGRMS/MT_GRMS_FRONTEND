import type { FC } from 'react';
import type { SupplierSummary } from '../types/supplier.types';
import { SupplierCategoryBadge, SupplierStatusBadge } from './SupplierStatusBadge';
import { CreditCard, Eye, Edit3 } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  onViewDetail: (supplier: SupplierSummary) => void;
  onEdit: (supplier: SupplierSummary) => void;
  onPayDebt: (supplier: SupplierSummary) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const SupplierTableRow: FC<Props> = ({
  supplier,
  onViewDetail,
  onEdit,
  onPayDebt,
  isSelected = false,
  onToggleSelect,
}) => {
  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <tr>
      {/* Checkbox */}
      <td style={{ textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(supplier.id)}
        />
      </td>

      {/* Mã NCC */}
      <td>
        <span
          className="admin-subdomain-tag"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {supplier.code}
        </span>
      </td>

      {/* Tên NCC */}
      <td>
        <b style={{ display: 'block', lineHeight: 1.3 }}>{supplier.name}</b>
        {supplier.tradeName && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            ({supplier.tradeName})
          </div>
        )}
      </td>


      {/* Phân loại */}
      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
        <SupplierCategoryBadge category={supplier.category} />
      </td>

      {/* Người liên hệ */}
      <td>
        <div style={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1.3 }}>{supplier.contactPerson}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {supplier.phone}
        </div>
      </td>

      {/* Hạn nợ */}
      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span
          className="admin-badge"
          style={{ background: 'var(--bg-soft-blue)', color: 'var(--blue-primary)', border: '1px solid var(--blue-border)', fontSize: 11, padding: '2px 7px' }}
        >
          {supplier.paymentTermDays === 0 ? 'Tiền mặt' : `${supplier.paymentTermDays}d`}
        </span>
      </td>

      {/* Đang nợ */}
      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', fontSize: 12 }}>
        {supplier.currentDebt > 0 ? (
          <b style={{ color: '#111827' }}>{fmt(supplier.currentDebt)}</b>
        ) : (
          <span style={{ color: 'var(--text-faint)' }}>0 đ</span>
        )}
      </td>

      {/* Quá hạn */}
      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', fontSize: 12 }}>
        {supplier.overdueDebt > 0 ? (
          <b style={{ color: 'var(--red-accent)' }}>{fmt(supplier.overdueDebt)}</b>
        ) : (
          <span style={{ color: 'var(--text-faint)' }}>--</span>
        )}
      </td>

      {/* Trạng thái */}
      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
        <SupplierStatusBadge status={supplier.status} />
      </td>

      {/* Thao tác */}
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          {supplier.currentDebt > 0 && (
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-success"
              style={{ padding: '3px 6px', fontSize: 11 }}
              onClick={() => onPayDebt(supplier)}
              title="Lập phiếu chi trả nợ"
            >
              <CreditCard size={12} />
              <span>Trả</span>
            </button>
          )}

          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-secondary"
            style={{ padding: '3px 6px', fontSize: 11 }}
            onClick={() => onEdit(supplier)}
            title="Chỉnh sửa thông tin"
          >
            <Edit3 size={12} />
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-primary"
            style={{ padding: '3px 7px', fontSize: 11 }}
            onClick={() => onViewDetail(supplier)}
            title="Xem chi tiết"
          >
            <Eye size={12} />
            <span>Chi tiết</span>
          </button>
        </div>
      </td>
    </tr>
  );
};
