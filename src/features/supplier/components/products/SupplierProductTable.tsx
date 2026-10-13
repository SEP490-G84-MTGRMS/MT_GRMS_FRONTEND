import { useState, useMemo } from 'react';
import type { FC } from 'react';
import type { SupplierProductItem, SupplierSummary } from '../../types/supplier.types';
import { SupplierProductTableRow } from './SupplierProductTableRow';
import { PackageX, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface SupplierProductTableProps {
  products: SupplierProductItem[];
  suppliers: SupplierSummary[];
  onEdit: (item: SupplierProductItem) => void;
  onToggleStatus: (item: SupplierProductItem) => void;
  onOpenAssignModal: () => void;
}

export const SupplierProductTable: FC<SupplierProductTableProps> = ({
  products,
  suppliers,
  onEdit,
  onToggleStatus,
  onOpenAssignModal,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(products.length / pageSize) || 1;

  const startIndex = (currentPage - 1) * pageSize;
  const currentProducts = products.slice(startIndex, startIndex + pageSize);

  // Map of supplier details by id for quick lookup
  const supplierMap = useMemo(() => {
    const map = new Map<string, SupplierSummary>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  return (
    <div className="admin-table-card">
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="admin-data-table">
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>

          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>#</th>
              <th>Mã Vạch</th>
              <th>Mã SKU</th>
              <th>Tên Sản Phẩm</th>
              <th>Mã NCC</th>
              <th>Tên Nhà Cung Cấp</th>
              <th>Ngành Hàng</th>
              <th style={{ textAlign: 'center' }}>ĐVT</th>
              <th style={{ textAlign: 'right' }}>Giá Nhập Sỉ Thỏa Thuận</th>
              <th style={{ textAlign: 'right' }}>MOQ</th>
              <th style={{ textAlign: 'center' }}>Trạng Thái</th>
              <th style={{ textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>

          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map((p, idx) => {
                const supp = supplierMap.get(p.supplierId);
                return (
                  <SupplierProductTableRow
                    key={p.id}
                    index={startIndex + idx + 1}
                    item={p}
                    supplierCode={supp?.code}
                    supplierName={supp?.name}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan={12} style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 9999,
                        backgroundColor: '#eff6ff',
                        color: 'var(--blue-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PackageX size={28} />
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                      Chưa có sản phẩm nào phù hợp với bộ lọc
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: 380 }}>
                      Bạn có thể xóa bớt điều kiện lọc hoặc gán thêm sản phẩm mới từ danh mục
                      Master vào Nhà cung cấp này.
                    </div>
                    <button
                      type="button"
                      onClick={onOpenAssignModal}
                      className="admin-btn admin-btn-primary"
                      style={{ marginTop: 6 }}
                    >
                      <Plus size={14} /> Gán sản phẩm ngay
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {products.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Hiển thị <b>{Math.min(startIndex + 1, products.length)}</b> –{' '}
            <b>{Math.min(startIndex + pageSize, products.length)}</b> trong tổng số{' '}
            <b>{products.length}</b> sản phẩm
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border-mid)',
                backgroundColor: currentPage === 1 ? 'var(--bg-soft-blue)' : '#ffffff',
                color: currentPage === 1 ? 'var(--border-mid)' : 'var(--text-main)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${page === currentPage ? 'var(--blue-primary)' : 'var(--border-mid)'}`,
                  backgroundColor: page === currentPage ? 'var(--blue-primary)' : '#ffffff',
                  color: page === currentPage ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.82rem',
                  fontWeight: page === currentPage ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border-mid)',
                backgroundColor: currentPage === totalPages ? 'var(--bg-soft-blue)' : '#ffffff',
                color: currentPage === totalPages ? 'var(--border-mid)' : 'var(--text-main)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
