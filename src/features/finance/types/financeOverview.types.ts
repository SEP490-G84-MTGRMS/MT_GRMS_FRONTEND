export type FinancePeriodPreset =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface FinanceOverviewFilter {
  branchId: string | 'ALL';
  preset: FinancePeriodPreset;
  startDate: string;
  endDate: string;
}

export interface FinanceOverviewPeriodDto {
  fromUtc: string;
  toUtc: string;
  timeZone: string;
}

export interface FinanceOverviewScopeDto {
  branchId: string | null;
  branchName: string;
  branchCount: number;
}

export interface FinanceAttentionDto {
  receivableAmount: number;
  debtorCount: number;
  pendingPayableAmount: number;
  pendingPayableCount: number;
  cashInTransit: number;
  pendingCashMovementCount: number;
  isCurrentSnapshot: boolean;
}

export interface BranchCashHealthDto {
  branchId: string;
  branchCode: string;
  branchName: string;
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  internalTransferNet: number;
  closingBalance: number;
  cashAtRegisters: number;
  safeDeposit: number;
  cashInTransit: number;
  receivableAmount: number;
  pendingPayableAmount: number;
  pendingPayableCount: number;
  status: 'HEALTHY' | 'ATTENTION' | 'HISTORICAL_CASH_ONLY';
}

export interface FinanceOverviewTotalsDto {
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  internalTransferNet: number;
  closingBalance: number;
  availableCash: number;
  cashAtRegisters: number;
  safeDeposit: number;
  bankBalance: number;
  unallocatedBankBalance: number;
  cashInTransit: number;
}

export interface FinanceOverviewResponse {
  scope: FinanceOverviewScopeDto;
  period: FinanceOverviewPeriodDto;
  positionAsOfUtc: string;
  generatedAtUtc: string;
  totals: FinanceOverviewTotalsDto;
  attention: FinanceAttentionDto;
  branches: BranchCashHealthDto[];
}
