import type { FC } from 'react';
import type { SupplierSummary } from '../types/supplier.types';
import { SupplierStatusBadge } from './SupplierStatusBadge';
import { Edit3, Eye } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  onViewDetail: (supplier: SupplierSummary) => void;
  onEdit: (supplier: SupplierSummary) => void;
  canEdit?: boolean;
}

export const SupplierTableRow: FC<Props> = ({
  supplier,
  onViewDetail,
  onEdit,
  canEdit = true,
}) => {
  return (
    <tr
      className="so-list-row"
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
      }}
    >
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

      <td className="so-list-td--wrap">
        <div className="so-list-name">
          {supplier.name}
        </div>
        {supplier.tradeName && supplier.tradeName !== supplier.name && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
            ({supplier.tradeName})
          </div>
        )}
      </td>

      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, color: '#1e293b', lineHeight: 1.3 }}>
          {supplier.contactPerson || '—'}
        </div>
      </td>

      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5, color: '#334155' }}>
        {supplier.phone || '—'}
      </td>

      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
        <SupplierStatusBadge status={supplier.status} />
      </td>

      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
        <div className="so-list-actions">
          {canEdit && (
            <button
              type="button"
              className="so-list-action-btn so-list-action-btn--icon"
              onClick={() => onEdit(supplier)}
              title="Chỉnh sửa thông tin nhà cung cấp"
            >
              <Edit3 size={12} />
            </button>
          )}

          <button
            type="button"
            className="so-list-action-btn"
            onClick={() => onViewDetail(supplier)}
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
