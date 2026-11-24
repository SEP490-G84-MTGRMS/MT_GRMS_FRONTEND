import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChefHat, Loader2, Printer, PackageOpen } from 'lucide-react';
import type { BatchItem, UserRole } from '../types/batch.types';
import { batchApi } from '../api/batchApi';
import { repackApi, type PackageDto } from '../api/repackApi';
import { BatchRepackModal } from '../components/BatchRepackModal';
import { printOnePackageBarcode, printPackageBarcodes } from '../utils/packageBarcodePrint';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

type StatusFilter = 'ALL' | 'AVAILABLE' | 'SOLD' | 'OTHER';

type RepackBatchGroup = {
  key: string;
  orderId: string | null;
  code: string;
  createdAt: string;
  packages: PackageDto[];
  availableCount: number;
  soldCount: number;
};

const fmtWeightDisplay = (kg: number) => {
  if (kg > 0 && kg < 1) return `${Math.round(kg * 1000).toLocaleString('vi-VN')} g`;
  return `${kg.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg`;
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ';

const fmtDateVi = (iso?: string | null) => {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
};

const fmtDateTimeVi = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fmtDateVi(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STATUS_META: Record<
  string,
  { label: string; sellLabel: string; bg: string; color: string; border: string }
> = {
  AVAILABLE: {
    label: 'Còn bán',
    sellLabel: 'Chưa bán',
    bg: '#dcfce7',
    color: '#15803d',
    border: '#bbf7d0',
  },
  SOLD: {
    label: 'Đã bán',
    sellLabel: 'Đã bán',
    bg: '#e0f2fe',
    color: '#0369a1',
    border: '#bae6fd',
  },
  QUARANTINED: {
    label: 'Cách ly',
    sellLabel: 'Cách ly',
    bg: '#fef3c7',
    color: '#b45309',
    border: '#fde68a',
  },
  VOID: {
    label: 'Đã hủy',
    sellLabel: 'Đã hủy',
    bg: '#f1f5f9',
    color: '#64748b',
    border: '#e2e8f0',
  },
  RETURNED: {
    label: 'Trả lại',
    sellLabel: 'Trả lại',
    bg: '#fae8ff',
    color: '#a21caf',
    border: '#f5d0fe',
  },
};

const badgeStyle = (status: string): CSSProperties => {
  const m = STATUS_META[status] || STATUS_META.VOID;
  return {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: m.bg,
    color: m.color,
    border: `1px solid ${m.border}`,
    whiteSpace: 'nowrap',
  };
};

const selectStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  background: '#fff',
  minWidth: 180,
};

export const BatchPackageManagePage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const basePath = defaultRole === 'employee' ? '/employee/batches' : '/store-owner/batches';

  const [batch, setBatch] = useState<BatchItem | null>(null);
  const [packages, setPackages] = useState<PackageDto[]>([]);
  const [suggestPricePerKg, setSuggestPricePerKg] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [repackOpen, setRepackOpen] = useState(false);
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError(null);
    try {
      const b = await batchApi.getBatchById(batchId);
      if (!b) {
        setError('Không tìm thấy lô hàng.');
        setBatch(null);
        setPackages([]);
        return;
      }
      setBatch(b);
      const summary = await repackApi.getBranchStockPackages(batchId);
      setPackages(summary.packages ?? []);
      setSuggestPricePerKg(Number(summary.suggestPricePerKg) || 0);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không tải được danh sách khay.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo((): RepackBatchGroup[] => {
    const map = new Map<string, RepackBatchGroup>();
    for (const p of packages) {
      const key = p.repackOrderId || `orphan-${String(p.createdAt).slice(0, 13)}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          orderId: p.repackOrderId || null,
          code: p.repackOrderCode || 'Đợt không mã',
          createdAt: p.createdAt,
          packages: [],
          availableCount: 0,
          soldCount: 0,
        };
        map.set(key, g);
      }
      g.packages.push(p);
      if (p.status === 'AVAILABLE') g.availableCount += 1;
      if (p.status === 'SOLD') g.soldCount += 1;
      if (new Date(p.createdAt).getTime() < new Date(g.createdAt).getTime()) {
        g.createdAt = p.createdAt;
      }
      if (p.repackOrderCode) g.code = p.repackOrderCode;
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [packages]);

  useEffect(() => {
    if (batchFilter === 'ALL') return;
    if (!groups.some((g) => g.key === batchFilter)) {
      setBatchFilter('ALL');
    }
  }, [groups, batchFilter]);

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const key = p.repackOrderId || `orphan-${String(p.createdAt).slice(0, 13)}`;
      if (batchFilter !== 'ALL' && key !== batchFilter) return false;
      if (statusFilter === 'AVAILABLE' && p.status !== 'AVAILABLE') return false;
      if (statusFilter === 'SOLD' && p.status !== 'SOLD') return false;
      if (
        statusFilter === 'OTHER' &&
        (p.status === 'AVAILABLE' || p.status === 'SOLD')
      ) {
        return false;
      }
      return true;
    });
  }, [packages, batchFilter, statusFilter]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.key === batchFilter) || null,
    [groups, batchFilter]
  );

  const toLabel = (p: PackageDto) => ({
    code: p.barcode || p.internalCode,
    productName: batch?.productName || '',
    batchCode: batch && batch.batchCode !== '—' ? batch.batchCode : undefined,
    manufactureDate: p.manufactureDate || p.createdAt,
    expiryDate: p.expiryDate || batch?.rawExpiryDate || null,
    netWeightKg: p.netWeight,
    sellingPrice: p.sellingPrice,
    pricePerKg: suggestPricePerKg > 0 ? suggestPricePerKg : null,
    branchName: batch?.branchName,
  });

  const downloadPdf = (list: PackageDto[], label: string) => {
    if (!list.length) {
      setToast({
        id: String(Date.now()),
        type: 'warning',
        message: 'Không có khay nào để xuất PDF.',
      });
      return;
    }
    void printPackageBarcodes(list.map(toLabel))
      .then((name) =>
        setToast({
          id: String(Date.now()),
          type: 'success',
          message: `Đã tải PDF ${label}: ${name}`,
        })
      )
      .catch((e: unknown) =>
        setToast({
          id: String(Date.now()),
          type: 'error',
          message: e instanceof Error ? e.message : 'Xuất PDF thất bại.',
        })
      );
  };

  const [voidTargetPkg, setVoidTargetPkg] = useState<PackageDto | null>(null);

  const handleVoid = (pkg: PackageDto) => {
    setVoidTargetPkg(pkg);
  };

  const executeVoid = async (pkg: PackageDto, mode: 'UNPACK_TO_RAW' | 'WRITE_OFF') => {
    try {
      await repackApi.voidPackage(pkg.id, mode);
      setToast({
        id: String(Date.now()),
        type: 'success',
        message: mode === 'UNPACK_TO_RAW' ? 'Đã hủy khay và trả về nguyên quả.' : 'Đã ghi hủy khay.',
      });
      setVoidTargetPkg(null);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Hủy khay thất bại.';
      setToast({ id: String(Date.now()), type: 'error', message: msg });
    }
  };

  return (
    <div className="po-page" style={{ padding: '16px 20px 32px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate(basePath)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36 }}
          >
            <ArrowLeft size={14} /> Danh sách lô
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Quản lý khay</div>
            {batch && (
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {batch.productName} · Lô {batch.batchCode} · {batch.branchName}
              </div>
            )}
          </div>
        </div>
        {batch && (
          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={() => setRepackOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 36,
              background: '#0f766e',
            }}
          >
            <ChefHat size={14} /> Chế biến khay
          </button>
        )}
      </div>

      {!loading && !error && packages.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700 }}>
            Đợt chế biến
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="ALL">Tất cả đợt ({groups.length})</option>
              {groups.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.code} · {fmtDateTimeVi(g.createdAt)} · {g.packages.length} khay
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700 }}>
            Trạng thái
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={selectStyle}
            >
              <option value="ALL">Tất cả</option>
              <option value="AVAILABLE">Chưa bán</option>
              <option value="SOLD">Đã bán</option>
              <option value="OTHER">Cách ly / Hủy / khác</option>
            </select>
          </label>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selectedGroup && (
              <button
                type="button"
                className="po-btn po-btn-secondary"
                onClick={() =>
                  downloadPdf(
                    selectedGroup.packages,
                    `đợt ${selectedGroup.code}`
                  )
                }
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34 }}
              >
                <Printer size={14} /> PDF đợt này ({selectedGroup.packages.length})
              </button>
            )}
            <button
              type="button"
              className="po-btn po-btn-secondary"
              onClick={() => downloadPdf(filteredPackages, 'theo bộ lọc')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34 }}
            >
              <Printer size={14} /> PDF đang lọc ({filteredPackages.length})
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', padding: 24 }}>
          <Loader2 size={16} className="spin" /> Đang tải…
        </div>
      ) : error ? (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '12px 14px',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      ) : (
        <div className="so-list-table-card" style={{ overflow: 'hidden' }}>
          {filteredPackages.length === 0 ? (
            <div
              style={{
                padding: '48px 16px',
                textAlign: 'center',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <PackageOpen size={36} color="#cbd5e1" />
              <span style={{ fontWeight: 600, color: '#475569' }}>
                {packages.length === 0 ? 'Chưa có khay nào' : 'Không có khay khớp bộ lọc'}
              </span>
              <span style={{ fontSize: 12 }}>
                {packages.length === 0
                  ? 'Bấm “Chế biến khay” để tạo khay từ nguyên quả.'
                  : 'Đổi đợt / trạng thái hoặc xóa bộ lọc.'}
              </span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                className="so-list-table"
                style={{ width: '100%', minWidth: 1500, tableLayout: 'fixed', borderCollapse: 'collapse' }}
              >
                <colgroup>
                  <col style={{ width: '3%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '7%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: 10, textAlign: 'center' }}>STT</th>
                    <th style={{ padding: 10 }}>Đợt</th>
                    <th style={{ padding: 10 }}>Tên khay</th>
                    <th style={{ padding: 10 }}>Mã khay</th>
                    <th style={{ padding: 10, textAlign: 'right' }}>Khối lượng</th>
                    <th style={{ padding: 10, textAlign: 'center' }}>NSX</th>
                    <th style={{ padding: 10, textAlign: 'center' }}>HSD</th>
                    <th style={{ padding: 10, textAlign: 'right' }}>Giá bán</th>
                    <th style={{ padding: 10, textAlign: 'center' }}>Bán hàng</th>
                    <th style={{ padding: 10, textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ padding: 10, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPackages.map((p, idx) => {
                    const sellMeta = STATUS_META[p.status] || STATUS_META.VOID;
                    return (
                      <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: 10 }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                            {p.repackOrderCode || '—'}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {fmtDateTimeVi(p.createdAt)}
                          </div>
                        </td>
                        <td style={{ padding: 10, fontWeight: 600 }} title={p.name?.trim() || undefined}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name?.trim() || '—'}
                          </div>
                        </td>
                        <td style={{ padding: 10, fontFamily: 'monospace' }} title={p.internalCode}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.internalCode}
                          </div>
                        </td>
                        <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtWeightDisplay(p.netWeight)}</td>
                        <td style={{ padding: 10, textAlign: 'center', whiteSpace: 'nowrap' }}>{fmtDateVi(p.manufactureDate || p.createdAt)}</td>
                        <td style={{ padding: 10, textAlign: 'center', whiteSpace: 'nowrap' }}>{fmtDateVi(p.expiryDate)}</td>
                        <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtMoney(p.sellingPrice)}</td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <span style={badgeStyle(p.status === 'SOLD' ? 'SOLD' : p.status === 'AVAILABLE' ? 'AVAILABLE' : p.status)}>
                            {sellMeta.sellLabel}
                          </span>
                          {p.status === 'SOLD' && p.soldAt && (
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                              {fmtDateTimeVi(p.soldAt)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <span style={badgeStyle(p.status)}>{sellMeta.label}</span>
                        </td>
                        <td style={{ padding: 10, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="so-list-action-btn"
                            onClick={() => {
                              void printOnePackageBarcode(toLabel(p)).catch((e: unknown) =>
                                setToast({
                                  id: String(Date.now()),
                                  type: 'error',
                                  message: e instanceof Error ? e.message : 'Xuất PDF thất bại.',
                                })
                              );
                            }}
                            title="Tải PDF tem"
                            style={{ marginRight: 4 }}
                          >
                            <Printer size={14} />
                          </button>
                          {(p.status === 'AVAILABLE' || p.status === 'QUARANTINED') && (
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => void handleVoid(p)}
                              title="Hủy khay"
                            >
                              Hủy
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {repackOpen && batch && (
        <BatchRepackModal
          batch={batch}
          onClose={() => setRepackOpen(false)}
          onDone={(order) => {
            const code = order?.code;
            const orderId = order?.id;
            setToast({
              id: String(Date.now()),
              type: 'success',
              message: code
                ? `Đã tạo đợt ${code}. Có thể lọc đợt này để in tem.`
                : 'Chế biến khay thành công. Có thể in barcode.',
            });
            void load().then(() => {
              if (orderId) setBatchFilter(orderId);
            });
          }}
        />
      )}

      {voidTargetPkg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 480, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Xác nhận hủy khay {voidTargetPkg.packageCode}
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
              {voidTargetPkg.repackType === 'PROCESSING'
                ? 'Khay đã sơ chế chỉ có thể ghi hủy (Write-off). Bạn có chắc chắn muốn ghi hủy khay này?'
                : 'Chọn hình thức xử lý tồn kho cho khay này. Bấm "Đóng" nếu không muốn thay đổi.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="po-btn po-btn-secondary" onClick={() => setVoidTargetPkg(null)}>
                Đóng / Không làm gì
              </button>
              {voidTargetPkg.repackType !== 'PROCESSING' && (
                <button
                  type="button"
                  className="po-btn po-btn-primary"
                  onClick={() => void executeVoid(voidTargetPkg, 'UNPACK_TO_RAW')}
                >
                  Trả về nguyên quả
                </button>
              )}
              <button
                type="button"
                className="po-btn"
                style={{ backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                onClick={() => void executeVoid(voidTargetPkg, 'WRITE_OFF')}
              >
                Ghi hủy (Write-off)
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default BatchPackageManagePage;
