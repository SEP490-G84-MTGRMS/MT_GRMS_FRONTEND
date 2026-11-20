import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { batchApi } from '../../batch/api/batchApi';
import type { BatchItem } from '../../batch/types/batch.types';
import { fetchLotsForProduct, groupBatchesByProduct } from '../utils/stocktakeLotExpand';

interface StocktakeAddProductModalProps {
  isOpen: boolean;
  branchId: string;
  /** productId đã có ít nhất 1 lô trên phiếu */
  existingProductIds: Set<string>;
  onClose: () => void;
  /** Trả về toàn bộ lô tồn của các SP đã chọn */
  onAdd: (batches: BatchItem[]) => void;
}

interface ProductOption {
  productId: string;
  sku: string;
  productName: string;
  /** ĐVT tồn (base) — qtyCurrent luôn theo đơn vị này */
  stockUnit: string;
  /** ĐVT nhập (purchase) */
  purchaseUnit: string;
  purchaseToStockRate: number;
  lotCount: number;
  /** Tổng QuantityOnHand theo ĐVT tồn */
  totalStockQty: number;
  sample: BatchItem;
}

const fmtQty = (n: number) =>
  n.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

/** qtyCurrent lưu theo ĐVT tồn → quy đổi ra ĐVT nhập để hiển thị phụ. */
const toPurchaseQty = (stockQty: number, rate: number) => {
  const r = rate > 0 ? rate : 1;
  return Math.round((stockQty / r) * 1000) / 1000;
};

export const StocktakeAddProductModal: FC<StocktakeAddProductModalProps> = ({
  isOpen,
  branchId,
  existingProductIds,
  onClose,
  onAdd,
}) => {
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await batchApi.getBatches({
        keyword: appliedKeyword,
        productName: '',
        sku: '',
        batchCode: '',
        supplierName: '',
        branchId,
        status: 'ALL',
        pageIndex: 1,
        pageSize: 120,
      });
      const withStock = (res.items || []).filter((b) => b.qtyCurrent > 0);
      const grouped = groupBatchesByProduct(withStock);
      const opts: ProductOption[] = [];
      grouped.forEach((lots, productId) => {
        const sample = lots[0];
        const stockUnit = (sample.stockUnit || sample.unit || 'Cái').trim() || 'Cái';
        const purchaseUnit = (sample.unit || stockUnit).trim() || stockUnit;
        // Mỗi lô có thể khác rate (hiếm) — quy đổi từng lô rồi cộng theo base, không cộng thùng + chai.
        const totalStockQty = lots.reduce((s, l) => s + (Number(l.qtyCurrent) || 0), 0);
        const rate =
          lots
            .map((l) => Number(l.purchaseToStockRate))
            .find((r) => r > 0) ||
          Number(sample.purchaseToStockRate) ||
          1;
        opts.push({
          productId,
          sku: sample.sku,
          productName: sample.productName,
          stockUnit,
          purchaseUnit,
          purchaseToStockRate: rate > 0 ? rate : 1,
          lotCount: lots.length,
          totalStockQty,
          sample,
        });
      });
      opts.sort((a, b) => a.sku.localeCompare(b.sku));
      setProducts(opts);
      setSelected(new Set());
    } catch (e: unknown) {
      setProducts([]);
      setError(e instanceof Error ? e.message : 'Không tải được danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [branchId, appliedKeyword]);

  useEffect(() => {
    if (!isOpen) return;
    setKeyword('');
    setAppliedKeyword('');
    setSelected(new Set());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !branchId) return;
    void load();
  }, [isOpen, branchId, load]);

  const selectable = useMemo(
    () => products.filter((p) => !existingProductIds.has(p.productId)),
    [products, existingProductIds]
  );

  const toggle = (productId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (selected.size === selectable.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectable.map((p) => p.productId)));
  };

  const handleAdd = async () => {
    const picked = products.filter(
      (p) => selected.has(p.productId) && !existingProductIds.has(p.productId)
    );
    if (picked.length === 0) return;

    setAdding(true);
    setError(null);
    try {
      const allLots: BatchItem[] = [];
      for (const p of picked) {
        const lots = await fetchLotsForProduct(branchId, p.productId, p.sku);
        allLots.push(...lots);
      }
      if (allLots.length === 0) {
        setError('Không tìm thấy lô tồn kho (> 0) cho sản phẩm đã chọn.');
        return;
      }
      onAdd(allLots);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể tải lô của sản phẩm.');
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(860px, 100%)',
          maxHeight: '88vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
            padding: '14px 16px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>Tìm sản phẩm thêm vào phiếu</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Chọn sản phẩm — hệ thống tự thêm toàn bộ lô đang có tồn tại chi nhánh
            </div>
          </div>
          <button type="button" className="so-list-action-btn" onClick={onClose} title="Đóng">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }}
              />
              <input
                type="text"
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setAppliedKeyword(keyword.trim());
                  }
                }}
                placeholder="Nhập SKU hoặc tên sản phẩm..."
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                }}
              />
            </div>
            <button
              type="button"
              className="po-btn po-btn-secondary"
              onClick={() => setAppliedKeyword(keyword.trim())}
              disabled={loading}
              style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Tìm
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 0 8px' }}>
          {error ? (
            <div style={{ padding: 16, color: '#b91c1c', fontSize: 13 }}>{error}</div>
          ) : loading ? (
            <div
              style={{
                padding: 24,
                color: '#64748b',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <Loader2 size={16} className="animate-spin" /> Đang tải…
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: 24, color: '#64748b', textAlign: 'center', fontSize: 13 }}>
              Không có sản phẩm tồn kho phù hợp. Thử đổi từ khóa.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '8px 12px', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectable.length > 0 && selected.size === selectable.length}
                      onChange={toggleAllVisible}
                      disabled={selectable.length === 0}
                      title="Chọn tất cả SP chưa có trên phiếu"
                    />
                  </th>
                  <th style={{ padding: '8px 12px' }}>SKU / Sản phẩm</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Số lô</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }} title="Theo ĐVT tồn (base)">
                    Tổng tồn
                  </th>
                  <th style={{ padding: '8px 12px' }}>TT</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const already = existingProductIds.has(p.productId);
                  const checked = selected.has(p.productId);
                  return (
                    <tr
                      key={p.productId}
                      style={{
                        borderTop: '1px solid #e2e8f0',
                        background: already ? '#f8fafc' : checked ? '#f0fdfa' : '#fff',
                        opacity: already ? 0.65 : 1,
                        cursor: already ? 'default' : 'pointer',
                      }}
                      onClick={() => {
                        if (!already) toggle(p.productId);
                      }}
                    >
                      <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={already}
                          onChange={() => toggle(p.productId)}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                          {p.sku}
                        </div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.productName}</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>
                        {p.lotCount}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        {(() => {
                          const rate = p.purchaseToStockRate > 0 ? p.purchaseToStockRate : 1;
                          const sameUnit =
                            rate === 1 ||
                            p.purchaseUnit.toLowerCase() === p.stockUnit.toLowerCase();
                          const purchaseQty = toPurchaseQty(p.totalStockQty, rate);
                          const rateLabel = Number.isInteger(rate)
                            ? String(rate)
                            : rate.toLocaleString('vi-VN');
                          return (
                            <div
                              title={
                                sameUnit
                                  ? undefined
                                  : `1 ${p.purchaseUnit} = ${rateLabel} ${p.stockUnit}`
                              }
                            >
                              <div>
                                {fmtQty(p.totalStockQty)}{' '}
                                <span style={{ fontWeight: 600, color: '#64748b' }}>
                                  {p.stockUnit}
                                </span>
                              </div>
                              {!sameUnit && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#94a3b8',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  ≈ {fmtQty(purchaseQty)} {p.purchaseUnit}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          fontSize: 12,
                          color: already ? '#94a3b8' : '#0f766e',
                        }}
                      >
                        {already ? 'Đã có trên phiếu' : 'Thêm mọi lô'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Đã chọn <b style={{ color: '#0f172a' }}>{selected.size}</b> sản phẩm
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="po-btn po-btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="po-btn po-btn-primary"
              disabled={selected.size === 0 || adding}
              onClick={() => void handleAdd()}
              style={{
                background: '#0f766e',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: selected.size === 0 || adding ? 0.5 : 1,
              }}
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Thêm vào phiếu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StocktakeAddProductModal;
