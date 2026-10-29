import type { FC } from 'react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';
import { Trash2 } from 'lucide-react';

interface SupplierBranchTableRowProps {
  index: number;
  item: SupplierBranchAssignmentItem;
  onUnassign: (item: SupplierBranchAssignmentItem) => void;
}

export const SupplierBranchTableRow: FC<SupplierBranchTableRowProps> = ({
  index,
  item,
  onUnassign,
}) => {
  const getSupplierTypeBadge = (type: string) => {
    switch (type) {
      case 'Goods':
        return { label: 'Hàng hóa', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Service':
        return { label: 'Dịch vụ', bg: '#fdf4ff', color: '#a21caf', border: '#f5d0fe' };
      default:
        return { label: 'Hàng & DV', bg: '#f0fdfa', color: '#0f766e', border: '#ccfbf1' };
    }
  };

  const typeBadge = getSupplierTypeBadge(item.supplierType);

  return (
    <tr
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
        transition: 'background-color 0.12s ease',
        opacity: item.status === 'Inactive' ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
      }}
    >
      {/* 1. STT */}
      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
        {index}
      </td>

      {/* 2. Mã NCC */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12,
            fontWeight: 700,
            color: '#0f766e',
          }}
        >
          {item.supplierCode}
        </span>
      </td>

      {/* 3. Tên NCC */}
      <td style={{ padding: '10px 12px', maxWidth: 220 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#0f172a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.supplierName}
        >
          {item.supplierName}
        </div>
      </td>

      {/* 4. Loại NCC */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 10,
            backgroundColor: typeBadge.bg,
            color: typeBadge.color,
            border: `1px solid ${typeBadge.border}`,
          }}
        >
          {typeBadge.label}
        </span>
      </td>

      {/* 5. Mã Cửa Hàng / Chi Nhánh */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 11.5,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 6,
            backgroundColor: '#f0fdfa',
            color: '#0f766e',
            border: '1px solid #99f6e4',
          }}
        >
          {item.branchCode}
        </span>
      </td>

      {/* 6. Tên Cửa Hàng */}
      <td style={{ padding: '10px 12px', maxWidth: 200 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.branchName}
        >
          {item.branchName}
        </div>
      </td>

      {/* 7. Địa Chỉ */}
      <td style={{ padding: '10px 12px', maxWidth: 240 }}>
        <div
          style={{
            fontSize: 12,
            color: '#64748b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.branchAddress}
        >
          {item.branchAddress || '—'}
        </div>
      </td>

      {/* 8. Ngày Gán */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }}>
        {item.assignedAt || '—'}
      </td>

      {/* 9. Trạng Thái */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 12,
            color: item.status === 'Active' ? '#0f766e' : '#64748b',
            backgroundColor: item.status === 'Active' ? '#f0fdfa' : '#f1f5f9',
            border: item.status === 'Active' ? '1px solid #ccfbf1' : '1px solid #e2e8f0',
          }}
        >
          {item.status === 'Active' ? '🟢 Hoạt động' : '⚪ Tạm ngưng'}
        </span>
      </td>

      {/* 10. Thao Tác */}
      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          type="button"
          onClick={() => onUnassign(item)}
          title={`Hủy phân bổ nhà cung cấp ${item.supplierName} khỏi chi nhánh ${item.branchName}`}
          style={{
            height: 26,
            padding: '0 10px',
            borderRadius: 4,
            border: '1px solid #fecaca',
            backgroundColor: '#ffffff',
            color: '#dc2626',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef2f2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          <Trash2 size={12} /> Hủy gán
        </button>
      </td>
    </tr>
  );
};
