export type PlanStatus = 'Active' | 'Inactive';
export type BackupFrequency = 'Daily' | 'Weekly' | 'Hourly';

export interface PlanQuotaConfig {
  maxBranches: number;      // -1: Không giới hạn (Unlimited)
  maxEmployees: number;     // -1: Không giới hạn (Unlimited)
  maxStorageGb: number;
  backupFrequency: BackupFrequency;
}

export interface PlanFeatureConfig {
  fefoExpiryAlert: boolean;       // Quản lý date FEFO 3 mức màu
  multiUnitConversion: boolean;   // Quy đổi đa đơn vị thùng/lon
  vietQrDynamic: boolean;         // VietQR động khớp tiền tự động
  debtZaloBook: boolean;          // Sổ nợ Zalo & Bán hàng nợ
  barcodeScanning: boolean;       // Quét mã vạch Barcode POS
  financialReporting: boolean;    // Báo cáo tài chính & Sổ quỹ chuyên sâu
}

export interface PlanTenantSummary {
  id: string;
  name: string;
  subdomain: string;
  activeBranches: number;
  activeEmployees: number;
  joinedDate: string;
  expiryDate: string;
}

export interface SubscriptionPlan {
  id: string;
  code: string;                   // PLAN_STARTER, PLAN_BASIC, PLAN_ADVANCED, PLAN_ENTERPRISE
  name: string;
  description: string;
  monthlyPrice: number;           // VNĐ / tháng
  yearlyPrice: number;            // VNĐ / năm
  status: PlanStatus;
  activeTenantCount: number;
  quotas: PlanQuotaConfig;
  features: PlanFeatureConfig;
  tenants?: PlanTenantSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanFilterState {
  keyword: string;
  status: 'all' | PlanStatus;
}
