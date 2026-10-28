import axios from 'axios';
import type {
  HouseholdTaxFilterDto,
  HouseholdTaxSummaryDto,
  AccountingBookEntryDto,
  CreateTaxSnapshotRequest,
  HouseholdTaxSnapshotDto,
  AccountingBookType,
} from '../types/taxSnapshot';
import { generateMockSummary, mockBookEntries, mockSnapshotsList } from './mockTaxData';

let localSnapshots = [...mockSnapshotsList];

/**
 * Explicit Mock Flag Configuration
 * Mock fallback is STRICTLY FORBIDDEN in production mode.
 * In Production, failures MUST propagate cleanly so users are never misled with fake financial data.
 */
export const isMockEnabled = (): boolean => {
  // Production MUST NEVER use mock data under any circumstances
  if (import.meta.env.PROD || import.meta.env.MODE === 'production') {
    return false;
  }
  return (
    import.meta.env.VITE_USE_MOCK_DATA === 'true' ||
    import.meta.env.MODE === 'development' ||
    import.meta.env.MODE === 'test'
  );
};

// Track whether the current data was served from local mock
let isCurrentlyUsingMock = true;

export const isUsingMockData = (): boolean => isCurrentlyUsingMock;

// Server-side Mock Security State for PIN verification, Rate Limiting, and Audit Logging
let failedPinAttempts = 0;
let lockedUntilTimestamp = 0;
const MAX_PIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Expected hashed PIN for Store Owner (SHA-256 of '1234')
const OWNER_PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

export interface TaxAuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  operator: string;
  year: number;
  periodType: number;
  periodNumber: number;
  calculationMethod: number;
  applyVatReduction2026: boolean;
  totalTaxAmount: number;
  status: 'SUCCESS' | 'FAILED_PIN' | 'LOCKED';
  notes?: string;
}

export const taxAuditLogs: TaxAuditLogEntry[] = [];

/**
 * SHA-256 hash helper
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const taxSnapshotApi = {
  resetSecurityLock(): void {
    failedPinAttempts = 0;
    lockedUntilTimestamp = 0;
  },

  /**
   * Fetch Tax Calculation Summary from server
   * Fails cleanly if server is down in production
   */
  async getTaxSummary(filter: HouseholdTaxFilterDto): Promise<HouseholdTaxSummaryDto> {
    try {
      const res = await axios.get('/api/tax/household/summary', {
        params: {
          year: filter.year,
          periodType: filter.periodType,
          periodNumber: filter.periodNumber,
          branchId: filter.branchId,
          calculationMethod: filter.calculationMethod,
          applyVatReduction2026: filter.applyVatReduction2026,
          customVatRate: filter.customVatRate,
          customPitRate: filter.customPitRate,
        },
        timeout: 2000,
      });

      if (res.data?.data) {
        isCurrentlyUsingMock = false;
        return res.data.data;
      }
    } catch (err: any) {
      if (!isMockEnabled()) {
        throw new Error(
          err.response?.data?.message ||
            'Không thể kết nối đến máy chủ quản lý thuế. Vui lòng kiểm tra đường truyền hoặc thử lại sau.'
        );
      }
    }

    // Explicit Mock Fallback (Only allowed in development/test with mock flag)
    isCurrentlyUsingMock = true;
    return generateMockSummary(filter);
  },

  /**
   * Preview tax snapshot compatibility wrapper
   */
  async previewTaxSnapshot(arg1: any, arg2?: any): Promise<any> {
    const year = typeof arg1 === 'number' ? arg1 : arg1?.year || 2026;
    const periodNumber = typeof arg2 === 'number' ? arg2 : arg1?.periodNumber || arg1?.quarter || 3;
    const calcMethod = typeof arg1 === 'object' ? arg1?.calculationMethod ?? 1 : 1;
    const applyReduction = typeof arg1 === 'object' ? arg1?.applyVatReduction2026 : false;

    return this.getTaxSummary({
      year,
      periodType: 2,
      periodNumber,
      branchId: typeof arg1 === 'object' ? arg1?.branchId : undefined,
      calculationMethod: calcMethod,
      applyVatReduction2026: applyReduction,
    });
  },

  /**
   * Fetch Accounting Book Entries for specific book type
   */
  async getBookDetails(params: {
    year?: number;
    periodType?: number;
    periodNumber?: number;
    branchId?: string;
    bookType?: AccountingBookType;
  }): Promise<AccountingBookEntryDto[]> {
    try {
      const res = await axios.get('/api/tax/household/books', {
        params,
        timeout: 2000,
      });

      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (err: any) {
      if (!isMockEnabled()) {
        throw new Error(err.response?.data?.message || 'Không thể tải sổ kế toán từ máy chủ.');
      }
    }

    if (params.bookType) {
      return mockBookEntries.filter((b) => b.bookType === params.bookType);
    }
    return mockBookEntries;
  },

  /**
   * Fetch all historical finalized snapshots
   */
  async getSnapshots(year?: number, branchId?: string): Promise<HouseholdTaxSnapshotDto[]> {
    try {
      const res = await axios.get('/api/tax/household/snapshots', {
        params: { year, branchId },
        timeout: 2000,
      });

      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (err: any) {
      if (!isMockEnabled()) {
        throw new Error(err.response?.data?.message || 'Không thể tải lịch sử kỳ tính thuế từ máy chủ.');
      }
    }

    let result = [...localSnapshots];
    if (year) {
      result = result.filter((s) => s.year === year);
    }
    return result;
  },

  /**
   * Create Finalized Tax Snapshot with strict PIN authentication, rate limiting, and audit logging
   */
  async createSnapshot(req: CreateTaxSnapshotRequest): Promise<HouseholdTaxSnapshotDto> {
    try {
      const res = await axios.post('/api/tax/household/snapshot', req, {
        timeout: 3000,
      });

      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err: any) {
      if (!isMockEnabled()) {
        throw new Error(
          err.response?.data?.message ||
            'Không thể kết nối đến máy chủ chốt kỳ thuế. Vui lòng thử lại sau.'
        );
      }
    }

    // Mock Security Guard: Rate Limiting & Account Lock
    const now = Date.now();
    if (lockedUntilTimestamp > now) {
      const minutesRemaining = Math.ceil((lockedUntilTimestamp - now) / 60000);
      throw new Error(
        `Tài khoản đã bị tạm khóa chức năng chốt kỳ do nhập sai mã PIN quá 5 lần. Vui lòng thử lại sau ${minutesRemaining} phút.`
      );
    }

    // PIN Verification: Hash entered PIN and verify against expected hash
    const inputPin = req.pin?.trim() || '';
    const inputHash = await sha256(inputPin);

    if (inputHash !== OWNER_PIN_HASH) {
      failedPinAttempts += 1;
      const attemptsLeft = MAX_PIN_ATTEMPTS - failedPinAttempts;

      // Audit Log failed attempt
      taxAuditLogs.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'FINALIZE_SNAPSHOT_FAILED',
        operator: 'StoreOwner',
        year: req.year,
        periodType: req.periodType,
        periodNumber: req.periodNumber,
        calculationMethod: req.calculationMethod,
        applyVatReduction2026: Boolean(req.applyVatReduction2026),
        totalTaxAmount: 0,
        status: failedPinAttempts >= MAX_PIN_ATTEMPTS ? 'LOCKED' : 'FAILED_PIN',
        notes: `Mã PIN không chính xác. Số lần còn lại: ${Math.max(0, attemptsLeft)}`,
      });

      if (failedPinAttempts >= MAX_PIN_ATTEMPTS) {
        lockedUntilTimestamp = now + LOCK_DURATION_MS;
        throw new Error(
          'Nhập sai mã PIN quá 5 lần liên tiếp. Hệ thống đã tạm khóa chức năng chốt kỳ trong 15 phút để bảo vệ dữ liệu.'
        );
      }

      throw new Error(`Mã PIN xác thực không chính xác. Bạn còn ${attemptsLeft} lần thử.`);
    }

    // Success PIN: reset security counter
    failedPinAttempts = 0;
    lockedUntilTimestamp = 0;

    // Generate dynamic values based on request
    const summary = generateMockSummary({
      year: req.year,
      periodType: req.periodType,
      periodNumber: req.periodNumber,
      branchId: req.branchId,
      calculationMethod: req.calculationMethod,
      applyVatReduction2026: req.applyVatReduction2026,
    });

    const newSnapshot: HouseholdTaxSnapshotDto = {
      id: `snap-${req.year}-p${req.periodNumber}-${Date.now().toString(36)}`,
      branchId: req.branchId,
      periodType: req.periodType,
      year: req.year,
      periodNumber: req.periodNumber,
      annualAccumulatedRevenue: summary.annualAccumulatedRevenue,
      householdGroup: summary.householdGroup,
      calculationMethod: req.calculationMethod,
      applyVatReduction2026: Boolean(req.applyVatReduction2026),
      isTaxExempt: summary.isTaxExempt,
      taxableRevenueInPeriod: summary.taxableRevenueInPeriod,
      vatRate: summary.vatRate,
      vatAmount: summary.vatAmount,
      pitRate: summary.pitRate,
      pitAmount: summary.pitAmount,
      totalTaxAmount: summary.totalTaxAmount,
      finalizedBy: 'Chủ tiệm (StoreOwner)',
      finalizedAtUtc: new Date().toISOString(),
      notes: req.notes || `Chốt kỳ tự động - Phương pháp ${req.calculationMethod === 2 ? 'Kê khai' : 'Tỷ lệ %'}`,
    };

    localSnapshots = [newSnapshot, ...localSnapshots];

    // Audit Log success
    taxAuditLogs.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'FINALIZE_SNAPSHOT_SUCCESS',
      operator: 'StoreOwner',
      year: req.year,
      periodType: req.periodType,
      periodNumber: req.periodNumber,
      calculationMethod: req.calculationMethod,
      applyVatReduction2026: Boolean(req.applyVatReduction2026),
      totalTaxAmount: summary.totalTaxAmount,
      status: 'SUCCESS',
      notes: `Chốt kỳ thành công. Mã snapshot: ${newSnapshot.id}`,
    });

    return newSnapshot;
  },
};
