import type { CSSProperties, FC } from 'react';
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

const monoCell: CSSProperties = {
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  display: 'inline-block',
  maxWidth: '100%',
  lineHeight: 1.35,
};

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
        opacity: item.status === 'Inactive' ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f1f5f9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
      }}
    >
      {/* 1. STT */}
      <td
        style={{
          padding: '5px 6px',
          textAlign: 'center',
          fontSize: 11,
          color: '#94a3b8',
          verticalAlign: 'middle',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        {index}
      </td>

      {/* 2. Ảnh */}
      <td
        style={{
          padding: '5px 4px',
          textAlign: 'center',
          verticalAlign: 'middle',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{
              width: 32,
              height: 32,
              objectFit: 'cover',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              display: 'block',
              margin: '0 auto',
              background: '#f8fafc',
            }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px dashed #cbd5e1',
              background: '#f8fafc',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              color: '#94a3b8',
            }}
          >
            N/A
          </div>
        )}
      </td>

      {/* 3. SKU */}
      <td className="supplier-product-cell--wrap" style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ ...monoCell, color: '#0f766e' }} title={item.sku}>
          {item.sku}
        </span>
      </td>

      {/* 4. Tên Sản Phẩm */}
      <td className="so-list-td--wrap">
        <div className="so-list-name" title={item.name}>
          {item.name}
        </div>
      </td>

      {/* 5. Mã NCC */}
      <td className="supplier-product-cell--wrap" style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9' }}>
        <span
          style={{ ...monoCell, color: '#334155' }}
          title={supplierCode || item.supplierCode || item.supplierId}
        >
          {supplierCode || item.supplierCode || item.supplierId}
        </span>
      </td>

      {/* 6. Tên Nhà Cung Cấp */}
      <td className="so-list-td--wrap">
        <div className="so-list-name" title={supplierName || item.supplierName || '---'}>
          {supplierName || item.supplierName || '---'}
        </div>
      </td>

      {/* 7. Ngành Hàng */}
      <td className="supplier-product-cell--wrap" style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9' }}>
        <span
          style={{
            fontSize: 11,
            color: '#475569',
            fontWeight: 500,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            lineHeight: 1.35,
          }}
        >
          {item.categoryName || 'Chung'}
        </span>
      </td>

      {/* 8. Đơn vị nhập */}
      <td
        className="supplier-product-cell--wrap"
        style={{
          padding: '5px 4px',
          textAlign: 'center',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#1e293b',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            display: 'inline-block',
            maxWidth: '100%',
          }}
        >
          {item.deliveryUoM || item.baseUoM}
        </span>
      </td>

      {/* 9. Giá Nhập Sỉ */}
      <td
        className="supplier-product-cell--wrap"
        style={{ padding: '5px 6px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}
      >
        {(() => {
          const isFromMaster = !(item.agreedPrice > 0) && (item.effectivePrice ?? 0) > 0;
          return (
            <span
              style={{
                ...monoCell,
                fontWeight: 700,
                color: isFromMaster ? '#94a3b8' : '#0f766e',
              }}
              title={isFromMaster ? 'Chưa thỏa thuận — đang dùng giá Master' : undefined}
            >
              {fmtCurrency(item.effectivePrice ?? item.agreedPrice)}
            </span>
          );
        })()}
      </td>

      {/* 10. MOQ */}
      <td
        className="supplier-product-cell--wrap"
        style={{ padding: '5px 6px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}
      >
        <span style={{ ...monoCell, fontWeight: 700, color: '#0f172a' }}>
          {item.moq} {item.deliveryUoM || item.baseUoM}
        </span>
      </td>

      {/* 11. Thiếu cho phép */}
      <td
        className="supplier-product-cell--wrap"
        style={{ padding: '5px 6px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}
      >
        <span style={{ ...monoCell, color: '#475569' }}>
          {item.allowedShortageQty ?? 0} {item.deliveryUoM || item.baseUoM}
        </span>
      </td>

      {/* 12. Trạng Thái */}
      <td
        className="so-list-td--status"
        style={{
          textAlign: 'center',
          verticalAlign: 'middle',
          padding: '5px 6px',
          borderBottom: '1px solid #f1f5f9',
        }}
        title={item.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng'}
      >
        <SupplierStatusBadge status={item.status} />
      </td>

      {/* 13. Thao Tác */}
      <td
        className="so-list-td--actions"
        style={{
          padding: '5px 6px',
          textAlign: 'center',
          verticalAlign: 'middle',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div className="so-list-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="so-list-action-btn"
            onClick={() => onEdit(item)}
            title="Sửa điều khoản cung ứng"
          >
            <Edit2 size={11} /> Sửa
          </button>
        </div>
      </td>
    </tr>
  );
};
