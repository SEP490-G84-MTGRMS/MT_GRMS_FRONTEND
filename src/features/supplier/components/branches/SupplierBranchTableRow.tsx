import type { CSSProperties, FC } from 'react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';
import { SupplierStatusBadge } from '../SupplierStatusBadge';
import { Pencil } from 'lucide-react';

interface SupplierBranchTableRowProps {
  item: SupplierBranchAssignmentItem;
  onEdit: (item: SupplierBranchAssignmentItem) => void;
}

const codeChipStyle: CSSProperties = {
  fontFamily: 'var(--font-mono, monospace)',
  fontWeight: 700,
  color: '#0f766e',
  backgroundColor: '#f0fdfa',
  padding: '1px 6px',
  borderRadius: 4,
  border: '1px solid #ccfbf1',
  fontSize: 11,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  lineHeight: 1.35,
  display: 'inline-block',
  maxWidth: '100%',
};

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
      <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
        <span style={codeChipStyle} title={item.branchCode}>
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

      <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
        <span style={codeChipStyle} title={item.supplierCode}>
          {item.supplierCode}
        </span>
      </td>

      <td className="so-list-td--wrap">
        <div className="so-list-name" title={item.supplierName}>
          {item.supplierName}
        </div>
      </td>

      <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
        <span
          title={item.deliveryDaysDisplay || '—'}
          style={{
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 11,
            fontWeight: 600,
            color: '#0f766e',
            fontFamily: 'var(--font-mono, monospace)',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            lineHeight: 1.35,
            display: 'inline-block',
            maxWidth: '100%',
          }}
        >
          {item.deliveryDaysDisplay || '—'}
        </span>
      </td>

      <td
        className="so-list-td--status"
        style={{
          padding: '5px 6px',
          borderBottom: '1px solid #f1f5f9',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          verticalAlign: 'middle',
        }}
      >
        <SupplierStatusBadge status={item.status} />
      </td>

      <td
        className="so-list-td--actions"
        style={{
          padding: '5px 6px',
          borderBottom: '1px solid #f1f5f9',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
        }}
      >
        <div className="so-list-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="so-list-action-btn"
            onClick={() => onEdit(item)}
            title={`Chỉnh sửa phân bổ ${item.supplierName} tại ${item.branchName}`}
          >
            <Pencil size={11} color="#0f766e" />
            <span>Sửa</span>
          </button>
        </div>
      </td>
    </tr>
  );
};
