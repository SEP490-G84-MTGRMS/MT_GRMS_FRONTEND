import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { SupplierProductItem, SupplierSummary } from '../../types/supplier.types';
import { SupplierProductTableRow } from './SupplierProductTableRow';
import { ArrowUpDown, ChevronLeft, ChevronRight, Package, Plus } from 'lucide-react';

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

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

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
      <col style={{ width: '3%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '22%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '10%' }} />
    </colgroup>
  );

  const thBaseStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
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
      {/* ── Table Header (Fixed at top, strictly outside vertical scroll) ── */}
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
            minWidth: 1000,
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
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>#</th>

              <th
                onClick={() => handleSort('sku')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã SKU</span>
                  <ArrowUpDown size={12} color={sortField === 'sku' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('name')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Tên Sản Phẩm</span>
                  <ArrowUpDown size={12} color={sortField === 'name' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('supplierCode')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã NCC</span>
                  <ArrowUpDown size={12} color={sortField === 'supplierCode' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th style={thBaseStyle}>
                <span>Nhà Cung Cấp</span>
              </th>

              <th style={thBaseStyle}>
                <span>Ngành Hàng</span>
              </th>

              <th style={{ ...thBaseStyle, textAlign: 'center' }}>
                <span>ĐVT</span>
              </th>

              <th
                onClick={() => handleSort('agreedPrice')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span>Giá Nhập Sỉ</span>
                  <ArrowUpDown size={12} color={sortField === 'agreedPrice' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('moq')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span>MOQ</span>
                  <ArrowUpDown size={12} color={sortField === 'moq' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                style={{ ...thBaseStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span>Trạng Thái</span>
                  <ArrowUpDown size={12} color={sortField === 'status' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th style={{ ...thBaseStyle, textAlign: 'right' }}>
                <span>Thao Tác</span>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Table Body Scroll Container (Vertical scroll strictly in rows area) ── */}
      <div
        ref={bodyRef}
        onScroll={handleBodyScroll}
        style={{
          overflowY: 'auto',
          overflowX: 'auto',
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1000,
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'left',
            fontSize: 12.5,
          }}
        >
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
                  colSpan={12}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#64748b',
                    fontSize: 13,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
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
                      style={{ marginTop: 8, height: 32, padding: '0 14px' }}
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

      {/* ── Footer Phân trang (Paging) tích hợp chuẩn theo SupplierTable ── */}
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
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> mặt hàng
          </div>

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
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
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
