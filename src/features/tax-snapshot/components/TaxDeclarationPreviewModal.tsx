import { useEffect, useRef, useState, type FC } from 'react';
import { AlertCircle, Download, Loader2, X } from 'lucide-react';
import type { HouseholdTaxDeclarationPreviewDto, HouseholdTaxFilterDto } from '../types/taxSnapshot';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { formatMoney } from '../../finance/utils/formatters';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';

interface Props {
  isOpen: boolean;
  filter: HouseholdTaxFilterDto;
  onClose: () => void;
}

export const TaxDeclarationPreviewModal: FC<Props> = ({ isOpen, filter, onClose }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const [preview, setPreview] = useState<HouseholdTaxDeclarationPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    taxSnapshotApi.getDeclarationPreview(filter)
      .then(setPreview)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không thể tải bản xem trước tờ khai.'))
      .finally(() => setIsLoading(false));
  }, [isOpen, filter]);

  useDialogFocusTrap(isOpen, dialogRef, onClose);

  if (!isOpen) return null;

  const exportXml = async () => {
    if (!preview?.snapshotId || !preview.isFinalized) return;
    try {
      setIsExporting(true);
      const blob = await taxSnapshotApi.exportDeclarationXml(preview.snapshotId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ToKhai_01_CNKD_${preview.year}_${preview.periodNumber}.xml`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Không thể xuất XML tờ khai.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="tax-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="tax-declaration-preview-modal" role="dialog" aria-modal="true" aria-labelledby="declaration-preview-title">
        <header className="tax-declaration-preview-toolbar no-print">
          <div>
            <strong id="declaration-preview-title">Xem trước Mẫu 01/CNKD</strong>
            <span>{preview?.isFinalized ? 'Bản đã chốt' : 'Bản tạm tính'}</span>
          </div>
          <div>
            <button type="button" className="btn-secondary-pill" onClick={() => window.print()}>In bản xem trước</button>
            <button type="button" className="btn-primary-pill" disabled={!preview?.isFinalized || !preview.snapshotId || isExporting} onClick={exportXml}>
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Xuất XML
            </button>
            <button type="button" className="tax-drawer-close-btn" aria-label="Đóng bản xem trước" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        <div className="tax-declaration-preview-scroll">
          {isLoading && <div className="tax-preview-state"><Loader2 className="animate-spin" /> Đang lập bản xem trước…</div>}
          {error && <div className="tax-preview-state error"><AlertCircle /> {error}</div>}
          {preview && !isLoading && (
            <article className="tax-form-sheet">
              <div className="tax-form-code">Mẫu số: <strong>{preview.formCode}</strong></div>
              <div className="tax-form-national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br /><span>Độc lập - Tự do - Hạnh phúc</span></div>
              <h2>{preview.formTitle.toUpperCase()}</h2>
              <p className="tax-form-period">[01] Kỳ tính thuế: <strong>{preview.periodLabel}</strong></p>
              <div className="tax-form-checks">
                <span>{!preview.requiresBusinessActivityAppendix ? '☒' : '☐'} Hộ kinh doanh, cá nhân kinh doanh thuộc đối tượng nộp thuế TNCN trên doanh thu tính thuế</span>
                <span>{preview.requiresBusinessActivityAppendix ? '☒' : '☐'} Hộ kinh doanh, cá nhân kinh doanh nộp thuế theo phương pháp kê khai</span>
                <span>☐ Chỉ có hoạt động kinh doanh trên nền tảng thương mại điện tử, nền tảng số</span>
                <span>☐ Khai các loại thuế khác (TTĐB, tài nguyên, bảo vệ môi trường/phí)</span>
                <span>☐ Đề nghị cấp hóa đơn điện tử có mã theo lần phát sinh</span>
                <span>[02] {preview.isFirstDeclaration ? '☒' : '☐'} Lần đầu &nbsp;&nbsp; [03] {preview.isSupplementaryDeclaration ? '☒' : '☐'} Bổ sung</span>
              </div>
              <dl className="tax-form-taxpayer">
                <div><dt>[04] Người nộp thuế:</dt><dd>{preview.taxpayer.taxpayerName || 'Chưa cập nhật'}</dd></div>
                <div><dt>[05] Mã số thuế:</dt><dd>{preview.taxpayer.taxCode || 'Chưa cập nhật'}</dd></div>
                <div><dt>[06] Người khai, nộp thuế thay theo ủy quyền:</dt><dd>Không áp dụng</dd></div>
                <div><dt>[06.1] Mã số thuế:</dt><dd>—</dd></div>
                <div><dt>[06.2] Văn bản ủy quyền:</dt><dd>—</dd></div>
                <div><dt>[07] Tên đại lý thuế:</dt><dd>Không áp dụng</dd></div>
                <div><dt>[07.1] Mã số thuế:</dt><dd>—</dd></div>
                <div><dt>Địa điểm kinh doanh:</dt><dd>{preview.taxpayer.businessLocation || 'Chưa cập nhật'}</dd></div>
                <div><dt>Điện thoại:</dt><dd>{preview.taxpayer.phoneNumber || 'Chưa cập nhật'}</dd></div>
                <div><dt>Cơ quan thuế quản lý:</dt><dd>{preview.taxpayer.taxAuthorityName || 'Chưa cập nhật'}</dd></div>
              </dl>
              {!preview.isProfileComplete && (
                <div className="tax-form-warning">Cần bổ sung: {preview.missingProfileFields.join(', ')}.</div>
              )}
              <h3>A. KÊ KHAI THUẾ GTGT, TNCN</h3>
              <div className="tax-table-wrapper">
                <table className="tax-form-table">
                  <thead><tr><th>[08] STT</th><th>[09] Nhóm ngành nghề</th><th>[10] Mã chỉ tiêu</th><th>[11] Tổng doanh thu</th><th>[12] DT không chịu GTGT</th><th>[13] DT thuế suất 0%</th><th>[14] Thuế GTGT</th><th>[15] DT chịu TNCN</th><th>[16] DT được trừ</th><th>[17] Thuế TNCN</th></tr></thead>
                  <tbody>{preview.lines.map((line) => <tr key={line.sequence}><td>{line.sequence}</td><td>{line.businessSector}</td><td>{line.taxCode}</td><td>{formatMoney(line.totalRevenue)}</td><td>{formatMoney(line.vatNonTaxableRevenue)}</td><td>{formatMoney(line.vatZeroRateRevenue)}</td><td>{formatMoney(line.vatAmount)}</td><td>{formatMoney(line.pitTaxableRevenue)}</td><td>{formatMoney(line.pitRevenueDeduction)}</td><td>{formatMoney(line.pitAmount)}</td></tr>)}</tbody>
                  <tfoot><tr><td colSpan={6}>Tổng cộng</td><td>{formatMoney(preview.totalVatAmount)}</td><td></td><td></td><td>{formatMoney(preview.totalPitAmount)}</td></tr></tfoot>
                </table>
              </div>
              {preview.requiresBusinessActivityAppendix && (
                <section className="tax-form-appendix">
                  <h3>PHỤ LỤC {preview.appendixCode}</h3>
                  <p>Bảng kê hoạt động kinh doanh trong kỳ của hộ kinh doanh, cá nhân kinh doanh</p>
                  <div className="tax-table-wrapper">
                    <table className="tax-form-table">
                      <thead><tr><th>Nhóm hoạt động</th><th>Doanh thu</th><th>Giá vốn</th><th>Chi phí hoạt động</th><th>Thu nhập tính thuế</th></tr></thead>
                      <tbody><tr><td>Sản xuất, kinh doanh hàng hóa, cung cấp dịch vụ</td><td>{formatMoney(preview.appendixRevenue)}</td><td>{formatMoney(preview.appendixCogs)}</td><td>{formatMoney(preview.appendixOpex)}</td><td>{formatMoney(preview.appendixTaxableIncome)}</td></tr></tbody>
                    </table>
                  </div>
                </section>
              )}
              <p className="tax-form-notice">{preview.dataNotice}</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
};
