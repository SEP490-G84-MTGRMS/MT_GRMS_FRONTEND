import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FC } from 'react';
import { ChefHat, Loader2, Plus, Printer, Trash2, X } from 'lucide-react';
import type { BatchItem } from '../types/batch.types';
import {
  repackApi,
  type BranchStockPackageSummary,
  type PackageDto,
  type RepackOrderDto,
} from '../api/repackApi';
import { printOnePackageBarcode, printPackageBarcodes } from '../utils/packageBarcodePrint';

interface BatchRepackModalProps {
  batch: BatchItem;
  onClose: () => void;
  onDone: (order?: RepackOrderDto) => void;
}

type WeightUnit = 'G' | 'KG';

type DraftLine = {
  key: string;
  weightValue: number;
  weightUnit: WeightUnit;
  /** YYYY-MM-DD — mặc định = ngày tạo khay */
  manufactureDate: string;
  expiryDate: string | null;
};

/** Tên khay tự gen: "{Tên SP} {khối lượng} KG|G" */
const buildPackageName = (productName: string, kg: number) => {
  const base = (productName || 'Khay').trim() || 'Khay';
  if (!(kg > 0)) return `${base} —`;
  if (kg > 0 && kg < 1) {
    return `${base} ${Math.round(kg * 1000)} G`;
  }
  const kgText = Number(kg.toFixed(3)).toString();
  return `${base} ${kgText} KG`;
};

const todayIsoDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const roundPrice100 = (n: number) => Math.round(n / 100) * 100;

const fmtKg = (n: number) =>
  n.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ';

const toKg = (value: number, unit: WeightUnit) =>
  unit === 'G' ? (Number(value) || 0) / 1000 : Number(value) || 0;

const fromKg = (kg: number, unit: WeightUnit) =>
  unit === 'G' ? (Number(kg) || 0) * 1000 : Number(kg) || 0;

const fmtWeightInUnit = (kg: number, unit: WeightUnit) => {
  const v = fromKg(kg, unit);
  if (unit === 'G') {
    return `${Math.round(v).toLocaleString('vi-VN')} g`;
  }
  return `${fmtKg(v)} kg`;
};

const fmtWeightDisplay = (kg: number) => {
  if (kg > 0 && kg < 1) return `${Math.round(kg * 1000).toLocaleString('vi-VN')} g`;
  return `${fmtKg(kg)} kg`;
};

const unitSelectStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  minWidth: 72,
};

export const BatchRepackModal: FC<BatchRepackModalProps> = ({ batch, onClose, onDone }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BranchStockPackageSummary | null>(null);
  const [justCreated, setJustCreated] = useState<PackageDto[]>([]);

  const [repackType, setRepackType] = useState<'PORTIONING' | 'PROCESSING'>('PORTIONING');
  const [inputWeight, setInputWeight] = useState('');
  const [inputUnit, setInputUnit] = useState<WeightUnit>('KG');
  const [wasteReason, setWasteReason] = useState('PEEL_SEED');
  const [wasteNote, setWasteNote] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([
    {
      key: '1',
      weightValue: 0,
      weightUnit: 'KG',
      manufactureDate: todayIsoDate(),
      expiryDate: batch.rawExpiryDate || null,
    },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await repackApi.getBranchStockPackages(batch.id);
      setSummary(data);
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          expiryDate:
            l.expiryDate ||
            (data.expiryDate ? String(data.expiryDate).slice(0, 10) : null),
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

  const suggestPerKg = Number(summary?.suggestPricePerKg) || 0;

  const lineKg = useCallback(
    (l: DraftLine) => toKg(l.weightValue, l.weightUnit),
    []
  );

  const linePrice = useCallback(
    (l: DraftLine) => {
      const kg = lineKg(l);
      return suggestPerKg > 0 && kg > 0 ? roundPrice100(suggestPerKg * kg) : 0;
    },
    [lineKg, suggestPerKg]
  );

  const packageSum = useMemo(
    () => lines.reduce((s, l) => s + lineKg(l), 0),
    [lines, lineKg]
  );
  const input = toKg(Number(inputWeight) || 0, inputUnit);
  /** Hao hụt = khối lượng lấy ra − tổng khay (sau khi xếp khay) */
  const waste = Math.max(0, Math.round((input - packageSum) * 1000) / 1000);
  const traysExceedInput = packageSum > input + 0.0005;
  const balanceOk = input > 0 && packageSum > 0 && !traysExceedInput;
  const rawMax = summary?.rawSellableQty ?? batch.rawSellableQty ?? batch.qtyAvailable ?? 0;

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: String(Date.now()),
        weightValue: 0,
        weightUnit: 'KG',
        manufactureDate: todayIsoDate(),
        expiryDate: summary?.expiryDate
          ? String(summary.expiryDate).slice(0, 10)
          : batch.rawExpiryDate || null,
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key !== key ? l : { ...l, ...patch })));
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const toLabel = (p: PackageDto) => ({
    code: p.barcode || p.internalCode,
    productName: batch.productName,
    batchCode: batch.batchCode !== '—' ? batch.batchCode : undefined,
    manufactureDate: p.manufactureDate || p.createdAt,
    expiryDate: p.expiryDate || batch.rawExpiryDate || null,
    netWeightKg: p.netWeight,
    sellingPrice: p.sellingPrice,
    pricePerKg: suggestPerKg > 0 ? suggestPerKg : null,
    branchName: batch.branchName,
  });

  const handleSubmit = async () => {
    setError(null);
    if (!summary?.isWeightProduct) {
      setError('Chỉ sản phẩm đơn vị kg mới được chế biến khay.');
      return;
    }
    if (!(suggestPerKg > 0)) {
      setError('Chưa có giá bán theo khay (đ/kg). Cấu hình “Giá khi đóng khay” trên sản phẩm master.');
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
    if (packageSum <= 0) {
      setError('Nhập khối lượng các khay sau khi cắt gọt / xếp khay.');
      return;
    }
    if (traysExceedInput) {
      setError(
        `Tổng khay (${fmtKg(packageSum)} kg) vượt khối lượng lấy ra (${fmtKg(input)} kg).`
      );
      return;
    }
    if (lines.some((l) => !(lineKg(l) > 0) || !(linePrice(l) > 0))) {
      setError('Mỗi khay cần khối lượng > 0 (giá bán tự tính từ giá khay đã cấu hình).');
      return;
    }
    if (lines.some((l) => !l.manufactureDate)) {
      setError('Mỗi khay cần ngày sản xuất (mặc định ngày tạo khay).');
      return;
    }
    if (
      lines.some(
        (l) => l.expiryDate && l.manufactureDate && l.manufactureDate > l.expiryDate
      )
    ) {
      setError('Ngày sản xuất không được sau hạn dùng.');
      return;
    }
    if (waste > 0 && !wasteReason) {
      setError('Chọn lý do hao hụt.');
      return;
    }

    setSaving(true);
    try {
      const order = await repackApi.createRepackOrder({
        branchStockId: batch.id,
        repackType: repackType,
        inputWeight: input,
        wasteWeight: waste,
        wasteReason: waste > 0 ? wasteReason : null,
        wasteNote: wasteNote.trim() || null,
        defaultUnitPricePerKg: suggestPerKg || null,
        packages: lines.map((l) => ({
          name: buildPackageName(batch.productName, lineKg(l)),
          netWeight: lineKg(l),
          sellingPrice: linePrice(l),
          manufactureDate: l.manufactureDate || todayIsoDate(),
          expiryDate: l.expiryDate || null,
          barcode: null,
        })),
      });
      setJustCreated(order.packages ?? []);
      setInputWeight('');
      setInputUnit('KG');
      setWasteNote('');
      setLines([
        {
          key: String(Date.now()),
          weightValue: 0,
          weightUnit: 'KG',
          manufactureDate: todayIsoDate(),
          expiryDate: summary?.expiryDate
            ? String(summary.expiryDate).slice(0, 10)
            : batch.rawExpiryDate || null,
        },
      ]);
      await load();
      onDone(order);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Chế biến thất bại.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setJustCreated([]);
    setError(null);
    setInputWeight('');
    setInputUnit('KG');
    setWasteNote('');
    setLines([
      {
        key: String(Date.now()),
        weightValue: 0,
        weightUnit: 'KG',
        manufactureDate: todayIsoDate(),
        expiryDate: summary?.expiryDate
          ? String(summary.expiryDate).slice(0, 10)
          : batch.rawExpiryDate || null,
      },
    ]);
  };

  const showSuccessOnly = justCreated.length > 0;

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
          width: 'min(960px, 100%)',
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
          ) : showSuccessOnly ? (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f766e' }}>
                  Đã tạo {justCreated.length} khay — in barcode
                </div>
                <button
                  type="button"
                  className="po-btn po-btn-secondary"
                  onClick={() => {
                    void printPackageBarcodes(justCreated.map(toLabel)).catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : 'Xuất PDF thất bại.')
                    );
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32 }}
                >
                  <Printer size={14} /> Tải PDF tất cả
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {justCreated.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className="so-list-action-btn"
                    title={`Tải PDF tem ${p.internalCode}`}
                    onClick={() => {
                      void printOnePackageBarcode(toLabel(p)).catch((e: unknown) =>
                        setError(e instanceof Error ? e.message : 'Xuất PDF thất bại.')
                      );
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Printer size={12} /> #{i + 1} {p.name || p.internalCode}
                  </button>
                ))}
              </div>
              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '8px 10px',
                    borderRadius: 8,
                    marginBottom: 10,
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="po-btn po-btn-secondary" onClick={resetCreateForm}>
                  Tạo thêm
                </button>
                <button type="button" className="po-btn po-btn-primary" onClick={onClose} style={{ background: '#0f766e' }}>
                  Đóng
                </button>
              </div>
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
                <span style={{ color: '#475569' }}>Tổng tồn</span>=
                {fmtKg(summary?.quantityOnHand ?? batch.qtyCurrent)} kg
                <span style={{ color: '#94a3b8' }}> · </span>
                <span style={{ color: '#475569' }}>Nguyên quả còn</span>={fmtKg(rawMax)} kg
                <span style={{ color: '#94a3b8' }}> · </span>
                <span style={{ color: '#475569' }}>Đã đóng khay</span>=
                {fmtKg(summary?.packagedQty ?? 0)} kg/{summary?.packageCount ?? 0}
                <span style={{ color: '#94a3b8' }}> · </span>
                <span style={{ color: '#475569' }}>Giá khay</span>=
                {suggestPerKg > 0 ? `${fmtMoney(suggestPerKg)}/kg` : '— chưa cấu hình'}
              </div>

              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#334155' }}>
                Tạo khay mới từ nguyên quả
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '10px 16px',
                  marginBottom: 10,
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Loại
                  <select
                    value={repackType}
                    onChange={(e) => setRepackType(e.target.value as 'PORTIONING' | 'PROCESSING')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontWeight: 500,
                      minWidth: 200,
                    }}
                  >
                    <option value="PORTIONING">Chia khay (có thể trả về nguyên quả)</option>
                    <option value="PROCESSING">Sơ chế / cắt (chỉ ghi hủy)</option>
                  </select>
                </label>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Lấy ra từ nguyên quả
                  <input
                    type="number"
                    min={0}
                    step={inputUnit === 'G' ? 1 : 0.001}
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    style={{
                      width: 100,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontWeight: 500,
                    }}
                  />
                  <select
                    value={inputUnit}
                    onChange={(e) => setInputUnit(e.target.value as WeightUnit)}
                    style={{ ...unitSelectStyle, padding: '8px 8px' }}
                  >
                    <option value="KG">KG</option>
                    <option value="G">G</option>
                  </select>
                  {inputUnit === 'G' && input > 0 && (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                      (= {fmtKg(input)} kg)
                    </span>
                  )}
                </label>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                  }}
                  title="Hao hụt = lấy ra − tổng khay (tự tính sau khi xếp khay)"
                >
                  Hao hụt
                  <div
                    style={{
                      minWidth: 88,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontWeight: 700,
                      fontFamily: 'ui-monospace, monospace',
                      textAlign: 'right',
                      color: traysExceedInput ? '#b91c1c' : waste > 0 ? '#b45309' : '#0f766e',
                    }}
                  >
                    {traysExceedInput ? '—' : fmtWeightDisplay(waste)}
                  </div>
                </label>
              </div>

              {waste > 0 && !traysExceedInput && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '10px 16px',
                    marginBottom: 10,
                  }}
                >
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      whiteSpace: 'nowrap',
                    }}
                  >
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
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      flex: '1 1 220px',
                      minWidth: 200,
                    }}
                  >
                    Ghi chú hao
                    <input
                      value={wasteNote}
                      onChange={(e) => setWasteNote(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontWeight: 500,
                      }}
                    />
                  </label>
                </div>
              )}

              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                Cắt gọt xong → xếp vào khay. Hao hụt = lấy ra − tổng khay (tự tính).
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: 8, width: 48 }}>STT</th>
                      <th style={{ padding: 8, minWidth: 140 }}>Tên khay</th>
                      <th style={{ padding: 8 }}>Khối lượng khay</th>
                      <th style={{ padding: 8, width: 88 }}>ĐVT</th>
                      <th style={{ padding: 8 }}>Giá bán</th>
                      <th style={{ padding: 8 }}>NSX</th>
                      <th style={{ padding: 8 }}>HSD</th>
                      <th style={{ padding: 8 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, idx) => {
                      const price = linePrice(l);
                      const kg = lineKg(l);
                      return (
                        <tr key={l.key} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ padding: 8, fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                          <td
                            style={{
                              padding: 8,
                              fontWeight: 600,
                              color: kg > 0 ? '#0f172a' : '#94a3b8',
                              minWidth: 140,
                            }}
                            title="Tự gen: tên sản phẩm + khối lượng"
                          >
                            {buildPackageName(batch.productName, kg)}
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="number"
                              min={0}
                              step={l.weightUnit === 'G' ? 1 : 0.001}
                              value={l.weightValue || ''}
                              onChange={(e) =>
                                updateLine(l.key, { weightValue: Number(e.target.value) || 0 })
                              }
                              style={{
                                width: 110,
                                padding: 6,
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                              }}
                            />
                            {l.weightUnit === 'G' && kg > 0 && (
                              <span style={{ marginLeft: 6, fontSize: 11, color: '#94a3b8' }}>
                                (= {fmtKg(kg)} kg)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: 8 }}>
                            <select
                              value={l.weightUnit}
                              onChange={(e) =>
                                updateLine(l.key, { weightUnit: e.target.value as WeightUnit })
                              }
                              style={{
                                padding: '6px 8px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                width: '100%',
                              }}
                            >
                              <option value="KG">KG</option>
                              <option value="G">G</option>
                            </select>
                          </td>
                          <td
                            style={{
                              padding: 8,
                              fontWeight: 700,
                              color: price > 0 ? '#0f172a' : '#94a3b8',
                              fontFamily: 'ui-monospace, monospace',
                            }}
                            title={
                              suggestPerKg > 0
                                ? `${fmtKg(kg)} kg × ${fmtMoney(suggestPerKg)}/kg`
                                : 'Chưa có giá khay'
                            }
                          >
                            {price > 0 ? fmtMoney(price) : '—'}
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="date"
                              value={l.manufactureDate || todayIsoDate()}
                              onChange={(e) => {
                                const mfg = e.target.value || todayIsoDate();
                                updateLine(l.key, {
                                  manufactureDate: mfg,
                                  ...(l.expiryDate && l.expiryDate < mfg
                                    ? { expiryDate: mfg }
                                    : {}),
                                });
                              }}
                              style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}
                              title="Mặc định = ngày hiện tại (ngày tạo khay)"
                            />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="date"
                              value={l.expiryDate || ''}
                              min={l.manufactureDate || todayIsoDate()}
                              onChange={(e) =>
                                updateLine(l.key, { expiryDate: e.target.value || null })
                              }
                              style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}
                              title="Không chọn ngày trước NSX"
                            />
                          </td>
                          <td style={{ padding: 8, textAlign: 'right' }}>
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => removeLine(l.key)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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

              <div
                style={{
                  fontSize: 12,
                  color: traysExceedInput ? '#b91c1c' : balanceOk ? '#0f766e' : '#64748b',
                  marginBottom: 12,
                }}
              >
                Lấy ra {fmtWeightInUnit(input, inputUnit)} − tổng khay {fmtKg(packageSum)} kg = hao{' '}
                {traysExceedInput ? '—' : fmtWeightDisplay(waste)}
                {traysExceedInput
                  ? ' — tổng khay vượt khối lượng lấy ra'
                  : balanceOk
                    ? ' ✓'
                    : ' — nhập lấy ra + khối lượng khay'}
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
                  disabled={saving || loading || !(suggestPerKg > 0)}
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
