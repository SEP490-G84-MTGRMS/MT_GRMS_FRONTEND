import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { ChefHat, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { BatchItem } from '../types/batch.types';
import {
  repackApi,
  type BranchStockPackageSummary,
  type PackageDto,
  type PackageLineInput,
} from '../api/repackApi';

interface BatchRepackModalProps {
  batch: BatchItem;
  onClose: () => void;
  onDone: () => void;
}

type DraftLine = PackageLineInput & { key: string };

const roundPrice100 = (n: number) => Math.round(n / 100) * 100;

const fmtKg = (n: number) =>
  n.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ';

export const BatchRepackModal: FC<BatchRepackModalProps> = ({ batch, onClose, onDone }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BranchStockPackageSummary | null>(null);

  const [repackType, setRepackType] = useState<'PORTIONING' | 'PROCESSING'>('PORTIONING');
  const [inputWeight, setInputWeight] = useState('');
  const [wasteWeight, setWasteWeight] = useState('0');
  const [wasteReason, setWasteReason] = useState('PEEL_SEED');
  const [wasteNote, setWasteNote] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([
    { key: '1', netWeight: 0, sellingPrice: 0, expiryDate: batch.rawExpiryDate || null },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await repackApi.getBranchStockPackages(batch.id);
      setSummary(data);
      const suggest = Number(data.suggestPricePerKg) || 0;
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          sellingPrice: l.sellingPrice > 0 ? l.sellingPrice : roundPrice100(suggest * (l.netWeight || 0)),
          expiryDate: l.expiryDate || (data.expiryDate ? String(data.expiryDate).slice(0, 10) : null),
        }))
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không tải được thông tin lô / khay.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [batch.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const packageSum = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.netWeight) || 0), 0),
    [lines]
  );
  const waste = Number(wasteWeight) || 0;
  const input = Number(inputWeight) || 0;
  const balanceOk = Math.abs(packageSum + waste - input) <= 0.005;
  const rawMax = summary?.rawSellableQty ?? batch.rawSellableQty ?? batch.qtyAvailable ?? 0;

  const suggestPerKg = Number(summary?.suggestPricePerKg) || 0;

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: String(Date.now()),
        netWeight: 0,
        sellingPrice: 0,
        expiryDate: summary?.expiryDate
          ? String(summary.expiryDate).slice(0, 10)
          : batch.rawExpiryDate || null,
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.netWeight !== undefined && suggestPerKg > 0) {
          next.sellingPrice = roundPrice100(suggestPerKg * (Number(patch.netWeight) || 0));
        }
        if (patch.sellingPrice !== undefined) {
          next.sellingPrice = roundPrice100(Number(patch.sellingPrice) || 0);
        }
        return next;
      })
    );
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!summary?.isWeightProduct) {
      setError('Chỉ sản phẩm đơn vị kg mới được chế biến khay.');
      return;
    }
    if (input <= 0) {
      setError('Nhập khối lượng lấy ra từ nguyên quả.');
      return;
    }
    if (input > rawMax + 0.0005) {
      setError(`Khối lượng lấy ra vượt nguyên quả còn lại (${fmtKg(rawMax)} kg).`);
      return;
    }
    if (!balanceOk) {
      setError(
        `Tổng cân khay (${fmtKg(packageSum)}) + hao (${fmtKg(waste)}) phải bằng khối lượng lấy ra (${fmtKg(input)}).`
      );
      return;
    }
    if (lines.some((l) => !(Number(l.netWeight) > 0) || !(Number(l.sellingPrice) > 0))) {
      setError('Mỗi khay cần khối lượng và giá bán > 0.');
      return;
    }
    if (waste > 0 && !wasteReason) {
      setError('Chọn lý do hao hụt.');
      return;
    }

    setSaving(true);
    try {
      await repackApi.createRepackOrder({
        branchStockId: batch.id,
        repackType: repackType,
        inputWeight: input,
        wasteWeight: waste,
        wasteReason: waste > 0 ? wasteReason : null,
        wasteNote: wasteNote.trim() || null,
        defaultUnitPricePerKg: suggestPerKg || null,
        packages: lines.map((l) => ({
          netWeight: Number(l.netWeight),
          sellingPrice: roundPrice100(Number(l.sellingPrice)),
          expiryDate: l.expiryDate || null,
          barcode: l.barcode || null,
        })),
      });
      onDone();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Chế biến thất bại.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async (pkg: PackageDto) => {
    const isProcessing = pkg.repackType === 'PROCESSING';
    const mode = isProcessing
      ? 'WRITE_OFF'
      : window.confirm('Trả về nguyên quả?\nOK = trả về nguyên quả\nCancel = ghi hủy')
        ? 'UNPACK_TO_RAW'
        : 'WRITE_OFF';
    try {
      await repackApi.voidPackage(pkg.id, mode);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Hủy khay thất bại.';
      setError(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 100%)',
          maxHeight: '92vh',
          overflow: 'auto',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px rgba(15,23,42,0.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChefHat size={18} color="#0f766e" />
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Chế biến khay</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {batch.productName} · Lô {batch.batchCode} · {batch.branchName}
              </div>
            </div>
          </div>
          <button type="button" className="so-list-action-btn" onClick={onClose} title="Đóng">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
              <Loader2 size={16} className="spin" /> Đang tải…
            </div>
          ) : (
            <>
              <div
                style={{
                  marginBottom: 12,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.55,
                  color: '#0f172a',
                  letterSpacing: 0.2,
                }}
              >
                <span style={{ color: '#475569' }}>Tổng tồn</span>={fmtKg(summary?.quantityOnHand ?? batch.qtyCurrent)} kg
                <span style={{ color: '#94a3b8' }}> · </span>
                <span style={{ color: '#475569' }}>Nguyên quả còn</span>={fmtKg(rawMax)} kg
                <span style={{ color: '#94a3b8' }}> · </span>
                <span style={{ color: '#475569' }}>Đã đóng khay</span>={fmtKg(summary?.packagedQty ?? 0)} kg/{summary?.packageCount ?? 0}
              </div>

              {summary && summary.packages.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#334155' }}>
                    Khay hiện có
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                          <th style={{ padding: 8 }}>Mã</th>
                          <th style={{ padding: 8 }}>Kg</th>
                          <th style={{ padding: 8 }}>Giá</th>
                          <th style={{ padding: 8 }}>TT</th>
                          <th style={{ padding: 8 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {summary.packages.map((p) => (
                          <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                            <td style={{ padding: 8, fontFamily: 'monospace' }}>{p.internalCode}</td>
                            <td style={{ padding: 8 }}>{fmtKg(p.netWeight)}</td>
                            <td style={{ padding: 8 }}>{fmtMoney(p.sellingPrice)}</td>
                            <td style={{ padding: 8 }}>{p.status}</td>
                            <td style={{ padding: 8, textAlign: 'right' }}>
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#334155' }}>
                Tạo khay mới từ nguyên quả
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  Loại
                  <select
                    value={repackType}
                    onChange={(e) => setRepackType(e.target.value as 'PORTIONING' | 'PROCESSING')}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  >
                    <option value="PORTIONING">Chia khay (có thể trả về nguyên quả)</option>
                    <option value="PROCESSING">Sơ chế / cắt (chỉ ghi hủy)</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  Kg lấy ra từ nguyên quả
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  Hao hụt (kg)
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={wasteWeight}
                    onChange={(e) => setWasteWeight(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </label>
                {waste > 0 && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    Lý do hao
                    <select
                      value={wasteReason}
                      onChange={(e) => setWasteReason(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                    >
                      <option value="PEEL_SEED">Vỏ / hạt</option>
                      <option value="TRIM">Cắt tỉa</option>
                      <option value="SPILL_DAMAGE">Rơi / hỏng</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </label>
                )}
              </div>

              {waste > 0 && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, marginBottom: 12 }}>
                  Ghi chú hao
                  <input
                    value={wasteNote}
                    onChange={(e) => setWasteNote(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </label>
              )}

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: 8 }}>Kg khay</th>
                      <th style={{ padding: 8 }}>Giá bán</th>
                      <th style={{ padding: 8 }}>HSD</th>
                      <th style={{ padding: 8 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.key} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: 8 }}>
                          <input
                            type="number"
                            min={0}
                            step={0.001}
                            value={l.netWeight || ''}
                            onChange={(e) => updateLine(l.key, { netWeight: Number(e.target.value) || 0 })}
                            style={{ width: 100, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={l.sellingPrice || ''}
                            onChange={(e) => updateLine(l.key, { sellingPrice: Number(e.target.value) || 0 })}
                            style={{ width: 120, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            type="date"
                            value={l.expiryDate || ''}
                            onChange={(e) => updateLine(l.key, { expiryDate: e.target.value || null })}
                            style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: 8, textAlign: 'right' }}>
                          <button type="button" className="so-list-action-btn" onClick={() => removeLine(l.key)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="po-btn po-btn-secondary"
                onClick={addLine}
                style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Thêm khay
              </button>

              <div style={{ fontSize: 12, color: balanceOk ? '#0f766e' : '#b45309', marginBottom: 12 }}>
                Cân bằng: khay {fmtKg(packageSum)} + hao {fmtKg(waste)} = {fmtKg(packageSum + waste)}
                {input > 0 ? ` (lấy ra ${fmtKg(input)})` : ''}
                {balanceOk ? ' ✓' : ' — chưa khớp'}
              </div>

              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '10px 12px',
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="po-btn po-btn-secondary" onClick={onClose} disabled={saving}>
                  Đóng
                </button>
                <button
                  type="button"
                  className="po-btn po-btn-primary"
                  onClick={() => void handleSubmit()}
                  disabled={saving || loading}
                  style={{ background: '#0f766e' }}
                >
                  {saving ? 'Đang lưu…' : 'Hoàn tất chế biến'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchRepackModal;
