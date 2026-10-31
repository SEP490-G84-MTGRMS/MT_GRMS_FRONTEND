import type { FC } from 'react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';
import { SupplierStatusBadge } from '../SupplierStatusBadge';
import { PauseCircle, CheckCircle2 } from 'lucide-react';

interface SupplierBranchTableRowProps {
  item: SupplierBranchAssignmentItem;
  onToggleStatus: (item: SupplierBranchAssignmentItem) => void;
}

export const SupplierBranchTableRow: FC<SupplierBranchTableRowProps> = ({
  item,
  onToggleStatus,
}) => {
  return (
    <tr
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
        transition: 'background-color 0.12s ease',
        opacity: item.status === 'Inactive' ? 0.75 : 1,
        height: '44px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
      }}
    >
      {/* 1. Mã Cửa Hàng */}
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

      {/* 2. Tên Cửa Hàng / Chi Nhánh */}
      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#0f172a',
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.branchAddress ? `${item.branchName} (${item.branchAddress})` : item.branchName}
        >
          {item.branchName}
        </div>
      </td>

      {/* 3. Mã NCC */}
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

      {/* 4. Tên Nhà Cung Cấp */}
      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#0f172a',
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.supplierName}
        >
          {item.supplierName}
        </div>
      </td>

      {/* 5. Trạng Thái (Chuẩn SupplierStatusBadge) */}
      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', textAlign: 'center' }}>
        <SupplierStatusBadge status={item.status} />
      </td>

      {/* 6. Thao Tác */}
      <td style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          type="button"
          onClick={() => onToggleStatus(item)}
          title={
            item.status === 'Active'
              ? `Tạm ngưng phân bổ ${item.supplierName} tại ${item.branchName}`
              : `Kích hoạt phân bổ ${item.supplierName} tại ${item.branchName}`
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            height: 28,
            padding: '0 10px',
            borderRadius: 6,
            border: item.status === 'Active' ? '1px solid #cbd5e1' : '1px solid #99f6e4',
            backgroundColor: '#ffffff',
            color: item.status === 'Active' ? '#475569' : '#0f766e',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = item.status === 'Active' ? '#f8fafc' : '#f0fdfa';
            e.currentTarget.style.borderColor = item.status === 'Active' ? '#94a3b8' : '#0d9488';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = item.status === 'Active' ? '#cbd5e1' : '#99f6e4';
          }}
        >
          {item.status === 'Active' ? (
            <>
              <PauseCircle size={13} color="#64748b" />
              <span>Tạm ngưng</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} color="#0f766e" />
              <span>Kích hoạt</span>
            </>
          )}
        </button>
      </td>
    </tr>
  );
};
