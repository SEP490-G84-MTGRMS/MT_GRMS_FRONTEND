import { MANUAL_CASH_MOVEMENT_CATEGORY } from '../types/posShift.types';

export type ManualCashMovementOption = {
  key: 'expense' | 'cashDraw' | 'cashDeposit';
  movementType: 'IN' | 'OUT';
  category: (typeof MANUAL_CASH_MOVEMENT_CATEGORY)[keyof typeof MANUAL_CASH_MOVEMENT_CATEGORY];
  label: string;
  defaultReason: string;
  activeBorder: string;
  activeBackground: string;
  activeColor: string;
  fullWidth?: boolean;
};

// Đây là danh mục nghiệp vụ hệ thống, không phải dữ liệu cấu hình của cửa hàng.
// Mỗi category có một chiều tiền cố định để khớp với quy tắc kiểm soát tại backend.
export const MANUAL_CASH_MOVEMENT_OPTIONS: readonly ManualCashMovementOption[] = [
  {
    key: 'expense',
    movementType: 'OUT',
    category: MANUAL_CASH_MOVEMENT_CATEGORY.EXPENSE,
    label: '[-] Chi vật quầy (Mua đá, bill...)',
    defaultReason: 'Chi vật quầy thu ngân',
    activeBorder: '#dc2626',
    activeBackground: '#fef2f2',
    activeColor: '#991b1b',
  },
  {
    key: 'cashDraw',
    movementType: 'OUT',
    category: MANUAL_CASH_MOVEMENT_CATEGORY.CASH_DRAW,
    label: '[↓] Rút két nộp Chủ / Két sắt',
    defaultReason: 'Rút bớt tiền nộp Chủ cửa hàng',
    activeBorder: '#ea580c',
    activeBackground: '#fff7ed',
    activeColor: '#c2410c',
  },
  {
    key: 'cashDeposit',
    movementType: 'IN',
    category: MANUAL_CASH_MOVEMENT_CATEGORY.CASH_DEPOSIT,
    label: '[+] Nạp thêm tiền lẻ vào két',
    defaultReason: 'Nạp thêm tiền lẻ vào két',
    activeBorder: '#059669',
    activeBackground: '#ecfdf5',
    activeColor: '#065f46',
    fullWidth: true,
  },
] as const;
