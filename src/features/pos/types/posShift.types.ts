export type CashMovementType = 'IN' | 'OUT' | 1 | 2;
export type CashMovementCategory = 'EXPENSE' | 'CASH_DRAW' | 'CASH_DEPOSIT' | 'DEBT_COLLECT' | 1 | 2 | 3 | 4;
export type CashMovementStatus = 'Recorded' | 'PendingApproval' | 'Rejected' | 'Cancelled' | 1 | 2 | 3 | 4;
export type HandoverStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 1 | 2 | 3;
export type ShiftState = 'Open' | 'Closed' | 'Closing' | 'ForceClosed' | 1 | 2 | 3 | 4;

export const MANUAL_CASH_MOVEMENT_CATEGORY = {
  EXPENSE: 1,
  CASH_DRAW: 2,
  CASH_DEPOSIT: 3,
} as const;

export interface ShiftParticipantDto {
  id: string;
  shiftId: string;
  userId: string;
  userName?: string | null;
  fullName?: string | null;
  joinedAtUtc: string;
  lastActiveAtUtc: string;
}

export interface ShiftCloseConfirmationDto {
  id: string;
  shiftId: string;
  userId: string;
  userName?: string | null;
  confirmedCountedCash: number;
  confirmedAtUtc: string;
}

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
  businessDate?: string | null;
  discrepancyReason?: string | null;
  openedScheduleId?: string | null;
  closedScheduleId?: string | null;
  cashMovements: ShiftCashMovementDto[];
  closingStartedByUserId?: string | null;
  closingStartedAtUtc?: string | null;
  closedByUserId?: string | null;
  forceCloseReason?: string | null;
  participants?: ShiftParticipantDto[];
  closeConfirmations?: ShiftCloseConfirmationDto[];
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
  earlyOrLateReason?: string | null;
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

export interface StartClosingShiftRequest {
  notes?: string | null;
}

export interface CancelClosingShiftRequest {
  reason?: string | null;
}

export interface UpdateCountedCashRequest {
  countedCash: number;
  notes?: string | null;
}

export interface ConfirmCloseShiftRequest {
  actualCashCounted: number;
  retainedFloatAmount: number;
  droppedToSafeAmount: number;
  receiverUserId?: string | null;
  notes?: string | null;
  earlyOrLateReason?: string | null;
  discrepancyReason?: string | null;
}

export interface ForceCloseShiftRequest {
  actualCashCounted: number;
  retainedFloatAmount: number;
  droppedToSafeAmount: number;
  reason: string;
  notes?: string | null;
}

export interface CashierShiftInfo {
  scheduleId?: string | null;
  shiftCode?: string | null;
  shiftName?: string | null;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
}

export interface CashierShiftEligibilityDto {
  isAllowed: boolean;
  isExempt: boolean;
  role?: string | null;
  employeeName?: string | null;
  reason?: string | null;
  activeSchedule?: CashierShiftInfo | null;
  isFullTime?: boolean;
  hasClosedShiftToday?: boolean;
  salaryType?: string | null;
}

export interface BusinessDayFundPreview {
  fundId: string;
  fundName: string;
  fundType: string;
  expectedCash: number;
  requiresPhysicalCount: boolean;
  isInTransit: boolean;
}

export interface BusinessDayFundCount {
  fundId: string;
  actualCashCounted: number;
}

export interface BusinessDayBlocker {
  code: string;
  entityType: string;
  entityId: string;
  displayName: string;
  amount?: number | null;
  status: string;
  actionPath?: string | null;
}

export interface BusinessDayClosingPreview {
  branchId: string;
  businessDate: string;
  periodStartUtc: string;
  periodEndUtc: string;
  totalCashSales: number;
  totalBankSales: number;
  totalCashIn: number;
  totalCashOut: number;
  totalRetainedFloat: number;
  totalDroppedToSafe: number;
  funds: BusinessDayFundPreview[];
  blockers: BusinessDayBlocker[];
  previewToken: string;
}

export interface BusinessDateResponse {
  branchId: string;
  businessDate: string;
  businessDayStartTime: string;
}

export interface BusinessDayClosingVersion {
  id: string;
  branchId: string;
  businessDate: string;
  version: number;
  status: string;
  isActive: boolean;
  supersedesClosingId?: string | null;
  referenceCode: string;
  totalCashSales: number;
  totalBankSales: number;
  totalCashIn: number;
  totalCashOut: number;
  totalDiscrepancy: number;
  closedAtUtc?: string | null;
  reopenedAtUtc?: string | null;
  reopenedByUserId?: string | null;
  reopenReason?: string | null;
}

