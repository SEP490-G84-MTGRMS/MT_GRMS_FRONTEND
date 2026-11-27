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

  /** One product row → all units on one line: Chai:10k Lốc:60k · Khay:50k/kg */
  const formatUnitPrices = (item: StoreProductItem) => {
    const units = item.unitPrices?.filter((u) => u.unitName?.trim()) ?? [];
    const parts =
      units.length === 0
        ? [`${item.unit || 'Cái'}:${fmtCompact(item.retailPrice)}`]
        : units.map((u) => `${u.unitName}:${fmtCompact(u.price)}`);

    if (item.allowRepack) {
      const trayPerKg =
        item.processedSellingPricePerKg && item.processedSellingPricePerKg > 0
          ? item.processedSellingPricePerKg
          : item.retailPrice;
      parts.push(`Khay:${fmtCompact(trayPerKg)}/kg`);
    }

    return parts.join(' ');
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
      <col style={{ width: '9%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '4%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '4%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '6%' }} />
    </colgroup>
  );

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '6px 5px',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
  };

  const sortIcon = (field: SortField) => (
    <ArrowUpDown
      size={11}
      style={{ color: sortField === field ? '#0f766e' : '#94a3b8', flexShrink: 0 }}
    />
  );

  return (
    <div className="so-list-table-card so-list-table-card--dense">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={{ minWidth: 1280, tableLayout: 'fixed' }}>
          {tableColGroup}
          <thead>
            <tr>
              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('storeCode')}
                title="Sắp xếp theo mã cửa hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã CH</span>
                  {sortIcon('storeCode')}
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('storeName')}
                title="Sắp xếp theo Cửa hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên CH</span>
                  {sortIcon('storeName')}
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('sku')}
                title="Sắp xếp theo mã SKU"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>SKU</span>
                  {sortIcon('sku')}
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('name')}
                title="Sắp xếp theo tên sản phẩm"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên SP</span>
                  {sortIcon('name')}
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('supplierCode')}
                title="Sắp xếp theo mã nhà cung cấp"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã NCC</span>
                  {sortIcon('supplierCode')}
                </div>
              </th>

              <th
                style={{ ...thStyle, cursor: 'pointer' }}
                onClick={() => handleSort('supplierName')}
                title="Sắp xếp theo nhà cung cấp"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên NCC</span>
                  {sortIcon('supplierName')}
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
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, width: '100%' }}>
                  <span>Giá vốn</span>
                  {sortIcon('costPrice')}
                </div>
              </th>

              <th style={{ ...thStyle }} title="Giá bán theo đơn vị tính">
                <span>Giá ĐVT</span>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => handleSort('minOrderQuantity')}
                title="Số lượng đặt hàng tối thiểu (MOQ)"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%' }}>
                  <span>MOQ</span>
                  {sortIcon('minOrderQuantity')}
                </div>
              </th>

              <th
                style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => handleSort('unit')}
                title="Đơn vị nhập (DeliveryUoM / đơn vị mua hàng)"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%' }}>
                  <span>Đơn vị nhập</span>
                  {sortIcon('unit')}
                </div>
              </th>

              <th style={{ ...thStyle, textAlign: 'center' }}>Trạng thái</th>

              <th style={{ ...thStyle, textAlign: 'center' }}>Thao tác</th>
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
        <table className="so-list-table" style={{ minWidth: 1280, tableLayout: 'fixed' }}>
          {tableColGroup}
          <tbody>
            {sortedProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
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
                const supplierList =
                  p.suppliers && p.suppliers.length > 0
                    ? p.suppliers
                    : p.supplierId || p.primarySupplierCode || p.primarySupplierName
                      ? [
                          {
                            supplierId: p.supplierId || '',
                            supplierCode: p.primarySupplierCode || '',
                            supplierName: p.primarySupplierName || '',
                            costPrice: p.costPrice,
                            minOrderQuantity: p.minOrderQuantity,
                            isPrimarySupplier: p.isPrimarySupplier,
                          },
                        ]
                      : [];
                const supplierCount = p.supplierCount ?? supplierList.length;
                const multiSupplier = supplierCount > 1;
                const supplierHoverTitle = multiSupplier
                  ? supplierList
                      .map((s) => `${s.supplierCode || '—'} — ${s.supplierName || '—'}`)
                      .join('\n')
                  : undefined;

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
                    {/* Mã Cửa Hàng */}
                    <td style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#334155',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          display: 'inline-block',
                          maxWidth: '100%',
                          lineHeight: 1.35,
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
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#0f766e',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          display: 'inline-block',
                          maxWidth: '100%',
                          lineHeight: 1.35,
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

                    {/* Mã Nhà Cung Cấp — nhiều NCC → "N NCC" + hover list */}
                    <td style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: multiSupplier ? '#0f766e' : '#334155',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          display: 'inline-block',
                          maxWidth: '100%',
                          lineHeight: 1.35,
                          cursor: multiSupplier ? 'help' : undefined,
                        }}
                        title={
                          multiSupplier
                            ? supplierHoverTitle
                            : p.primarySupplierCode
                        }
                      >
                        {p.lostSupplierSource
                          ? '---'
                          : multiSupplier
                            ? `${supplierCount} NCC`
                            : p.primarySupplierCode || '---'}
                      </span>
                    </td>

                    {/* Tên Nhà Cung Cấp — nhiều NCC → "N NCC" + hover list */}
                    <td className="so-list-td--wrap">
                      <div
                        className="so-list-name"
                        title={
                          p.lostSupplierSource
                            ? 'Mất nguồn NCC — SP đang bán tại CN nhưng không còn NCC Active phục vụ'
                            : multiSupplier
                              ? supplierHoverTitle
                              : p.primarySupplierName
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                          cursor: multiSupplier ? 'help' : undefined,
                        }}
                      >
                        <span style={{ color: multiSupplier ? '#0f766e' : undefined, fontWeight: multiSupplier ? 600 : undefined }}>
                          {p.lostSupplierSource
                            ? '—'
                            : multiSupplier
                              ? `${supplierCount} NCC`
                              : p.primarySupplierName || '---'}
                        </span>
                        {!multiSupplier && p.isPrimarySupplier && !p.lostSupplierSource ? (
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
                        {p.lostSupplierSource ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#b45309',
                              background: '#fef3c7',
                              borderRadius: 4,
                              padding: '1px 6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Mất nguồn NCC
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
                    <td style={{ padding: '5px 6px', textAlign: 'right', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 600,
                          fontSize: 11,
                          color: '#64748b',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {fmt(p.costPrice)} đ
                      </span>
                    </td>

                    {/* Giá bán theo ĐVT */}
                    <td style={{ padding: '5px 6px', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        title={formatUnitPrices(p)}
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#334155',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          display: 'inline-block',
                          maxWidth: '100%',
                          lineHeight: 1.35,
                        }}
                      >
                        {formatUnitPrices(p)}
                      </span>
                    </td>

                    {/* MOQ */}
                    <td style={{ padding: '5px 6px', textAlign: 'center', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          fontSize: 11,
                          color: '#0f172a',
                          whiteSpace: 'normal',
                        }}
                      >
                        {p.minOrderQuantity ?? 1}
                      </span>
                    </td>

                    {/* DVN — đơn vị nhập */}
                    <td style={{ padding: '5px 4px', textAlign: 'center', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
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
                        title="Đơn vị nhập"
                      >
                        {p.unit || 'Cái'}
                      </span>
                    </td>

                    {/* Trạng Thái */}
                    <td
                      className="so-list-td--status"
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        padding: '5px 6px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <SupplierStatusBadge status={p.status} />
                    </td>

                    {/* Thao Tác */}
                    <td
                      className="so-list-td--actions"
                      style={{
                        padding: '5px 6px',
                        textAlign: 'center',
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
