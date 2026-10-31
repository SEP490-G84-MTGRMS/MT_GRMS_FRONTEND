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
  onToggleStatus?: (item: StoreProductItem) => void;
  onRemove?: (item: StoreProductItem) => void;
  onOpenAssignModal: () => void;
}

type SortField =
  | 'sku'
  | 'name'
  | 'unit'
  | 'category'
  | 'storeName'
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
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'unit':
          valA = a.unit.toLowerCase();
          valB = b.unit.toLowerCase();
          break;
        case 'category':
          valA = a.category.toLowerCase();
          valB = b.category.toLowerCase();
          break;
        case 'storeName':
          valA = a.storeName.toLowerCase();
          valB = b.storeName.toLowerCase();
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
      <col style={{ width: '4%' }} />   {/* STT */}
      <col style={{ width: '10%' }} />  {/* Mã SKU */}
      <col style={{ width: '18%' }} />  {/* Tên SP */}
      <col style={{ width: '5%' }} />   {/* ĐVT */}
      <col style={{ width: '9%' }} />   {/* Ngành Hàng */}
      <col style={{ width: '11%' }} />  {/* Cửa Hàng */}
      <col style={{ width: '9%' }} />   {/* Giá Vốn */}
      <col style={{ width: '9%' }} />   {/* Giá Bán */}
      <col style={{ width: '8%' }} />   {/* MOQ */}
      <col style={{ width: '9%' }} />   {/* Trạng Thái */}
      <col style={{ width: '8%' }} />   {/* Thao Tác */}
    </colgroup>
  );

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '10px 8px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
      }}
    >
      {/* ── Fixed Table Header ── */}
      <div
        ref={headerRef}
        style={{
          width: '100%',
          overflowX: 'hidden',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #cbd5e1',
          flexShrink: 0,
          boxSizing: 'border-box',
          paddingRight: hasScrollY ? 6 : 0,
        }}
      >
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'left',
            fontSize: 12.5,
          }}
        >
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
                  <span>Mã SKU</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'sku' ? '#0f766e' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('name')}
                title="Sắp xếp theo tên sản phẩm"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Tên Sản Phẩm</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'name' ? '#0f766e' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => handleSort('unit')}
                title="Sắp xếp theo đơn vị tính"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>ĐVT</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'unit' ? '#0f766e' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('category')}
                title="Sắp xếp theo ngành hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Ngành Hàng</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'category' ? '#0f766e' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('storeName')}
                title="Sắp xếp theo Cửa hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Cửa Hàng</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'storeName' ? '#0f766e' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }}
                onClick={() => handleSort('costPrice')}
                title="Sắp xếp theo giá vốn nhập sỉ"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, width: '100%' }}>
                  <span>Giá Vốn (đ)</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'costPrice' ? '#0f766e' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }}
                onClick={() => handleSort('retailPrice')}
                title="Sắp xếp theo giá bán lẻ niêm yết"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, width: '100%' }}>
                  <span>Giá Bán Lẻ (đ)</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'retailPrice' ? '#0f766e' : '#94a3b8' }} />
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => handleSort('minOrderQuantity')}
                title="Số lượng đặt hàng tối thiểu"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>SL Đặt Tối Thiểu</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'minOrderQuantity' ? '#0f766e' : '#94a3b8' }} />
                </div>
              </th>

              <th style={{ ...thStyle, textAlign: 'center' }}>Trạng Thái</th>

              <th style={{ ...thStyle, textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Scrollable Table Body (Tự động lấp đầy chiều cao cân đối chuẩn 12 dòng như màn suppliers) ── */}
      <div
        ref={bodyRef}
        className="supplier-table-scroll-container"
        onScroll={handleBodyScroll}
        style={{
          width: '100%',
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <table
          style={{
            width: '100%',
            height: sortedProducts.length > 0 && sortedProducts.length <= 12 ? '100%' : 'auto',
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'left',
            fontSize: 12.5,
          }}
        >
          {tableColGroup}
          <tbody>
            {sortedProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
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

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff',
                      transition: 'background-color 0.12s ease',
                      height: sortedProducts.length <= 12 ? undefined : '44px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    {/* 1. STT */}
                    <td style={{ padding: '10px 4px', textAlign: 'center', fontSize: 12, color: '#64748b', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      {rowIndex}
                    </td>

                    {/* 2. Mã SKU (Bỏ Barcode) */}
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#0f766e',
                          backgroundColor: '#f0fdfa',
                          padding: '2px 8px',
                          borderRadius: 4,
                          border: '1px solid #ccfbf1',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.sku}
                      </span>
                    </td>

                    {/* 3. Tên Sản phẩm (Tách riêng, tự động xuống dòng khi dài) */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: '#0f172a',
                          lineHeight: 1.35,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {p.name}
                      </div>
                    </td>

                    {/* 4. Đơn vị tính (ĐVT) */}
                    <td style={{ padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#475569',
                          backgroundColor: '#f8fafc',
                          padding: '2px 8px',
                          borderRadius: 4,
                          border: '1px solid #e2e8f0',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.unit}
                      </span>
                    </td>

                    {/* 5. Ngành Hàng (Tự động xuống dòng khi dài) */}
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          display: 'inline-block',
                          lineHeight: 1.25,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {p.category}
                      </span>
                    </td>

                    {/* 6. Cửa Hàng (Bỏ vị trí, tự động xuống dòng khi dài) */}
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 12.5,
                          color: '#1e293b',
                          lineHeight: 1.3,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {p.storeName}
                      </div>
                    </td>

                    {/* 7. Giá Vốn (đ) (Tách riêng) */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, fontSize: 12.5, color: '#64748b' }}>
                        {fmt(p.costPrice)} đ
                      </span>
                    </td>

                    {/* 8. Giá Bán Lẻ (đ) (Tách riêng) */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 13, color: '#0f766e' }}>
                        {fmt(p.retailPrice)} đ
                      </span>
                    </td>

                    {/* 9. SL Đặt Tối Thiểu (MOQ) */}
                    <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>
                        {p.minOrderQuantity ?? 10}
                      </span>
                    </td>

                    {/* 10. Trạng Thái (CSS chuẩn theo http://localhost:5173/store-owner/suppliers/products) */}
                    <td style={{ padding: '10px 6px', textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 12,
                          color: p.status === 'Active' ? '#0f766e' : '#64748b',
                          backgroundColor: p.status === 'Active' ? '#f0fdfa' : '#f1f5f9',
                          border: p.status === 'Active' ? '1px solid #ccfbf1' : '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.status === 'Active' ? '🟢 Hoạt động' : '⚪ Tạm ngưng'}
                      </span>
                    </td>

                    {/* 11. Thao Tác (1 nút duy nhất mở popup thao tác) */}
                    <td style={{ padding: '10px 6px', textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="po-table-action-btn"
                        style={{
                          height: 28,
                          padding: '0 14px',
                          borderRadius: 6,
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#0f766e',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0fdfa';
                          e.currentTarget.style.borderColor = '#99f6e4';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
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
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b',
          backgroundColor: '#ffffff',
          flexWrap: 'wrap',
          gap: 10,
          flexShrink: 0,
          zIndex: 15,
        }}
      >
        {/* Bên trái: Thông tin số lượng & Chọn số bản ghi / trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> sản phẩm
          </div>

          {onPageSizeChange && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                style={{
                  height: 28,
                  padding: '0 8px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value={12}>12</option>
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
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: pageIndex <= 1 ? '#94a3b8' : '#334155',
              cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer',
              opacity: pageIndex <= 1 ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>

          <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: pageIndex >= totalPages ? '#94a3b8' : '#334155',
              cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer',
              opacity: pageIndex >= totalPages ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
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
