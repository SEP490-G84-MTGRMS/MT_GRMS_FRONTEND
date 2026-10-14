import { useState } from 'react';
import type { FC } from 'react';
import { Eye, FileCheck, CheckCircle2, Trash2 } from 'lucide-react';
import type { TaxSnapshot } from '../types/taxSnapshot';
import { TaxSnapshotStatusBadge } from './TaxSnapshotStatusBadge';
import { TablePagination } from '../../../components/common/TablePagination';

interface Props {
  snapshots: TaxSnapshot[];
  isLoading: boolean;
  onViewDetail: (snapshot: TaxSnapshot) => void;
  onFinalize: (snapshot: TaxSnapshot) => void;
  onMarkPaid: (snapshot: TaxSnapshot) => void;
  onDelete: (snapshot: TaxSnapshot) => void;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const TaxSnapshotTable: FC<Props> = ({
  snapshots,
  isLoading,
  onViewDetail,
  onFinalize,
  onMarkPaid,
  onDelete,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-500">Đang tải danh sách kỳ tính thuế...</p>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mx-auto mb-3">
          <FileCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Chưa có kỳ tính thuế nào</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          Bấm "Tạo kỳ tính thuế" để bắt đầu quét doanh thu và chốt số liệu thuế Quý theo Thông tư 40.
        </p>
      </div>
    );
  }

  // Client-side pagination slice
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSnapshots = snapshots.slice(startIndex, startIndex + pageSize);

  return (
    <div className="tax-table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm tax-table">
          <thead>
            <tr>
              <th>Kỳ tính thuế</th>
              <th>Doanh thu chịu thuế</th>
              <th>VAT (1%)</th>
              <th>PIT (0.5%)</th>
              <th>Tổng thuế (1.5%)</th>
              <th>Số hóa đơn</th>
              <th>Trạng thái</th>
              <th>Ngày tạo / Chốt</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSnapshots.map((s) => (
              <tr key={s.id} className="transition-colors">
                <td className="font-semibold text-gray-900">
                  Quý {s.quarter}/{s.year}
                </td>
                <td className="font-medium text-gray-900">
                  {formatVND(s.taxableRevenue)}
                </td>
                <td className="text-teal-700 font-medium">
                  {formatVND(s.vatAmount)}
                </td>
                <td className="text-emerald-700 font-medium">
                  {formatVND(s.pitAmount)}
                </td>
                <td className="text-gray-900 font-bold">
                  {formatVND(s.totalTaxAmount)}
                </td>
                <td className="text-gray-600">
                  {s.ordersCount.toLocaleString('vi-VN')} đơn
                </td>
                <td>
                  <TaxSnapshotStatusBadge status={s.status} />
                </td>
                <td className="text-xs text-gray-500">
                  {new Date(s.generatedAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onViewDetail(s)}
                      className="p-1.5 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                      title="Xem chi tiết & bảng kê"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {s.status === 'Draft' && (
                      <>
                        <button
                          onClick={() => onFinalize(s)}
                          className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          title="Chốt số liệu kỳ thuế"
                        >
                          <FileCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(s)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa nháp"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {s.status === 'Submitted' && (
                      <button
                        onClick={() => onMarkPaid(s)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Xác nhận đã hoàn thành nộp thuế"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shared TablePagination Component */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={snapshots.length}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setCurrentPage(1);
        }}
        itemLabel="kỳ tính thuế"
      />
    </div>
  );
};
