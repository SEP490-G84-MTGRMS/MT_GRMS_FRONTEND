import { describe, it, expect } from 'vitest';

/**
 * Validates supplier product agreement inputs
 */
export function validateSupplierProductInput(input: {
  agreedPrice: number;
  moq: number;
  deliveryUoM?: string;
}): { valid: boolean; error?: string } {
  if (!input.deliveryUoM || input.deliveryUoM.trim().length === 0) {
    return { valid: false, error: 'Đơn vị nhập hàng không được để trống.' };
  }
  if (input.agreedPrice <= 0) {
    return { valid: false, error: 'Giá sỉ thỏa thuận phải lớn hơn 0.' };
  }
  if (input.moq < 1) {
    return { valid: false, error: 'Số lượng đặt tối thiểu (MOQ) phải ít nhất là 1.' };
  }
  return { valid: true };
}

describe('Supplier Product Validation Unit Tests (REQ-SP01, BR-SP03)', () => {
  it('should accept valid price, MOQ and delivery unit', () => {
    const result = validateSupplierProductInput({
      agreedPrice: 280000,
      moq: 5,
      deliveryUoM: 'Thùng',
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject price less than or equal to 0 (BR-SP03)', () => {
    const zeroPrice = validateSupplierProductInput({
      agreedPrice: 0,
      moq: 5,
      deliveryUoM: 'Thùng',
    });
    expect(zeroPrice.valid).toBe(false);
    expect(zeroPrice.error).toContain('Giá sỉ thỏa thuận phải lớn hơn 0');

    const negativePrice = validateSupplierProductInput({
      agreedPrice: -10000,
      moq: 5,
      deliveryUoM: 'Thùng',
    });
    expect(negativePrice.valid).toBe(false);
  });

  it('should reject MOQ less than 1 (BR-SP03)', () => {
    const zeroMoq = validateSupplierProductInput({
      agreedPrice: 50000,
      moq: 0,
      deliveryUoM: 'Hộp',
    });
    expect(zeroMoq.valid).toBe(false);
    expect(zeroMoq.error).toContain('MOQ');

    const negativeMoq = validateSupplierProductInput({
      agreedPrice: 50000,
      moq: -2,
      deliveryUoM: 'Hộp',
    });
    expect(negativeMoq.valid).toBe(false);
  });

  it('should reject empty or whitespace delivery unit', () => {
    const emptyUoM = validateSupplierProductInput({
      agreedPrice: 50000,
      moq: 2,
      deliveryUoM: '   ',
    });
    expect(emptyUoM.valid).toBe(false);
    expect(emptyUoM.error).toContain('Đơn vị nhập hàng');
  });
});
