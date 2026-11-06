export type CashMovementType = 'IN' | 'OUT' | 1 | 2;
export type CashMovementCategory = 'EXPENSE' | 'CASH_DRAW' | 'CASH_DEPOSIT' | 'DEBT_COLLECT' | 1 | 2 | 3 | 4;
export type CashMovementStatus = 'Recorded' | 'PendingApproval' | 'Rejected' | 'Cancelled' | 1 | 2 | 3 | 4;
export type HandoverStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 1 | 2 | 3;
export type ShiftState = 'Open' | 'Closed' | 'Closing' | 'ForceClosed' | 1 | 2 | 3 | 4;

export interface ShiftCashMovementDto {
  id: string;
  shiftId: string;
  movementType: CashMovementType;
  category: CashMovementCategory;
  amount: number;
  reason: string;
  createdByName?: string | null;
  occurredAtUtc: string;
  status: CashMovementStatus;
  approvedBy?: string | null;
  approvedAtUtc?: string | null;
  rejectionReason?: string | null;
  isConfirmedByOwner: boolean;
  confirmedByOwnerAtUtc?: string | null;
}

export interface ShiftDetailResponse {
  id: string;
  tenantId: string;
  branchId: string;
  branchName?: string | null;
  tillId: string;
  shiftCode: string;
  shiftName: string;
  cashierUserId: string;
  receiverUserId?: string | null;
  prevShiftId?: string | null;
  openedAtUtc: string;
  closedAtUtc?: string | null;
  openingFloatExpected: number;
  openingFloat: number;
  openingDiscrepancy: number;
  totalCashIn: number;
  totalCashOut: number;
  totalBankRevenue: number;
  totalOrdersCount: number;
  expectedCash: number;
  actualCashCounted?: number | null;
  discrepancy?: number | null;
  retainedFloatAmount: number;
  droppedToSafeAmount: number;
  handoverStatus: HandoverStatus;
  status: ShiftState;
  notes?: string | null;
  cashMovements: ShiftCashMovementDto[];
}

export interface OpenShiftRequest {
  branchId: string;
  tillId: string;
  shiftName: string;
  openingFloat: number;
  notes?: string | null;
}

export interface CashMovementRequest {
  movementType: 1 | 2; // 1 = IN, 2 = OUT
  category: 1 | 2 | 3 | 4; // 1 = EXPENSE, 2 = CASH_DRAW, 3 = CASH_DEPOSIT, 4 = DEBT_COLLECT
  amount: number;
  reason: string;
  createdByName?: string | null;
}

export interface CloseShiftRequest {
  actualCashCounted: number;
  retainedFloatAmount: number;
  droppedToSafeAmount: number;
  receiverUserId?: string | null;
  notes?: string | null;
}

export interface ConfirmHandoverRequest {
  status: 2 | 3; // 2 = CONFIRMED, 3 = DISPUTED
  disputeReason?: string | null;
}

export interface ZReportResponse {
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  branchId: string;
  branchName?: string | null;
  tillId: string;
  openedAtUtc: string;
  closedAtUtc?: string | null;
  openingFloat: number;
  cashSales: number;
  totalCashIn: number;
  totalCashOut: number;
  totalBankRevenue: number;
  totalOrdersCount: number;
  expectedCashInTill: number;
  actualCashCounted?: number | null;
  discrepancy?: number | null;
  retainedFloatAmount: number;
  droppedToSafeAmount: number;
  handoverStatus: HandoverStatus;
  receiverUserId?: string | null;
  notes?: string | null;
  cashMovements: ShiftCashMovementDto[];
}

export interface CashMovementSettingsDto {
  cashOutApprovalThreshold: number;
  cashOutShiftTotalLimit: number;
}

export interface UpdateCashMovementSettingsRequest {
  cashOutApprovalThreshold: number;
  cashOutShiftTotalLimit: number;
}

export interface PendingMovementsSummaryResponse {
  pendingApprovalsCount: number;
  unconfirmedDropsCount: number;
  movements: ShiftCashMovementDto[];
}

