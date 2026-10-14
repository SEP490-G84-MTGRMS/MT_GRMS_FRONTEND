import { useState } from 'react';
import type { FC } from 'react';
import { X, FileSpreadsheet, Code, CheckCircle } from 'lucide-react';
import type { TaxSnapshot } from '../types/taxSnapshot';

interface Props {
  snapshot: TaxSnapshot | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaxExportModal: FC<Props> = ({ snapshot, isOpen, onClose }) => {
  const [exportType, setExportType] = useState<'excel' | 'xml'>('excel');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  if (!isOpen || !snapshot) return null;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      // Simulate file download
      const filename =
        exportType === 'excel'
          ? `To_Khai_Thue_HKD_Q${snapshot.quarter}_${snapshot.year}.xlsx`
          : `To_Khai_Form_01_CNKD_Q${snapshot.quarter}_${snapshot.year}.xml`;

      const dummyContent = exportType === 'excel' ? 'DATA_EXCEL_PLACEHOLDER' : '<?xml version="1.0"?><TaxReport></TaxReport>';
      const blob = new Blob([dummyContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      setIsDone(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Xuất hồ sơ khai thuế</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-600">
            Hồ sơ kỳ: <strong>Quý {snapshot.quarter}/{snapshot.year}</strong> (Thông tư 40/2021/TT-BTC)
          </p>

          <div className="space-y-3">
            <label
              className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${
                exportType === 'excel' ? 'border-blue-600 bg-blue-50/30' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'excel'}
                onChange={() => setExportType('excel')}
                className="w-4 h-4 text-blue-600"
              />
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="text-sm font-semibold text-gray-900">Bảng kê Excel (Kèm hóa đơn chi tiết)</div>
                <div className="text-xs text-gray-500">Phù hợp in ấn, lưu trữ hồ sơ nội bộ cửa hàng</div>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${
                exportType === 'xml' ? 'border-blue-600 bg-blue-50/30' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'xml'}
                onChange={() => setExportType('xml')}
                className="w-4 h-4 text-blue-600"
              />
              <Code className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-sm font-semibold text-gray-900">File XML chuẩn TCT (Mẫu 01/CNKD)</div>
                <div className="text-xs text-gray-500">Dùng nộp trực tiếp trên cổng Thuedientu.gdt.gov.vn</div>
              </div>
            </label>
          </div>

          {isDone && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã kết xuất và tải tệp tin thành công!</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isExporting ? 'Đang xuất file...' : 'Tải về ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};
