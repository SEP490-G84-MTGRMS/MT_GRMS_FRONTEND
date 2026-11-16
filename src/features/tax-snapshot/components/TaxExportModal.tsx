import { useRef, useState } from 'react';
import type { FC } from 'react';
import { X, FileSpreadsheet, Code, CheckCircle, Download } from 'lucide-react';
import { formatTaxPeriodLabel, type TaxSnapshot } from '../types/taxSnapshot';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';

interface Props {
  snapshot: TaxSnapshot | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaxExportModal: FC<Props> = ({ snapshot, isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [exportType, setExportType] = useState<'excel' | 'xml'>('excel');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  useDialogFocusTrap(isOpen, dialogRef, onClose);

  if (!isOpen || !snapshot) return null;

  const periodTitle = formatTaxPeriodLabel(snapshot.periodType, snapshot.periodNumber ?? snapshot.quarter, snapshot.year);
  const normalizedStatus = String(snapshot.status ?? '').toLowerCase();
  const canExportXml =
    snapshot.isIntegrityValid !== false &&
    (normalizedStatus === 'finalized' || normalizedStatus === '1' || Boolean(snapshot.auditSignatureHash));

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const pNum = snapshot.periodNumber ?? snapshot.quarter ?? 1;
      const pType = snapshot.periodType ?? 2;
      const pCode = pType === 1 ? `T${pNum}` : pType === 3 ? `Nam${snapshot.year}` : `Q${pNum}`;

      if (exportType === 'excel') {
        const blob = await taxSnapshotApi.exportTaxExcel({
          year: snapshot.year,
          periodType: pType,
          periodNumber: pNum,
          branchId: snapshot.branchId,
          calculationMethod: snapshot.calculationMethod ?? 1,
          applyVatReduction2026: Boolean(snapshot.applyVatReduction2026),
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BaoCaoThue_${snapshot.year}_${pCode}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const blob = await taxSnapshotApi.exportDeclarationXml(snapshot.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `To_Khai_Form_01_CNKD_${snapshot.year}_${pCode}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setIsDone(true);
    } catch (err: any) {
      setExportError(err.message || 'Không thể xuất báo cáo thuế từ máy chủ.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="tax-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="tax-modal-card" role="dialog" aria-modal="true" aria-label="Xuất hồ sơ khai thuế">
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
                Hồ sơ {periodTitle} (Hồ sơ lưu trữ nội bộ và kê khai điện tử)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="tax-drawer-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="tax-modal-body">
          {exportError && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                color: '#B91C1C',
                fontSize: '0.84rem',
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              ⚠️ {exportError}
            </div>
          )}
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
              onClick={() => canExportXml && setExportType('xml')}
              aria-disabled={!canExportXml}
              style={!canExportXml ? { opacity: 0.58, cursor: 'not-allowed' } : undefined}
            >
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'xml'}
                onChange={() => setExportType('xml')}
                disabled={!canExportXml}
                style={{ accentColor: '#0F766E', width: 16, height: 16 }}
              />
              <Code size={24} color="#4F46E5" />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                  XML Mẫu 01/CNKD từ bản chốt
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                  {canExportXml
                    ? 'Máy chủ tạo từ snapshot đã chốt và kiểm tra chữ ký HMAC. Cần đối chiếu XSD của cổng thuế trước khi nộp.'
                    : 'Chỉ khả dụng sau khi kỳ được chốt thành công và chữ ký toàn vẹn còn hợp lệ.'}
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
