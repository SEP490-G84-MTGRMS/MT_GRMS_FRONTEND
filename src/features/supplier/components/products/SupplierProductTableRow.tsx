import type { FC } from 'react';
import type { SupplierProductItem } from '../../types/supplier.types';
import { Edit2, Power } from 'lucide-react';

interface SupplierProductTableRowProps {
  index: number;
  item: SupplierProductItem;
  supplierCode?: string;
  supplierName?: string;
  onEdit: (item: SupplierProductItem) => void;
  onToggleStatus: (item: SupplierProductItem) => void;
}

export const SupplierProductTableRow: FC<SupplierProductTableRowProps> = ({
  index,
  item,
  supplierCode,
  supplierName,
  onEdit,
  onToggleStatus,
}) => {
  const fmtCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <tr
      style={{
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.15s ease',
        opacity: item.status === 'Inactive' ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* 1. STT */}
      <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
        {index}
      </td>

      {/* 2. Barcode */}
      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#334155',
            backgroundColor: '#f1f5f9',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          {item.barcode}
        </span>
      </td>

      {/* 3. Tách cột Mã SKU riêng */}
      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--blue-primary)',
            backgroundColor: 'var(--blue-light)',
            border: '1px solid var(--blue-border)',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          {item.sku}
        </span>
      </td>

      {/* 4. Tách cột Tên Sản Phẩm riêng */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>
          {item.name}
        </div>
      </td>

      {/* 5. Tách cột Mã Nhà Cung Cấp riêng */}
      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
        <div>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '2px 7px',
              borderRadius: 6,
            }}
          >
            {supplierCode || item.supplierId}
          </span>
          {item.supplierProductCode && (
            <div
              style={{
                fontSize: '0.72rem',
                color: '#94a3b8',
                marginTop: 3,
                fontFamily: 'JetBrains Mono, monospace',
              }}
              title="Mã sản phẩm của Nhà cung cấp"
            >
              Mã SP: {item.supplierProductCode}
            </div>
          )}
        </div>
      </td>

      {/* 6. Tách cột Tên Nhà Cung Cấp riêng */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>
          {supplierName || '---'}
        </div>
      </td>

      {/* 7. Ngành Hàng */}
      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontSize: '0.76rem',
            padding: '2px 10px',
            borderRadius: 9999,
            backgroundColor: '#f1f5f9',
            color: '#475569',
            fontWeight: 500,
          }}
        >
          {item.categoryName || 'Chung'}
        </span>
      </td>

      {/* 8. Delivery UoM */}
      <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
          {item.deliveryUoM}
        </span>
      </td>

      {/* 9. Agreed Wholesale Price */}
      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: 'var(--blue-primary)',
          }}
        >
          {fmtCurrency(item.agreedPrice)}
        </span>
      </td>

      {/* 10. MOQ */}
      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.85rem',
            color: '#475569',
          }}
        >
          {item.moq} {item.deliveryUoM}
        </span>
      </td>

      {/* 11. Status Badge */}
      <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 9999,
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: item.status === 'Active' ? '#e6f4ea' : '#f1f5f9',
            color: item.status === 'Active' ? '#008800' : '#64748b',
            border: `1px solid ${item.status === 'Active' ? '#b7e1cd' : '#cbd5e1'}`,
          }}
        >
          ● {item.status === 'Active' ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* 12. Actions */}
      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => onEdit(item)}
            title="Sửa giá & số lượng tối thiểu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 9999,
              backgroundColor: 'var(--blue-light)',
              border: '1px solid var(--blue-border)',
              color: 'var(--blue-primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Edit2 size={12} /> Sửa
          </button>

          <button
            type="button"
            onClick={() => onToggleStatus(item)}
            title={item.status === 'Active' ? 'Tạm ngưng phân phối' : 'Kích hoạt lại'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 9999,
              backgroundColor: item.status === 'Active' ? '#fff1f2' : '#f0fdf4',
              border: `1px solid ${item.status === 'Active' ? '#fecdd3' : '#bbf7d0'}`,
              color: item.status === 'Active' ? '#e11d48' : '#16a34a',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Power size={12} /> {item.status === 'Active' ? 'Ngưng' : 'Bật'}
          </button>
        </div>
      </td>
    </tr>
  );
};
