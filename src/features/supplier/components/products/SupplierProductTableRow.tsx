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
  onSetPrimary?: (item: SupplierProductItem) => void;
}

export const SupplierProductTableRow: FC<SupplierProductTableRowProps> = ({
  index,
  item,
  supplierCode,
  supplierName,
  onEdit,
  onToggleStatus,
  onSetPrimary: _onSetPrimary,
}) => {
  const fmtCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <tr
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
        transition: 'background-color 0.12s ease',
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
            fontWeight: 700,
            color: '#0f766e',
            backgroundColor: '#f0fdfa',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid #ccfbf1',
          }}
        >
          {item.sku}
        </span>
      </td>

      {/* 4. Tên Sản Phẩm */}
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, lineHeight: 1.35 }}>
            {item.name}
          </span>
        </div>
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
          {supplierCode || item.supplierId}
        </span>
      </td>

      {/* 6. Tên Nhà Cung Cấp */}
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1e293b' }}>
          {supplierName || '---'}
        </div>
      </td>

      {/* 7. Ngành Hàng */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontSize: 12,
            color: '#475569',
            fontWeight: 500,
            backgroundColor: '#f1f5f9',
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {item.categoryName || 'Chung'}
        </span>
      </td>

      {/* 8. ĐVT */}
      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
          {item.deliveryUoM}
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
          {fmtCurrency(item.agreedPrice)}
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
          {item.moq} {item.deliveryUoM}
        </span>
      </td>

      {/* 11. Trạng Thái */}
      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 11.5,
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

      {/* 12. Thao Tác */}
      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => onEdit(item)}
            title="Sửa giá sỉ thỏa thuận & MOQ"
            style={{
              height: 26,
              padding: '0 8px',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Edit2 size={11} /> Sửa
          </button>

          <button
            type="button"
            onClick={() => onToggleStatus(item)}
            title={item.status === 'Active' ? 'Tạm ngưng cung ứng mặt hàng này' : 'Kích hoạt lại'}
            style={{
              height: 26,
              padding: '0 8px',
              borderRadius: 4,
              border: item.status === 'Active' ? '1px solid #fecaca' : '1px solid #bbf7d0',
              backgroundColor: item.status === 'Active' ? '#fef2f2' : '#f0fdf4',
              color: item.status === 'Active' ? '#dc2626' : '#16a34a',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Power size={11} /> {item.status === 'Active' ? 'Ngưng' : 'Bật'}
          </button>
        </div>
      </td>
    </tr>
  );
};
