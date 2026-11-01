import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { StoreProductItem } from '../types/storeProduct.types';
import { SupplierStatusBadge } from '../../supplier/components/SupplierStatusBadge';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface StoreProductTableProps {
  products: StoreProductItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (item: StoreProductItem) => void;
  onToggleStatus?: (item: StoreProductItem) => void;
  onRemove?: (item: StoreProductItem) => void;
  onOpenAssignModal: () => void;
}

type SortField =
  | 'sku'
  | 'name'
  | 'unit'
  | 'storeCode'
  | 'storeName'
  | 'supplierCode'
  | 'supplierName'
  | 'costPrice'
  | 'retailPrice'
  | 'minOrderQuantity'
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
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'unit':
          valA = a.unit.toLowerCase();
          valB = b.unit.toLowerCase();
          break;
        case 'storeCode':
          valA = (a.storeCode || '').toLowerCase();
          valB = (b.storeCode || '').toLowerCase();
          break;
        case 'storeName':
          valA = a.storeName.toLowerCase();
          valB = b.storeName.toLowerCase();
          break;
        case 'supplierCode':
          valA = (a.primarySupplierCode || '').toLowerCase();
          valB = (b.primarySupplierCode || '').toLowerCase();
          break;
        case 'supplierName':
          valA = (a.primarySupplierName || '').toLowerCase();
          valB = (b.primarySupplierName || '').toLowerCase();
          break;
        case 'costPrice':
          valA = a.costPrice;
          valB = b.costPrice;
          break;
        case 'retailPrice':
          valA = a.retailPrice;
          valB = b.retailPrice;
          break;
        case 'minOrderQuantity':
          valA = a.minOrderQuantity || 0;
          valB = b.minOrderQuantity || 0;
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

  // Synchronize horizontal scrolling between header and body & detect vertical scroll
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };

    updateScrollState();

    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateScrollState();
      });
      observer.observe(bodyRef.current);
    }

    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (observer) observer.disconnect();
    };
  }, [sortedProducts, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '9%' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '10.5%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '11.5%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '4%' }} />
      <col style={{ width: '4%' }} />
      <col style={{ width: '8.5%' }} />
      <col style={{ width: '7.5%' }} />
    </colgroup>
  );

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '8px 6px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: 1.25,
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
  };

  return (
    <div className="so-list-table-card">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={{ minWidth: 1380, tableLayout: 'fixed' }}>
          {tableColGroup}
          <thead>
            <tr>
              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('sku')}
                title="Sắp xếp theo mã SKU"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã SKU</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'sku' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('name')}
                title="Sắp xếp theo tên sản phẩm"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Tên Sản Phẩm</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'name' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('storeCode')}
                title="Sắp xếp theo mã cửa hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã Cửa Hàng</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'storeCode' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('storeName')}
                title="Sắp xếp theo Cửa hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Cửa Hàng</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'storeName' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('supplierCode')}
                title="Sắp xếp theo mã nhà cung cấp"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã NCC</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'supplierCode' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('supplierName')}
                title="Sắp xếp theo nhà cung cấp"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Nhà Cung Cấp</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'supplierName' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }}
                onClick={() => handleSort('costPrice')}
                title="Sắp xếp theo giá vốn nhập sỉ"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, width: '100%' }}>
                  <span>Giá Vốn (đ)</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'costPrice' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }}
                onClick={() => handleSort('retailPrice')}
                title="Sắp xếp theo giá bán lẻ niêm yết"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, width: '100%' }}>
                  <span>Giá Bán Lẻ (đ)</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'retailPrice' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => handleSort('minOrderQuantity')}
                title="Số lượng đặt hàng tối thiểu (MOQ)"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>MOQ</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'minOrderQuantity' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => handleSort('unit')}
                title="Sắp xếp theo đơn vị tính"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>ĐVT</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'unit' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th style={{ ...thStyle, textAlign: 'right', paddingRight: 8 }}>Trạng Thái</th>

              <th style={{ ...thStyle, textAlign: 'right', paddingRight: 14 }}>Thao Tác</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Scrollable Table Body (Tự động lấp đầy chiều cao cân đối chuẩn 12 dòng như màn suppliers) ── */}
      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table" style={{ minWidth: 1380, tableLayout: 'fixed' }}>
          {tableColGroup}
          <tbody>
            {sortedProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
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
              sortedProducts.map((p) => {
                return (
                  <tr
                    key={p.id}
                    className="so-list-row"
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    {/* 1. Mã SKU */}
                    <td style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#0f766e',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                        title={p.sku}
                      >
                        {p.sku}
                      </span>
                    </td>

                    {/* 2. Tên Sản phẩm (xuống dòng tối đa 2 dòng khi dài) */}
                    <td className="so-list-td--wrap">
                      <div className="so-list-name" title={p.name}>{p.name}</div>
                    </td>

                    {/* 3. Mã Cửa Hàng */}
                    <td style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#334155',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                        title={p.storeCode}
                      >
                        {p.storeCode || '---'}
                      </span>
                    </td>

                    {/* 4. Cửa Hàng (xuống dòng tối đa 2 dòng khi dài) */}
                    <td className="so-list-td--wrap">
                      <div className="so-list-name" title={p.storeName}>{p.storeName}</div>
                    </td>

                    {/* 5. Mã Nhà Cung Cấp */}
                    <td style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#334155',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                        title={p.primarySupplierCode}
                      >
                        {p.primarySupplierCode || '---'}
                      </span>
                    </td>

                    {/* 6. Tên Nhà Cung Cấp */}
                    <td className="so-list-td--wrap">
                      <div className="so-list-name" title={p.primarySupplierName}>{p.primarySupplierName || '---'}</div>
                    </td>

                    {/* 8. Giá Vốn (đ) */}
                    <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, fontSize: 12.5, color: '#64748b' }}>
                        {fmt(p.costPrice)} đ
                      </span>
                    </td>

                    {/* 9. Giá Bán Lẻ (đ) */}
                    <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 13, color: '#0f766e' }}>
                        {fmt(p.retailPrice)} đ
                      </span>
                    </td>

                    {/* 10. SL Đặt Tối Thiểu (MOQ) */}
                    <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>
                        {p.minOrderQuantity ?? 10}
                      </span>
                    </td>

                    {/* 10. ĐVT (bỏ highlight, hiển thị text sạch gọn) */}
                    <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: '#334155',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.unit}
                      </span>
                    </td>

                    {/* 11. Trạng Thái (Căn sát lại gần cột Thao Tác) */}
                    <td
                      style={{
                        textAlign: 'right',
                        verticalAlign: 'middle',
                        padding: '8px 8px 8px 4px',
                        borderBottom: '1px solid #f1f5f9',
                        overflow: 'visible',
                        textOverflow: 'clip',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <SupplierStatusBadge status={p.status} />
                    </td>

                    {/* 12. Thao Tác (Căn sát về bên phải của table) */}
                    <td
                      style={{
                        padding: '8px 14px 8px 4px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <button
                        type="button"
                        className="so-list-action-btn"
                        onClick={() => onEdit(p)}
                        title="Mở popup thao tác sản phẩm"
                      >
                        Thao tác
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang (Paging) tích hợp đồng bộ theo chuẩn http://localhost:5173/store-owner/suppliers ── */}
      <div className="so-list-pager">
        {/* Bên trái: Thông tin số lượng & Chọn số bản ghi / trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> sản phẩm
          </div>

          {onPageSizeChange && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
              <select
                className="so-list-pager-select"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <option value={15}>15</option>
                <option value={24}>24</option>
                <option value={36}>36</option>
                <option value={48}>48</option>
              </select>
            </div>
          )}
        </div>

        {/* Bên phải: Nút Trước / Trang x / y / Sau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="so-list-pager-btn"
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>

          <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            className="so-list-pager-btn"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            <span>Sau</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreProductTable;
