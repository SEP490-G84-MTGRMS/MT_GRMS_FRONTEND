import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierSummary } from '../types/supplier.types';
import { TablePagination } from '../../../components/common';
import { SupplierTableRow } from './SupplierTableRow';

interface Props {
  suppliers: SupplierSummary[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onViewDetail: (supplier: SupplierSummary) => void;
  onEdit: (supplier: SupplierSummary) => void;
  onPayDebt: (supplier: SupplierSummary) => void;
}

export const SupplierTable: FC<Props> = ({
  suppliers,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onEdit,
  onPayDebt,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === suppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="admin-table-card" style={{ overflowX: 'hidden' }}>
      <table className="admin-data-table supplier-admin-table" style={{ width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '3%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '9.5%' }} />
          <col style={{ width: '15.5%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '13%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: '3%', textAlign: 'center', padding: '10px 4px' }}>
              <input
                type="checkbox"
                checked={suppliers.length > 0 && selectedIds.length === suppliers.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th style={{ width: '7%' }}>Mã NCC</th>
            <th style={{ width: '17%' }}>Tên Nhà Cung Cấp</th>
            <th style={{ width: '9.5%', textAlign: 'center' }}>Phân loại</th>
            <th style={{ width: '15.5%' }}>Người liên hệ</th>
            <th style={{ width: '7%', textAlign: 'center' }}>Hạn nợ</th>
            <th style={{ width: '11%', textAlign: 'right' }}>Đang nợ</th>
            <th style={{ width: '9%', textAlign: 'right' }}>Quá hạn</th>
            <th style={{ width: '8%', textAlign: 'center' }}>Trạng thái</th>
            <th style={{ width: '13%', textAlign: 'right' }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <SupplierTableRow
                key={supplier.id}
                supplier={supplier}
                onViewDetail={onViewDetail}
                onEdit={onEdit}
                onPayDebt={onPayDebt}
                isSelected={selectedIds.includes(supplier.id)}
                onToggleSelect={toggleSelectOne}
              />
            ))
          ) : (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                🔍 Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc hiện tại.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Shared Pagination Footer */}
      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        itemLabel="nhà cung cấp"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};
