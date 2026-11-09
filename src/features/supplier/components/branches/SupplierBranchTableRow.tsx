import type { FC } from 'react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';
import { SupplierStatusBadge } from '../SupplierStatusBadge';
import { Pencil } from 'lucide-react';

interface SupplierBranchTableRowProps {
  item: SupplierBranchAssignmentItem;
  onEdit: (item: SupplierBranchAssignmentItem) => void;
}

export const SupplierBranchTableRow: FC<SupplierBranchTableRowProps> = ({ item, onEdit }) => {
  return (
    <tr
      className="so-list-row"
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
        opacity: item.status === 'Inactive' ? 0.75 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
      }}
    >
      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 700,
            color: '#0f766e',
            backgroundColor: '#f0fdfa',
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #ccfbf1',
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          {item.branchCode}
        </span>
      </td>

      <td className="so-list-td--wrap">
        <div
          className="so-list-name"
          title={item.branchAddress ? `${item.branchName} (${item.branchAddress})` : item.branchName}
        >
          {item.branchName}
        </div>
      </td>

      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 700,
            color: '#0f766e',
            backgroundColor: '#f0fdfa',
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #ccfbf1',
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          {item.supplierCode}
        </span>
      </td>

      <td className="so-list-td--wrap">
        <div className="so-list-name" title={item.supplierName}>
          {item.supplierName}
        </div>
      </td>

      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
        <span
          title={item.deliveryDaysDisplay || '—'}
          style={{
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 12,
            fontWeight: 600,
            color: '#0f766e',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {item.deliveryDaysDisplay || '—'}
        </span>
      </td>

      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', textAlign: 'center' }}>
        <SupplierStatusBadge status={item.status} />
      </td>

      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          type="button"
          className="so-list-action-btn"
          onClick={() => onEdit(item)}
          title={`Chỉnh sửa phân bổ ${item.supplierName} tại ${item.branchName}`}
        >
          <Pencil size={13} color="#0f766e" />
          <span>Chỉnh sửa</span>
        </button>
      </td>
    </tr>
  );
};
