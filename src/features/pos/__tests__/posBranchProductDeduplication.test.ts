import { describe, expect, it } from 'vitest';
import { mapUniqueBranchProductsToPos } from '../api/posOrderApi';

describe('POS branch product deduplication', () => {
  it('returns one POS product when a product has multiple suppliers', () => {
    const products = mapUniqueBranchProductsToPos([
      {
        id: 'branch-product-1',
        productId: 'product-1',
        sku: 'SP000006',
        name: 'Dưa Hấu Hà Nội',
        primarySupplierName: 'Nhà Cung Cấp Long Nhật',
        retailPrice: 20000,
        currentStock: 15.25,
        stockUnit: 'KG',
      },
      {
        id: 'branch-product-1',
        productId: 'product-1',
        sku: 'SP000006',
        name: 'Dưa Hấu Hà Nội',
        primarySupplierName: 'Nhà Cung Cấp Minh Đức',
        retailPrice: 20000,
        currentStock: 15.25,
        stockUnit: 'KG',
      },
    ]);

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: 'product-1',
      sku: 'SP000006',
      name: 'Dưa Hấu Hà Nội',
      basePrice: 20000,
      quantityOnHand: 15.25,
    });
  });

  it('keeps different products even when their names are identical', () => {
    const products = mapUniqueBranchProductsToPos([
      { productId: 'product-1', sku: 'SKU-1', name: 'Dưa Hấu', retailPrice: 20000 },
      { productId: 'product-2', sku: 'SKU-2', name: 'Dưa Hấu', retailPrice: 25000 },
    ]);

    expect(products.map((product) => product.id)).toEqual(['product-1', 'product-2']);
  });
});
