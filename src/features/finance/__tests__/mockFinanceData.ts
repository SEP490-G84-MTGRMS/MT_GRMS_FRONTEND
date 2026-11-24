/**
 * Standardized Seed Data for MT-GRMS Finance Subsystem Redesign.
 * Single Source of Truth matching MT-GRMS_Finance_Redesign_Spec_for_AI.md & Plan v2.
 * Reference Demo Date: 2026-10-27.
 */

export interface FundAccount {
  id: string;
  name: string;
  group: 'cash' | 'bank';
  balance: number;
  restrictedTo?: ('owner' | 'chief_accountant')[];
  accountNumber?: string;
  bankName?: string;
  description?: string;
}

export interface CashInTransit {
  id: string;
  fromFundId: string;
  toFundId: string;
  amount: number;
  transferredBy: string;
  transferredAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISCREPANCY';
}

export interface PayableExpense {
  id: string;
  code: string;
  category: string;
  branch: string;
  vendorName: string;
  partnerCustomerCode?: string; // e.g., EVN customer code PE01000...
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  paidFromFundId?: string;
}

export interface CustomerDebtRecord {
  id: string;
  name: string;
  phone: string;
  tier: 'Standard' | 'Silver' | 'Gold' | 'VIP';
  currentDebt: number;
  creditLimit: number;
  oldestDebtDate: string; // Used for dynamic calculation of days overdue
  depositBalance?: number; // Pre-paid deposit from overpayment
}

export interface PnlSummaryData {
  grossSales: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  shrinkageWarehouse: number;
  netProfit: number;
  totalOrders: number;
  averageOrderValue: number;
  netProfitMargin: number;
  // Detail drilldown for operating expenses (solves the 57.3M gap)
  opexBreakdown: {
    servicePayables: number;
    staffSalaries: number;
    utilitiesAndMisc: number;
  };
}

export const MOCK_FUNDS: FundAccount[] = [
  { id: 'cash_q1', name: 'Két quầy Q1', group: 'cash', balance: 12_500_000 },
  { id: 'cash_q7', name: 'Két quầy Q7', group: 'cash', balance: 8_200_000 },
  {
    id: 'safe',
    name: 'Két sắt chủ shop',
    group: 'cash',
    balance: 150_000_000,
    restrictedTo: ['owner', 'chief_accountant'],
    description: 'Quỹ an toàn tích lũy của chủ tiệm',
  },
  {
    id: 'vcb',
    name: 'Vietcombank (Thu bán hàng)',
    group: 'bank',
    balance: 145_800_000,
    accountNumber: '0071001234567',
    bankName: 'VCB',
  },
  {
    id: 'tcb',
    name: 'Techcombank (Chi trả NCC)',
    group: 'bank',
    balance: 32_450_000,
    accountNumber: '19034567890123',
    bankName: 'TCB',
  },
];

export const MOCK_CASH_TRANSIT: CashInTransit[] = [
  {
    id: 'TRANSIT-20261027-01',
    fromFundId: 'cash_q1',
    toFundId: 'safe',
    amount: 10_350_000,
    transferredBy: 'Trần Thị Lan',
    transferredAt: '2026-10-27T08:15:00Z',
    status: 'PENDING',
  },
];

export const MOCK_PAYABLES: PayableExpense[] = [
  {
    id: 'exp-001',
    code: 'EXP-2026-001',
    category: 'Tiền điện',
    branch: 'Quận 1',
    vendorName: 'EVN HCMC',
    partnerCustomerCode: 'PE0100023489',
    dueDate: '2026-10-15', // Overdue 12 days
    amount: 3_850_000,
    isPaid: false,
  },
  {
    id: 'exp-002',
    code: 'EXP-2026-002',
    category: 'Tiền nước',
    branch: 'Quận 1',
    vendorName: 'SAWACO',
    partnerCustomerCode: 'DB-098234',
    dueDate: '2026-10-10',
    amount: 720_000,
    isPaid: true,
    paidAt: '2026-10-10T14:20:00Z',
    paidFromFundId: 'cash_q1',
  },
  {
    id: 'exp-003',
    code: 'EXP-2026-003',
    category: 'Mặt bằng',
    branch: 'Bình Thạnh',
    vendorName: 'Ông Trần Văn Đức',
    partnerCustomerCode: 'HD-MB-BT01',
    dueDate: '2026-10-08', // Overdue 19 days
    amount: 18_000_000,
    isPaid: false,
  },
  {
    id: 'exp-005',
    code: 'EXP-2026-005',
    category: 'Sửa chữa',
    branch: 'Thủ Đức',
    vendorName: 'Cơ điện lạnh Hoàng Long',
    partnerCustomerCode: 'BB-SC-782',
    dueDate: '2026-10-20', // Overdue 7 days
    amount: 1_450_000,
    isPaid: false,
  },
];

export const MOCK_CUSTOMERS: CustomerDebtRecord[] = [
  {
    id: 'cust-01',
    name: 'Đại lý Tạp hóa Hoàng Mai 1',
    phone: '0901 234 567',
    tier: 'VIP',
    currentDebt: 25_000_000,
    creditLimit: 50_000_000,
    oldestDebtDate: '2026-09-12', // 45 days
  },
  {
    id: 'cust-02',
    name: 'Nguyễn Văn Hùng',
    phone: '0912 345 678',
    tier: 'Standard',
    currentDebt: 0,
    creditLimit: 5_000_000,
    oldestDebtDate: '2026-10-27',
  },
  {
    id: 'cust-03',
    name: 'Cửa hàng Tiện lợi Phúc An',
    phone: '0987 654 321',
    tier: 'Gold',
    currentDebt: 32_000_000,
    creditLimit: 30_000_000, // Over limit
    oldestDebtDate: '2026-08-26', // 62 days
  },
  {
    id: 'cust-04',
    name: 'Trần Thị Mai',
    phone: '0934 567 890',
    tier: 'Silver',
    currentDebt: 4_500_000,
    creditLimit: 10_000_000,
    oldestDebtDate: '2026-10-07', // 20 days
  },
  {
    id: 'cust-05',
    name: 'Phạm Minh Tuấn',
    phone: '0978 123 456',
    tier: 'Standard',
    currentDebt: 6_200_000,
    creditLimit: 5_000_000, // Over limit
    oldestDebtDate: '2026-09-22', // 35 days
  },
  {
    id: 'cust-06',
    name: 'Lê Thị Thu Thảo',
    phone: '0965 432 198',
    tier: 'VIP',
    currentDebt: 15_000_000,
    creditLimit: 40_000_000,
    oldestDebtDate: '2026-10-12', // 15 days
  },
];

export const MOCK_PNL_MONTH: PnlSummaryData = {
  grossSales: 580_000_000,
  netSales: 560_860_000,
  cogs: 386_993_400,
  grossProfit: 173_866_600, // 560.860.000 - 386.993.400
  operatingExpenses: 81_324_700,
  shrinkageWarehouse: 6_730_320,
  netProfit: 85_811_580, // 173.866.600 - 81.324.700 - 6.730.320
  totalOrders: 1968,
  averageOrderValue: 284_990,
  netProfitMargin: 0.153, // 15.3%
  opexBreakdown: {
    servicePayables: 24_020_000,
    staffSalaries: 45_000_000,
    utilitiesAndMisc: 12_304_700,
  },
};

export const MOCK_LEDGER_EQUATION = {
  openingBalance: 345_050_000, // D2 adjustment
  receiptsTotal: 16_450_000,
  paymentsTotal: 2_200_000,
  closingBalance: 359_300_000, // 345.050.000 + 16.450.000 - 2.200.000
  totalAssetsWithTransit: 359_300_000, // 348.950.000 (5 funds) + 10.350.000 (transit)
  monthlyGrowthAmount: 14_250_000, // 359.300.000 - 345.050.000
};
