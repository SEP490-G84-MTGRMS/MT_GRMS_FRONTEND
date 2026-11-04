import type { FC } from 'react';
import type { SupplierProductItem } from '../../types/supplier.types';
import { SupplierStatusBadge } from '../SupplierStatusBadge';
import { Edit2 } from 'lucide-react';

interface SupplierProductTableRowProps {
  index: number;
  item: SupplierProductItem;
  supplierCode?: string;
  supplierName?: string;
  onEdit: (item: SupplierProductItem) => void;
  onToggleStatus?: (item: SupplierProductItem) => void;
  onSetPrimary?: (item: SupplierProductItem) => void;
}

export const SupplierProductTableRow: FC<SupplierProductTableRowProps> = ({
  index,
  item,
  supplierCode,
  supplierName,
  onEdit,
  onToggleStatus: _onToggleStatus,
  onSetPrimary: _onSetPrimary,
}) => {
  const fmtCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <tr
      className="so-list-row"
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
        opacity: item.status === 'Inactive' ? 0.65 : 1,
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

      {/* 2. SKU */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12,
            fontWeight: 600,
            color: '#0f766e',
          }}
        >
          {item.sku}
        </span>
      </td>

      {/* 4. Tên Sản Phẩm */}
      <td className="so-list-td--wrap">
        <div className="so-list-name">{item.name}</div>
      </td>

      {/* 4. Mã NCC */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12,
            fontWeight: 600,
            color: '#475569',
          }}
        >
          {supplierCode || item.supplierCode || item.supplierId}
        </span>
      </td>

      {/* 6. Tên Nhà Cung Cấp */}
      <td className="so-list-td--wrap">
        <div className="so-list-name">{supplierName || item.supplierName || '---'}</div>
      </td>

      {/* 7. Ngành Hàng */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontSize: 12,
            color: '#475569',
            fontWeight: 500,
          }}
        >
          {item.categoryName || 'Chung'}
        </span>
      </td>

      {/* 8. ĐVT */}
      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
          {item.baseUoM || item.deliveryUoM}
        </span>
      </td>

      {/* 9. Giá Nhập Sỉ */}
      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12.5,
            fontWeight: 700,
            color: '#0f766e',
          }}
        >
          {fmtCurrency(item.effectivePrice ?? item.agreedPrice)}
        </span>
      </td>

      {/* 10. MOQ */}
      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12,
            color: '#475569',
          }}
        >
          {item.moq} {item.baseUoM || item.deliveryUoM}
        </span>
      </td>

      {/* 11. Trạng Thái */}
      <td style={{ textAlign: 'center' }}>
        <SupplierStatusBadge status={item.status} />
      </td>

      {/* 12. Thao Tác */}
      <td style={{ textAlign: 'right' }}>
        <div className="so-list-actions">
          <button
            type="button"
            className="so-list-action-btn"
            onClick={() => onEdit(item)}
            title="Sửa điều khoản cung ứng"
          >
            <Edit2 size={12} /> Sửa
          </button>
        </div>
      </td>
    </tr>
  );
};
