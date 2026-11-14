import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { X, Upload, FileSpreadsheet, Download } from 'lucide-react';

interface ImportTransferExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmUpload: (rows: Array<{ productCode: string; quantity: number }>) => void;
}

export const ImportTransferExcelModal: React.FC<ImportTransferExcelModalProps> = ({
  isOpen,
  onClose,
  onConfirmUpload,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setError('');
    try {
      if (selectedFile.size > 5 * 1024 * 1024) throw new Error('File vượt quá dung lượng tối đa 5 MB.');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await selectedFile.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('File Excel không có sheet dữ liệu.');
      const header = sheet.getRow(1).values as Array<ExcelJS.CellValue>;
      const codeColumn = header.findIndex((cell) => String(cell ?? '').trim().toLowerCase() === 'productcode');
      const qtyColumn = header.findIndex((cell) => ['quantity', 'sentqty'].includes(String(cell ?? '').trim().toLowerCase()));
      if (codeColumn < 1 || qtyColumn < 1) throw new Error('Cần có cột ProductCode và Quantity ở dòng đầu tiên.');
      const rows: Array<{ productCode: string; quantity: number }> = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const productCode = String(row.getCell(codeColumn).value ?? '').trim();
        const quantity = Number(row.getCell(qtyColumn).value);
        if (!productCode && !row.getCell(qtyColumn).value) return;
        if (!productCode || !Number.isFinite(quantity) || quantity <= 0) throw new Error(`Dữ liệu không hợp lệ tại dòng ${rowNumber}.`);
        rows.push({ productCode, quantity });
      });
      if (!rows.length) throw new Error('File không có sản phẩm hợp lệ để nhập.');
      onConfirmUpload(rows);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được file Excel.');
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');
    sheet.addRow(['ProductCode', 'Quantity']);
    sheet.getRow(1).font = { bold: true };
    sheet.columns = [{ width: 24 }, { width: 16 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Mau_chuyen_hang.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError('');
    onClose();
  };

  return (
    <div className="custom-modal-backdrop" style={{ zIndex: 1200 }} onClick={handleClose}>
      <div className="custom-modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="custom-modal-header">
          <h3>Thêm sản phẩm từ file Excel</h3>
          <button type="button" className="custom-modal-close" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-modal-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Tải về file Excel mẫu chuẩn: &nbsp;
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); void downloadTemplate(); }}
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
        {error && <div role="alert" style={{ color: '#b91c1c', padding: '0 20px 12px' }}>{error}</div>}

        {/* Footer */}
        <div className="custom-modal-footer">
          <button type="button" className="btn-secondary-white" onClick={handleClose}>
            Bỏ qua
          </button>
          <button
            type="button"
            className="btn-primary-teal"
            disabled={!selectedFile}
            onClick={() => void handleUpload()}
          >
            Xác nhận tải lên
          </button>
        </div>
      </div>
    </div>
  );
};
