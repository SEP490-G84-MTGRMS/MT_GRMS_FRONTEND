import React, { useState } from 'react';
import { Download } from 'lucide-react';

interface ImportEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

export const ImportEmployeeModal: React.FC<ImportEmployeeModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMode, setErrorMode] = useState<'stop' | 'skip'>('skip');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('Vui lòng chọn đúng định dạng file Excel (.xlsx hoặc .xls)!');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Vui lòng chọn file dữ liệu Excel trước khi nhấn Thực hiện!');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onImportSuccess(5);
      alert('Nhập danh sách nhân viên từ Excel thành công (5 bản ghi hợp lệ)!');
      onClose();
    }, 1000);
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 580 }}>
        <div className="emp-modal-header">
          <h3>Nhập nhân viên từ file dữ liệu Excel</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px' }}>
                Tải về file Excel mẫu chuẩn của hệ thống để nhập liệu:
              </p>
              <button
                type="button"
                className="emp-btn emp-btn-outline-teal"
                style={{ height: 36, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => alert('Đang tải file mẫu: Mau_nhan_vien.xlsx')}
              >
                <Download size={14} />
                <span>Tải về file mẫu Excel</span>
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '16px 0' }} />

            <div className="emp-form-group">
              <label className="emp-form-label">
                Chọn file dữ liệu <span className="required">*</span>
              </label>
              <input
                type="file"
                accept=".xlsx, .xls"
                className="emp-form-input"
                style={{ padding: '6px 12px' }}
                onChange={handleFileChange}
              />
              <small style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>
                Hỗ trợ định dạng .xlsx, .xls. Tối đa 500 nhân viên / lần nhập.
              </small>
            </div>

            <div className="emp-form-group" style={{ marginTop: 16 }}>
              <label className="emp-form-label">Xử lý khi phát sinh dòng dữ liệu lỗi:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                <label className="emp-radio-label">
                  <input
                    type="radio"
                    name="err_mode"
                    checked={errorMode === 'stop'}
                    onChange={() => setErrorMode('stop')}
                  />
                  <span>Dừng nhập file ngay khi gặp lỗi</span>
                </label>
                <label className="emp-radio-label">
                  <input
                    type="radio"
                    name="err_mode"
                    checked={errorMode === 'skip'}
                    onChange={() => setErrorMode('skip')}
                  />
                  <span>Bỏ qua dòng lỗi và tiếp tục nhập các dòng hợp lệ</span>
                </label>
              </div>
            </div>
          </div>

          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose} disabled={isProcessing}>
              Hủy
            </button>
            <button type="submit" className="emp-btn emp-btn-primary" disabled={isProcessing}>
              {isProcessing ? 'Đang xử lý...' : 'Thực hiện nạp dữ liệu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
