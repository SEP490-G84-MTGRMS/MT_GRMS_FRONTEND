import { fitsDecimal } from './adminInputValidation';
import type { CreateMasterProductInput } from '../types/masterCatalog.types';

export function validateMasterProduct(product: Omit<CreateMasterProductInput, 'taxCategory'>): string | undefined {
  const fields = [
    [product.barcode, 'Mã vạch', 1, 50],
    [product.name, 'Tên hàng mẫu', 2, 250],
    [product.brand, 'Thương hiệu', 1, 100],
    [product.categoryName, 'Ngành hàng', 1, 100],
    [product.baseUnit, 'Đơn vị cơ bản', 1, 30],
  ] as const;
  for (const [value, label, min, max] of fields) {
    if (value.trim().length < min || value.trim().length > max) return label + ' phải có từ ' + min + ' đến ' + max + ' ký tự.';
  }
  if (product.suggestedRetailPrice != null && !fitsDecimal(product.suggestedRetailPrice, 2))
    return 'Giá bán lẻ phải từ 0 trở lên, tối đa 16 chữ số nguyên và 2 chữ số thập phân.';
  if (![0, 8, 10].includes(product.vatRate ?? 8)) return 'Thuế suất phải là 0, 8 hoặc 10%.';
  const url = product.imageUrl?.trim();
  if (url && (url.length > 1000 || !/^https?:\/\//i.test(url) || !URL.canParse(url)))
    return 'Link ảnh phải là địa chỉ HTTP hoặc HTTPS, tối đa 1000 ký tự.';
  if ((product.description?.trim().length ?? 0) > 1000) return 'Mô tả tối đa 1000 ký tự.';
  for (const [index, unit] of (product.units ?? []).entries()) {
    const label = 'Đơn vị quy đổi ' + (index + 1);
    if (!unit.unitName.trim() || unit.unitName.trim().length > 50) return label + ' cần tên từ 1 đến 50 ký tự.';
    if (!(unit.conversionRate > 1) || !fitsDecimal(unit.conversionRate, 4))
      return label + ' cần hệ số lớn hơn 1, tối đa 14 chữ số nguyên và 4 chữ số thập phân.';
    if ((unit.barcode?.trim().length ?? 0) > 50) return label + ' có mã vạch dài quá 50 ký tự.';
  }
}
