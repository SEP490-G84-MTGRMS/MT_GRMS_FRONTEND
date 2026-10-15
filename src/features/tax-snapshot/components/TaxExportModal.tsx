import { useState } from 'react';
import type { FC } from 'react';
import { X, FileSpreadsheet, Code, CheckCircle, Download } from 'lucide-react';
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
      const filename =
        exportType === 'excel'
          ? 'To_Khai_Thue_HKD_Q' + snapshot.quarter + '_' + snapshot.year + '.xlsx'
          : 'To_Khai_Form_01_CNKD_Q' + snapshot.quarter + '_' + snapshot.year + '.xml';

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
    <div className="tax-modal-backdrop" onClick={onClose}>
      <div className="tax-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="tax-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(15, 118, 110, 0.1)', color: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Xuất hồ sơ khai thuế
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Hồ sơ Quý {snapshot.quarter}/{snapshot.year} (Thông tư 40/2021/TT-BTC)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="tax-drawer-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="tax-modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label
              className={'tax-radio-option ' + (exportType === 'excel' ? 'selected' : '')}
              onClick={() => setExportType('excel')}
            >
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'excel'}
                onChange={() => setExportType('excel')}
                style={{ accentColor: '#0F766E', width: 16, height: 16 }}
              />
              <FileSpreadsheet size={24} color="#059669" />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                  Bảng kê Excel (Kèm hóa đơn chi tiết)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                  Phù hợp in ấn, lưu trữ hồ sơ kế toán nội bộ cửa hàng
                </div>
              </div>
            </label>

            <label
              className={'tax-radio-option ' + (exportType === 'xml' ? 'selected' : '')}
              onClick={() => setExportType('xml')}
            >
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'xml'}
                onChange={() => setExportType('xml')}
                style={{ accentColor: '#0F766E', width: 16, height: 16 }}
              />
              <Code size={24} color="#4F46E5" />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                  File XML chuẩn TCT (Mẫu 01/CNKD)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                  Dùng nộp tờ khai trực tiếp lên cổng Thuedientu.gdt.gov.vn
                </div>
              </div>
            </label>
          </div>

          {isDone && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} color="#059669" />
              <span>Đã kết xuất và tải tệp tin thành công!</span>
            </div>
          )}
        </div>

        <div className="tax-modal-footer">
          <button onClick={onClose} className="btn-secondary-pill">
            Đóng
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-primary-pill"
          >
            {isExporting ? 'Đang xuất file...' : 'Tải về ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};
