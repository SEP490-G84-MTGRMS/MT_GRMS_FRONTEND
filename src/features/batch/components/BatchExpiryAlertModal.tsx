import { useEffect, useMemo, useState, type FC } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import type { BatchFilterState, BatchItem } from '../types/batch.types';
import { batchApi } from '../api/batchApi';
import { supplierApi } from '../../supplier/api/supplierApi';
import type { SupplierReturnPolicy } from '../../supplier/types/supplier.types';
import { supplierReturnApi } from '../../supplier-return/api/supplierReturnApi';

type LotAction = 'return' | 'markdown' | 'expired' | 'no_grn';

interface AlertRow {
  batch: BatchItem;
  selected: boolean;
  confirmQty: number;
  action: LotAction;
  hint: string;
  resolutionType?: string;
}

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hasValidGrn = (batch: BatchItem): boolean =>
  Boolean(batch.originalGrnId && GUID_RE.test(batch.originalGrnId));

interface BatchExpiryAlertModalProps {
  isOpen: boolean;
  branchId: string;
  onClose: () => void;
  onCreated: (codes: string[]) => void;
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
  branchId,
  onClose,
  onCreated,
}) => {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const [warning, critical, expired] = await Promise.all([
          batchApi.getBatches(emptyFilters(branchId, 'Warning')),
          batchApi.getBatches(emptyFilters(branchId, 'Critical')),
          batchApi.getBatches(emptyFilters(branchId, 'Expired')),
        ]);
        const lots = [...critical.items, ...warning.items, ...expired.items];
        const unique = new Map<string, BatchItem>();
        lots.forEach((b) => unique.set(b.id, b));

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
        const policies = Object.fromEntries(policyEntries) as Record<
          string,
          SupplierReturnPolicy | null
        >;

        if (cancelled) return;

        const nextRows: AlertRow[] = [...unique.values()].map((batch) => {
          const hasGrn = hasValidGrn(batch);
          if (batch.status === 'Expired') {
            return {
              batch,
              selected: false,
              confirmQty: batch.qtyCurrent,
              action: 'expired',
              hint: 'Hết hạn: xử lý bằng phiếu kiểm kê (write-off), không tạo trả NCC.',
            };
          }
          if (!hasGrn) {
            return {
              batch,
              selected: false,
              confirmQty: batch.qtyCurrent,
              action: 'no_grn',
              hint: 'Lô không gắn phiếu nhập gốc — không tạo được trả hàng.',
            };
          }
          const policy = policies[batch.supplierId] || null;
          const ok = canReturnNearExpiry(policy, batch.daysLeft);
          if (ok) {
            const resolution = policy?.defaultResolutionType || 'REDUCE_PAYABLE';
            return {
              batch,
              selected: true,
              confirmQty: batch.qtyCurrent,
              action: 'return',
              hint: `Đủ điều kiện NEAR_EXPIRY · xử lý mặc định: ${resolution}`,
              resolutionType: resolution,
            };
          }
          return {
            batch,
            selected: false,
            confirmQty: batch.qtyCurrent,
            action: 'markdown',
            hint: 'Policy NCC không cho trả cận hạn — giữ bán FEFO.',
          };
        });

        nextRows.sort((a, b) => a.batch.daysLeft - b.batch.daysLeft);
        setRows(nextRows);
      } catch (err: unknown) {
        if (!cancelled) {
          setRows([]);
          setErrorMsg(err instanceof Error ? err.message : 'Không tải được danh sách lô cận hạn.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, branchId]);

  const selectedReturnRows = useMemo(
    () => rows.filter((r) => r.selected && r.action === 'return' && r.confirmQty > 0),
    [rows]
  );

  const handleCreate = async () => {
    if (selectedReturnRows.length === 0) {
      setErrorMsg('Chọn ít nhất 1 lô đủ điều kiện trả NCC và nhập SL xác nhận > 0.');
      return;
    }

    const missingGrn = selectedReturnRows.filter((r) => !r.batch.originalGrnId);
    if (missingGrn.length) {
      setErrorMsg('Có lô được chọn nhưng thiếu GRN gốc.');
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
            reasonNotes: `Tạo từ cảnh báo HSD · ${group.length} lô · xác nhận SL trên kệ.`,
            autoSubmit: false,
            resolutionType: first.resolutionType || 'REDUCE_PAYABLE',
            lines: group.map((r) => ({
              productId: r.batch.productId,
              batchCode: r.batch.batchCode !== '—' ? r.batch.batchCode : undefined,
              expiryDate: r.batch.rawExpiryDate || undefined,
              requestedQty: r.confirmQty,
              unitCost: r.batch.costPrice || 0,
              notes: `Lô ${r.batch.batchCode} · còn ${r.batch.daysLeft} ngày`,
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

  if (!isOpen) return null;

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
              <AlertTriangle size={18} color="#b45309" />
              Cảnh báo lô cận hạn / hết hạn
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
              Xác nhận SL còn trên kệ rồi tạo phiếu trả/đổi theo chính sách NCC (nháp — Store Owner gửi NCC).
            </div>
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
              <Loader2 size={18} className="animate-spin" style={{ verticalAlign: 'middle' }} /> Đang tải lô...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              Không có lô cảnh báo / khẩn cấp / hết hạn theo chi nhánh đang lọc.
            </div>
          ) : (
            <table className="so-list-table" style={{ minWidth: 980, tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th className="so-list-th" style={{ width: 36 }} />
                  <th className="so-list-th">SKU / Sản phẩm</th>
                  <th className="so-list-th">Mã lô</th>
                  <th className="so-list-th">HSD</th>
                  <th className="so-list-th" style={{ textAlign: 'right' }}>Còn (ngày)</th>
                  <th className="so-list-th">NCC</th>
                  <th className="so-list-th" style={{ textAlign: 'right' }}>Tồn</th>
                  <th className="so-list-th" style={{ textAlign: 'right' }}>SL xác nhận</th>
                  <th className="so-list-th">Hướng xử lý</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.batch.id} className="so-list-row">
                    <td>
                      <input
                        type="checkbox"
                        disabled={row.action !== 'return'}
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
                    <td>{row.batch.expiryDate}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: row.batch.daysLeft <= 3 ? '#be123c' : '#b45309' }}>
                      {row.batch.daysLeft}
                    </td>
                    <td>{row.batch.supplierName}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{row.batch.qtyCurrent}</td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        min={0}
                        max={row.batch.qtyCurrent}
                        disabled={row.action !== 'return'}
                        value={row.confirmQty}
                        onChange={(e) => {
                          const n = Math.max(0, Number(e.target.value) || 0);
                          setRows((prev) =>
                            prev.map((r) =>
                              r.batch.id === row.batch.id
                                ? { ...r, confirmQty: Math.min(n, r.batch.qtyCurrent) }
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
                    </td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 700, color: row.action === 'return' ? '#0f766e' : '#b45309' }}>
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
            Đã chọn {selectedReturnRows.length} lô để tạo phiếu trả (tách theo GRN / NCC).
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="so-list-filter-reset" onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className="so-list-filter-search"
              disabled={isSubmitting || selectedReturnRows.length === 0}
              style={
                isSubmitting || selectedReturnRows.length === 0
                  ? { opacity: 0.55, cursor: 'not-allowed' }
                  : undefined
              }
              onClick={() => void handleCreate()}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Tạo phiếu gửi Store Owner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
