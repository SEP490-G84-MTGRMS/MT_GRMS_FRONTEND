import { useState, useMemo } from 'react';
import type { FC } from 'react';
import type { SupplierProductItem, SupplierSummary } from '../../types/supplier.types';
import { TablePagination } from '../../../../components/common';
import { SupplierProductTableRow } from './SupplierProductTableRow';
import { PackageX, Plus } from 'lucide-react';

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
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const startIndex = (currentPage - 1) * pageSize;
  const currentProducts = products.slice(startIndex, startIndex + pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.length === currentProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
            <col style={{ width: 30 }} />
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
              <th style={{ width: 30, textAlign: 'center', padding: '10px 4px' }}>
                <input
                  type="checkbox"
                  checked={currentProducts.length > 0 && selectedIds.length === currentProducts.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th style={{ textAlign: 'center' }}>#</th>
              <th>Mã Vạch</th>
              <th>Mã SKU</th>
              <th>Tên Sản Phẩm</th>
              <th>Mã NCC</th>
              <th>Tên Nhà Cung Cấp</th>
              <th>Ngành Hàng</th>
              <th style={{ textAlign: 'left' }}>ĐVT</th>
              <th style={{ textAlign: 'right' }}>Giá Nhập Sỉ Thỏa Thuận</th>
              <th style={{ textAlign: 'right' }}>MOQ</th>
              <th style={{ textAlign: 'left' }}>Trạng Thái</th>
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
                    isSelected={selectedIds.includes(p.id)}
                    onToggleSelect={toggleSelectOne}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan={13} style={{ padding: '60px 20px', textAlign: 'center' }}>
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

      {/* Shared Pagination Footer */}
      {products.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={products.length}
          itemLabel="sản phẩm"
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
};
