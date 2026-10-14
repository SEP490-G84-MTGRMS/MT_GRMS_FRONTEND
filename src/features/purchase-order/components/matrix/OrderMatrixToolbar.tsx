import { useRef } from 'react';
import type { FC, ChangeEvent } from 'react';
import {
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Copy,
  Calendar,
} from 'lucide-react';

interface OrderMatrixToolbarProps {
  onShiftWeek: (deltaWeeks: number) => void;
  onThisWeek: () => void;
  onCopyPrevWeek: () => void;
  onExcelDownload: () => void;
  onExcelUpload: (file: File) => void;
}

export const OrderMatrixToolbar: FC<OrderMatrixToolbarProps> = ({
  onShiftWeek,
  onThisWeek,
  onCopyPrevWeek,
  onExcelDownload,
  onExcelUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onExcelUpload(e.target.files[0]);
    }
    e.target.value = '';
  };

  return (
    <div className="po-toolbar" style={{ background: '#ffffff', minHeight: 42, padding: '4px 10px' }}>
      <div className="po-toolbar-group">
        <button
          type="button"
          onClick={onExcelDownload}
          className="po-btn po-btn-secondary"
          style={{ height: 32, fontSize: 12.5 }}
          title="Tải bảng ma trận hiện tại ra file CSV/Excel"
        >
          <Download size={13} />
          <span>Xuất Excel</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="po-btn po-btn-secondary"
          style={{ height: 32, fontSize: 12.5 }}
          title="Nhập số lượng từ file Excel đã tải về"
        >
          <Upload size={13} />
          <span>Nạp Excel</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="po-toolbar-group">
        <button
          type="button"
          onClick={() => onShiftWeek(-1)}
          className="po-btn po-btn-secondary"
          style={{ height: 32, fontSize: 12.5 }}
          title="Lùi lại 1 tuần"
        >
          <ChevronLeft size={13} />
          <span>Tuần trước</span>
        </button>

        <button
          type="button"
          onClick={onThisWeek}
          className="po-btn po-btn-secondary"
          style={{ height: 32, fontSize: 12.5 }}
          title="Về tuần hiện tại"
        >
          <Calendar size={13} />
          <span>Tuần này</span>
        </button>

        <button
          type="button"
          onClick={() => onShiftWeek(1)}
          className="po-btn po-btn-secondary"
          style={{ height: 32, fontSize: 12.5 }}
          title="Tiến tới 1 tuần"
        >
          <span>Tuần tới</span>
          <ChevronRight size={13} />
        </button>

        <button
          type="button"
          onClick={onCopyPrevWeek}
          className="po-btn po-btn-secondary"
          style={{ height: 32, fontSize: 12.5, borderColor: 'var(--blue-primary)', color: 'var(--blue-primary)' }}
          title="Sao chép toàn bộ số lượng từ các ngày của tuần trước sang tuần này"
        >
          <Copy size={13} />
          <span>Copy Tuần Trước</span>
        </button>
      </div>
    </div>
  );
};

export default OrderMatrixToolbar;
