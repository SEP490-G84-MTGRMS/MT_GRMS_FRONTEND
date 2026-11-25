import { describe, expect, it } from 'vitest';
import { fitsDecimal, validHotline } from '../utils/adminInputValidation';
import { validateMasterProduct } from '../utils/masterProductValidation';
import { validatePlanCode, validatePlanPricing, validatePlanQuotas } from '../utils/planValidation';

const product = { barcode: 'A', name: 'Trà', brand: 'X', categoryName: 'Y', baseUnit: 'g' };
describe('Hàng mẫu', () => {
  it.each([
    ['barcode', 1, 50], ['name', 2, 250], ['brand', 1, 100], ['categoryName', 1, 100], ['baseUnit', 1, 30],
  ] as const)('%s bắt buộc và khớp độ dài cột', (field, min, max) => {
    for (const text of ['', '   ', 'x'.repeat(min - 1), 'x'.repeat(max + 1)])
      expect(validateMasterProduct({ ...product, [field]: text })).toBeTruthy();
    for (const length of [min, max])
      expect(validateMasterProduct({ ...product, [field]: 'x'.repeat(length) })).toBeUndefined();
  });

  it.each([
    { imageUrl: 'file:///image' }, { imageUrl: 'https://example.com/' + 'x'.repeat(1000) },
    { description: 'x'.repeat(1001) }, { vatRate: 11 }, { suggestedRetailPrice: -1 },
    { suggestedRetailPrice: 0.001 }, { suggestedRetailPrice: 1e16 },
    { units: [{ unitName: ' ', conversionRate: 2 }] }, { units: [{ unitName: 'Lốc', conversionRate: 1 }] },
    { units: [{ unitName: 'Lốc', conversionRate: 1.00001 }] },
    { units: [{ unitName: 'Lốc', conversionRate: 6, barcode: '0'.repeat(51) }] },
  ])('từ chối giá trị ngoài giới hạn %#', fields => {
    expect(validateMasterProduct({ ...product, ...fields })).toBeTruthy();
  });

  it('chấp nhận trường tùy chọn trống, giá 0 và hệ số 4 chữ số thập phân', () => {
    expect(validateMasterProduct(product)).toBeUndefined();
    expect(validateMasterProduct({ ...product, suggestedRetailPrice: 0, description: 'x'.repeat(1000),
      units: [{ unitName: 'Lốc', conversionRate: 1.0001 }], imageUrl: 'https://example.com/a.jpg' })).toBeUndefined();
  });
});

describe('Gói và cấu hình nền tảng', () => {
  it.each([NaN, Infinity, 0.001, 1e-7, -1, 1e16])('từ chối đơn giá %s', price => {
    expect(fitsDecimal(price, 2)).toBe(false);
    expect(validatePlanPricing(price, 0).isValid).toBe(false);
  });
  it.each([0, 0.01, 1.23, 9999999999999998])('chấp nhận đơn giá %s', price => expect(fitsDecimal(price, 2)).toBe(true));
  it.each([NaN, Infinity, 1.2, 2147483648])('từ chối hạn mức %s', value => {
    expect(validatePlanQuotas({ maxBranches: value, maxEmployees: 1, maxStorageGb: 2 }).isValid).toBe(false);
  });
  it('kiểm tra giới hạn mã gói', () => {
    expect(validatePlanCode('A'.repeat(50)).isValid).toBe(true);
    expect(validatePlanCode('A'.repeat(51)).isValid).toBe(false);
  });
  it.each([['1900 6522', true], ['+84 912-345-678', true], ['1234567', false], ['1234567890123456', false],
    ['1900abcd', false]] as const)('hotline %s', (phone, valid) => expect(validHotline(phone)).toBe(valid));
});
