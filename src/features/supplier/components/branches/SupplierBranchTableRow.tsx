import type { FC } from 'react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';
import { PauseCircle, CheckCircle2 } from 'lucide-react';

interface SupplierBranchTableRowProps {
  index: number;
  item: SupplierBranchAssignmentItem;
  onToggleStatus: (item: SupplierBranchAssignmentItem) => void;
}

export const SupplierBranchTableRow: FC<SupplierBranchTableRowProps> = ({
  index,
  item,
  onToggleStatus,
}) => {
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

      {/* 2. Mã Cửa Hàng */}
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

      {/* 3. Tên Cửa Hàng */}
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

      {/* 4. Mã NCC */}
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

      {/* 5. Tên NCC */}
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

      {/* 6. Trạng Thái */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          title={item.status === 'Inactive' ? item.inactiveReason : undefined}
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

      {/* 7. Thao Tác */}
      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          type="button"
          onClick={() => onToggleStatus(item)}
          title={
            item.status === 'Active'
              ? `Tạm ngưng phân bổ ${item.supplierName} tại ${item.branchName}`
              : `Kích hoạt phân bổ ${item.supplierName} tại ${item.branchName}`
          }
          style={{
            height: 26,
            padding: '0 10px',
            borderRadius: 4,
            border: item.status === 'Active' ? '1px solid #fde68a' : '1px solid #99f6e4',
            backgroundColor: '#ffffff',
            color: item.status === 'Active' ? '#d97706' : '#0f766e',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              item.status === 'Active' ? '#fffbeb' : '#f0fdfa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          {item.status === 'Active' ? (
            <>
              <PauseCircle size={12} /> Tạm ngưng
            </>
          ) : (
            <>
              <CheckCircle2 size={12} /> Kích hoạt
            </>
          )}
        </button>
      </td>
    </tr>
  );
};
