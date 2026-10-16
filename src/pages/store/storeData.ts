// src/pages/store/storeData.ts
// Shared models & store for Store Info, Subscriptions, Wallet, and User Profile

export interface StoreInfo {
  tenantId: string;
  name: string;
  subdomain: string;
  code: string;
  taxCode: string;
  hotline: string;
  address: string;
  city: string;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  currentPlan: string;
  subscriptionExpiresAt: string;
  daysRemaining: number;
  branchesCount: number;
  industry: string;
  walletBalance: number;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  userName: string;
  role: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  address: string;
  note: string;
  isTwoFactorEnabled: boolean;
  avatarUrl?: string;
}

export interface UserSessionItem {
  id: string;
  deviceName: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
  status: 'active' | 'unverified';
}

export interface WalletTransaction {
  id: string;
  transactionCode: string;
  type: 'TOPUP' | 'PURCHASE_PLAN' | 'PURCHASE_ADDON' | 'REFUND';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  paymentMethod: 'VietQR' | 'Wallet' | 'BankTransfer';
  status: 'Success' | 'Pending' | 'Failed';
  createdAt: string;
}

export interface SubscriptionPlanItem {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  tagline: string;
  branchNote: string;
  warehouseNote?: string;
  features: string[];
  highlight?: boolean;
  themeColor: string;
  badgeBg: string;
  buttonBg: string;
  buttonText: string;
}

export const INITIAL_STORE_INFO: StoreInfo = {
  tenantId: 't-001-minhduc',
  name: 'Chuỗi Siêu thị Mini Minh Đức',
  subdomain: 'sieu-thi-minh-duc',
  code: 'MD-RETAIL-01',
  taxCode: '0109887766',
  hotline: '0369880798',
  address: 'Số 186 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
  city: 'Hà Nội',
  email: 'minhduc.retail@gmail.com',
  status: 'ACTIVE',
  currentPlan: 'Gói dùng thử',
  subscriptionExpiresAt: '2026-10-19',
  daysRemaining: 3,
  branchesCount: 99,
  industry: 'Tạp hóa & Siêu thị',
  walletBalance: 1250000,
};

export const INITIAL_USER_PROFILE: UserProfile = {
  userId: 'usr-001',
  fullName: 'Nhật Long',
  userName: '0369880798',
  role: 'Admin',
  phone: '+84369880798',
  email: 'nhatlong.dev@gmail.com',
  dateOfBirth: '1995-08-15',
  address: 'Số 186 Cầu Giấy, Hà Nội',
  note: 'Quản trị viên trưởng chuỗi siêu thị Minh Đức',
  isTwoFactorEnabled: false,
};

export const INITIAL_SESSIONS: UserSessionItem[] = [
  {
    id: 'ses-1',
    deviceName: 'Máy tính Windows',
    browser: 'Chrome',
    ipAddress: '113.190.234.12',
    lastActive: '16/10/2026',
    isCurrent: true,
    status: 'unverified',
  },
  {
    id: 'ses-2',
    deviceName: 'iPhone 15 Pro Max',
    browser: 'Safari Mobile',
    ipAddress: '14.238.99.102',
    lastActive: '15/10/2026',
    isCurrent: false,
    status: 'active',
  },
];

export const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx-001',
    transactionCode: 'WAL-20261016-001',
    type: 'TOPUP',
    amount: 1500000,
    balanceBefore: 0,
    balanceAfter: 1500000,
    description: 'Nạp tiền vào ví qua VietQR Napas247',
    paymentMethod: 'VietQR',
    status: 'Success',
    createdAt: '16/10/2026 09:15',
  },
  {
    id: 'tx-002',
    transactionCode: 'WAL-20261016-002',
    type: 'PURCHASE_ADDON',
    amount: 250000,
    balanceBefore: 1500000,
    balanceAfter: 1250000,
    description: 'Kích hoạt gói tin nhắn SMS thông báo hạn sử dụng Zalo ZNS',
    paymentMethod: 'Wallet',
    status: 'Success',
    createdAt: '16/10/2026 10:30',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlanItem[] = [
  {
    id: 'plan-support',
    code: 'SUPPORT',
    name: 'Gói hỗ trợ',
    monthlyPrice: 270000,
    yearlyPrice: 270000 * 12,
    tagline: 'Dành cho mô hình kinh doanh nhỏ, người bắt đầu kinh doanh hoặc bán hàng online.',
    branchNote: '1 chi nhánh /tháng',
    features: [
      '3 tài khoản truy cập',
      'Không giới hạn tính năng cơ bản',
      'Không phí khởi tạo',
      'Hỗ trợ qua tổng đài 1900 6522',
      'Giải pháp thanh toán Napas VietQR/ Visa/ Master',
      'Cổng vận chuyển MT-GRMS',
    ],
    themeColor: '#00C853',
    badgeBg: '#E8F9EE',
    buttonBg: '#E8F9EE',
    buttonText: '#008738',
  },
  {
    id: 'plan-pro',
    code: 'PRO',
    name: 'Gói chuyên nghiệp',
    monthlyPrice: 330000,
    yearlyPrice: 330000 * 12,
    tagline: 'Dành cho mô hình kinh doanh chuyên nghiệp, chuyên môn hóa quy trình.',
    branchNote: 'Quản lý đa chi nhánh: 270k/ +1 chi nhánh',
    warehouseNote: 'Quản lý đa kho: 150k/ +1 kho',
    highlight: true,
    features: [
      'Không giới hạn tài khoản truy cập',
      'Không giới hạn tính năng cơ bản',
      'Không phí khởi tạo',
      'Hỗ trợ qua tổng đài ưu tiên',
      'Giải pháp thanh toán Napas VietQR/ Visa/ Master',
      'Hỗ trợ liên kết các hãng vận chuyển',
      'Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu',
      'Định mức suất combo giỏ quà Tết tự động khấu trừ',
    ],
    themeColor: '#0066FF',
    badgeBg: '#E8F1FF',
    buttonBg: '#E8F1FF',
    buttonText: '#0066FF',
  },
  {
    id: 'plan-premium',
    code: 'PREMIUM',
    name: 'Gói cao cấp',
    monthlyPrice: 490000,
    yearlyPrice: 490000 * 12,
    tagline: 'Dành cho mô hình kinh doanh lớn, nhiều kênh bán & cần dịch vụ cao cấp.',
    branchNote: 'Quản lý đa chi nhánh: 375k/ +1 chi nhánh',
    warehouseNote: 'Quản lý đa kho: 150k/ +1 kho',
    features: [
      'Không giới hạn tài khoản truy cập',
      'Không giới hạn tính năng cơ bản',
      'Không phí khởi tạo',
      'Giải pháp thanh toán Napas VietQR/ Visa/ Master',
      'Liên kết các hãng vận chuyển & COD siêu tốc',
      'Bán hàng online trên sàn TMĐT, TikTok, Facebook, Instagram, Zalo',
      'Tích hợp hóa đơn điện tử khởi tạo từ máy tính tiền CQT',
      'Chuyên viên CSKH kỹ thuật hỗ trợ trực tiếp 1-1',
    ],
    themeColor: '#FF9500',
    badgeBg: '#FFF8EB',
    buttonBg: '#FF9500',
    buttonText: '#FFFFFF',
  },
];
