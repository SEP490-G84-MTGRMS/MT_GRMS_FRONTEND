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
      <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 600,
            color: '#334155',
            fontSize: 11,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            lineHeight: 1.35,
            display: 'inline-block',
            maxWidth: '100%',
          }}
        >
          {supplier.code}
        </span>
      </td>

      <td className="so-list-td--wrap">
        <div className="so-list-name">{supplier.name}</div>
        {supplier.tradeName && supplier.tradeName !== supplier.name && (
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 1, lineHeight: 1.3 }}>
            ({supplier.tradeName})
          </div>
        )}
      </td>

      <td
        style={{
          padding: '5px 6px',
          borderBottom: '1px solid #f1f5f9',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 11,
          color: supplier.taxCode ? '#334155' : '#94a3b8',
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          lineHeight: 1.35,
        }}
      >
        {supplier.taxCode || '—'}
      </td>

      <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9' }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 11,
            color: '#1e293b',
            lineHeight: 1.35,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {supplier.contactPerson || '—'}
        </div>
      </td>

      <td
        style={{
          padding: '5px 6px',
          borderBottom: '1px solid #f1f5f9',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 11,
          color: '#334155',
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          lineHeight: 1.35,
        }}
      >
        {supplier.phone || '—'}
      </td>

      <td
        className="so-list-td--wrap"
        style={{
          padding: '5px 6px',
          borderBottom: '1px solid #f1f5f9',
          verticalAlign: 'top',
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: supplier.address ? '#334155' : '#94a3b8',
            lineHeight: 1.35,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {supplier.address || '—'}
        </div>
      </td>

      <td
        className="so-list-td--status"
        style={{
          padding: '5px 6px',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          borderBottom: '1px solid #f1f5f9',
          verticalAlign: 'middle',
        }}
      >
        <SupplierStatusBadge status={supplier.status} />
      </td>

      <td
        className="so-list-td--actions"
        style={{
          padding: '5px 6px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          borderBottom: '1px solid #f1f5f9',
          verticalAlign: 'middle',
        }}
      >
        <div className="so-list-actions" style={{ justifyContent: 'center' }}>
          {canEdit && (
            <button
              type="button"
              className="so-list-action-btn so-list-action-btn--icon"
              onClick={() => onEdit(supplier)}
              title="Chỉnh sửa thông tin nhà cung cấp"
            >
              <Edit3 size={11} />
            </button>
          )}

          <button
            type="button"
            className="so-list-action-btn"
            onClick={() => onViewDetail(supplier)}
            title="Xem chi tiết nhà cung cấp"
          >
            <Eye size={11} />
            <span>Chi tiết</span>
          </button>
        </div>
      </td>
    </tr>
  );
};
