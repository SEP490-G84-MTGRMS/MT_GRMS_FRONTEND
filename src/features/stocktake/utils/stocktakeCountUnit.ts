import type { BatchItem } from '../../batch/types/batch.types';
import type { ProductUnitResponse } from '../../product/types';

export interface StocktakeCountUnitOption {
  name: string;
  toStockRate: number;
}

/** Quy đổi số lượng base ↔ ĐVT đang chọn để nhập kiểm kê. */
export const toCountQty = (baseQty: number, toStockRate: number): number => {
  const rate = Number(toStockRate) > 0 ? Number(toStockRate) : 1;
  return Math.round((Number(baseQty) / rate) * 1000) / 1000;
};

export const toBaseQty = (countQty: number, toStockRate: number): number => {
  const rate = Number(toStockRate) > 0 ? Number(toStockRate) : 1;
  return Math.round(Number(countQty) * rate * 1000) / 1000;
};

export const formatCountQty = (n: number): string => {
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
};

/** Dựng danh sách ĐVT kiểm kê từ lô (stock + purchase). */
export const buildCountUnitOptionsFromBatch = (b: BatchItem): StocktakeCountUnitOption[] => {
  const stockUnit = (b.stockUnit || b.unit || 'Cái').trim() || 'Cái';
  const purchaseUnit = (b.unit || stockUnit).trim() || stockUnit;
  const rate = Number(b.purchaseToStockRate) > 0 ? Number(b.purchaseToStockRate) : 1;

  const opts: StocktakeCountUnitOption[] = [{ name: stockUnit, toStockRate: 1 }];
  if (
    rate > 1 &&
    purchaseUnit.toLowerCase() !== stockUnit.toLowerCase()
  ) {
    opts.push({ name: purchaseUnit, toStockRate: rate });
  }
  return opts;
};

/** Gộp thêm ĐVT từ ProductUnits (conversionRate = số đơn vị base / 1 đơn vị này). */
export const mergeProductUnitOptions = (
  base: StocktakeCountUnitOption[],
  units: ProductUnitResponse[]
): StocktakeCountUnitOption[] => {
  const map = new Map<string, StocktakeCountUnitOption>();
  for (const o of base) {
    map.set(o.name.toLowerCase(), o);
  }
  for (const u of units || []) {
    const name = (u.unitName || '').trim();
    if (!name) continue;
    const rate = u.isBaseUnit
      ? 1
      : Number(u.conversionRate) > 0
        ? Number(u.conversionRate)
        : 1;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { name, toStockRate: rate });
    }
  }
  return Array.from(map.values());
};
