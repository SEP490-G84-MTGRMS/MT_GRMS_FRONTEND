import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  Building,
  Calendar,
} from 'lucide-react';
import type {
  BranchOption,
  KpiSummaryData,
  PnlFilterParams,
  PnlLineItem,
} from '../types/reportsPnl.types';

interface PnlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: PnlFilterParams;
  branches: BranchOption[];
  kpi?: KpiSummaryData;
  pnlTree: PnlLineItem[];
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Modal dialog for export options (CSV/Excel download and A4 Print Preview).
 */
export const PnlExportModal: React.FC<PnlExportModalProps> = ({
  isOpen,
  onClose,
  filter,
  branches,
  kpi,
  pnlTree,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'EXCEL' | 'PDF'>('PDF');

  if (!isOpen) return null;

  const currentBranchName =
    branches.find((b) => b.id === filter.branchId)?.name || 'Toàn hệ thống';

  // Export CSV generator
  const handleDownloadCsv = () => {
    const headers = ['Mã', 'Khoản mục tài chính', 'Số tiền (VNĐ)', 'Tỷ lệ % / Doanh thu'];
    const rows: string[] = [headers.join(',')];

    const appendItems = (items: PnlLineItem[]) => {
      for (const it of items) {
        rows.push(
          `"${it.code}","${it.title.replace(/"/g, '""')}",${it.amount},"${it.percentageOfNetRevenue}%"`
        );
        if (it.children) appendItems(it.children);
      }
    };

    appendItems(pnlTree);

    const blob = new Blob(['\uFEFF' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bao_Cao_PNL_${filter.startDate}_${filter.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('Đã xuất báo cáo P&L sang file Excel (.csv) thành công!', 'success');
  };

  const handlePrint = () => {
    onShowToast?.('Đang mở hộp thoại in / xuất bản in PDF khổ A4...', 'info');
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-[24px] shadow-2xl border border-teal-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-teal-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl shadow-xs">
              <Printer size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                In & Xuất Báo Cáo Tài Chính P&L
              </h2>
              <p className="text-xs text-gray-500">
                Xuất file Excel (.csv) hoặc xem trước bản in chuẩn khổ giấy A4
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-200 px-6 bg-white gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('PDF')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'PDF'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Printer size={15} />
            Bản In / Xuất PDF (Khổ A4)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EXCEL')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'EXCEL'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileSpreadsheet size={15} />
            Bảng Tính Excel (.CSV)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/40">
          {activeTab === 'PDF' ? (
            /* A4 Print Sheet Preview */
            <div
              id="printable-pnl-sheet"
              className="bg-white border border-gray-300 rounded-lg p-8 shadow-sm max-w-3xl mx-auto text-gray-900 text-xs"
            >
              {/* Report Header */}
              <div className="border-b-2 border-gray-800 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold uppercase tracking-wide text-emerald-800">
                      HỆ THỐNG BÁN LẺ TẠP HÓA MT-GRMS
                    </h3>
                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                      <Building size={12} />
                      Chi nhánh: <span className="font-semibold">{currentBranchName}</span>
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-gray-500">
                    <p>Mẫu số: B02-DNN</p>
                    <p>Ban hành theo TT 133/2016/TT-BTC</p>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <h1 className="text-lg font-black text-gray-900 uppercase">
                    BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (P&L)
                  </h1>
                  <p className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
                    <Calendar size={12} />
                    Thời gian: Từ ngày {filter.startDate} đến ngày {filter.endDate}
                  </p>
                </div>
              </div>

              {/* KPI Mini Summary */}
              {kpi && (
                <div className="grid grid-cols-4 gap-2 mb-6 p-3 bg-gray-50 border border-gray-200 rounded-md text-center">
                  <div>
                    <p className="text-[10px] text-gray-500">DOANH THU THUẦN</p>
                    <p className="font-bold text-xs text-gray-900">
                      {formatVnd(kpi.netRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">GIÁ VỐN (COGS)</p>
                    <p className="font-bold text-xs text-gray-900">
                      {formatVnd(kpi.cogs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">CHI PHÍ VẬN HÀNH</p>
                    <p className="font-bold text-xs text-gray-900">
                      {formatVnd(kpi.operatingExpenses + kpi.shrinkageLoss)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">LỢI NHUẬN RÒNG</p>
                    <p className="font-bold text-xs text-emerald-700">
                      {formatVnd(kpi.netProfit)}
                    </p>
                  </div>
                </div>
              )}

              {/* Statement Items Table */}
              <table className="w-full border-collapse border border-gray-300 text-xs mb-8">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800">
                    <th className="border border-gray-300 p-2 w-16 text-center">Mã</th>
                    <th className="border border-gray-300 p-2 text-left">Chỉ Tiêu Tài Chính</th>
                    <th className="border border-gray-300 p-2 text-right w-36">Số Tiền (VNĐ)</th>
                    <th className="border border-gray-300 p-2 text-right w-24">Tỷ Lệ %</th>
                  </tr>
                </thead>
                <tbody>
                  {pnlTree.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.isTotal
                          ? 'font-bold bg-emerald-50/60'
                          : row.isHeader
                          ? 'font-bold bg-gray-50'
                          : ''
                      }
                    >
                      <td className="border border-gray-300 p-1.5 text-center font-mono text-[11px]">
                        {row.code}
                      </td>
                      <td
                        className={`border border-gray-300 p-1.5 ${
                          row.level === 2 ? 'pl-6' : row.level === 3 ? 'pl-10' : ''
                        }`}
                      >
                        {row.title}
                      </td>
                      <td className="border border-gray-300 p-1.5 text-right font-medium">
                        {formatVnd(row.amount)}
                      </td>
                      <td className="border border-gray-300 p-1.5 text-right font-medium">
                        {row.percentageOfNetRevenue}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-3 text-center text-xs pt-4 mt-8 border-t border-gray-200">
                <div>
                  <p className="font-bold">Người Lập Biểu</p>
                  <p className="text-[11px] text-gray-400 italic">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Nhân viên kế toán</p>
                </div>
                <div>
                  <p className="font-bold">Kế Toán Trưởng</p>
                  <p className="text-[11px] text-gray-400 italic">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Trưởng ban kiểm soát</p>
                </div>
                <div>
                  <p className="font-bold">Giám Đốc / Chủ Tiệm</p>
                  <p className="text-[11px] text-gray-400 italic">(Ký, đóng dấu)</p>
                  <div className="h-16" />
                  <p className="font-semibold text-emerald-800">Store Owner</p>
                </div>
              </div>
            </div>
          ) : (
            /* Excel Tab */
            <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet size={32} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                Xuất Bảng Tính Excel (.CSV UTF-8)
              </h3>
              <p className="text-xs text-gray-500 mb-6 max-w-md mx-auto">
                File tải về hỗ trợ chuẩn tiếng Việt UTF-8 có BOM, mở trực tiếp bằng Microsoft Excel mà không bị lỗi font chữ.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="btn-primary-pill text-xs"
                >
                  <Download size={16} />
                  Tải Xuống File .CSV
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
          <p className="text-xs text-gray-400">
            * Nhấn Ctrl+P hoặc nút in để kích hoạt máy in / lưu file PDF
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-pill text-xs"
            >
              Đóng
            </button>
            {activeTab === 'PDF' && (
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary-pill text-xs"
              >
                <Printer size={15} />
                In / Lưu PDF Ngay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
