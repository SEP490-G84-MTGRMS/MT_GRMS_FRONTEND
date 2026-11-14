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
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
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
  status: "active" | "unverified";
}

export interface WalletTransaction {
  id: string;
  transactionCode: string;
  type: "TOPUP" | "PURCHASE_PLAN" | "PURCHASE_ADDON" | "REFUND";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  paymentMethod: "VietQR" | "Wallet" | "BankTransfer";
  status: "Success" | "Pending" | "Failed";
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
  trialNote?: string;
  features: string[];
  highlight?: boolean;
  themeColor: string;
  badgeBg: string;
  buttonBg: string;
  buttonText: string;
}

export const INITIAL_STORE_INFO: StoreInfo = {
  tenantId: "t-001-minhduc",
  name: "Chuỗi Siêu thị Mini Minh Đức",
  subdomain: "sieu-thi-minh-duc",
  code: "MD-RETAIL-01",
  taxCode: "0109887766",
  hotline: "0369880798",
  address: "Số 186 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội",
  city: "Hà Nội",
  email: "minhduc.retail@gmail.com",
  status: "ACTIVE",
  currentPlan: "Gói dùng thử",
  subscriptionExpiresAt: "2026-10-19",
  daysRemaining: 3,
  branchesCount: 99,
  industry: "Tạp hóa & Siêu thị",
  walletBalance: 1250000,
};

export const INITIAL_USER_PROFILE: UserProfile = {
  userId: "usr-001",
  fullName: "Nhật Long",
  userName: "0369880798",
  role: "Admin",
  phone: "+84369880798",
  email: "nhatlong.dev@gmail.com",
  dateOfBirth: "1995-08-15",
  address: "Số 186 Cầu Giấy, Hà Nội",
  note: "Quản trị viên trưởng chuỗi siêu thị Minh Đức",
  isTwoFactorEnabled: false,
};

export const INITIAL_SESSIONS: UserSessionItem[] = [
  {
    id: "ses-1",
    deviceName: "Máy tính Windows",
    browser: "Chrome",
    ipAddress: "113.190.234.12",
    lastActive: "16/10/2026",
    isCurrent: true,
    status: "unverified",
  },
  {
    id: "ses-2",
    deviceName: "iPhone 15 Pro Max",
    browser: "Safari Mobile",
    ipAddress: "14.238.99.102",
    lastActive: "15/10/2026",
    isCurrent: false,
    status: "active",
  },
];

export const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "tx-001",
    transactionCode: "WAL-20261016-001",
    type: "TOPUP",
    amount: 1500000,
    balanceBefore: 0,
    balanceAfter: 1500000,
    description: "Nạp tiền vào ví qua VietQR Napas247",
    paymentMethod: "VietQR",
    status: "Success",
    createdAt: "16/10/2026 09:15",
  },
  {
    id: "tx-002",
    transactionCode: "WAL-20261016-002",
    type: "PURCHASE_ADDON",
    amount: 250000,
    balanceBefore: 1500000,
    balanceAfter: 1250000,
    description: "Kích hoạt gói tin nhắn SMS thông báo hạn sử dụng Zalo ZNS",
    paymentMethod: "Wallet",
    status: "Success",
    createdAt: "16/10/2026 10:30",
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlanItem[] = [
  {
    id: "plan-trial",
    code: "TRIAL",
    name: "Gói Dùng Thử (Trải Nghiệm)",
    monthlyPrice: 0,
    yearlyPrice: 0,
    tagline: "",
    branchNote: "",
    features: [
      "1 tài khoản chủ cửa hàng quản trị",
      "Mở khóa sẵn Quản lý nhân viên (Trải nghiệm)",
      "Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu",
      "Quy đổi Thùng sang Lon 1 chạm",
      "Quét mã vạch bán hàng & kiểm kho",
      "Giải pháp thanh toán Napas VietQR tự động",
      "Không tự động gia hạn sau khi hết hạn",
    ],
    themeColor: "#64748B",
    badgeBg: "#F1F5F9",
    buttonBg: "#F1F5F9",
    buttonText: "#334155",
  },
  {
    id: "plan-standard",
    code: "STANDARD",
    name: "Gói Thường (Cửa Hàng Độc Lập)",
    monthlyPrice: 99000,
    yearlyPrice: 99000 * 12,
    tagline: "Dành cho tiệm tạp hóa, siêu thị mini độc lập.",
    branchNote: "1 chi nhánh kiêm kho hàng",
    features: [
      "1 tài khoản chủ cửa hàng quản trị",
      "Tùy chọn: Mua thêm Quản lý & Phân quyền nhân viên (+30k/tháng)",
      "Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu",
      "Quy đổi Thùng sang Lon 1 chạm",
      "Quét mã vạch bán hàng & kiểm kho",
      "Giải pháp thanh toán Napas VietQR tự động",
      "Không hỗ trợ quản lý chuỗi đa chi nhánh",
    ],
    themeColor: "#00C853",
    badgeBg: "#E8F9EE",
    buttonBg: "#E8F9EE",
    buttonText: "#008738",
  },
  {
    id: "plan-pro",
    code: "PRO",
    name: "Gói Pro (Chuỗi Cửa Hàng)",
    monthlyPrice: 249000,
    yearlyPrice: 249000 * 12,
    tagline:
      "Dành cho chuỗi siêu thị bán lẻ, chuyên môn hóa quy trình và điều chuyển kho chuỗi.",
    branchNote: "Mặc định sẵn 2 chi nhánh (Mua thêm: +80k/chi nhánh/tháng)",
    highlight: true,
    features: [
      "Mặc định sẵn 2 chi nhánh kiêm kho hàng",
      "Đã bao gồm sẵn Quản lý nhân viên (Không giới hạn tài khoản)",
      "Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu",
      "Điều chuyển hàng hóa giữa các chi nhánh chuỗi",
      "Báo cáo doanh thu & P&L đa chi nhánh",
      "Giải pháp thanh toán Napas VietQR tự động",
      "Hỗ trợ ưu tiên qua tổng đài 1900 6522",
    ],
    themeColor: "var(--blue-primary)",
    badgeBg: "var(--blue-light)",
    buttonBg: "var(--blue-light)",
    buttonText: "var(--blue-primary)",
  },
];
