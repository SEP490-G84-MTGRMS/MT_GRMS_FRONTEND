import type { FC } from 'react';
import type { SupplierSummary } from '../types/supplier.types';
import { SupplierCategoryBadge, SupplierStatusBadge } from './SupplierStatusBadge';
import { CreditCard, Edit3, Eye } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  onViewDetail: (supplier: SupplierSummary) => void;
  onEdit: (supplier: SupplierSummary) => void;
  onPayDebt: (supplier: SupplierSummary) => void;
}

export const SupplierTableRow: FC<Props> = ({
  supplier,
  onViewDetail,
  onEdit,
  onPayDebt,
}) => {
  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <tr
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
        transition: 'background-color 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
      }}
    >

      {/* Mã NCC */}
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 700,
            color: '#0f766e',
            backgroundColor: '#f0fdfa',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid #ccfbf1',
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          {supplier.code}
        </span>
      </td>

      {/* Tên NCC */}
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.35 }}>
          {supplier.name}
        </div>
        {supplier.tradeName && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
            ({supplier.tradeName})
          </div>
        )}
      </td>

      {/* Phân loại */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
        <SupplierCategoryBadge category={supplier.category} />
      </td>

      {/* Người liên hệ */}
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, color: '#1e293b', lineHeight: 1.3 }}>
          {supplier.contactPerson}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          {supplier.phone}
        </div>
      </td>

      {/* Hạn nợ */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>
          {supplier.paymentTermDays === 0 ? 'Tiền mặt' : `${supplier.paymentTermDays} ngày`}
        </span>
      </td>

      {/* Đang nợ */}
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap', fontSize: 12.5, borderBottom: '1px solid #f1f5f9' }}>
        {supplier.currentDebt > 0 ? (
          <b style={{ color: '#0f172a' }}>{fmt(supplier.currentDebt)}</b>
        ) : (
          <span style={{ color: '#94a3b8' }}>0 đ</span>
        )}
      </td>

      {/* Quá hạn */}
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap', fontSize: 12.5, borderBottom: '1px solid #f1f5f9' }}>
        {supplier.overdueDebt > 0 ? (
          <b style={{ color: '#dc2626' }}>{fmt(supplier.overdueDebt)}</b>
        ) : (
          <span style={{ color: '#94a3b8' }}>--</span>
        )}
      </td>

      {/* Trạng thái */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
        <SupplierStatusBadge status={supplier.status} />
      </td>

      {/* Thao tác */}
      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          {supplier.currentDebt > 0 && (
            <button
              type="button"
              onClick={() => onPayDebt(supplier)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 8px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#b45309',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fef3c7';
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fffbeb';
                e.currentTarget.style.borderColor = '#fde68a';
              }}
              title="Lập phiếu chi trả nợ"
            >
              <CreditCard size={12} />
              <span>Trả</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(supplier)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              fontSize: 12,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0284c7';
              e.currentTarget.style.color = '#0284c7';
              e.currentTarget.style.backgroundColor = '#f0f9ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
            title="Chỉnh sửa thông tin nhà cung cấp"
          >
            <Edit3 size={12} />
          </button>

          <button
            type="button"
            onClick={() => onViewDetail(supplier)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 28,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f766e';
              e.currentTarget.style.color = '#0f766e';
              e.currentTarget.style.backgroundColor = '#f0fdfa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#334155';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
            title="Xem chi tiết nhà cung cấp"
          >
            <Eye size={12} />
            <span>Chi tiết</span>
          </button>
        </div>
      </td>
    </tr>
  );
};
