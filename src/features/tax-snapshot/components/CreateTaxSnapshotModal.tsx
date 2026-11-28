import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, FileCheck, Loader2, Lock, ShieldCheck, X } from 'lucide-react';
import { TaxCalculationMethod, TaxPeriodType, type CreateTaxSnapshotRequest, type HouseholdTaxSnapshotDto, type HouseholdTaxSummaryDto } from '../types/taxSnapshot';
import { formatMoney } from '../../finance/utils/formatters';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';

interface CreateTaxSnapshotModalProps {
  isOpen: boolean; onClose: () => void; summary?: HouseholdTaxSummaryDto;
  calculationMethod: TaxCalculationMethod; applyVatReduction: boolean;
  applyPitReduction?: boolean | null;
  customVatRate?: number | null; customPitRate?: number | null; vatReductionPercentage?: number | null;
  existingFinalizedSnapshot?: HouseholdTaxSnapshotDto | null;
  onOpenPinModal?: (tab?: 'change' | 'reset') => void;
  onSubmit: (request: CreateTaxSnapshotRequest) => Promise<HouseholdTaxSnapshotDto>;
}

const steps = ['Kiểm tra số liệu', 'Xác thực', 'Xác nhận chốt sổ'];

export const CreateTaxSnapshotModal: React.FC<CreateTaxSnapshotModalProps> = ({ isOpen, onClose, summary, calculationMethod, applyVatReduction, applyPitReduction, customVatRate, customPitRate, vatReductionPercentage, existingFinalizedSnapshot, onOpenPinModal, onSubmit }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [notes, setNotes] = useState('');
  const [allowSupersede, setAllowSupersede] = useState(false);
  const [rectificationReason, setRectificationReason] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sealedSnapshot, setSealedSnapshot] = useState<HouseholdTaxSnapshotDto | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  useDialogFocusTrap(isOpen && Boolean(summary), dialogRef, () => { if (!isSubmitting) onClose(); });

  useEffect(() => {
    if (!isOpen) return;
    setStep(1); setPin(''); setShowPin(false); setNotes(''); setAllowSupersede(false); setRectificationReason('');
    setIsConfirmed(false); setIsSubmitting(false); setPinError(null); setSubmitError(null); setSealedSnapshot(null); setIsCopied(false);
  }, [isOpen]);

  if (!isOpen || !summary) return null;
  const periodLabel = summary.periodType === TaxPeriodType.Month ? `Tháng ${summary.periodNumber}/${summary.year}` : summary.periodType === TaxPeriodType.Quarter ? `Quý ${summary.periodNumber}/${summary.year}` : `Cả năm ${summary.year}`;
  const isExistingLocked = Boolean(existingFinalizedSnapshot || summary.isFinalized);
  const stepOneInvalid = isExistingLocked && (!allowSupersede || !rectificationReason.trim());

  const handleExecuteSeal = async () => {
    if (!/^\d{4,6}$/.test(pin)) { setPinError('Mã PIN phải gồm 4 đến 6 chữ số.'); setStep(2); return; }
    if (stepOneInvalid) { setSubmitError('Vui lòng xác nhận và nhập lý do thay thế bản chốt cũ.'); setStep(1); return; }
    setIsSubmitting(true); setSubmitError(null);
    try {
      const result = await onSubmit({ year: summary.year, periodType: summary.periodType, periodNumber: summary.periodNumber, branchId: summary.branchId, calculationMethod, tier2Method: summary.tier2Method, applyVatReduction2026: applyVatReduction, applyPitReduction, customVatRate, customPitRate, vatReductionPercentage, confirmEstimatedCogsResponsible: isConfirmed, estimatedCogsConfirmationStatement: summary.isCogsEstimated ? 'Chủ hộ xác nhận tiếp tục chốt kỳ với phần giá vốn có chứng từ hợp lệ theo Điều 6 NĐ 68/2026.' : undefined, pin, notes: notes.trim() || undefined, allowSupersedeExisting: allowSupersede, rectificationReason: rectificationReason.trim() || undefined });
      if (!result?.id) throw new Error('Máy chủ chưa xác nhận bản chốt kỳ. Vui lòng kiểm tra lịch sử trước khi thử lại.');
      setSealedSnapshot(result);
    } catch (error: any) {
      const message = error.message || 'Không thể chốt kỳ sổ. Vui lòng kiểm tra kết nối và thử lại.';
      setSubmitError(message); if (message.toLowerCase().includes('pin')) { setPinError(message); setStep(2); }
    } finally { setIsSubmitting(false); }
  };

  const copyHash = (value: string) => { navigator.clipboard.writeText(value); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); };

  return <div className="tax-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
    <div ref={dialogRef} className="tax-modal-card tax-seal-dialog" role="dialog" aria-modal="true" aria-labelledby="tax-seal-title">
      <header className="tax-seal-header">
        <div className="tax-seal-heading"><span className="tax-seal-heading__icon"><Lock size={20} /></span><div><h2 id="tax-seal-title">Chốt kỳ sổ</h2><p>{periodLabel} · Dữ liệu sẽ được khóa sau khi hoàn tất</p></div></div>
        <button type="button" onClick={onClose} disabled={isSubmitting} className="tax-seal-icon-btn" aria-label="Đóng"><X size={20} /></button>
      </header>

      <nav className="tax-seal-steps" aria-label="Tiến trình chốt kỳ sổ">
        {steps.map((label, index) => { const number = index + 1; const complete = step > number || Boolean(sealedSnapshot); const active = step === number && !sealedSnapshot; return <React.Fragment key={label}>{index > 0 && <span className={`tax-seal-steps__line ${step > index ? 'is-complete' : ''}`} />}<div className={`tax-seal-step ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`} aria-current={active ? 'step' : undefined}><span className="tax-seal-step__number">{complete ? <Check size={14} /> : number}</span><span>{label}</span></div></React.Fragment>; })}
      </nav>

      <main className="tax-seal-content">
        {step === 1 && <section className="tax-seal-pane" aria-labelledby="seal-review-title">
          <div className="tax-seal-section-heading"><div><span className="tax-seal-eyebrow">Bước 1/3</span><h3 id="seal-review-title">Kiểm tra số liệu trước khi chốt</h3></div><span className="tax-seal-status"><FileCheck size={15} /> Đã đối soát 7 sổ</span></div>
          {isExistingLocked && <div className="tax-seal-revision"><div className="tax-seal-revision__title"><span>Chốt thay thế</span><small>Bản hiện tại: {existingFinalizedSnapshot?.id || summary.snapshotId}</small></div><p>Kỳ này đã được chốt. Bản mới sẽ thay thế bản hiện tại và được lưu thành một lần điều chỉnh mới.</p><label className="tax-seal-check"><input type="checkbox" checked={allowSupersede} onChange={(event) => setAllowSupersede(event.target.checked)} /><span>Tôi hiểu và đồng ý tạo bản chốt thay thế</span></label>{allowSupersede && <div className="tax-seal-field"><label htmlFor="revision-reason">Lý do thay thế <b>*</b></label><textarea id="revision-reason" value={rectificationReason} onChange={(event) => setRectificationReason(event.target.value)} placeholder="Nhập lý do điều chỉnh hoặc số hiệu quyết định…" rows={2} /></div>}</div>}
          <div className="tax-seal-summary"><div className="tax-seal-summary__primary"><span>Doanh thu tính thuế</span><strong>{formatMoney(summary.taxableRevenueInPeriod)}</strong><small>Lũy kế năm {formatMoney(summary.annualAccumulatedRevenue)}</small></div><div className="tax-seal-summary__taxes"><div><span>Thuế GTGT · {summary.vatRate}%</span><strong>{formatMoney(summary.vatAmount)}</strong></div><div><span>Thuế TNCN · {summary.pitRate}%</span><strong>{formatMoney(summary.pitAmount)}</strong></div></div><div className="tax-seal-summary__total"><span>Tổng thuế phải nộp</span><strong>{formatMoney(summary.totalTaxAmount)}</strong></div></div>
          <div className="tax-seal-field"><label htmlFor="seal-notes">Ghi chú <span>Không bắt buộc</span></label><textarea id="seal-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Thêm thông tin cần lưu cùng bản chốt…" rows={2} /></div>
        </section>}

        {step === 2 && <section className="tax-seal-pane tax-seal-auth" aria-labelledby="seal-auth-title">
          <span className="tax-seal-auth__icon"><ShieldCheck size={26} /></span><span className="tax-seal-eyebrow">Bước 2/3</span><h3 id="seal-auth-title">Xác thực chủ cửa hàng</h3><p>Nhập mã PIN 4–6 số để xác nhận bạn có quyền chốt kỳ sổ này.</p>
          <div className={`tax-seal-pin ${pinError ? 'has-error' : ''}`}><input type={showPin ? 'text' : 'password'} inputMode="numeric" autoComplete="off" autoFocus maxLength={6} value={pin} aria-label="Mã PIN bảo mật" aria-invalid={Boolean(pinError)} placeholder="••••" onChange={(event) => { setPin(event.target.value.replace(/\D/g, '').slice(0, 6)); setPinError(null); setSubmitError(null); }} onKeyDown={(event) => { if (event.key === 'Enter' && pin.length >= 4 && isConfirmed) { event.preventDefault(); setStep(3); } }} /><button type="button" onClick={() => setShowPin(!showPin)} aria-label={showPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}>{showPin ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
          {pinError ? <div className="tax-seal-error" role="alert">{pinError}</div> : <small className="tax-seal-auth__hint">Mã PIN không được lưu trên thiết bị này</small>}
          {onOpenPinModal && <div className="tax-seal-auth__links"><button type="button" onClick={() => onOpenPinModal('reset')}>Quên mã PIN?</button><span>·</span><button type="button" onClick={() => onOpenPinModal('change')}>Đổi mã PIN</button></div>}
          <label className="tax-seal-consent"><input type="checkbox" checked={isConfirmed} onChange={(event) => setIsConfirmed(event.target.checked)} /><span><strong>Tôi xác nhận số liệu trên là chính xác</strong><small>Tôi chịu trách nhiệm đối với việc chốt kỳ thuế {periodLabel}.</small></span></label>
        </section>}

        {step === 3 && !sealedSnapshot && <section className="tax-seal-pane" aria-labelledby="seal-confirm-title">
          <div className="tax-seal-section-heading"><div><span className="tax-seal-eyebrow">Bước 3/3</span><h3 id="seal-confirm-title">Xác nhận chốt kỳ sổ</h3></div><span className="tax-seal-status"><ShieldCheck size={15} /> Sẵn sàng</span></div><p className="tax-seal-lead">Kiểm tra lần cuối trước khi khóa dữ liệu. Sau khi hoàn tất, bạn không thể sửa trực tiếp bản chốt này.</p>
          <div className="tax-seal-confirm-card"><div><span>Kỳ kê khai</span><strong>{periodLabel}</strong></div><div><span>Doanh thu tính thuế</span><strong>{formatMoney(summary.taxableRevenueInPeriod)}</strong></div><div><span>Tổng thuế phải nộp</span><strong className="is-accent">{formatMoney(summary.totalTaxAmount)}</strong></div>{isExistingLocked && allowSupersede && <div><span>Hình thức</span><strong>Chốt thay thế · Lần {existingFinalizedSnapshot?.revisionNumber ? existingFinalizedSnapshot.revisionNumber + 1 : 2}</strong></div>}<div><span>Xác thực</span><strong className="is-success"><Check size={15} /> PIN đã nhập</strong></div></div>
          {submitError && <div className="tax-seal-error" role="alert">{submitError}</div>}<div className="tax-seal-notice"><Lock size={17} /><span>Hệ thống sẽ khóa dữ liệu và tạo chữ ký bảo mật để đảm bảo bản chốt không bị thay đổi.</span></div>
        </section>}

        {sealedSnapshot && <section className="tax-seal-pane tax-seal-success" aria-labelledby="seal-success-title"><span className="tax-seal-success__icon"><Check size={30} /></span><span className="tax-seal-eyebrow">Hoàn tất</span><h3 id="seal-success-title">Đã chốt kỳ sổ thành công</h3><p>{periodLabel} đã được khóa và lưu an toàn. Bạn có thể tra cứu lại trong lịch sử chốt sổ.</p><div className="tax-seal-receipt"><div><span>Mã bản chốt</span><strong>{sealedSnapshot.id}</strong></div><div><span>Thời điểm</span><strong>{new Date(sealedSnapshot.finalizedAtUtc).toLocaleString('vi-VN')}</strong></div><div><span>Tổng thuế</span><strong>{formatMoney(sealedSnapshot.totalTaxAmount)}</strong></div><div className="tax-seal-receipt__signature"><span>Chữ ký bảo mật</span><code>{sealedSnapshot.auditSignatureHash || 'Chưa có chữ ký từ máy chủ'}</code><button type="button" disabled={!sealedSnapshot.auditSignatureHash} onClick={() => copyHash(sealedSnapshot.auditSignatureHash || '')} aria-label="Sao chép chữ ký">{isCopied ? <Check size={16} /> : <Copy size={16} />}</button></div></div></section>}
      </main>

      <footer className="tax-seal-footer">
        {!sealedSnapshot && step > 1 ? <button type="button" className="tax-seal-btn tax-seal-btn--secondary" disabled={isSubmitting} onClick={() => setStep(step === 3 ? 2 : 1)}><ChevronLeft size={17} /> Quay lại</button> : <span />}
        {step === 1 && <button type="button" className="tax-seal-btn tax-seal-btn--primary" disabled={stepOneInvalid} onClick={() => setStep(2)}>Tiếp tục <ChevronRight size={17} /></button>}
        {step === 2 && <button type="button" className="tax-seal-btn tax-seal-btn--primary" disabled={pin.length < 4 || !isConfirmed} onClick={() => setStep(3)}>Tiếp tục <ChevronRight size={17} /></button>}
        {step === 3 && !sealedSnapshot && <button type="button" className="tax-seal-btn tax-seal-btn--danger" disabled={isSubmitting} onClick={handleExecuteSeal}>{isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Đang chốt kỳ sổ…</> : <><Lock size={17} /> Chốt kỳ sổ</>}</button>}
        {sealedSnapshot && <button type="button" className="tax-seal-btn tax-seal-btn--primary" onClick={onClose}>Hoàn tất</button>}
      </footer>
    </div>
  </div>;
};
