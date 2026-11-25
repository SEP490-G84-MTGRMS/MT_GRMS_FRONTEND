import { financeHttpClient, type EnhancedAxiosError } from '../../../api/financeHttpClient';
import { generateUuidV7 } from '../../../utils/uuid';
import { TaxPeriodType, TaxCalculationMethod, HouseholdTaxGroup, AccountingBookType } from '../types/taxSnapshot';
import type {
  HouseholdTaxFilterDto,
  HouseholdTaxSummaryDto,
  AccountingBookEntryDto,
  CreateTaxSnapshotRequest,
  HouseholdTaxSnapshotDto,
  ChangeSecurityPinRequest,
  ResetSecurityPinRequest,
  HouseholdTaxDeclarationPreviewDto,
} from '../types/taxSnapshot';

// ASP.NET serializes enums as names; components use the numeric domain constants.
function normalizeTaxDto<T extends object>(dto: T): T {
  if (dto == null || typeof dto !== 'object' || Array.isArray(dto))
    throw new Error('Máy chủ trả về dữ liệu thuế không hợp lệ.');
  const normalized = { ...dto } as Record<string, unknown>;
  const fields = { periodType: TaxPeriodType, calculationMethod: TaxCalculationMethod,
    appliedPitMethod: TaxCalculationMethod, householdGroup: HouseholdTaxGroup, bookType: AccountingBookType };
  for (const [field, values] of Object.entries(fields)) {
    const value = normalized[field];
    if (value == null) continue;
    const options: Record<string, number> = values;
    if (typeof value === 'number' && Object.values(options).includes(value)) continue;
    if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(options, value))
      throw new Error(`Máy chủ trả về giá trị ${field} không hợp lệ.`);
    normalized[field] = options[value];
  }
  return normalized as T;
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
  async getFilingConfirmation(snapshotId: string, signal?: AbortSignal): Promise<string | null> {
    const response = await financeHttpClient.get<{ data: { confirmedAtUtc: string | null } }>(
      `/tax/household/snapshots/${encodeURIComponent(snapshotId)}/filing-confirmation`, { signal },
    );
    return response.data.data.confirmedAtUtc;
  },

  async confirmFiling(snapshotId: string, signal?: AbortSignal): Promise<string> {
    const response = await financeHttpClient.put<{ data: { confirmedAtUtc: string } }>(
      `/tax/household/snapshots/${encodeURIComponent(snapshotId)}/filing-confirmation`, null, { signal },
    );
    return response.data.data.confirmedAtUtc;
  },

  async getSnapshot(id: string, signal?: AbortSignal): Promise<HouseholdTaxSnapshotDto> {
    const response = await financeHttpClient.get<{ data: HouseholdTaxSnapshotDto }>(
      `/tax/household/snapshots/${encodeURIComponent(id)}`, { signal },
    );
    if (!response.data?.data) throw new Error('Không tìm thấy hồ sơ chốt kỳ.');
    return normalizeTaxDto(response.data.data);
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
          method: filter.calculationMethod,
          calculationMethod: filter.calculationMethod,
          tier2Method: filter.tier2Method,
          applyVatReduction: filter.applyVatReduction2026,
          vatReductionPercentage: filter.vatReductionPercentage,
          customVatRate: filter.customVatRate,
          customPitRate: filter.customPitRate,
        },
      });

      if (res.data?.success !== false && res.data?.data && typeof res.data.data.year === 'number' && typeof res.data.data.totalTaxAmount === 'number') {
        return normalizeTaxDto(res.data.data);
      }
      throw new Error('Máy chủ trả về dữ liệu tổng hợp thuế không hợp lệ.');
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể tải dữ liệu tổng hợp thuế.'));
    }
  },

  async getDeclarationPreview(filter: HouseholdTaxFilterDto): Promise<HouseholdTaxDeclarationPreviewDto> {
    const res = await financeHttpClient.get<{ data: HouseholdTaxDeclarationPreviewDto }>(
      '/tax/household/declarations/01-cnkd/preview',
      {
        params: {
          year: filter.year,
          periodType: filter.periodType,
          periodNumber: filter.periodNumber,
          branchId: filter.branchId,
          calculationMethod: filter.calculationMethod,
          tier2Method: filter.tier2Method,
          applyVatReduction: filter.applyVatReduction2026,
          vatReductionPercentage: filter.vatReductionPercentage,
          customVatRate: filter.customVatRate,
          customPitRate: filter.customPitRate,
        },
      }
    );
    return normalizeTaxDto(res.data.data);
  },

  async exportDeclarationXml(snapshotId: string): Promise<Blob> {
    const res = await financeHttpClient.get(
      `/tax/household/snapshots/${snapshotId}/declaration-xml`,
      { responseType: 'blob' }
    );
    return res.data;
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

      if (res.data?.success !== false && Array.isArray(res.data?.data)) {
        return res.data.data.map(normalizeTaxDto);
      }
      throw new Error('Máy chủ trả về sổ kế toán không hợp lệ.');
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể tải sổ kế toán từ máy chủ.'));
    }
  },

  /**
   * Lấy danh sách lịch sử các kỳ thuế đã chốt ký số (Snapshots)
   */
  async getSnapshots(year?: number, branchId?: string): Promise<HouseholdTaxSnapshotDto[]> {
    try {
      const res = await financeHttpClient.get<{ data: HouseholdTaxSnapshotDto[]; success: boolean }>('/tax/household/snapshots', {
        params: { year, branchId },
      });

      if (res.data?.success !== false && Array.isArray(res.data?.data)) {
        return res.data.data.map(normalizeTaxDto);
      }
      throw new Error('Máy chủ trả về lịch sử chốt kỳ không hợp lệ.');
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể tải lịch sử kỳ tính thuế từ máy chủ.'));
    }
  },

  /**
   * Thực hiện chốt sổ ký số kỳ tính thuế (Finalize Snapshot)
   * Xác thực PIN và khóa kỳ được thực hiện tại backend.
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
      vatReductionPercentage: req.vatReductionPercentage ?? null,
      customVatRate: req.customVatRate ?? null,
      customPitRate: req.customPitRate ?? null,
      confirmEstimatedCogsResponsible: Boolean(req.confirmEstimatedCogsResponsible),
      estimatedCogsConfirmationStatement: req.estimatedCogsConfirmationStatement || null,
      notes: req.notes || null,
      allowSupersedeExisting: Boolean(req.allowSupersedeExisting),
      rectificationReason: req.rectificationReason || null,
    };

    try {
      // 1. Luôn ưu tiên gọi Backend thật (Kèm Idempotency-Key chống trùng lặp giao dịch)
      const res = await financeHttpClient.post<{ data: HouseholdTaxSnapshotDto; success: boolean; message?: string }>(
        '/tax/household/snapshots',
        backendPayload,
        {
          headers: {
            'Idempotency-Key': generateUuidV7(),
          },
        }
      );

      if (res.data?.data) {
        return normalizeTaxDto(res.data.data);
      }
      throw new Error(res.data?.message || 'Không thể tạo bản chốt kỳ tính thuế.');
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể chốt kỳ thuế.'));
    }
  },

  /**
   * Xuất báo cáo thuế và sổ kế toán Thông tư 152/2025/TT-BTC (Excel .xlsx)
   * Nếu truyền bookType thì chỉ xuất sổ đó, nếu không truyền sẽ xuất trọn bộ 7 sổ.
   */
  async exportTaxExcel(filter: HouseholdTaxFilterDto, bookType?: AccountingBookType): Promise<Blob> {
    const effectiveBookType = bookType ?? filter.bookType;
    const res = await financeHttpClient.get('/tax/household/export-excel', {
      params: {
        year: filter.year,
        periodType: filter.periodType,
        periodNumber: filter.periodNumber,
        branchId: filter.branchId,
        bookType: effectiveBookType,
        method: filter.calculationMethod,
        calculationMethod: filter.calculationMethod,
        tier2Method: filter.tier2Method,
        applyVatReduction: filter.applyVatReduction2026,
        vatReductionPercentage: filter.vatReductionPercentage,
        customVatRate: filter.customVatRate,
        customPitRate: filter.customPitRate,
      },
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Đổi mã PIN bảo mật (yêu cầu mã PIN hiện tại hoặc mật khẩu tài khoản)
   */
  async changeSecurityPin(req: ChangeSecurityPinRequest): Promise<void> {
    try {
      await financeHttpClient.post('/tax/household/pin/change', {
        currentPin: req.currentPin || null,
        currentPassword: req.password || null,
        newPin: req.newPin,
        confirmNewPin: req.confirmNewPin,
      });
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể đổi mã PIN bảo mật.'));
    }
  },

  /**
   * Khôi phục / Thiết lập lại mã PIN bảo mật bằng mật khẩu tài khoản
   */
  async resetSecurityPin(req: ResetSecurityPinRequest): Promise<void> {
    try {
      await financeHttpClient.post('/tax/household/pin/reset', {
        password: req.password,
        newPin: req.newPin,
        confirmNewPin: req.confirmNewPin,
      });
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể đặt lại mã PIN bảo mật.'));
    }
  },

  /**
   * Kiểm tra tính toàn vẹn và chữ ký số bất biến HMAC-SHA256 của snapshot
   */
  async verifyIntegrity(snapshotId: string): Promise<{ isIntegrityValid: boolean; message: string; snapshotId?: string }> {
    try {
      const res = await financeHttpClient.get<{
        data: { snapshotId?: string; isIntegrityValid: boolean };
        message?: string;
      }>(`/tax/household/snapshots/${snapshotId}/verify-integrity`);
      return {
        snapshotId: res.data?.data?.snapshotId || snapshotId,
        isIntegrityValid: Boolean(res.data?.data?.isIntegrityValid),
        message: res.data?.message || 'Kiểm tra chữ ký số HMAC-SHA256 hoàn tất.',
      };
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể kiểm tra tính toàn vẹn của snapshot.'));
    }
  },
};
