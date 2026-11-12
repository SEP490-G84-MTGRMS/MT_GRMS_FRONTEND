/** Row key Matrix: cùng ProductId có thể nhiều NCC → không dùng productId đơn. */
export function matrixRowKey(productId: string, supplierId: string): string {
  return `${productId}__${supplierId || 'none'}`;
}

export function parseMatrixRowKey(key: string): { productId: string; supplierId: string } {
  const idx = key.indexOf('__');
  if (idx < 0) {
    return { productId: key, supplierId: '' };
  }
  return {
    productId: key.slice(0, idx),
    supplierId: key.slice(idx + 2) === 'none' ? '' : key.slice(idx + 2),
  };
}

export function productRowKey(p: { id: string; supplierId: string }): string {
  return matrixRowKey(p.id, p.supplierId);
}
