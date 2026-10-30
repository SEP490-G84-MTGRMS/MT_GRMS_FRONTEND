import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { StoreProductItem } from '../types/storeProduct.types';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface StoreProductTableProps {
  products: StoreProductItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (item: StoreProductItem) => void;
  onToggleStatus: (item: StoreProductItem) => void;
  onRemove: (item: StoreProductItem) => void;
  onOpenAssignModal: () => void;
}

type SortField =
  | 'sku'
  | 'barcode'
  | 'name'
  | 'storeName'
  | 'retailPrice'
  | 'currentStock'
  | 'minStockLevel'
  | 'status';
type SortDirection = 'asc' | 'desc';

export const StoreProductTable: FC<StoreProductTableProps> = ({
  products,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onToggleStatus,
  onRemove,
  onOpenAssignModal,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedProducts = useMemo(() => {
    if (!sortField) return products;

    return [...products].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'sku':
          valA = a.sku.toLowerCase();
          valB = b.sku.toLowerCase();
          break;
        case 'barcode':
          valA = a.barcode.toLowerCase();
          valB = b.barcode.toLowerCase();
          break;
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'storeName':
          valA = a.storeName.toLowerCase();
          valB = b.storeName.toLowerCase();
          break;
        case 'retailPrice':
          valA = a.retailPrice;
          valB = b.retailPrice;
          break;
        case 'currentStock':
          valA = a.currentStock;
          valB = b.currentStock;
          break;
        case 'minStockLevel':
          valA = a.minStockLevel;
          valB = b.minStockLevel;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortField, sortDir]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

  // Synchronize horizontal scrolling between header and body
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current && bodyRef.current) {
        headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
      }
    };
    const bodyEl = bodyRef.current;
    if (bodyEl) {
      bodyEl.addEventListener('scroll', handleScroll);
      return () => bodyEl.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '4%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '22%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '10%' }} />
    </colgroup>
  );

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    textAlign: 'left',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        minHeight: 0,
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* ── Fixed Table Header ── */}
      <div
        ref={headerRef}
        style={{
          width: '100%',
          overflowX: 'hidden',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          {tableColGroup}
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'center' }}>STT</th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('sku')}
                title="Sắp xếp theo mã SKU"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã SKU / Barcode</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'sku' ? '#2563eb' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('name')}
                title="Sắp xếp theo tên sản phẩm"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Tên Sản Phẩm (ĐVT)</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'name' ? '#2563eb' : '#94a3b8' }} />
                </div>
              </th>

              <th style={thStyle}>Ngành Hàng</th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('storeName')}
                title="Sắp xếp theo Cửa hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Cửa Hàng</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'storeName' ? '#2563eb' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }}
                onClick={() => handleSort('retailPrice')}
                title="Sắp xếp theo giá bán lẻ niêm yết"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, width: '100%' }}>
                  <span>Giá Bán Lẻ (đ)</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'retailPrice' ? '#2563eb' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => handleSort('currentStock')}
                title="Tồn kho thực tế SOH và định mức an toàn"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>Tồn / Định mức</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'currentStock' ? '#2563eb' : '#94a3b8' }} />
                </div>
              </th>

              <th style={{ ...thStyle, textAlign: 'center' }}>Trạng Thái</th>

              <th style={{ ...thStyle, textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Scrollable Table Body ── */}
      <div
        ref={bodyRef}
        style={{
          width: '100%',
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'auto',
          minHeight: 0,
        }}
      >
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          {tableColGroup}
          <tbody>
            {sortedProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#64748b',
                  }}
                >
                  <p style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>
                    Không tìm thấy sản phẩm nào phù hợp với điều kiện lọc.
                  </p>
                  <button
                    type="button"
                    className="po-btn po-btn-primary"
                    style={{ height: 32, padding: '0 16px' }}
                    onClick={onOpenAssignModal}
                  >
                    <span>Gán sản phẩm mới vào cửa hàng</span>
                  </button>
                </td>
              </tr>
            ) : (
              sortedProducts.map((p, idx) => {
                const rowIndex = (pageIndex - 1) * pageSize + idx + 1;
                const isOutOfStock = p.currentStock === 0;
                const isLowStock = p.currentStock > 0 && p.currentStock <= p.minStockLevel;

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    {/* STT */}
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                      {rowIndex}
                    </td>

                    {/* Mã SKU & Barcode */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#1e293b' }}>
                        {p.sku}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                        {p.barcode}
                      </div>
                    </td>

                    {/* Tên Sản phẩm & ĐVT */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>ĐVT: <b>{p.unit}</b></span>
                        <span>•</span>
                        <span>NCC: {p.primarySupplierName}</span>
                      </div>
                    </td>

                    {/* Ngành Hàng */}
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {p.category}
                      </span>
                    </td>

                    {/* Cửa Hàng */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#334155' }}>
                        {p.storeName}
                      </div>
                      {p.shelfLocation && (
                        <div style={{ fontSize: 10.5, color: '#0d9488' }}>
                          Vị trí: {p.shelfLocation}
                        </div>
                      )}
                    </td>

                    {/* Giá bán lẻ niêm yết */}
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#059669' }}>
                        {fmt(p.retailPrice)} đ
                      </div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                        Vốn: {fmt(p.costPrice)} đ
                      </div>
                    </td>

                    {/* Tồn kho SOH & Định mức an toàn */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: 12.5,
                        }}
                      >
                        <span
                          style={{
                            color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#0f172a',
                          }}
                        >
                          {p.currentStock}
                        </span>
                        <span style={{ color: '#cbd5e1' }}>/</span>
                        <span style={{ color: '#64748b' }}>{p.minStockLevel}</span>
                      </div>

                      {isOutOfStock ? (
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
                          Hết hàng
                        </div>
                      ) : isLowStock ? (
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706', marginTop: 2 }}>
                          Cần bổ sung
                        </div>
                      ) : null}
                    </td>

                    {/* Trạng Thái */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 999,
                          backgroundColor: p.status === 'Active' ? '#ecfdf5' : '#f1f5f9',
                          color: p.status === 'Active' ? '#047857' : '#64748b',
                          border: `1px solid ${p.status === 'Active' ? '#a7f3d0' : '#cbd5e1'}`,
                        }}
                      >
                        {p.status === 'Active' ? 'Đang bán' : 'Tạm ngừng'}
                      </span>
                    </td>

                    {/* Thao Tác (Refactored modern pure-text action buttons) */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="po-table-action-btn"
                          style={{
                            height: 26,
                            padding: '0 10px',
                            borderRadius: 6,
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: '#1d4ed8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                            e.currentTarget.style.borderColor = '#93c5fd';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          title="Chỉnh sửa giá bán lẻ và định mức tồn an toàn"
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleStatus(p)}
                          className="po-table-action-btn"
                          style={{
                            height: 26,
                            padding: '0 10px',
                            borderRadius: 6,
                            backgroundColor: p.status === 'Active' ? '#fffbeb' : '#f0fdf4',
                            border: `1px solid ${p.status === 'Active' ? '#fde68a' : '#bbf7d0'}`,
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: p.status === 'Active' ? '#b45309' : '#15803d',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = 'brightness(0.96)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = 'none';
                          }}
                          title={p.status === 'Active' ? 'Tạm ngừng kinh doanh sản phẩm tại cửa hàng này' : 'Kích hoạt lại'}
                        >
                          {p.status === 'Active' ? 'Tạm ngừng' : 'Kích hoạt'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemove(p)}
                          className="po-table-action-btn"
                          style={{
                            height: 26,
                            padding: '0 10px',
                            borderRadius: 6,
                            backgroundColor: '#ffffff',
                            border: '1px solid #fecaca',
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: '#dc2626',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fef2f2';
                            e.currentTarget.style.borderColor = '#f87171';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#fecaca';
                          }}
                          title="Gỡ sản phẩm khỏi danh mục kinh doanh của cửa hàng này"
                        >
                          Gỡ
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

      {/* ── Pagination Footer ── */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 12.5, color: '#64748b' }}>
          Hiển thị từ <b>{startItem}</b> đến <b>{endItem}</b> trong tổng số <b>{totalCount}</b> sản phẩm
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
            <span>Số dòng/trang:</span>
            <select
              className="po-ctrl-select"
              style={{ width: 68, height: 28, fontSize: 12 }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              className="po-icon-btn"
              onClick={() => onPageChange(pageIndex - 1)}
              disabled={pageIndex <= 1}
              style={{ opacity: pageIndex <= 1 ? 0.5 : 1, cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer' }}
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontSize: 12, fontWeight: 700, padding: '0 8px', color: '#1e293b' }}>
              Trang {pageIndex} / {totalPages}
            </span>

            <button
              type="button"
              className="po-icon-btn"
              onClick={() => onPageChange(pageIndex + 1)}
              disabled={pageIndex >= totalPages}
              style={{ opacity: pageIndex >= totalPages ? 0.5 : 1, cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer' }}
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreProductTable;
