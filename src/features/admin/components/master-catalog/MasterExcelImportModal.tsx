import { useState, useRef } from 'react';
import type { FC, ChangeEvent, DragEvent } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { MasterProductExcelImportResult } from '../../types/masterCatalog.types';
import { masterCatalogApi } from '../../api/masterCatalogApi';

interface MasterExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const MasterExcelImportModal: FC<MasterExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [upsert, setUpsert] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<MasterProductExcelImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setErrorMessage('Chỉ chấp nhận tệp định dạng Excel (.xlsx).');
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);
    setImportResult(null);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const res = await masterCatalogApi.importExcel(selectedFile, upsert);
      setImportResult(res);
      if (res.successCount > 0) {
        onImportSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra trong quá trình nạp tệp Excel.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '9999px',
                background: '#F0F6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0066FF',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Import Danh Mục Hàng Mẫu Từ Excel
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                Hỗ trợ nạp hàng loạt 5.000+ mã vạch FMCG vào Thư viện Toàn cầu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '9999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {errorMessage && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#DC2626',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {!importResult ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed #0066FF' : '2px dashed #CBD5E1',
                  borderRadius: '18px',
                  background: isDragging ? '#F0F6FF' : '#F8FAFC',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '18px',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleInputChange}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '9999px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0066FF',
                    margin: '0 auto 12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <Upload size={22} />
                </div>
                {selectedFile ? (
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB · Nhấp để đổi file khác
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#0F172A' }}>
                      Kéo thả tệp Excel vào đây hoặc <span style={{ color: '#0066FF' }}>chọn từ máy tính</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                      Chỉ hỗ trợ định dạng Microsoft Excel (.xlsx), dung lượng tối đa 15MB
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                    Ghi đè thông tin nếu trùng mã vạch
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Nếu bật: Cập nhật tên, ảnh, quy cách mới. Nếu tắt: Bỏ qua dòng trùng.
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={upsert}
                    onChange={(e) => setUpsert(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#0066FF', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* Template Download Prompt */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  border: '1px solid #DBE9FE',
                  background: '#F0F6FF',
                  borderRadius: '14px',
                }}
              >
                <div style={{ fontSize: '12.5px', color: '#1E3A8A' }}>
                  Chưa có tệp Excel đúng mẫu? Tải xuống file mẫu chuẩn hóa kèm hướng dẫn cột.
                </div>
                <button
                  type="button"
                  onClick={() => masterCatalogApi.downloadTemplate()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#FFFFFF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '9999px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0066FF',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Download size={13} />
                  <span>Tải file mẫu</span>
                </button>
              </div>
            </>
          ) : (
            /* Result View */
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    background: '#F8FAFC',
                    padding: '14px',
                    borderRadius: '14px',
                    textAlign: 'center',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Tổng số dòng</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', fontFamily: 'JetBrains Mono' }}>
                    {importResult.totalRows}
                  </div>
                </div>
                <div
                  style={{
                    background: '#F0FDF4',
                    padding: '14px',
                    borderRadius: '14px',
                    textAlign: 'center',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#166534' }}>Nạp thành công</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#00C853', fontFamily: 'JetBrains Mono' }}>
                    {importResult.successCount}
                  </div>
                </div>
                <div
                  style={{
                    background: '#FEF2F2',
                    padding: '14px',
                    borderRadius: '14px',
                    textAlign: 'center',
                    border: '1px solid #FECACA',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#991B1B' }}>Dòng lỗi</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444', fontFamily: 'JetBrains Mono' }}>
                    {importResult.failedCount}
                  </div>
                </div>
              </div>

              {/* Error messages if any */}
              {importResult.errorMessages && importResult.errorMessages.length > 0 && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>
                    Chi tiết các dòng bị bỏ qua ({importResult.errorMessages.length}):
                  </div>
                  <div
                    style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      background: '#FFF1F2',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: '#BE123C',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {importResult.errorMessages.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700 }}>•</span>
                        <span>{msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          {importResult ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
                <span>Nạp tệp khác</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 22px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#0066FF',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={15} />
                <span>Hoàn tất</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 22px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#0066FF',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer',
                  opacity: !selectedFile || isUploading ? 0.6 : 1,
                }}
              >
                <Upload size={15} />
                <span>{isUploading ? 'Đang phân tích & nạp...' : 'Tiến Hành Import'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
