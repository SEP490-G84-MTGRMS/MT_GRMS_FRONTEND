import { useState } from 'react';
import type { FC } from 'react';
import { X, FileCheck, CheckCircle2, Download, Receipt, ArrowRight } from 'lucide-react';
import type { TaxSnapshot, TaxSnapshotStatus } from '../types/taxSnapshot';
import { TaxSnapshotStatusBadge } from './TaxSnapshotStatusBadge';
import { mockOrdersPool } from '../api/mockTaxData';
import { TablePagination } from '../../../components/common/TablePagination';

interface Props {
  snapshot: TaxSnapshot | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: TaxSnapshotStatus) => Promise<void>;
  onOpenExportModal: (snapshot: TaxSnapshot) => void;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const TaxSnapshotDetailDrawer: FC<Props> = ({
  snapshot,
  isOpen,
  onClose,
  onUpdateStatus,
  onOpenExportModal,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'orders'>('summary');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(5);

  if (!isOpen || !snapshot) return null;

  const handleStatusChange = async (nextStatus: TaxSnapshotStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(snapshot.id, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const paginatedOrders = mockOrdersPool.slice(
    (orderPage - 1) * orderPageSize,
    orderPage * orderPageSize
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">
                Kỳ tính thuế Quý {snapshot.quarter}/{snapshot.year}
              </h2>
              <TaxSnapshotStatusBadge status={snapshot.status} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Mã tham chiếu: {snapshot.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'summary'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tổng quan nghĩa vụ thuế
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'orders'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Bảng kê hóa đơn ({snapshot.ordersCount})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'summary' ? (
            <div className="space-y-6">
              {/* Formula Card */}
              <div className="bg-teal-50/60 rounded-2xl p-4 border border-teal-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-900 uppercase">
                  <Receipt className="w-4 h-4 text-teal-700" />
                  <span>Quy định biểu thuế Hộ kinh doanh (Thông tư 40/2021/TT-BTC)</span>
                </div>
                <p className="text-xs text-teal-800 mt-2 leading-relaxed">
                  Ngành nghề: <strong>Phân phối, cung cấp hàng hóa (bán buôn, bán lẻ tạp hóa)</strong>
                  <br />
                  - Tỷ lệ thuế GTGT: <strong>1.0%</strong> trên doanh thu thực tế
                  <br />
                  - Tỷ lệ thuế TNCN: <strong>0.5%</strong> trên doanh thu thực tế
                  <br />
                  - Tổng thuế phải nộp: <strong>1.5%</strong> doanh thu chịu thuế
                </p>
              </div>

              {/* Number Details */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Tổng doanh thu bán lẻ chịu thuế</span>
                  <span className="text-base font-bold text-gray-900">
                    {formatVND(snapshot.taxableRevenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Thuế GTGT phải nộp (1%)</span>
                  <span className="font-semibold text-teal-700">{formatVND(snapshot.vatAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Thuế TNCN phải nộp (0.5%)</span>
                  <span className="font-semibold text-emerald-700">{formatVND(snapshot.pitAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-base font-bold text-gray-900">Tổng tiền thuế phải nộp</span>
                  <span className="text-xl font-bold text-teal-800">
                    {formatVND(snapshot.totalTaxAmount)}
                  </span>
                </div>
              </div>

              {/* Timestamps & Audit */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Ngày chốt số liệu:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(snapshot.generatedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                {snapshot.submittedAt && (
                  <div className="flex justify-between">
                    <span>Ngày nộp tờ khai:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(snapshot.submittedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
                {snapshot.paidAt && (
                  <div className="flex justify-between">
                    <span>Ngày hoàn tất nộp thuế:</span>
                    <span className="font-medium text-emerald-700">
                      {new Date(snapshot.paidAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
                {snapshot.note && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="font-medium text-gray-700">Ghi chú:</span> {snapshot.note}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-gray-500">
                Hiển thị các hóa đơn bán lẻ POS cấu thành doanh thu Quý {snapshot.quarter}:
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Mã hóa đơn</th>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Khách hàng</th>
                      <th className="py-2.5 px-3">PTTT</th>
                      <th className="py-2.5 px-3 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedOrders.map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-teal-50/30">
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{ord.orderCode}</td>
                        <td className="py-2.5 px-3 text-gray-500">{ord.orderDate}</td>
                        <td className="py-2.5 px-3 text-gray-700">{ord.customerName}</td>
                        <td className="py-2.5 px-3 text-gray-500">{ord.paymentMethod}</td>
                        <td className="py-2.5 px-3 font-semibold text-teal-800 text-right">
                          {formatVND(ord.finalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TablePagination for Orders */}
              <TablePagination
                currentPage={orderPage}
                pageSize={orderPageSize}
                totalItems={mockOrdersPool.length}
                pageSizeOptions={[5, 10, 20]}
                onPageChange={setOrderPage}
                onPageSizeChange={(newSize) => {
                  setOrderPageSize(newSize);
                  setOrderPage(1);
                }}
                itemLabel="hóa đơn"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button onClick={() => onOpenExportModal(snapshot)} className="btn-secondary-pill">
            <Download className="w-4 h-4" />
            <span>Xuất tờ khai Form 01</span>
          </button>

          <div className="flex items-center gap-2">
            {snapshot.status === 'Draft' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('Finalized')}
                className="btn-primary-pill disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                <span>Chốt số liệu</span>
              </button>
            )}

            {snapshot.status === 'Finalized' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('Submitted')}
                className="btn-primary-pill disabled:opacity-50"
              >
                <span>Đánh dấu Đã nộp tờ khai</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {snapshot.status === 'Submitted' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('Paid')}
                className="btn-primary-pill disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận Đã nộp thuế</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
