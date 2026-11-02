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
      <td className="so-list-td--wrap">
        <div
          className="so-list-name"
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
      <td className="so-list-td--wrap">
        <div className="so-list-name" title={item.supplierName}>
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
          className={`so-list-action-btn${item.status === 'Active' ? '' : ' so-list-action-btn--success'}`}
          onClick={() => onToggleStatus(item)}
          title={
            item.status === 'Active'
              ? `Tạm ngưng phân bổ ${item.supplierName} tại ${item.branchName}`
              : `Kích hoạt phân bổ ${item.supplierName} tại ${item.branchName}`
          }
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
