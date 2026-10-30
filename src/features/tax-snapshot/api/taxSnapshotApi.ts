import { financeHttpClient, type EnhancedAxiosError } from '../../../api/financeHttpClient';
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
 * Cấu hình chế độ Mock dữ liệu:
 * - Production: TUYỆT ĐỐI KHÔNG DÙNG MOCK (luôn trả về false).
 * - Vitest Unit Test / Explicit Flag: Cho phép mock để CI runner chạy độc lập mà không cần live database.
 */
export const isMockEnabled = (): boolean => {
  if (import.meta.env.PROD || import.meta.env.MODE === 'production') {
    return false;
  }
  return (
    import.meta.env.VITE_USE_MOCK_DATA === 'true' ||
    import.meta.env.MODE === 'test'
  );
};

// Theo dõi nguồn dữ liệu hiện tại (thật từ Backend hay Mock)
let isCurrentlyUsingMock = false;

export const isUsingMockData = (): boolean => isCurrentlyUsingMock;

// Mock Security State cho Unit Test Runner
let failedPinAttempts = 0;
let lockedUntilTimestamp = 0;
const MAX_PIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 phút

// Expected hashed PIN cho Unit Test Runner (SHA-256 của '1234')
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
 * SHA-256 helper cho Unit Test Runner
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface BackendResponsePayload {
  success?: boolean;
  message?: string;
  errorCode?: string;
  data?: unknown;
}

function extractErrorMessage(err: unknown, defaultMsg: string): string {
  const enhancedError = err as EnhancedAxiosError;
  const data = enhancedError.response?.data as BackendResponsePayload | undefined;
  return (
    enhancedError.vietnameseMessage ||
    data?.message ||
    (err instanceof Error ? err.message : defaultMsg)
  );
}

export const taxSnapshotApi = {
  resetSecurityLock(): void {
    failedPinAttempts = 0;
    lockedUntilTimestamp = 0;
  },

  /**
   * Lấy dữ liệu tổng hợp tính thuế hộ kinh doanh (Thông tư 152/2025/TT-BTC) từ Backend
   */
  async getTaxSummary(filter: HouseholdTaxFilterDto): Promise<HouseholdTaxSummaryDto> {
    try {
      const res = await financeHttpClient.get<{ data: HouseholdTaxSummaryDto; success: boolean }>('/tax/household/summary', {
        params: {
          year: filter.year,
          periodType: filter.periodType,
          periodNumber: filter.periodNumber,
          branchId: filter.branchId,
          calculationMethod: filter.calculationMethod,
          tier2Method: filter.tier2Method,
          applyVatReduction: filter.applyVatReduction2026,
          customVatRate: filter.customVatRate,
          customPitRate: filter.customPitRate,
        },
      });

      if (res.data?.data) {
        isCurrentlyUsingMock = false;
        return res.data.data;
      }
    } catch (err: unknown) {
      if (!isMockEnabled()) {
        throw new Error(
          extractErrorMessage(
            err,
            'Không thể kết nối đến máy chủ quản lý thuế. Vui lòng kiểm tra đường truyền hoặc thử lại sau.'
          )
        );
      }
    }

    // Mock Fallback cho Unit Test Runner
    isCurrentlyUsingMock = true;
    return generateMockSummary(filter);
  },

  /**
   * Wrapper hỗ trợ xem trước bảng tính thuế
   */
  async previewTaxSnapshot(arg1: any, arg2?: any): Promise<HouseholdTaxSummaryDto> {
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
   * Lấy chi tiết các sổ kế toán thuế (S1a, S2a, S2b, S2c, S2d, S2e, S3a)
   */
  async getBookDetails(params: {
    year?: number;
    periodType?: number;
    periodNumber?: number;
    branchId?: string;
    bookType?: AccountingBookType;
  }): Promise<AccountingBookEntryDto[]> {
    try {
      const res = await financeHttpClient.get<{ data: AccountingBookEntryDto[]; success: boolean }>('/tax/household/books', {
        params,
      });

      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (err: unknown) {
      if (!isMockEnabled()) {
        throw new Error(extractErrorMessage(err, 'Không thể tải sổ kế toán từ máy chủ.'));
      }
    }

    if (params.bookType) {
      return mockBookEntries.filter((b) => b.bookType === params.bookType);
    }
    return mockBookEntries;
  },

  /**
   * Lấy danh sách lịch sử các kỳ thuế đã chốt ký số (Snapshots)
   */
  async getSnapshots(year?: number, branchId?: string): Promise<HouseholdTaxSnapshotDto[]> {
    try {
      const res = await financeHttpClient.get<{ data: HouseholdTaxSnapshotDto[]; success: boolean }>('/tax/household/snapshots', {
        params: { year, branchId },
      });

      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (err: unknown) {
      if (!isMockEnabled()) {
        throw new Error(extractErrorMessage(err, 'Không thể tải lịch sử kỳ tính thuế từ máy chủ.'));
      }
    }

    let result = [...localSnapshots];
    if (year) {
      result = result.filter((s) => s.year === year);
    }
    return result;
  },

  /**
   * Thực hiện chốt sổ ký số kỳ tính thuế (Finalize Snapshot)
   * Trong runtime: Gọi Backend thật POST /api/tax/household/snapshots (xác thực PBKDF2 và khóa 15 phút).
   * Trong Vitest Runner: Chạy mock security guard để kiểm thử logic rate limiting độc lập.
   */
  async createSnapshot(req: CreateTaxSnapshotRequest): Promise<HouseholdTaxSnapshotDto> {
    const backendPayload = {
      year: req.year,
      periodType: req.periodType,
      periodNumber: req.periodNumber,
      branchId: req.branchId || null,
      calculationMethod: req.calculationMethod,
      tier2Method: req.tier2Method || 'REVENUE_EXCESS',
      securityPin: req.pin, // Đồng bộ trường PIN sang SecurityPin của Backend
      applyVatReduction2026: Boolean(req.applyVatReduction2026),
      confirmEstimatedCogsResponsible: Boolean(req.confirmEstimatedCogsResponsible),
      estimatedCogsConfirmationStatement: req.estimatedCogsConfirmationStatement || null,
      notes: req.notes || null,
    };

    try {
      // 1. Luôn ưu tiên gọi Backend thật
      const res = await financeHttpClient.post<{ data: HouseholdTaxSnapshotDto; success: boolean; message?: string }>(
        '/tax/household/snapshots',
        backendPayload
      );

      if (res.data?.data) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Không thể tạo bản chốt kỳ tính thuế.');
    } catch (err: unknown) {
      // 2. Nếu không bật chế độ mock (runtime thông thường), ném lỗi thật từ Backend
      if (!isMockEnabled()) {
        const errorMsg = extractErrorMessage(
          err,
          'Không thể kết nối đến máy chủ chốt kỳ thuế. Vui lòng kiểm tra mã PIN hoặc thử lại sau.'
        );
        throw new Error(errorMsg);
      }
    }

    // 3. Mock Security Guard cho Vitest Test Runner
    const now = Date.now();
    if (lockedUntilTimestamp > now) {
      const minutesRemaining = Math.ceil((lockedUntilTimestamp - now) / 60000);
      throw new Error(
        `Tài khoản đã bị tạm khóa chức năng chốt kỳ do nhập sai mã PIN quá 5 lần. Vui lòng thử lại sau ${minutesRemaining} phút.`
      );
    }

    const inputPin = req.pin?.trim() || '';
    const inputHash = await sha256(inputPin);

    if (inputHash !== OWNER_PIN_HASH) {
      failedPinAttempts += 1;
      const attemptsLeft = MAX_PIN_ATTEMPTS - failedPinAttempts;

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

    // PIN hợp lệ trong Test Runner
    failedPinAttempts = 0;
    lockedUntilTimestamp = 0;

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

  /**
   * Kiểm tra tính toàn vẹn và chữ ký số bất biến của snapshot
   */
  async verifyIntegrity(snapshotId: string): Promise<{ isIntegrityValid: boolean; message: string }> {
    try {
      const res = await financeHttpClient.get<{ data: { isIntegrityValid: boolean }; message?: string }>(
        `/tax/household/snapshots/${snapshotId}/verify-integrity`
      );
      return {
        isIntegrityValid: Boolean(res.data?.data?.isIntegrityValid),
        message: res.data?.message || 'Kiểm tra chữ ký số hoàn tất.',
      };
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể kiểm tra tính toàn vẹn của snapshot.'));
    }
  },
};
