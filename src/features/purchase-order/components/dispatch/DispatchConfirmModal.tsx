import { useMemo, useEffect, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Building2,
  Calendar,
  Zap,
  Package,
  Layers,
  Info,
  Check,
  ChevronLeft,
  Clock,
  Download,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type {
  DispatchScope,
  SplitMatrixBatchResult,
  SupplierDispatchGroup,
  SplitGroupResult,
  EmailSendMode,
  SupplierDispatchPackage,
} from '../../types/po.types';
import { dispatchHubApi } from '../../api/dispatchHubApi';

interface DispatchConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  supplier: SupplierDispatchGroup | null;
  supplierEmail?: string;
  scope: DispatchScope;
  onScopeChange: (scope: DispatchScope) => void;
  weekStartDate: string;
  onWeekChange: (value: string) => void;
  previewData?: SplitMatrixBatchResult | null;
  isLoadingPreview?: boolean;
  previewError?: string | null;
  onRetryPreview?: () => void;
  batchResult?: SplitMatrixBatchResult | null;
  note?: string;
  onNoteChange?: (note: string) => void;
  emailSendMode: EmailSendMode;
  onEmailSendModeChange: (mode: EmailSendMode) => void;
  scheduledSendAt: string;
  onScheduledSendAtChange: (value: string) => void;
  ccEmails: string[];
  onCcEmailsChange: (emails: string[]) => void;
}

function formatDateVN(dateStr?: string | Date): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dow = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()];
  return `${dow}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatWeekRange(mondayStr?: string): string {
  if (!mondayStr) return 'Tuần hiện tại';
  const mon = new Date(mondayStr);
  if (Number.isNaN(mon.getTime())) return mondayStr;
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Thứ Hai ${pad(mon.getDate())}/${pad(mon.getMonth() + 1)} — Chủ Nhật ${pad(sun.getDate())}/${pad(sun.getMonth() + 1)}/${sun.getFullYear()}`;
}

function shiftWeek(currentMondayStr?: string, deltaWeeks = 0): string {
  const d = currentMondayStr ? new Date(currentMondayStr) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + deltaWeeks * 7);
  const day = d.getDay();
  const diff = (7 + (day - 1)) % 7;
  d.setDate(d.getDate() - diff);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function toDatetimeLocalValue(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const DispatchConfirmModal: FC<DispatchConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  supplier,
  supplierEmail,
  scope,
  onScopeChange,
  weekStartDate,
  onWeekChange,
  previewData = null,
  isLoadingPreview = false,
  previewError = null,
  onRetryPreview,
  batchResult = null,
  note = '',
  onNoteChange,
  emailSendMode,
  onEmailSendModeChange,
  scheduledSendAt,
  onScheduledSendAtChange,
  ccEmails,
  onCcEmailsChange,
}) => {
  const [ccInput, setCcInput] = useState('');
  const [ccError, setCcError] = useState<string | null>(null);
  const [livePackage, setLivePackage] = useState<SupplierDispatchPackage | null>(null);
  const [packageBusy, setPackageBusy] = useState(false);

  // Keyboard shortcut Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (!batchResult?.dispatchPackage?.id) {
      setLivePackage(null);
      return;
    }
    setLivePackage(batchResult.dispatchPackage);
    const id = batchResult.dispatchPackage.id;
    const timer = setInterval(() => {
      void dispatchHubApi
        .getDispatchPackage(id)
        .then(setLivePackage)
        .catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [batchResult?.dispatchPackage?.id]);

  const addCcEmail = (raw: string) => {
    const email = raw.trim().replace(/,$/, '');
    if (!email) return;
    if (!isValidEmail(email)) {
      setCcError(`Email không hợp lệ: ${email}`);
      return;
    }
    if (supplierEmail && email.toLowerCase() === supplierEmail.trim().toLowerCase()) {
      setCcError('CC không được trùng email người nhận chính (To).');
      return;
    }
    if (ccEmails.some((e) => e.toLowerCase() === email.toLowerCase())) {
      setCcError('Email CC đã tồn tại.');
      return;
    }
    if (ccEmails.length >= 10) {
      setCcError('Tối đa 10 địa chỉ CC.');
      return;
    }
    setCcError(null);
    onCcEmailsChange([...ccEmails, email]);
    setCcInput('');
  };

  const handleCcKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCcEmail(ccInput);
    } else if (e.key === 'Backspace' && !ccInput && ccEmails.length > 0) {
      onCcEmailsChange(ccEmails.slice(0, -1));
    }
  };

  const scheduleValid =
    emailSendMode !== 'SCHEDULED_SEND' ||
    (!!scheduledSendAt && new Date(scheduledSendAt).getTime() > Date.now());
  const toEmailOk = !supplierEmail || isValidEmail(supplierEmail);



  // Phân loại các group từ Preview
  const {
    eligibleGroups,
    ineligibleGroups,
    uniqueBranchesCount,
    totalSkuCount,
    totalQuantity,
    totalAmount,
    hasAnyMissingPrice,
  } = useMemo(() => {
    const results = previewData?.results || [];

    const eligible: SplitGroupResult[] = [];
    const ineligible: SplitGroupResult[] = [];

    const branchSet = new Set<string>();
    let skuSum = 0;
    let qtySum = 0;
    let amountSum = 0;
    let missingPriceFound = false;

    for (const r of results) {
      if (r.status === 'SUCCESS') {
        eligible.push(r);
        if (r.branchId) branchSet.add(r.branchId);
        skuSum += r.validLineCount || (r.lines ? r.lines.length : 0);
        qtySum += r.totalQuantity || (r.lines ? r.lines.reduce((s, l) => s + l.quantity, 0) : 0);
        amountSum += r.totalAmount || 0;
        if (r.hasMissingPrice || (r.lines && r.lines.some((l) => l.hasMissingPrice || l.unitPrice <= 0))) {
          missingPriceFound = true;
        }
      } else {
        ineligible.push(r);
      }
    }

    return {
      eligibleGroups: eligible,
      ineligibleGroups: ineligible,
      uniqueBranchesCount: branchSet.size,
      totalSkuCount: skuSum,
      totalQuantity: qtySum,
      totalAmount: amountSum,
      hasAnyMissingPrice: missingPriceFound,
    };
  }, [previewData]);

  // Phân nhóm các lý do bị bỏ qua / lỗi
  const categorizedIneligible = useMemo(() => {
    const map = new Map<string, { label: string; badgeColor: string; badgeBg: string; groups: SplitGroupResult[] }>();

    for (const g of ineligibleGroups) {
      let categoryKey = g.errorCode || g.status;
      let label = g.errorMessage || 'Không đủ điều kiện';
      let badgeColor = '#b91c1c';
      let badgeBg = '#fef2f2';

      if (g.status === 'ALREADY_FINALIZED') {
        categoryKey = 'ALREADY_FINALIZED';
        label = 'Đã chốt trước đó';
        badgeColor = '#0369a1';
        badgeBg = '#e0f2fe';
      } else if (g.errorCode === 'CUTOFF_EXPIRED') {
        categoryKey = 'CUTOFF_EXPIRED';
        label = 'Đã quá thời hạn Cutoff ngày giao';
        badgeColor = '#b45309';
        badgeBg = '#fef3c7';
      } else if (g.errorCode === 'EMPTY_LINES' || g.errorCode === 'NO_QTY') {
        categoryKey = 'EMPTY_LINES';
        label = 'Không có số lượng đặt (>0)';
        badgeColor = '#64748b';
        badgeBg = '#f1f5f9';
      } else if (g.errorCode?.includes('MOQ')) {
        categoryKey = 'MOQ_NOT_MET';
        label = 'Không đạt số lượng tối thiểu (MOQ)';
        badgeColor = '#b91c1c';
        badgeBg = '#fef2f2';
      } else if (g.errorCode?.includes('MULTIPLE')) {
        categoryKey = 'ORDER_MULTIPLE_VIOLATION';
        label = 'Vi phạm bội số đặt hàng';
        badgeColor = '#b91c1c';
        badgeBg = '#fef2f2';
      } else if (g.errorCode?.includes('INACTIVE')) {
        categoryKey = 'INACTIVE';
        label = 'NCC hoặc chi nhánh tạm ngừng hoạt động';
        badgeColor = '#b91c1c';
        badgeBg = '#fef2f2';
      }

      if (!map.has(categoryKey)) {
        map.set(categoryKey, { label, badgeColor, badgeBg, groups: [] });
      }
      map.get(categoryKey)!.groups.push(g);
    }

    return Array.from(map.entries());
  }, [ineligibleGroups]);

  if (!isOpen || !supplier) return null;

  // ─────────────────────────────────────────────────────────────
  // RESULT VIEW: HIỂN THỊ KẾT QUẢ SAU KHI SUBMIT CHỐT ĐƠN
  // ─────────────────────────────────────────────────────────────
  if (batchResult) {
    const isFullSuccess = batchResult.failedCount === 0 && batchResult.successCount > 0;
    const isPartialSuccess = batchResult.successCount > 0 && batchResult.failedCount > 0;
    
    return (
      <div className="po-modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }} onClick={onClose}>
        <div
          className="po-modal-container"
          style={{
            maxWidth: 920,
            width: '95%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isFullSuccess ? '#dcfce7' : isPartialSuccess ? '#fef3c7' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isFullSuccess ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : isPartialSuccess ? (
                  <AlertTriangle size={20} color="#d97706" />
                ) : (
                  <X size={20} color="#dc2626" />
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                  {isFullSuccess
                    ? 'Chốt đơn Purchase Order thành công!'
                    : isPartialSuccess
                    ? 'Chốt đơn thành công một phần (Partial Success)'
                    : 'Chốt đơn không thành công'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Nhà cung cấp: <strong>{supplier.name}</strong> ({supplier.code}) • Phạm vi: <strong>{scope}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
              title="Đóng (Esc)"
            >
              <X size={20} color="#64748b" />
            </button>
          </div>

          {/* Result Body */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {/* Stat Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '12px 14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11.5, color: '#166534', fontWeight: 700 }}>PO TẠO THÀNH CÔNG</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', marginTop: 2 }}>
                  {batchResult.successCount}
                </div>
              </div>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '12px 14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11.5, color: '#991b1b', fontWeight: 700 }}>PO THẤT BẠI</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c', marginTop: 2 }}>
                  {batchResult.failedCount}
                </div>
              </div>
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: '12px 14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11.5, color: '#92400e', fontWeight: 700 }}>BỎ QUA (CUTOFF)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309', marginTop: 2 }}>
                  {batchResult.skippedCount}
                </div>
              </div>
              <div
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '12px 14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11.5, color: '#334155', fontWeight: 700 }}>ĐÃ CHỐT TRƯỚC ĐÓ</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#475569', marginTop: 2 }}>
                  {batchResult.alreadyFinalizedCount}
                </div>
              </div>
            </div>

            {/* List results by group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                Chi tiết kết quả theo từng Purchase Order:
              </div>
              {batchResult.results.map((r, idx) => {
                                const isAlready = r.status === 'ALREADY_FINALIZED';
                const isSkipped = r.status === 'SKIPPED';
                const isFailed = r.status === 'FAILED';

                let badgeColor = '#15803d';
                let badgeBg = '#dcfce7';
                let statusText = 'TẠO PO THÀNH CÔNG';

                if (isAlready) {
                  badgeColor = '#0369a1';
                  badgeBg = '#e0f2fe';
                  statusText = 'ĐÃ CHỐT TRƯỚC ĐÓ';
                } else if (isSkipped) {
                  badgeColor = '#b45309';
                  badgeBg = '#fef3c7';
                  statusText = 'BỎ QUA (QUÁ HẠN)';
                } else if (isFailed) {
                  badgeColor = '#b91c1c';
                  badgeBg = '#fee2e2';
                  statusText = 'THẤT BẠI';
                }

                return (
                  <div
                    key={`${r.branchId}-${r.deliveryDate}-${idx}`}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '12px 16px',
                      background: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>
                          {r.branchName || 'Chi nhánh'}
                        </span>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ fontSize: 13, color: '#475569' }}>
                          Ngày giao: <strong>{formatDateVN(r.deliveryDate)}</strong>
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 4,
                          background: badgeBg,
                          color: badgeColor,
                        }}
                      >
                        {statusText}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      {r.purchaseOrderCode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <span style={{ color: '#64748b' }}>Mã PO:</span>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#0f766e',
                              background: '#f0fdfa',
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: '1px solid #ccfbf1',
                            }}
                          >
                            {r.purchaseOrderCode}
                          </span>
                          <Link
                            to={`/store-owner/purchase-orders?code=${encodeURIComponent(r.purchaseOrderCode)}`}
                            target="_blank"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#0284c7',
                              fontSize: 12.5,
                              fontWeight: 600,
                              textDecoration: 'none',
                              marginLeft: 6,
                            }}
                          >
                            <span>Xem PO</span>
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12.5, color: '#ef4444', fontStyle: 'italic' }}>
                          Lý do: {r.errorMessage || 'Không thể tạo đơn hàng'}
                        </span>
                      )}

                      {r.totalAmount != null && r.totalAmount > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                          {r.totalAmount.toLocaleString('vi-VN')} đ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Excel + Email package status */}
          {livePackage && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#fff' }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={14} /> Excel
                </div>
                <div style={{ fontSize: 13, color: '#334155' }}>
                  {livePackage.generationStatus === 'PENDING' || livePackage.generationStatus === 'GENERATING'
                    ? 'Đang tạo file Excel...'
                    : livePackage.generationStatus === 'GENERATED'
                      ? `Tạo file thành công${livePackage.fileName ? `: ${livePackage.fileName}` : ''}`
                      : `Tạo file thất bại${livePackage.lastError ? `: ${livePackage.lastError}` : ''}`}
                </div>
                {livePackage.canDownload && (
                  <button
                    type="button"
                    className="po-btn po-btn-secondary"
                    style={{ marginTop: 8, height: 32, fontSize: 12 }}
                    disabled={packageBusy}
                    onClick={() => {
                      setPackageBusy(true);
                      void dispatchHubApi
                        .downloadDispatchPackage(livePackage.id)
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = livePackage.fileName || 'don-hang.xlsx';
                          a.click();
                          URL.revokeObjectURL(url);
                        })
                        .finally(() => setPackageBusy(false));
                    }}
                  >
                    <Download size={13} /> Tải Excel
                  </button>
                )}
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#fff' }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} /> Email
                </div>
                <div style={{ fontSize: 13, color: '#334155' }}>
                  {livePackage.emailStatus === 'PENDING' && 'Đang chờ gửi / chuẩn bị gửi email NCC...'}
                  {livePackage.emailStatus === 'SCHEDULED' &&
                    `Đã lên lịch gửi lúc ${
                      livePackage.scheduledSendAtUtc
                        ? new Date(livePackage.scheduledSendAtUtc).toLocaleString('vi-VN')
                        : '—'
                    }`}
                  {livePackage.emailStatus === 'SENDING' && 'Đang gửi email...'}
                  {livePackage.emailStatus === 'SENT' &&
                    `Đã gửi${livePackage.sentAtUtc ? ` lúc ${new Date(livePackage.sentAtUtc).toLocaleString('vi-VN')}` : ''}`}
                  {livePackage.emailStatus === 'FAILED' &&
                    `Gửi thất bại${livePackage.lastError ? `: ${livePackage.lastError}` : ''}`}
                  {livePackage.emailStatus === 'CANCELLED' && 'Đã hủy lịch gửi email'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  To: {livePackage.emailTo}
                  {livePackage.emailCc?.length ? ` · CC: ${livePackage.emailCc.join(', ')}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {livePackage.canCancelSchedule && (
                    <button
                      type="button"
                      className="po-btn po-btn-secondary"
                      style={{ height: 32, fontSize: 12 }}
                      disabled={packageBusy}
                      onClick={() => {
                        setPackageBusy(true);
                        void dispatchHubApi
                          .cancelPackageSchedule(livePackage.id)
                          .then(setLivePackage)
                          .finally(() => setPackageBusy(false));
                      }}
                    >
                      <Clock size={13} /> Hủy lịch gửi
                    </button>
                  )}
                  {livePackage.canRetryEmail && (
                    <button
                      type="button"
                      className="po-btn po-btn-secondary"
                      style={{ height: 32, fontSize: 12 }}
                      disabled={packageBusy}
                      onClick={() => {
                        setPackageBusy(true);
                        void dispatchHubApi
                          .retryPackageEmail(livePackage.id)
                          .then(setLivePackage)
                          .finally(() => setPackageBusy(false));
                      }}
                    >
                      <RotateCcw size={13} /> Gửi lại email
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Result Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}
          >
            <Link
              to="/store-owner/purchase-orders"
              className="po-btn po-btn-secondary"
              onClick={onClose}
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Xem danh sách Purchase Orders</span>
            </Link>
            <button
              type="button"
              className="po-btn po-btn-primary"
              onClick={onClose}
              style={{ padding: '0 24px', height: 38, fontWeight: 700 }}
            >
              Hoàn tất & Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PREVIEW CONFIRMATION VIEW
  // ─────────────────────────────────────────────────────────────
  const hasEligibleGroups = eligibleGroups.length > 0;

  return (
    <div className="po-modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }} onClick={onClose}>
      <div
        className="po-modal-container"
        style={{
          maxWidth: 940,
          width: '95%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={18} color="#0d9488" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                Xác nhận chốt đơn NCC
              </h3>
              <div style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    background: '#e2e8f0',
                    color: '#334155',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 11.5,
                  }}
                >
                  {supplier.code}
                </span>
                <strong style={{ color: '#1e293b' }}>{supplier.name}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
            title="Đóng popup (Esc)"
          >
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Scope Selector: Segmented Control */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  PHẠM VI CHỐT ĐƠN:
                </label>
                {/* Segmented Control Buttons */}
                <div
                  style={{
                    display: 'inline-flex',
                    background: '#e2e8f0',
                    borderRadius: 8,
                    padding: 3,
                    gap: 3,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onScopeChange('NEAREST')}
                    disabled={isLoadingPreview || isSubmitting}
                    style={{
                      border: 'none',
                      background: scope === 'NEAREST' ? '#ffffff' : 'transparent',
                      color: scope === 'NEAREST' ? '#0f766e' : '#475569',
                      boxShadow: scope === 'NEAREST' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Zap size={14} color={scope === 'NEAREST' ? '#0d9488' : '#64748b'} />
                    <span>Ngày giao gần nhất</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onScopeChange('WEEK')}
                    disabled={isLoadingPreview || isSubmitting}
                    style={{
                      border: 'none',
                      background: scope === 'WEEK' ? '#ffffff' : 'transparent',
                      color: scope === 'WEEK' ? '#0369a1' : '#475569',
                      boxShadow: scope === 'WEEK' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Calendar size={14} color={scope === 'WEEK' ? '#0284c7' : '#64748b'} />
                    <span>Cả tuần (T2–CN)</span>
                  </button>
                </div>
              </div>

              {/* Time Details Display */}
              <div style={{ textAlign: 'right', minWidth: 260 }}>
                {scope === 'NEAREST' ? (
                  <div>
                    <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>NGÀY GIAO DỰ KIẾN:</span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e', marginTop: 2 }}>
                      {eligibleGroups[0]
                        ? formatDateVN(eligibleGroups[0].deliveryDate)
                        : 'Chưa xác định ngày giao'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>KHOẢNG THỜI GIAN TUẦN:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => onWeekChange(shiftWeek(weekStartDate, -1))}
                        disabled={isLoadingPreview || isSubmitting}
                        className="po-btn po-btn-secondary"
                        style={{ padding: '2px 6px', height: 26 }}
                        title="Tuần trước"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#0369a1',
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          padding: '3px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {formatWeekRange(weekStartDate)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onWeekChange(shiftWeek(undefined, 0))}
                        disabled={isLoadingPreview || isSubmitting}
                        className="po-btn po-btn-secondary"
                        style={{ padding: '2px 8px', height: 26, fontSize: 11 }}
                        title="Về tuần hiện tại"
                      >
                        Hiện tại
                      </button>
                      <button
                        type="button"
                        onClick={() => onWeekChange(shiftWeek(weekStartDate, 1))}
                        disabled={isLoadingPreview || isSubmitting}
                        className="po-btn po-btn-secondary"
                        style={{ padding: '2px 6px', height: 26 }}
                        title="Tuần kế tiếp"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Loading Preview State */}
          {isLoadingPreview && (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <RotateCcw size={24} className="animate-spin" style={{ color: '#0d9488', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                Đang đối chiếu dữ liệu Draft và tính toán preview từ máy chủ...
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Kiểm tra Cutoff, MOQ, OrderMultiple và lịch giao hàng của từng chi nhánh
              </div>
            </div>
          )}

          {/* Preview Error State */}
          {!isLoadingPreview && previewError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '16px 20px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 10 }}>
                <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ fontSize: 13.5, color: '#991b1b' }}>Không thể tải dữ liệu xem trước:</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#b91c1c' }}>{previewError}</p>
                </div>
              </div>
              {onRetryPreview && (
                <button
                  type="button"
                  className="po-btn po-btn-secondary"
                  onClick={onRetryPreview}
                  style={{ flexShrink: 0 }}
                >
                  <RotateCcw size={13} />
                  <span>Thử lại</span>
                </button>
              )}
            </div>
          )}

          {/* Normal Data Render */}
          {!isLoadingPreview && !previewError && previewData && (
            <>
              {/* Summary 4-Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                {/* 1. Tổng số PO dự kiến */}
                <div
                  style={{
                    background: '#f0fdfa',
                    border: '1px solid #99f6e4',
                    borderRadius: 8,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#0f766e', fontWeight: 700 }}>
                    <Layers size={14} />
                    <span>PO DỰ KIẾN TẠO</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f766e', marginTop: 4 }}>
                    {eligibleGroups.length}{' '}
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#134e4a' }}>đơn hàng</span>
                  </div>
                </div>

                {/* 2. Số chi nhánh có đơn */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#475569', fontWeight: 700 }}>
                    <Building2 size={14} />
                    <span>CHI NHÁNH CÓ ĐƠN</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                    {uniqueBranchesCount}{' '}
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>cửa hàng</span>
                  </div>
                </div>

                {/* 3. Tổng SKU */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#475569', fontWeight: 700 }}>
                    <Package size={14} />
                    <span>TỔNG SKU / MÓN</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                    {totalSkuCount}{' '}
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                      SKU ({totalQuantity.toLocaleString('vi-VN')})
                    </span>
                  </div>
                </div>

                {/* 4. Tổng giá trị dự kiến */}
                <div
                  style={{
                    background: hasAnyMissingPrice ? '#fffbeb' : '#f0fdf4',
                    border: hasAnyMissingPrice ? '1px solid #fde68a' : '1px solid #bbf7d0',
                    borderRadius: 8,
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                      color: hasAnyMissingPrice ? '#92400e' : '#166534',
                      fontWeight: 700,
                    }}
                  >
                    {hasAnyMissingPrice ? <AlertTriangle size={14} /> : <Check size={14} />}
                    <span>TỔNG GIÁ TRỊ DỰ KIẾN</span>
                  </div>
                  {hasAnyMissingPrice ? (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>
                        Chưa đủ giá một số SKU
                      </div>
                      <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                        Chỉ tính được: {totalAmount.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                      {totalAmount.toLocaleString('vi-VN')} đ
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Table: Eligible Purchase Orders */}
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                    Danh sách Purchase Order sẽ được tạo ({eligibleGroups.length}):
                  </span>

                </div>

                {hasEligibleGroups ? (
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#ffffff',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                          
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Chi nhánh</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Ngày giao</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Số SKU</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>SL đặt</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Giá trị dự kiến</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligibleGroups.map((g, idx) => {
                          const rowKey = `${g.branchId || ''}_${g.deliveryDate}_${idx}`;
                          const lines = g.lines || [];
                          const groupHasMissing =
                            g.hasMissingPrice || lines.some((l) => l.hasMissingPrice || l.unitPrice <= 0);

                          return (
                            <tr
                              key={rowKey}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                              }}
                            >
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                                {g.branchName || 'Chi nhánh'}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#334155' }}>
                                {formatDateVN(g.deliveryDate)}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: '#0f766e' }}>
                                {g.validLineCount ?? lines.length}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                                {(g.totalQuantity || lines.reduce((s, l) => s + l.quantity, 0)).toLocaleString('vi-VN')}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                                {groupHasMissing ? (
                                  <span style={{ color: '#b45309', fontSize: 11.5 }} title="Thiếu đơn giá một số SKU">
                                    ⚠️ Thiếu giá
                                  </span>
                                ) : (
                                  `${(g.totalAmount || 0).toLocaleString('vi-VN')} đ`
                                )}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '4px 10px',
                                    borderRadius: 4,
                                    background: '#dcfce7',
                                    color: '#15803d',
                                  }}
                                >
                                  Sẵn sàng tạo PO
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px dashed #cbd5e1',
                      color: '#64748b',
                      fontSize: 13,
                    }}
                  >
                    <Info size={20} color="#94a3b8" style={{ margin: '0 auto 6px' }} />
                    <div>Không có Purchase Order nào đủ điều kiện tạo trong phạm vi này.</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      Vui lòng kiểm tra lại số lượng đặt trên Ma trận đặt hàng hoặc chọn phạm vi tuần khác.
                    </div>
                  </div>
                )}
              </div>

              {/* Skipped / ineligible — table */}
              {categorizedIneligible.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                    }}
                  >
                    Các trường hợp bị bỏ qua / không đủ điều kiện ({ineligibleGroups.length}):
                  </div>
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#ffffff',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Chi nhánh</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Ngày giao</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Lý do</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Chi tiết</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorizedIneligible.flatMap(([catKey, cat]) =>
                          cat.groups.map((item, iIdx) => (
                            <tr
                              key={`${catKey}-${item.branchId || ''}-${item.deliveryDate}-${iIdx}`}
                              style={{ borderTop: '1px solid #f1f5f9' }}
                            >
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                                {item.branchName || 'Chi nhánh'}
                              </td>
                              <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                {formatDateVN(item.deliveryDate)}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    background: cat.badgeBg,
                                    color: cat.badgeColor,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {cat.label}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>
                                {item.purchaseOrderCode ? (
                                  <span style={{ fontFamily: 'monospace', color: '#0369a1', fontWeight: 700 }}>
                                    {item.purchaseOrderCode}
                                  </span>
                                ) : (
                                  item.errorMessage || item.errorCode || '—'
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    background: item.status === 'ALREADY_FINALIZED' ? '#e0f2fe' : '#f1f5f9',
                                    color: item.status === 'ALREADY_FINALIZED' ? '#0369a1' : '#64748b',
                                  }}
                                >
                                  {item.status === 'ALREADY_FINALIZED'
                                    ? 'Đã chốt'
                                    : item.status === 'SKIPPED'
                                      ? 'Bỏ qua'
                                      : item.status === 'FAILED'
                                        ? 'Lỗi'
                                        : item.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Email send mode */}
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={15} color="#0f766e" />
                  Phương thức gửi email
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 10,
                  }}
                >
                  <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={emailSendMode === 'SEND_NOW'}
                      onChange={() => onEmailSendModeChange('SEND_NOW')}
                      disabled={isSubmitting}
                    />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Gửi email ngay</span>
                  </label>
                  <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={emailSendMode === 'SCHEDULED_SEND'}
                      onChange={() => {
                        onEmailSendModeChange('SCHEDULED_SEND');
                        if (!scheduledSendAt) {
                          const d = new Date();
                          d.setHours(d.getHours() + 1, 0, 0, 0);
                          onScheduledSendAtChange(toDatetimeLocalValue(d));
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Hẹn giờ gửi email</span>
                  </label>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#334155',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    Email NCC
                  </label>
                  <input
                    type="email"
                    value={supplierEmail || ''}
                    readOnly
                    disabled
                    placeholder="Chưa có email trên hồ sơ NCC"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#f1f5f9',
                      color: supplierEmail ? '#0f172a' : '#94a3b8',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {emailSendMode === 'SCHEDULED_SEND' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                      Thời điểm gửi (GMT+7)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledSendAt}
                      min={toDatetimeLocalValue()}
                      onChange={(e) => onScheduledSendAtChange(e.target.value)}
                      disabled={isSubmitting}
                      style={{
                        display: 'block',
                        marginTop: 6,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: scheduleValid ? '1px solid #cbd5e1' : '1px solid #ef4444',
                        fontSize: 13,
                      }}
                    />
                    {!scheduleValid && (
                      <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                        Thời điểm phải ở tương lai.
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>CC email</label>
                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      minHeight: 42,
                      alignItems: 'center',
                    }}
                  >
                    {ccEmails.map((email) => (
                      <span
                        key={email}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#ecfeff',
                          border: '1px solid #a5f3fc',
                          color: '#0e7490',
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => onCcEmailsChange(ccEmails.filter((e) => e !== email))}
                          disabled={isSubmitting}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0e7490', padding: 0, lineHeight: 1 }}
                          aria-label={`Xóa ${email}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyDown={handleCcKeyDown}
                      onBlur={() => addCcEmail(ccInput)}
                      disabled={isSubmitting}
                      placeholder="Nhập email và nhấn Enter để thêm..."
                      style={{ flex: 1, minWidth: 160, border: 'none', outline: 'none', fontSize: 13 }}
                    />
                  </div>
                  {ccError && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{ccError}</div>}
                </div>
              </div>

              {/* Note for Supplier */}
              {onNoteChange && (
                <div style={{ marginTop: 14 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: 4,
                    }}
                  >
                    Ghi chú gửi nhà cung cấp (tùy chọn)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    rows={2}
                    disabled={isSubmitting}
                    placeholder="Nhập ghi chú giao hàng, dặn dò đóng gói, thời gian nhận hàng..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ height: 38, padding: '0 18px', fontWeight: 600 }}
          >
            Hủy
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={onConfirm}
            disabled={
              isSubmitting ||
              isLoadingPreview ||
              !hasEligibleGroups ||
              !scheduleValid ||
              (!!supplierEmail && !toEmailOk)
            }
            style={{
              height: 38,
              padding: '0 24px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity:
                isSubmitting || isLoadingPreview || !hasEligibleGroups || !scheduleValid ? 0.6 : 1,
              cursor:
                isSubmitting || isLoadingPreview || !hasEligibleGroups || !scheduleValid
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {isSubmitting ? (
              <>
                <RotateCcw size={15} className="animate-spin" />
                <span>Đang chốt đơn...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>
                  {emailSendMode === 'SCHEDULED_SEND' ? 'Chốt đơn và lên lịch gửi' : 'Chốt đơn và gửi email'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
