import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { StoreProductItem } from '../types/storeProduct.types';
import { SupplierStatusBadge } from '../../supplier/components/SupplierStatusBadge';
import { TablePagination } from '../../../components/common';
import { ArrowUpDown, Package } from 'lucide-react';

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
  onToggleStatus: _onToggleStatus,
  onRemove: _onRemove,
  onOpenAssignModal,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  /** Compact VND: 10000 → 10k, 200000 → 200k, 1500000 → 1.5tr */
  const fmtCompact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) {
      const m = n / 1_000_000;
      const s = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, '');
      return `${s}tr`;
    }
    if (abs >= 1_000) {
      const k = n / 1_000;
      const s = Number.isInteger(k) ? String(k) : k.toFixed(1).replace(/\.0$/, '');
      return `${s}k`;
    }
    return String(Math.round(n));
  };

  /** One product row → all units on one line: Chai:10k Lốc:60k Thùng:200k */
  const formatUnitPrices = (item: StoreProductItem) => {
    const units = item.unitPrices?.filter((u) => u.unitName?.trim()) ?? [];
    if (units.length === 0) {
      return `${item.unit || 'ĐVT'}:${fmtCompact(item.retailPrice)}`;
    }
    return units.map((u) => `${u.unitName}:${fmtCompact(u.price)}`).join(' ');
  };

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
      <col style={{ width: '7%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '4%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '4%' }} />
      <col style={{ width: '4%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '6%' }} />
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
        <table className="so-list-table" style={{ minWidth: 1520, tableLayout: 'fixed' }}>
          {tableColGroup}
          <thead>
            <tr>
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
                  <span>Tên Cửa Hàng</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'storeName' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

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
                  <span>Tên Nhà Cung Cấp</span>
                  <ArrowUpDown size={12} style={{ color: sortField === 'supplierName' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                </div>
              </th>

              <th style={{ ...thStyle, textAlign: 'center' }}>
                <span>Ảnh</span>
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

              <th style={{ ...thStyle }}>
                <span>Giá Bán Theo ĐVT</span>
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
        <table className="so-list-table" style={{ minWidth: 1520, tableLayout: 'fixed' }}>
          {tableColGroup}
          <tbody>
            {sortedProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
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
                const rowKey = `${p.id}-${p.supplierId || 'none'}`;
                return (
                  <tr
                    key={rowKey}
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
                    {/* Mã Cửa Hàng */}
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

                    {/* Tên Cửa Hàng */}
                    <td className="so-list-td--wrap">
                      <div className="so-list-name" title={p.storeName}>{p.storeName}</div>
                    </td>

                    {/* Mã SKU */}
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

                    {/* Tên Sản phẩm */}
                    <td className="so-list-td--wrap">
                      <div className="so-list-name" title={p.name}>{p.name}</div>
                    </td>

                    {/* Mã Nhà Cung Cấp */}
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

                    {/* Tên Nhà Cung Cấp */}
                    <td className="so-list-td--wrap">
                      <div
                        className="so-list-name"
                        title={p.primarySupplierName}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
                      >
                        <span>{p.primarySupplierName || '---'}</span>
                        {p.isPrimarySupplier ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#0f766e',
                              background: '#ccfbf1',
                              borderRadius: 4,
                              padding: '1px 6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Chính
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Ảnh */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            display: 'inline-block',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Package size={16} color="#94a3b8" />
                        </span>
                      )}
                    </td>

                    {/* Giá Vốn (đ) — theo NCC của dòng */}
                    <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, fontSize: 12.5, color: '#64748b' }}>
                        {fmt(p.costPrice)} đ
                      </span>
                    </td>

                    {/* Giá Bán Lẻ (đ) */}
                    <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 13, color: '#0f766e' }}>
                        {fmt(p.retailPrice)} đ
                      </span>
                    </td>

                    {/* Giá bán theo ĐVT — gộp 1 dòng: Chai:10k Lốc:60k Thùng:200k */}
                    <td style={{ padding: '8px 6px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <span
                        title={formatUnitPrices(p)}
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#334155',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatUnitPrices(p)}
                      </span>
                    </td>

                    {/* MOQ */}
                    <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>
                        {p.minOrderQuantity ?? 1}
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

      {/* ── Footer Phân trang chuẩn 1, 2, 3... ── */}
      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        pageSizeOptions={[15, 24, 36, 48]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="sản phẩm"
      />
    </div>
  );
};

export default StoreProductTable;
