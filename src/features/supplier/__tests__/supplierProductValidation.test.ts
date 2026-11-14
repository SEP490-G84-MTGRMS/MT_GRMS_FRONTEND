import { describe, it, expect } from 'vitest';

export function resolveEffectivePurchasePrice(
  agreedPrice: number,
  costPrice?: number | null
): { ok: true; value: number } | { ok: false; error: string } {
  if (agreedPrice < 0) {
    return { ok: false, error: 'Giá sỉ thỏa thuận không được âm.' };
  }
  if (agreedPrice > 0) {
    return { ok: true, value: agreedPrice };
  }
  // 0 / trống = chưa thỏa thuận → hiệu lực = Master (có thể 0 nếu Master trống)
  return { ok: true, value: costPrice ?? 0 };
}

export function validateSupplierProductInput(input: {
  agreedPrice: number;
  moq: number;
  costPrice?: number | null;
}): { valid: boolean; error?: string } {
  if (input.agreedPrice < 0) {
    return { valid: false, error: 'Giá sỉ thỏa thuận không được âm.' };
  }
  const effective = resolveEffectivePurchasePrice(input.agreedPrice, input.costPrice);
  if (!effective.ok) {
    return { valid: false, error: effective.error };
  }
  if (input.moq < 1) {
    return { valid: false, error: 'Số lượng đặt tối thiểu (MOQ) phải ít nhất là 1.' };
  }
  return { valid: true };
}

describe('Supplier Product Validation Unit Tests (REQ-SP01, BR-SP03)', () => {
  it('should accept valid price and MOQ', () => {
    const result = validateSupplierProductInput({
      agreedPrice: 280000,
      moq: 5,
      costPrice: 8000,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept agreed price 0 when product cost price exists', () => {
    const result = validateSupplierProductInput({
      agreedPrice: 0,
      moq: 5,
      costPrice: 8000,
    });
    expect(result.valid).toBe(true);
    expect(resolveEffectivePurchasePrice(0, 8000)).toEqual({ ok: true, value: 8000 });
  });

  it('should accept agreed price 0 when product has no cost price (null agreed, effective 0)', () => {
    const result = validateSupplierProductInput({
      agreedPrice: 0,
      moq: 5,
      costPrice: null,
    });
    expect(result.valid).toBe(true);
    expect(resolveEffectivePurchasePrice(0, null)).toEqual({ ok: true, value: 0 });
  });

  it('should reject negative price', () => {
    const negativePrice = validateSupplierProductInput({
      agreedPrice: -10000,
      moq: 5,
      costPrice: 8000,
    });
    expect(negativePrice.valid).toBe(false);
  });

  it('should reject MOQ less than 1', () => {
    const zeroMoq = validateSupplierProductInput({
      agreedPrice: 50000,
      moq: 0,
      costPrice: 8000,
    });
    expect(zeroMoq.valid).toBe(false);
    expect(zeroMoq.error).toContain('MOQ');
  });

  it('should keep per-product terms independent', () => {
    const productA = validateSupplierProductInput({ agreedPrice: 100000, moq: 10, costPrice: 90000 });
    const productB = validateSupplierProductInput({ agreedPrice: 55000, moq: 8, costPrice: 40000 });
    expect(productA.valid).toBe(true);
    expect(productB.valid).toBe(true);
    expect(resolveEffectivePurchasePrice(100000, 90000).ok && resolveEffectivePurchasePrice(100000, 90000).ok).toBe(true);
  });
});
