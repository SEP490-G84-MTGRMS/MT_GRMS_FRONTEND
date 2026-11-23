import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { SupplierProductItem, SupplierSummary } from '../../types/supplier.types';
import { SupplierProductTableRow } from './SupplierProductTableRow';
import { TablePagination } from '../../../../components/common';
import { ArrowUpDown, Package, Plus } from 'lucide-react';

interface SupplierProductTableProps {
  products: SupplierProductItem[];
  suppliers: SupplierSummary[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (item: SupplierProductItem) => void;
  onToggleStatus: (item: SupplierProductItem) => void;
  onSetPrimary?: (item: SupplierProductItem) => void;
  onOpenAssignModal: () => void;
}

type SortField =
  | 'sku'
  | 'name'
  | 'supplierCode'
  | 'agreedPrice'
  | 'moq'
  | 'allowedShortageQty'
  | 'status';
type SortDirection = 'asc' | 'desc';

export const SupplierProductTable: FC<SupplierProductTableProps> = ({
  products,
  suppliers,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onToggleStatus,
  onSetPrimary,
  onOpenAssignModal,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const supplierMap = useMemo(() => {
    const map = new Map<string, SupplierSummary>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

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
        case 'supplierCode': {
          const suppA = supplierMap.get(a.supplierId)?.code || a.supplierId;
          const suppB = supplierMap.get(b.supplierId)?.code || b.supplierId;
          valA = suppA.toLowerCase();
          valB = suppB.toLowerCase();
          break;
        }
        case 'agreedPrice':
          valA = a.agreedPrice;
          valB = b.agreedPrice;
          break;
        case 'moq':
          valA = a.moq;
          valB = b.moq;
          break;
        case 'allowedShortageQty':
          valA = a.allowedShortageQty ?? 0;
          valB = b.allowedShortageQty ?? 0;
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
  }, [products, sortField, sortDir, supplierMap]);

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);
  const [emptyViewportWidth, setEmptyViewportWidth] = useState(0);

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
      <col style={{ width: 48 }} />
      <col style={{ width: 64 }} />
      <col style={{ width: 120 }} />
      <col style={{ width: 220 }} />
      <col style={{ width: 110 }} />
      <col style={{ width: 190 }} />
      <col style={{ width: 130 }} />
      <col style={{ width: 105 }} />
      <col style={{ width: 130 }} />
      <col style={{ width: 100 }} />
      <col style={{ width: 125 }} />
      <col style={{ width: 120 }} />
      <col style={{ width: 100 }} />
    </colgroup>
  );

  const thBaseStyle: React.CSSProperties = {
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

  const sortIcon = (field: typeof sortField) => (
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
        <table className="so-list-table supplier-product-data-table">
          {tableColGroup}
          <thead>
            <tr>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>STT</th>

              <th style={{ ...thBaseStyle, textAlign: 'center' }}>
                <span>Ảnh</span>
              </th>

              <th
                onClick={() => handleSort('sku')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã SKU"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>SKU</span>
                  {sortIcon('sku')}
                </div>
              </th>

              <th
                onClick={() => handleSort('name')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo tên sản phẩm"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên SP</span>
                  {sortIcon('name')}
                </div>
              </th>

              <th
                onClick={() => handleSort('supplierCode')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã nhà cung cấp"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã NCC</span>
                  {sortIcon('supplierCode')}
                </div>
              </th>

              <th style={thBaseStyle}>
                <span>Tên NCC</span>
              </th>

              <th style={thBaseStyle}>
                <span>Ngành hàng</span>
              </th>

              <th style={{ ...thBaseStyle, textAlign: 'center' }} title="Đơn vị nhập">
                <span>Đơn vị nhập</span>
              </th>

              <th
                onClick={() => handleSort('agreedPrice')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer' }}
                title="Sắp xếp theo giá nhập sỉ"
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
                  <span>Giá nhập sỉ</span>
                  {sortIcon('agreedPrice')}
                </div>
              </th>

              <th
                onClick={() => handleSort('moq')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer' }}
                title="Số lượng đặt hàng tối thiểu (MOQ)"
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
                  <span>MOQ</span>
                  {sortIcon('moq')}
                </div>
              </th>

              <th
                onClick={() => handleSort('allowedShortageQty')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer' }}
                title="Số lượng thiếu cho phép"
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
                  <span>Thiếu cho phép</span>
                  {sortIcon('allowedShortageQty')}
                </div>
              </th>

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

              <th style={{ ...thBaseStyle, textAlign: 'center' }}>
                <span>Thao tác</span>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Table Body Scroll Container (Vertical scroll strictly in rows area) ── */}
      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table supplier-product-data-table">
          {tableColGroup}
          <tbody>
            {sortedProducts.length > 0 ? (
              sortedProducts.map((p, idx) => {
                const supp = supplierMap.get(p.supplierId);
                return (
                  <SupplierProductTableRow
                    key={p.id}
                    index={(pageIndex - 1) * pageSize + idx + 1}
                    item={p}
                    supplierCode={supp?.code}
                    supplierName={supp?.name}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onSetPrimary={onSetPrimary}
                  />
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={13}
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
                      Bạn có thể xóa bớt điều kiện lọc hoặc gán thêm sản phẩm mới từ danh mục Master.
                    </span>
                    <button
                      type="button"
                      onClick={onOpenAssignModal}
                      className="po-btn po-btn-primary"
                      style={{
                        marginTop: 8,
                        height: 32,
                        padding: '0 14px',
                        alignSelf: 'center',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Plus size={14} />
                      <span>Gán sản phẩm ngay</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang chuẩn 1, 2, 3... ── */}
      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        pageSizeOptions={[15, 20, 36, 48]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="mặt hàng"
      />
    </div>
  );
};
