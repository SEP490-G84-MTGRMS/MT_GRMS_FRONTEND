import { useEffect, useMemo, useRef, useState, type FC } from 'react';
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
}

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
      return 'Không trả được — đẩy bán';
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
            };
          }

          const hasGrn = hasValidGrn(batch);
          if (!hasGrn) {
            return {
              batch,
              selected: false,
              confirmQty: confirmPurchaseQty,
              action: 'no_grn' as const,
              hint: 'Lô không gắn phiếu nhập gốc — không tạo được trả/đổi hàng.',
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
            };
          }
          return {
            batch,
            selected: false,
            confirmQty: confirmPurchaseQty,
            action: 'markdown' as const,
            hint: 'Policy NCC không cho trả cận hạn — giữ bán FEFO.',
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

  const evidenceRequired = useMemo(
    () => selectedReturnRows.some((r) => r.requireEvidenceImage),
    [selectedReturnRows]
  );

  const selectable = (row: AlertRow) =>
    isExpiredMode ? row.action === 'expired' : row.action === 'return';

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

  const title = isExpiredMode ? 'Lô hết hạn' : 'Lô cận hạn — trả / đổi NCC';
  const subtitle = isExpiredMode
    ? 'Tồn & SL xác nhận theo ĐVT nhập. Tạo phiếu kiểm kê (write-off khi Store Owner duyệt).'
    : 'Chỉ lô cảnh báo / khẩn cấp. Tồn & SL xác nhận theo ĐVT nhập. Tạo phiếu trả/đổi nháp (Store Owner gửi NCC).';
  const emptyText = isExpiredMode
    ? 'Không có lô hết hạn theo chi nhánh đang lọc.'
    : 'Không có lô cận hạn (cảnh báo / khẩn cấp) theo chi nhánh đang lọc.';
  const accent = isExpiredMode ? '#be123c' : '#b45309';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="so-list-table-card"
        style={{
          width: 'min(1080px, 100%)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 16 }}>
              {isExpiredMode ? (
                <ClipboardCheck size={18} color={accent} />
              ) : (
                <AlertTriangle size={18} color={accent} />
              )}
              {title}
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>{subtitle}</div>
          </div>
          <button type="button" className="so-list-action-btn" onClick={onClose} title="Đóng">
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              margin: '10px 18px 0',
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 12.5,
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={18} className="animate-spin" style={{ verticalAlign: 'middle' }} /> Đang
              tải lô...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>{emptyText}</div>
          ) : (
            <table className="so-list-table" style={{ minWidth: 980, tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th className="so-list-th" style={{ width: 36 }} />
                  <th className="so-list-th">SKU / Sản phẩm</th>
                  <th className="so-list-th">Mã lô</th>
                  <th className="so-list-th">Chi nhánh</th>
                  <th className="so-list-th">HSD</th>
                  <th className="so-list-th" style={{ textAlign: 'right' }}>
                    Còn (ngày)
                  </th>
                  <th className="so-list-th">NCC</th>
                  <th className="so-list-th" style={{ textAlign: 'right' }}>
                    Tồn (ĐVT nhập)
                  </th>
                  <th className="so-list-th" style={{ textAlign: 'right' }}>
                    SL xác nhận
                  </th>
                  <th className="so-list-th">Hướng xử lý</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.batch.id} className="so-list-row">
                    <td>
                      <input
                        type="checkbox"
                        disabled={!selectable(row)}
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
                      />
                    </td>
                    <td>
                      <div className="so-list-name">{row.batch.productName}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#64748b' }}>
                        {row.batch.sku}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}>
                      {row.batch.batchCode}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{row.batch.branchName}</td>
                    <td>{row.batch.expiryDate}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 800,
                        color: row.batch.daysLeft <= 0 ? '#be123c' : accent,
                      }}
                    >
                      {row.batch.daysLeft}
                    </td>
                    <td>{row.batch.supplierName}</td>
                    <td
                      style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}
                      title={
                        getPurchaseRate(row.batch) > 1 &&
                        purchaseUnitOf(row.batch).toLowerCase() !==
                          stockUnitOf(row.batch).toLowerCase()
                          ? `Tồn gốc: ${fmtQty(Number(row.batch.qtyCurrent) || 0)} ${stockUnitOf(row.batch)} · 1 ${purchaseUnitOf(row.batch)} = ${getPurchaseRate(row.batch)} ${stockUnitOf(row.batch)}`
                          : undefined
                      }
                    >
                      {fmtQty(maxPurchaseQty(row.batch))}{' '}
                      <span style={{ fontWeight: 600, color: '#64748b' }}>
                        {purchaseUnitOf(row.batch)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <input
                          type="number"
                          min={0}
                          step="any"
                          max={maxPurchaseQty(row.batch)}
                          disabled={!selectable(row)}
                          value={row.confirmQty}
                          onChange={(e) => {
                            const maxP = maxPurchaseQty(row.batch);
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
                            width: 72,
                            height: 28,
                            textAlign: 'right',
                            padding: '0 6px',
                            borderRadius: 5,
                            border: '1px solid #cbd5e1',
                            fontWeight: 700,
                          }}
                        />
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                          {purchaseUnitOf(row.batch)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            row.action === 'return' || row.action === 'expired'
                              ? '#0f766e'
                              : '#b45309',
                        }}
                      >
                        {actionLabel(row.action)}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{row.hint}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isExpiredMode && selectedReturnRows.length > 0 && (
          <div
            style={{
              padding: '10px 18px',
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
              <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                  Ảnh minh chứng
                  {evidenceRequired ? (
                    <span style={{ color: '#b45309', fontWeight: 800 }}> (bắt buộc)</span>
                  ) : (
                    <span style={{ color: '#64748b', fontWeight: 500 }}> (tuỳ chọn)</span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  {evidenceRequired
                    ? 'NCC đã chọn yêu cầu ảnh khi trả/đổi — đính kèm ảnh lô/kệ trước khi tạo phiếu.'
                    : 'Có thể đính kèm ảnh để Store Owner gửi NCC thuận tiện hơn.'}
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
                        width: 48,
                        height: 48,
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
                      className="so-list-action-btn"
                      title="Xóa ảnh"
                      disabled={isUploadingEvidence || isSubmitting}
                      onClick={() => setEvidenceUrl(null)}
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
                  className="so-list-filter-reset"
                  disabled={isUploadingEvidence || isSubmitting}
                  onClick={() => evidenceInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    ...(evidenceRequired && !evidenceUrl
                      ? { borderColor: '#f59e0b', color: '#b45309' }
                      : undefined),
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
            padding: '12px 18px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12.5, color: '#475569' }}>
            {isExpiredMode
              ? `Đã chọn ${selectedExpiredRows.length} lô hết hạn để lập phiếu kiểm kê (1 chi nhánh / phiếu).`
              : `Đã chọn ${selectedReturnRows.length} lô cận hạn để tạo phiếu trả/đổi (tách theo GRN / NCC).`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="so-list-filter-reset" onClick={onClose}>
              Đóng
            </button>
            {isExpiredMode ? (
              <button
                type="button"
                className="so-list-filter-search"
                disabled={selectedExpiredRows.length === 0}
                style={
                  selectedExpiredRows.length === 0
                    ? { opacity: 0.55, cursor: 'not-allowed' }
                    : { backgroundColor: '#be123c', borderColor: '#be123c' }
                }
                onClick={handleCreateStocktake}
              >
                <ClipboardCheck size={14} />
                Tạo phiếu kiểm kê
              </button>
            ) : (
              <button
                type="button"
                className="so-list-filter-search"
                disabled={
                  isSubmitting ||
                  isUploadingEvidence ||
                  selectedReturnRows.length === 0 ||
                  (evidenceRequired && !evidenceUrl)
                }
                style={
                  isSubmitting ||
                  isUploadingEvidence ||
                  selectedReturnRows.length === 0 ||
                  (evidenceRequired && !evidenceUrl)
                    ? { opacity: 0.55, cursor: 'not-allowed' }
                    : undefined
                }
                onClick={() => void handleCreateReturns()}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                Tạo phiếu gửi Store Owner
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
