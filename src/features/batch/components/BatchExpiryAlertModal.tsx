import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC } from 'react';
import { AlertTriangle, ClipboardCheck, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import type { BatchFilterState, BatchItem } from '../types/batch.types';
import { batchApi } from '../api/batchApi';
import { supplierApi } from '../../supplier/api/supplierApi';
import type { SupplierReturnPolicy } from '../../supplier/types/supplier.types';
import { supplierReturnApi } from '../../supplier-return/api/supplierReturnApi';
import { uploadImageToCloudinary } from '../../../utils/cloudinary';

export type BatchAlertMode = 'near_expiry' | 'expired';

type LotAction = 'return' | 'markdown' | 'expired' | 'no_grn';

interface AlertRow {
  batch: BatchItem;
  selected: boolean;
  confirmQty: number;
  action: LotAction;
  hint: string;
  resolutionType?: string;
  requireEvidenceImage?: boolean;
  canReturn: boolean;
  discountPercent: number;
  startDaysBeforeExpiry: number;
  startTime: string;
}

const formatVnDateTime = (utc?: string | null) => {
  if (!utc) return '—';
  try {
    return new Date(utc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  } catch {
    return utc;
  }
};

const discountStatusLabel = (status?: BatchItem['fefoDiscountStatus']) => {
  switch (status) {
    case 'Scheduled':
      return 'Đã lên lịch';
    case 'Active':
      return 'Đang giảm giá';
    case 'Completed':
      return 'Hết hiệu lực';
    default:
      return 'Chưa có lịch';
  }
};

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hasValidGrn = (batch: BatchItem): boolean =>
  Boolean(batch.originalGrnId && GUID_RE.test(batch.originalGrnId));

interface BatchExpiryAlertModalProps {
  isOpen: boolean;
  mode: BatchAlertMode;
  branchId: string;
  onClose: () => void;
  onCreated: (codes: string[]) => void;
  onCreateStocktake: (batches: Array<BatchItem & { confirmQty?: number }>) => void;
  canManageDiscount: boolean;
  onDiscountSaved: (message: string) => void | Promise<void>;
}

const emptyFilters = (branchId: string, status: BatchFilterState['status']): BatchFilterState => ({
  keyword: '',
  productName: '',
  sku: '',
  batchCode: '',
  supplierName: '',
  branchId: branchId || 'ALL',
  status,
  pageIndex: 1,
  pageSize: 100,
});

const canReturnNearExpiry = (policy: SupplierReturnPolicy | null, daysLeft: number): boolean => {
  if (!policy || !policy.isActive || !policy.allowReturn) return false;
  const types = (policy.allowedReturnTypes || []).map((t) => t.toUpperCase());
  if (!types.includes('NEAR_EXPIRY')) return false;
  if (daysLeft < 0) return false;
  if (policy.nearExpiryMinDaysLeft != null) {
    return daysLeft <= policy.nearExpiryMinDaysLeft;
  }
  return true;
};

/** qtyCurrent trên BatchItem là ĐVT tồn; popup này nhập/hiển thị theo ĐVT nhập. */
const getPurchaseRate = (batch: BatchItem) =>
  Number(batch.purchaseToStockRate) > 0 ? Number(batch.purchaseToStockRate) : 1;

const purchaseUnitOf = (batch: BatchItem) =>
  (batch.unit || batch.stockUnit || 'Cái').trim() || 'Cái';

const stockUnitOf = (batch: BatchItem) =>
  (batch.stockUnit || batch.unit || 'Cái').trim() || 'Cái';

const stockToPurchase = (stockQty: number, rate: number) => {
  const r = rate > 0 ? rate : 1;
  return Math.round((Number(stockQty) / r) * 1000) / 1000;
};

const purchaseToStock = (purchaseQty: number, rate: number) => {
  const r = rate > 0 ? rate : 1;
  return Math.round(Number(purchaseQty) * r * 1000) / 1000;
};

const maxPurchaseQty = (batch: BatchItem) =>
  stockToPurchase(Number(batch.qtyCurrent) || 0, getPurchaseRate(batch));

const fmtQty = (n: number) =>
  n.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

const actionLabel = (action: LotAction): string => {
  switch (action) {
    case 'return':
      return 'Trả / đổi NCC';
    case 'markdown':
      return 'Giảm giá kích cầu';
    case 'expired':
      return 'Hết hạn — kiểm kê/hủy';
    default:
      return 'Thiếu GRN gốc';
  }
};

export const BatchExpiryAlertModal: FC<BatchExpiryAlertModalProps> = ({
  isOpen,
  mode,
  branchId,
  onClose,
  onCreated,
  onCreateStocktake,
  canManageDiscount,
  onDiscountSaved,
}) => {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const isExpiredMode = mode === 'expired';

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMsg('');
      setEvidenceUrl(null);
      try {
        let lots: BatchItem[] = [];
        if (isExpiredMode) {
          const expired = await batchApi.getBatches(emptyFilters(branchId, 'Expired'));
          lots = expired.items;
        } else {
          const [warning, critical] = await Promise.all([
            batchApi.getBatches(emptyFilters(branchId, 'Warning')),
            batchApi.getBatches(emptyFilters(branchId, 'Critical')),
          ]);
          lots = [...critical.items, ...warning.items];
        }

        const unique = new Map<string, BatchItem>();
        lots.forEach((b) => unique.set(b.id, b));

        let policies: Record<string, SupplierReturnPolicy | null> = {};
        if (!isExpiredMode) {
          const supplierIds = [
            ...new Set(
              [...unique.values()].map((b) => b.supplierId).filter((id) => id && id !== '—')
            ),
          ];
          const policyEntries = await Promise.all(
            supplierIds.map(async (id) => {
              try {
                return [id, await supplierApi.getReturnPolicy(id)] as const;
              } catch {
                return [id, null] as const;
              }
            })
          );
          policies = Object.fromEntries(policyEntries) as Record<
            string,
            SupplierReturnPolicy | null
          >;
        }

        if (cancelled) return;

        const nextRows: AlertRow[] = [...unique.values()].map((batch) => {
          const confirmPurchaseQty = maxPurchaseQty(batch);
          if (isExpiredMode) {
            return {
              batch,
              selected: true,
              confirmQty: confirmPurchaseQty,
              action: 'expired' as const,
              hint: 'Hết hạn: tạo phiếu kiểm kê để write-off khi Store Owner duyệt.',
              canReturn: false,
              discountPercent: 20,
              startDaysBeforeExpiry: 0,
              startTime: '00:00',
            };
          }

          const hasGrn = hasValidGrn(batch);
          if (!hasGrn) {
            return {
              batch,
              selected: false,
              confirmQty: confirmPurchaseQty,
              action: 'markdown' as const,
              hint: 'Lô không gắn phiếu nhập gốc — có thể chọn giảm giá kích cầu.',
              canReturn: false,
              discountPercent: batch.discountPercent && batch.discountPercent >= 10 ? batch.discountPercent : 20,
              startDaysBeforeExpiry: Math.max(0, batch.daysLeft),
              startTime: '00:00',
            };
          }
          const policy = policies[batch.supplierId] || null;
          const ok = canReturnNearExpiry(policy, batch.daysLeft);
          if (ok) {
            // Cận hạn "Trả/đổi NCC": ưu tiên EXCHANGE (để sinh PO đổi hàng) nếu policy cho phép.
            const allowedRes = (policy?.allowedResolutionTypes || []).map((t) =>
              String(t || '').toUpperCase()
            );
            const preferExchange = allowedRes.length === 0 || allowedRes.includes('EXCHANGE');
            const resolution = preferExchange
              ? 'EXCHANGE'
              : policy?.defaultResolutionType || 'REDUCE_PAYABLE';
            const needEvidence = policy?.requireEvidenceImage !== false;
            return {
              batch,
              selected: true,
              confirmQty: confirmPurchaseQty,
              action: 'return' as const,
              hint: needEvidence
                ? `Đủ điều kiện NEAR_EXPIRY · ${resolution} · NCC yêu cầu ảnh minh chứng`
                : `Đủ điều kiện NEAR_EXPIRY · xử lý mặc định: ${resolution}`,
              resolutionType: resolution,
              requireEvidenceImage: needEvidence,
              canReturn: true,
              discountPercent: batch.discountPercent && batch.discountPercent >= 10 ? batch.discountPercent : 20,
              startDaysBeforeExpiry: Math.max(0, batch.daysLeft),
              startTime: '00:00',
            };
          }
          return {
            batch,
            selected: false,
            confirmQty: confirmPurchaseQty,
            action: 'markdown' as const,
            hint: 'Policy NCC không cho trả cận hạn — có thể lập lịch giảm giá kích cầu.',
            canReturn: false,
            discountPercent: batch.discountPercent && batch.discountPercent >= 10 ? batch.discountPercent : 20,
            startDaysBeforeExpiry: Math.max(0, batch.daysLeft),
            startTime: '00:00',
          };
        });

        nextRows.sort((a, b) => a.batch.daysLeft - b.batch.daysLeft);
        setRows(nextRows);
      } catch (err: unknown) {
        if (!cancelled) {
          setRows([]);
          setErrorMsg(
            err instanceof Error
              ? err.message
              : isExpiredMode
                ? 'Không tải được danh sách lô hết hạn.'
                : 'Không tải được danh sách lô cận hạn.'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, branchId, isExpiredMode]);

  const selectedReturnRows = useMemo(
    () => rows.filter((r) => r.selected && r.action === 'return' && r.confirmQty > 0),
    [rows]
  );

  const selectedExpiredRows = useMemo(
    () => rows.filter((r) => r.selected && r.action === 'expired' && r.confirmQty > 0),
    [rows]
  );

  const selectedMarkdownRows = useMemo(
    () => rows.filter((r) => r.selected && r.action === 'markdown'),
    [rows]
  );

  const evidenceRequired = useMemo(
    () => selectedReturnRows.some((r) => r.requireEvidenceImage),
    [selectedReturnRows]
  );

  const selectable = (row: AlertRow) =>
    isExpiredMode ? row.action === 'expired' : row.action === 'return' || (canManageDiscount && row.action === 'markdown');

  const handleSaveDiscounts = async () => {
    if (!canManageDiscount || selectedMarkdownRows.length === 0) return;
    const invalid = selectedMarkdownRows.find((r) => r.discountPercent < 10 || r.discountPercent > 90);
    if (invalid) {
      setErrorMsg(`Lô ${invalid.batch.batchCode}: mức giảm phải từ 10% đến 90%.`);
      return;
    }
    const invalidDays = selectedMarkdownRows.find((r) => r.startDaysBeforeExpiry < 0);
    if (invalidDays) {
      setErrorMsg(`Lô ${invalidDays.batch.batchCode}: số ngày còn lại đến HSD không hợp lệ.`);
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    let saved = 0;
    try {
      for (const row of selectedMarkdownRows) {
        try {
          await batchApi.applyFefoDiscount(
            row.batch.id,
            row.discountPercent,
            row.startDaysBeforeExpiry,
            row.startTime
          );
          saved += 1;
        } catch (err: unknown) {
          const detail = err instanceof Error ? err.message : 'Lỗi không xác định';
          throw new Error(
            `Dừng tại lô ${row.batch.batchCode} (đã lưu ${saved}/${selectedMarkdownRows.length}): ${detail}`
          );
        }
      }
      await onDiscountSaved(`Đã lưu lịch giảm giá cho ${saved} lô cận hạn.`);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu lịch giảm giá FEFO.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDiscount = async (row: AlertRow) => {
    if (!canManageDiscount) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await batchApi.cancelFefoDiscount(row.batch.id);
      await onDiscountSaved(`Đã tắt lịch giảm giá lô ${row.batch.batchCode}.`);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tắt lịch giảm giá FEFO.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvidenceUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingEvidence(true);
    setErrorMsg('');
    try {
      const url = await uploadImageToCloudinary(file, 'mtgrms/supplier-returns');
      setEvidenceUrl(url);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải ảnh minh chứng.');
    } finally {
      setIsUploadingEvidence(false);
      if (evidenceInputRef.current) evidenceInputRef.current.value = '';
    }
  };

  const handleCreateReturns = async () => {
    if (selectedReturnRows.length === 0) {
      setErrorMsg('Chọn ít nhất 1 lô đủ điều kiện trả/đổi NCC và nhập SL xác nhận > 0.');
      return;
    }

    const missingGrn = selectedReturnRows.filter((r) => !r.batch.originalGrnId);
    if (missingGrn.length) {
      setErrorMsg('Có lô được chọn nhưng thiếu GRN gốc.');
      return;
    }

    if (evidenceRequired && !evidenceUrl) {
      setErrorMsg('Chính sách NCC yêu cầu ảnh minh chứng khi trả/đổi hàng. Vui lòng đính kèm ảnh.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const grouped = new Map<string, AlertRow[]>();
      selectedReturnRows.forEach((row) => {
        const key = row.batch.originalGrnId as string;
        const list = grouped.get(key) || [];
        list.push(row);
        grouped.set(key, list);
      });

      const createdCodes: string[] = [];
      for (const [grnId, group] of grouped) {
        const first = group[0];
        const created = await supplierReturnApi.create(
          {
            goodsReceiptId: grnId,
            supplierId: first.batch.supplierId,
            branchId: first.batch.branchId,
            reason: 'Hàng sắp hết hạn (Near-Expiry)',
            reasonNotes: `Tạo từ cảnh báo cận hạn · ${group.length} lô · xác nhận SL trên kệ.`,
            attachmentUrl: evidenceUrl || undefined,
            autoSubmit: false,
            resolutionType: first.resolutionType || 'EXCHANGE',
            lines: group.map((r) => ({
              productId: r.batch.productId,
              batchCode: r.batch.batchCode !== '—' ? r.batch.batchCode : undefined,
              expiryDate: r.batch.rawExpiryDate || undefined,
              // API / tồn kho dùng ĐVT tồn (base)
              requestedQty: purchaseToStock(r.confirmQty, getPurchaseRate(r.batch)),
              unitCost: r.batch.costPrice || 0,
              notes: `Lô ${r.batch.batchCode} · còn ${r.batch.daysLeft} ngày · ${fmtQty(r.confirmQty)} ${purchaseUnitOf(r.batch)}`,
            })),
          },
          { allowMock: false }
        );
        createdCodes.push(created.code);
      }
      onCreated(createdCodes);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tạo được phiếu trả hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStocktake = () => {
    if (selectedExpiredRows.length === 0) {
      setErrorMsg('Chọn ít nhất 1 lô hết hạn và nhập SL xác nhận > 0.');
      return;
    }

    const branchIds = new Set(selectedExpiredRows.map((r) => r.batch.branchId));
    if (branchIds.size > 1) {
      setErrorMsg(
        'Phiếu kiểm kê chỉ thuộc 1 chi nhánh. Lọc 1 chi nhánh hoặc chỉ chọn lô cùng chi nhánh.'
      );
      return;
    }

    onCreateStocktake(
      selectedExpiredRows.map((r) => ({
        ...r.batch,
        // Phiếu kiểm kê nhận SL theo ĐVT tồn
        confirmQty: purchaseToStock(r.confirmQty, getPurchaseRate(r.batch)),
      }))
    );
  };

  if (!isOpen) return null;

  const title = isExpiredMode ? 'Lô hết hạn' : 'Lô cận hạn';
  const subtitle = isExpiredMode
    ? 'Xác nhận số lượng rồi tạo phiếu kiểm kê để write-off.'
    : 'Chọn hướng xử lý từng lô: trả/đổi NCC hoặc giảm giá kích cầu.';
  const emptyText = isExpiredMode
    ? 'Không có lô hết hạn trong phạm vi đang lọc.'
    : 'Không có lô cận hạn trong phạm vi đang lọc.';
  const accent = isExpiredMode ? '#be123c' : '#b45309';
  const accentSoft = isExpiredMode ? '#fff1f2' : '#fffbeb';

  const daysBadge = (daysLeft: number) => {
    const urgent = daysLeft <= 0;
    const critical = daysLeft > 0 && daysLeft <= 7;
    const bg = urgent ? '#ffe4e6' : critical ? '#ffedd5' : '#fef3c7';
    const color = urgent ? '#be123c' : critical ? '#c2410c' : '#b45309';
    const label = urgent ? 'Hết hạn' : `Còn ${daysLeft} ngày`;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 22,
          padding: '0 8px',
          borderRadius: 999,
          background: bg,
          color,
          fontSize: 11.5,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    );
  };

  const fieldLabel: CSSProperties = {
    fontSize: 10.5,
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    marginBottom: 4,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        backgroundColor: 'rgba(15, 23, 42, 0.48)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
            background: `linear-gradient(180deg, ${accentSoft} 0%, #fff 100%)`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 800,
                fontSize: 17,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              {isExpiredMode ? (
                <ClipboardCheck size={18} color={accent} />
              ) : (
                <AlertTriangle size={18} color={accent} />
              )}
              {title}
              {!isLoading && rows.length > 0 && (
                <span
                  style={{
                    marginLeft: 2,
                    height: 22,
                    minWidth: 22,
                    padding: '0 7px',
                    borderRadius: 999,
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: 11.5,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {rows.length}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>
              {subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 12.5,
              lineHeight: 1.4,
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 16px 16px' }}>
          {isLoading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
              <Loader2 size={18} className="animate-spin" style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Đang tải lô...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 13.5 }}>
              {emptyText}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map((row) => {
                const unit = purchaseUnitOf(row.batch);
                const maxP = maxPurchaseQty(row.batch);
                const isMarkdown = row.action === 'markdown';
                const isReturn = row.action === 'return';
                const canPick = selectable(row);
                const stockTitle =
                  getPurchaseRate(row.batch) > 1 &&
                  unit.toLowerCase() !== stockUnitOf(row.batch).toLowerCase()
                    ? `Tồn gốc: ${fmtQty(Number(row.batch.qtyCurrent) || 0)} ${stockUnitOf(row.batch)} · 1 ${unit} = ${getPurchaseRate(row.batch)} ${stockUnitOf(row.batch)}`
                    : undefined;

                return (
                  <div
                    key={row.batch.id}
                    style={{
                      border: row.selected ? `1px solid ${isReturn || row.action === 'expired' ? '#99f6e4' : '#fcd34d'}` : '1px solid #e2e8f0',
                      background: row.selected ? (isReturn || row.action === 'expired' ? '#f0fdfa' : '#fffbeb') : '#fff',
                      borderRadius: 12,
                      padding: '12px 14px',
                      transition: 'border-color 120ms ease, background 120ms ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px minmax(0, 1fr) auto',
                        gap: 10,
                        alignItems: 'start',
                      }}
                    >
                      <div style={{ paddingTop: 3 }}>
                        <input
                          type="checkbox"
                          disabled={!canPick}
                          checked={row.selected}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.batch.id === row.batch.id
                                  ? { ...r, selected: e.target.checked }
                                  : r
                              )
                            )
                          }
                          style={{ width: 16, height: 16, cursor: canPick ? 'pointer' : 'not-allowed' }}
                        />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#0f172a',
                            lineHeight: 1.3,
                            wordBreak: 'break-word',
                          }}
                        >
                          {row.batch.productName}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '4px 10px',
                            marginTop: 5,
                            fontSize: 12,
                            color: '#64748b',
                          }}
                        >
                          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                            {row.batch.sku}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span
                            style={{
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              fontWeight: 700,
                              color: '#0f766e',
                            }}
                          >
                            {row.batch.batchCode}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span>HSD {row.batch.expiryDate}</span>
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          {daysBadge(row.batch.daysLeft)}
                          <span
                            title={stockTitle}
                            style={{
                              fontSize: 12,
                              color: '#475569',
                              fontWeight: 600,
                            }}
                          >
                            Tồn {fmtQty(maxP)} {unit}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 128 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={fieldLabel}>SL xác nhận</div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              max={maxP}
                              disabled={!canPick}
                              value={row.confirmQty}
                              onChange={(e) => {
                                const n = Math.max(0, Number(e.target.value) || 0);
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.batch.id === row.batch.id
                                      ? { ...r, confirmQty: Math.min(n, maxP) }
                                      : r
                                  )
                                );
                              }}
                              style={{
                                width: 76,
                                height: 32,
                                textAlign: 'right',
                                padding: '0 8px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                fontWeight: 700,
                                fontSize: 13.5,
                                background: canPick ? '#fff' : '#f8fafc',
                              }}
                            />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', minWidth: 28 }}>
                              {unit}
                            </span>
                          </div>
                        </div>

                        {!isExpiredMode && canManageDiscount ? (
                          <div style={{ textAlign: 'right', width: '100%' }}>
                            <div style={fieldLabel}>Hướng xử lý</div>
                            <select
                              value={isReturn || isMarkdown ? row.action : 'markdown'}
                              disabled={isSubmitting}
                              onChange={(e) => {
                                const action = e.target.value as LotAction;
                                if (action === 'return' && !row.canReturn) return;
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.batch.id === row.batch.id
                                      ? { ...r, action, selected: true }
                                      : r
                                  )
                                );
                              }}
                              style={{
                                width: '100%',
                                minWidth: 148,
                                height: 32,
                                border: '1px solid #cbd5e1',
                                borderRadius: 8,
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: isReturn ? '#0f766e' : '#b45309',
                                background: '#fff',
                                padding: '0 8px',
                              }}
                            >
                              <option value="return" disabled={!row.canReturn}>
                                Trả / đổi NCC
                              </option>
                              <option value="markdown">Giảm giá kích cầu</option>
                            </select>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: 700,
                                color:
                                  isReturn || row.action === 'expired' ? '#0f766e' : '#b45309',
                              }}
                            >
                              {actionLabel(row.action)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        marginLeft: 38,
                        fontSize: 12,
                        color: '#94a3b8',
                        lineHeight: 1.35,
                      }}
                    >
                      {row.hint}
                    </div>

                    {isMarkdown && (
                      <div
                        style={{
                          marginTop: 10,
                          marginLeft: 38,
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: '#fff7ed',
                          border: '1px solid #fed7aa',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#9a3412', fontWeight: 600 }}>
                          {discountStatusLabel(row.batch.fefoDiscountStatus)}
                          {row.batch.fefoDiscountStartAtUtc
                            ? ` · từ ${formatVnDateTime(row.batch.fefoDiscountStartAtUtc)}`
                            : ''}
                          {row.batch.fefoDiscountEndAtUtc
                            ? ` → ${formatVnDateTime(row.batch.fefoDiscountEndAtUtc)}`
                            : ''}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#78533a' }}>
                            Giảm
                            <input
                              type="number"
                              min={10}
                              max={90}
                              disabled={!canManageDiscount || isSubmitting}
                              value={row.discountPercent}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.batch.id === row.batch.id
                                      ? { ...r, discountPercent: Number(e.target.value) }
                                      : r
                                  )
                                )
                              }
                              style={{
                                width: 52,
                                height: 30,
                                border: '1px solid #fdba74',
                                borderRadius: 7,
                                textAlign: 'right',
                                padding: '0 6px',
                                fontWeight: 700,
                                background: '#fff',
                              }}
                              title="Phần trăm giảm"
                            />
                            %
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#78533a' }}>
                            khi còn
                            <input
                              type="number"
                              min={0}
                              max={Math.max(0, row.batch.daysLeft)}
                              disabled={!canManageDiscount || isSubmitting}
                              value={row.startDaysBeforeExpiry}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.batch.id === row.batch.id
                                      ? {
                                          ...r,
                                          startDaysBeforeExpiry: Math.max(0, Number(e.target.value)),
                                        }
                                      : r
                                  )
                                )
                              }
                              style={{
                                width: 48,
                                height: 30,
                                border: '1px solid #fdba74',
                                borderRadius: 7,
                                textAlign: 'right',
                                padding: '0 6px',
                                fontWeight: 700,
                                background: '#fff',
                              }}
                              title="Số ngày còn lại đến HSD"
                            />
                            ngày,
                          </label>
                          <input
                            type="time"
                            disabled={!canManageDiscount || isSubmitting}
                            value={row.startTime}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.batch.id === row.batch.id
                                    ? { ...r, startTime: e.target.value }
                                    : r
                                )
                              )
                            }
                            style={{
                              height: 30,
                              border: '1px solid #fdba74',
                              borderRadius: 7,
                              padding: '0 6px',
                              background: '#fff',
                            }}
                          />
                          {canManageDiscount && row.batch.isFefoDiscountActive && (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => void handleCancelDiscount(row)}
                              style={{
                                height: 30,
                                padding: '0 10px',
                                border: '1px solid #fecaca',
                                borderRadius: 7,
                                color: '#b91c1c',
                                background: '#fff',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Tắt giảm giá
                            </button>
                          )}
                          {!canManageDiscount && (
                            <span style={{ fontSize: 11.5, color: '#a16207' }}>
                              Chỉ Store Owner được chỉnh
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isExpiredMode && selectedReturnRows.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              background: evidenceRequired && !evidenceUrl ? '#fffbeb' : '#f8fafc',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Ảnh minh chứng
                  {evidenceRequired ? (
                    <span style={{ color: '#b45309' }}> · bắt buộc</span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontWeight: 500 }}> · tuỳ chọn</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.35 }}>
                  {evidenceRequired
                    ? 'Policy NCC yêu cầu ảnh khi trả/đổi — đính kèm ảnh lô/kệ trước khi tạo phiếu.'
                    : 'Có thể đính kèm ảnh để gửi NCC thuận tiện hơn.'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {evidenceUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a
                      href={evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        overflow: 'hidden',
                        width: 44,
                        height: 44,
                        background: '#fff',
                      }}
                      title="Xem ảnh minh chứng"
                    >
                      <img
                        src={evidenceUrl}
                        alt="Ảnh minh chứng"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </a>
                    <button
                      type="button"
                      title="Xóa ảnh"
                      disabled={isUploadingEvidence || isSubmitting}
                      onClick={() => setEvidenceUrl(null)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: '1px solid #fecaca',
                        background: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  </div>
                ) : null}

                <input
                  ref={evidenceInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => void handleEvidenceUpload(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  disabled={isUploadingEvidence || isSubmitting}
                  onClick={() => evidenceInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: evidenceRequired && !evidenceUrl ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                    background: '#fff',
                    color: evidenceRequired && !evidenceUrl ? '#b45309' : '#334155',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isUploadingEvidence ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ImagePlus size={14} />
                  )}
                  {evidenceUrl ? 'Đổi ảnh' : 'Chọn ảnh'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            padding: '12px 20px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
            background: '#fff',
          }}
        >
          <span style={{ fontSize: 12.5, color: '#64748b' }}>
            {isExpiredMode
              ? `Đã chọn ${selectedExpiredRows.length} lô để kiểm kê`
              : `Trả/đổi ${selectedReturnRows.length} · Giảm giá ${selectedMarkdownRows.length}`}
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 9,
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            {isExpiredMode ? (
              <button
                type="button"
                disabled={selectedExpiredRows.length === 0}
                onClick={handleCreateStocktake}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 9,
                  border: 'none',
                  background: selectedExpiredRows.length === 0 ? '#fda4af' : '#be123c',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: selectedExpiredRows.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: selectedExpiredRows.length === 0 ? 0.65 : 1,
                }}
              >
                <ClipboardCheck size={14} />
                Tạo phiếu kiểm kê
              </button>
            ) : (
              <>
                {canManageDiscount && selectedMarkdownRows.length > 0 && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleSaveDiscounts()}
                    style={{
                      height: 36,
                      padding: '0 14px',
                      borderRadius: 9,
                      border: 'none',
                      background: '#d97706',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                    Lưu giảm giá ({selectedMarkdownRows.length})
                  </button>
                )}
                {selectedReturnRows.length > 0 && (
                  <button
                    type="button"
                    disabled={isSubmitting || isUploadingEvidence || (evidenceRequired && !evidenceUrl)}
                    onClick={() => void handleCreateReturns()}
                    style={{
                      height: 36,
                      padding: '0 14px',
                      borderRadius: 9,
                      border: 'none',
                      background:
                        isSubmitting || isUploadingEvidence || (evidenceRequired && !evidenceUrl)
                          ? '#5eead4'
                          : '#0f766e',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor:
                        isSubmitting || isUploadingEvidence || (evidenceRequired && !evidenceUrl)
                          ? 'not-allowed'
                          : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                    Tạo phiếu trả/đổi
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
