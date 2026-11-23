import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import { ArrowUpDown, Edit3, Package, Plus } from 'lucide-react';
import type { ProductItem } from '../types';
import { TablePagination } from '../../../components/common';

interface MasterProductTableProps {
  products: ProductItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  userRole: 'StoreOwner' | 'Cashier' | string;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (item: ProductItem) => void;
  onOpenCreate: () => void;
}

type SortField = 'sku' | 'name' | 'sellingPrice' | 'costPrice' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const thBaseStyle: CSSProperties = {
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

/** Dense: xuống dòng thay vì cắt … — đồng bộ SP theo cửa hàng */
const cellTextStyle: CSSProperties = {
  display: 'inline-block',
  maxWidth: '100%',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  lineHeight: 1.35,
  fontSize: 11,
};

type UnitChip = { name: string; isPurchase: boolean; sellingPrice: number };

function getUnitChips(p: ProductItem): UnitChip[] {
  const baseName = (p.baseUnit || 'Cái').trim() || 'Cái';
  const purchaseFromFlag = p.uomConversions?.find((u) => Boolean(u.isPurchaseUnit))?.unitName?.trim();
  const purchaseUnitName = (
    purchaseFromFlag ||
    p.purchaseUnit ||
    (p.isBaseUnitPurchaseUnit !== false ? baseName : '')
  ).trim();

  const chips: UnitChip[] = [
    {
      name: baseName,
      isPurchase: purchaseUnitName.toLowerCase() === baseName.toLowerCase(),
      sellingPrice: p.sellingPrice || 0,
    },
  ];
  for (const u of p.uomConversions || []) {
    const name = (u.unitName || '').trim();
    if (!name) continue;
    chips.push({
      name,
      isPurchase:
        Boolean(u.isPurchaseUnit) || purchaseUnitName.toLowerCase() === name.toLowerCase(),
      sellingPrice: u.price || 0,
    });
  }
  return chips;
}

export const MasterProductTable: FC<MasterProductTableProps> = ({
  products,
  totalCount,
  pageIndex,
  pageSize,
  userRole,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onOpenCreate,
}) => {
  const showCost = userRole === 'StoreOwner';
  const [sortField, setSortField] = useState<SortField | null>('sku');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);
  const [emptyViewportWidth, setEmptyViewportWidth] = useState(0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
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
      let cmp = 0;
      switch (sortField) {
        case 'sku':
          cmp = (a.productCode || '').localeCompare(b.productCode || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          });
          break;
        case 'name':
          cmp = (a.productName || '').localeCompare(b.productName || '', 'vi', { sensitivity: 'base' });
          break;
        case 'sellingPrice':
          cmp = (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0);
          break;
        case 'costPrice':
          cmp = (a.costPrice ?? 0) - (b.costPrice ?? 0);
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '');
          break;
        case 'createdAt': {
          const timeA = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0;
          const timeB = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0;
          cmp = timeA - timeB;
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [products, sortField, sortDir]);

  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
        setEmptyViewportWidth(bodyRef.current.clientWidth);
      }
    };
    updateScrollState();
    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateScrollState());
      observer.observe(bodyRef.current);
    }
    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      observer?.disconnect();
    };
  }, [sortedProducts, pageSize, showCost]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  /** Cột % tổng 100% — fit viewport, không ép min-width → không scroll ngang màn hình. */
  const tableColGroup = (
    <colgroup>
      <col style={{ width: '3.5%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: showCost ? '9%' : '10%' }} />
      <col style={{ width: showCost ? '15%' : '17%' }} />
      <col style={{ width: showCost ? '12%' : '14%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: showCost ? '16%' : '18%' }} />
      {showCost && <col style={{ width: '9%' }} />}
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: showCost ? '6.5%' : '8.5%' }} />
    </colgroup>
  );

  const tableFitStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
    tableLayout: 'fixed',
  };

  const colSpan = showCost ? 11 : 10;

  const sortIcon = (field: SortField) => (
    <ArrowUpDown
      size={11}
      style={{ color: sortField === field ? '#0f766e' : '#94a3b8', flexShrink: 0 }}
    />
  );

  return (
    <div className="so-list-table-card so-list-table-card--fit so-list-table-card--dense">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={tableFitStyle}>
          {tableColGroup}
          <thead>
            <tr>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>#</th>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>Ảnh</th>
              <th
                onClick={() => handleSort('sku')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã hàng</span>
                  {sortIcon('sku')}
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo tên hàng hóa"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên hàng</span>
                  {sortIcon('name')}
                </div>
              </th>
              <th style={thBaseStyle}>
                <span>Đơn vị</span>
              </th>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>
                <span>Lô &amp; HSD</span>
              </th>
              <th
                onClick={() => handleSort('sellingPrice')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer' }}
                title="Sắp xếp theo giá bán"
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 3,
                    width: '100%',
                  }}
                >
                  <span>Giá bán / khay</span>
                  {sortIcon('sellingPrice')}
                </div>
              </th>
              {showCost && (
                <th
                  onClick={() => handleSort('costPrice')}
                  style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer' }}
                  title="Sắp xếp theo giá vốn"
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 3,
                      width: '100%',
                    }}
                  >
                    <span>Giá vốn</span>
                    {sortIcon('costPrice')}
                  </div>
                </th>
              )}
              <th
                onClick={() => handleSort('status')}
                style={{ ...thBaseStyle, textAlign: 'center', cursor: 'pointer' }}
                title="Sắp xếp theo trạng thái"
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    width: '100%',
                  }}
                >
                  <span>Trạng thái</span>
                  {sortIcon('status')}
                </div>
              </th>
              <th
                onClick={() => handleSort('createdAt')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo ngày tạo"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Ngày tạo</span>
                  {sortIcon('createdAt')}
                </div>
              </th>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>
                <span>Thao tác</span>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table" style={tableFitStyle}>
          {tableColGroup}
          <tbody>
            {sortedProducts.length > 0 ? (
              sortedProducts.map((p, idx) => {
                const unitChips = getUnitChips(p);
                const unitsTitle = unitChips
                  .map((u) => (u.isPurchase ? `${u.name} (nhập)` : u.name))
                  .join(' · ');
                const priceTitle = unitChips
                  .map((u) => `${u.name}: ${(u.sellingPrice || 0).toLocaleString('vi-VN')} đ`)
                  .concat(
                    p.allowRepack
                      ? [
                          `Khay: ${(
                            (p.processedSellingPricePerKg && p.processedSellingPricePerKg > 0
                              ? p.processedSellingPricePerKg
                              : p.sellingPrice) ?? 0
                          ).toLocaleString('vi-VN')} đ/kg`,
                        ]
                      : []
                  )
                  .join(' · ');
                const costTitle =
                  p.costPrice != null && Number(p.costPrice) > 0
                    ? `${Number(p.costPrice).toLocaleString('vi-VN')} đ/${(p.baseUnit || '').trim() || 'ĐVT'}`
                    : '';
                const stt = (pageIndex - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={p.id}
                    style={{
                      backgroundColor: p.status === 'Discontinued' || p.status === 'Inactive' ? '#f8fafc' : undefined,
                      opacity: p.status === 'Discontinued' || p.status === 'Inactive' ? 0.75 : 1,
                    }}
                  >
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '5px 6px',
                        color: '#64748b',
                        fontWeight: 600,
                        fontSize: 11,
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {stt}
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '5px 4px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt=""
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            objectFit: 'cover',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            margin: '0 auto',
                            borderRadius: 6,
                            border: '1px dashed #cbd5e1',
                            backgroundColor: '#f8fafc',
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
                    <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        className="product-code-link"
                        style={{ ...cellTextStyle, fontWeight: 700, color: '#0f766e' }}
                        title={p.productCode}
                      >
                        {p.productCode}
                      </span>
                    </td>
                    <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{ ...cellTextStyle, fontWeight: 600, color: '#1e293b' }}
                        title={p.productName}
                      >
                        {p.productName}
                        {p.isCombo ? ' · Combo' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '5px 6px', fontSize: 11, borderBottom: '1px solid #f1f5f9' }}>
                      <span style={cellTextStyle} title={unitsTitle}>
                        {unitChips.map((u, i) => (
                          <span key={`${u.name}-${i}`}>
                            {i > 0 ? ' · ' : ''}
                            <span
                              style={
                                u.isPurchase
                                  ? { color: '#0F766E', fontWeight: 700 }
                                  : { color: '#334155', fontWeight: 500 }
                              }
                            >
                              {u.name}
                              {u.isPurchase ? ' (nhập)' : ''}
                            </span>
                          </span>
                        ))}
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '5px 6px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {p.hasBatches ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: '#1d4ed8',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '2px 6px',
                            borderRadius: 999,
                          }}
                        >
                          Có
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '5px 6px',
                        fontWeight: 600,
                        color: '#1e293b',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <span style={{ ...cellTextStyle, textAlign: 'right' }} title={priceTitle}>
                        {priceTitle}
                      </span>
                    </td>
                    {showCost && (
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '5px 6px',
                          color: '#64748b',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{ ...cellTextStyle, textAlign: 'right' }}
                          title={costTitle || undefined}
                        >
                          {costTitle || '—'}
                        </span>
                      </td>
                    )}
                    <td
                      className="so-list-td--status"
                      style={{
                        textAlign: 'center',
                        padding: '5px 6px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          backgroundColor: p.status === 'Active' ? '#f0fdf4' : '#f8fafc',
                          color: p.status === 'Active' ? '#15803d' : '#64748b',
                          border: p.status === 'Active' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.status === 'Active' ? 'Đang bán' : 'Ngừng KD'}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '5px 6px',
                        fontSize: 11,
                        color: '#64748b',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <span style={cellTextStyle} title={p.createdAt}>
                        {p.createdAt}
                      </span>
                    </td>
                    <td
                      className="so-list-td--actions"
                      style={{
                        textAlign: 'center',
                        padding: '5px 6px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div className="so-list-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="so-list-action-btn"
                          title="Chỉnh sửa hàng hóa"
                          aria-label={`Chỉnh sửa ${p.productName}`}
                          onClick={() => onEdit(p)}
                        >
                          <Edit3 size={11} />
                          <span>Sửa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={colSpan}
                  style={{
                    padding: 0,
                    borderBottom: '1px solid #f1f5f9',
                    verticalAlign: 'middle',
                  }}
                >
                  <div
                    style={{
                      position: 'sticky',
                      left: 0,
                      width: emptyViewportWidth || '100%',
                      minHeight: 220,
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '48px 16px',
                      color: '#64748b',
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  >
                    <Package size={36} color="#cbd5e1" />
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Chưa có sản phẩm nào phù hợp với bộ lọc
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Thử đặt lại bộ lọc hoặc thêm hàng hóa mới vào danh mục Master.
                    </span>
                    <button
                      type="button"
                      onClick={onOpenCreate}
                      className="po-btn po-btn-primary"
                      style={{
                        marginTop: 8,
                        height: 32,
                        padding: '0 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Plus size={14} />
                      <span>Thêm hàng hóa</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        pageSizeOptions={[15, 20, 36, 48]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="hàng hóa"
        isLoading={isLoading}
      />
    </div>
  );
};

export default MasterProductTable;
