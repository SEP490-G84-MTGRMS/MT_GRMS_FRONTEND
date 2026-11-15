import { batchApi } from '../../batch/api/batchApi';
import type { BatchItem } from '../../batch/types/batch.types';

/** Lấy toàn bộ lô đang có tồn (QOH > 0) của 1 sản phẩm tại chi nhánh. */
export async function fetchLotsForProduct(
  branchId: string,
  productId: string,
  skuOrNameHint?: string
): Promise<BatchItem[]> {
  const res = await batchApi.getBatches({
    keyword: (skuOrNameHint || '').trim(),
    productName: '',
    sku: '',
    batchCode: '',
    supplierName: '',
    branchId,
    status: 'ALL',
    pageIndex: 1,
    pageSize: 200,
  });

  const lots = (res.items || []).filter(
    (b) => b.productId === productId && Number(b.qtyCurrent) > 0
  );

  // Nếu hint quá hẹp / lệch → thử lại bằng productId qua keyword rỗng + filter client
  if (lots.length === 0 && skuOrNameHint) {
    const broad = await batchApi.getBatches({
      keyword: '',
      productName: '',
      sku: '',
      batchCode: '',
      supplierName: '',
      branchId,
      status: 'ALL',
      pageIndex: 1,
      pageSize: 500,
    });
    return (broad.items || []).filter(
      (b) => b.productId === productId && Number(b.qtyCurrent) > 0
    );
  }

  return lots;
}

/** Gom batch list theo productId (giữ thứ tự xuất hiện). */
export function groupBatchesByProduct(items: BatchItem[]): Map<string, BatchItem[]> {
  const map = new Map<string, BatchItem[]>();
  for (const b of items) {
    const list = map.get(b.productId) || [];
    list.push(b);
    map.set(b.productId, list);
  }
  return map;
}
