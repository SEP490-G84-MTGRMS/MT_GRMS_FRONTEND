import type { ReceiptData } from '../types/pos.types';
import { posOrderApi } from '../api/posOrderApi';

/**
 * Loại bỏ dấu tiếng Việt để phục vụ tìm kiếm không phân biệt dấu
 */
export const removeVietnameseTones = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

/**
 * In trực tiếp hóa đơn POS-58 qua backend/server (1-Click, không bao giờ mở hộp thoại Print Preview trình duyệt).
 */
export const printReceiptDirectly = async (receipt: ReceiptData): Promise<{ success: boolean; message: string }> => {
  return await posOrderApi.printDirect(receipt);
};
