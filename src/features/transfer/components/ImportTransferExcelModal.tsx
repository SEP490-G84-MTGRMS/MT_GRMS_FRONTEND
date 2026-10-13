import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Download } from 'lucide-react';

interface ImportTransferExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmUpload: (fileName: string) => void;
}

export const ImportTransferExcelModal: React.FC<ImportTransferExcelModalProps> = ({
  isOpen,
  onClose,
  onConfirmUpload,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    onConfirmUpload(selectedFile.name);
    onClose();
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-box" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="custom-modal-header">
          <h3>Thêm sản phẩm từ file Excel</h3>
          <button type="button" className="custom-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-modal-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Tải về file Excel mẫu chuẩn: &nbsp;
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('Đang tải file mẫu transfer_template.xlsx');
              }}
              style={{ color: '#0F766E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Download size={14} /> Mau_chuyen_hang.xlsx
            </a>
          </div>

          {/* Khung upload kéo thả */}
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #cbd5e1',
              borderRadius: 18,
              padding: '30px 20px',
              cursor: 'pointer',
              backgroundColor: '#f8fafc',
              transition: 'border-color 0.2s',
            }}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {selectedFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <FileSpreadsheet size={40} color="#0F766E" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB - Nhấp để đổi file khác
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#ccfbf1', color: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={22} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  Chọn file dữ liệu Excel
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Hỗ trợ định dạng .xlsx, .xls. Dung lượng tối đa 5 MB.
                </span>
              </div>
            )}
          </label>
        </div>

        {/* Footer */}
        <div className="custom-modal-footer">
          <button type="button" className="btn-secondary-white" onClick={onClose}>
            Bỏ qua
          </button>
          <button
            type="button"
            className="btn-primary-teal"
            disabled={!selectedFile}
            onClick={handleUpload}
          >
            Xác nhận tải lên
          </button>
        </div>
      </div>
    </div>
  );
};
