import type { FC } from 'react';
import { Package, Edit2, Trash2, PackageOpen, Layers } from 'lucide-react';
import type { MasterProductItem } from '../../types/masterCatalog.types';
import { TablePagination } from '../../../../components/common/TablePagination/TablePagination';

interface MasterCatalogTableProps {
  products: MasterProductItem[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
  onEdit: (product: MasterProductItem) => void;
  onDelete: (product: MasterProductItem) => void;
}

export const MasterCatalogTable: FC<MasterCatalogTableProps> = ({
  products,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        border: '1px solid #EDF2F9',
        boxShadow: '0 4px 12px rgba(0, 30, 90, 0.04)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr
              style={{
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '14px 16px', width: '60px' }}>Ảnh</th>
              <th style={{ padding: '14px 16px', minWidth: '130px' }}>Mã Vạch EAN-13</th>
              <th style={{ padding: '14px 16px', minWidth: '220px' }}>Tên Sản Phẩm Chuẩn</th>
              <th style={{ padding: '14px 16px', minWidth: '140px' }}>Hãng & Ngành Hàng</th>
              <th style={{ padding: '14px 16px', minWidth: '180px' }}>ĐVT & Quy Cách FMCG</th>
              <th style={{ padding: '14px 16px', minWidth: '120px', textAlign: 'right' }}>Giá Gợi Ý</th>
              <th style={{ padding: '14px 16px', width: '90px', textAlign: 'center' }}>Thuế</th>
              <th style={{ padding: '14px 16px', width: '110px', textAlign: 'center' }}>Khởi tạo</th>
              <th style={{ padding: '14px 16px', width: '100px', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  Đang tải dữ liệu thư viện hàng mẫu...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '50px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '9999px',
                        background: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                      }}
                    >
                      <PackageOpen size={24} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B' }}>
                      Chưa có mặt hàng mẫu nào khớp điều kiện
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      Vui lòng thử tìm từ khóa khác hoặc bấm "Import Excel" để nạp danh mục hàng loạt.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const formattedPrice = p.suggestedRetailPrice
                  ? `${p.suggestedRetailPrice.toLocaleString('vi-VN')} đ`
                  : '—';

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Thumbnail */}
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              // Fallback on image error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package size={20} color="#94A3B8" />
                        )}
                      </div>
                    </td>

                    {/* Barcode EAN-13 */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          color: '#0F172A',
                          background: '#F1F5F9',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {p.barcode}
                      </span>
                    </td>

                    {/* Product Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13.5px', marginBottom: '2px' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Cơ bản: <strong>{p.baseUnit}</strong>
                      </div>
                    </td>

                    {/* Brand & Category */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0066FF', fontSize: '12.5px' }}>{p.brand}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{p.categoryName}</div>
                    </td>

                    {/* Packaging Units */}
                    <td style={{ padding: '12px 16px' }}>
                      {p.units && p.units.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {p.units.map((u) => (
                            <div
                              key={u.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                color: '#334155',
                              }}
                            >
                              <Layers size={13} color="#0066FF" />
                              <span>
                                1 {u.unitName} = <strong>{u.conversionRate}</strong> {p.baseUnit}
                              </span>
                              {u.barcode && (
                                <span style={{ fontSize: '10.5px', color: '#94A3B8', fontFamily: 'JetBrains Mono' }}>
                                  ({u.barcode})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>Chỉ bán lẻ {p.baseUnit}</span>
                      )}
                    </td>

                    {/* Price */}
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        color: '#0F172A',
                      }}
                    >
                      {formattedPrice}
                    </td>

                    {/* VAT Rate */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#0066FF',
                          background: '#EFF6FF',
                          padding: '2px 7px',
                          borderRadius: '9999px',
                        }}
                      >
                        {p.vatRate}%
                      </span>
                    </td>

                    {/* Usage count */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: p.isActive ? '#0F766E' : '#64748B',
                          background: p.isActive ? '#EAF6F4' : '#F1F5F9',
                          padding: '3px 9px',
                          borderRadius: '9999px',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {p.isActive ? 'Đang áp dụng' : 'Tạm ngừng'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          title="Chỉnh sửa sản phẩm mẫu"
                          style={{
                            background: '#F1F5F9',
                            border: 'none',
                            borderRadius: '9999px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p)}
                          title="Xóa khỏi thư viện mẫu"
                          style={{
                            background: '#FEE2E2',
                            border: 'none',
                            borderRadius: '9999px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#EF4444',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid #EDF2F9' }}>
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            pageSizeOptions={[10, 15, 30, 50]}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            itemLabel="mặt hàng mẫu"
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};
