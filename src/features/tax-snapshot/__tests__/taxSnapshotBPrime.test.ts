import { describe, it, expect, beforeEach } from 'vitest';
import { taxSnapshotApi, taxAuditLogs } from '../api/taxSnapshotApi';
import {
  TaxPeriodType,
  TaxCalculationMethod,
  HouseholdTaxGroup,
  type CreateTaxSnapshotRequest,
} from '../types/taxSnapshot';
import { getTaxFilingDeadline } from '../../finance/config/taxConfig';

describe('Stage B-Prime: Tax Method Selection, Dynamic Server Mapping, Security PIN & Audit', () => {
  beforeEach(() => {
    taxSnapshotApi.resetSecurityLock();
  });

  describe('1. Dynamic Server Mapping (No Hardcoded Values in Calculations)', () => {
    it('should derive all tax figures dynamically from server DTO response', async () => {
      const summaryQ3 = await taxSnapshotApi.getTaxSummary({
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 3,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
        applyVatReduction2026: false,
      });

      // Assert that figures strictly come from DTO calculations
      expect(summaryQ3.grossRevenueInPeriod).toBeGreaterThan(0);
      expect(summaryQ3.vatAmount).toBe(
        Math.round(summaryQ3.vatTaxableRevenue * (summaryQ3.vatRate / 100))
      );
      expect(summaryQ3.pitAmount).toBe(
        Math.round(summaryQ3.pitTaxableRevenue * (summaryQ3.pitRate / 100))
      );
      expect(summaryQ3.totalTaxAmount).toBe(summaryQ3.vatAmount + summaryQ3.pitAmount);
      expect(summaryQ3.householdGroup).toBe(HouseholdTaxGroup.Group2_1BTo3B);
    });

    it('should dynamically reduce VAT rate to 0.8% when applyVatReduction2026 is true', async () => {
      const summaryWithout = await taxSnapshotApi.getTaxSummary({
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 3,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
        applyVatReduction2026: false,
      });

      const summaryWith = await taxSnapshotApi.getTaxSummary({
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 3,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
        applyVatReduction2026: true,
      });

      expect(summaryWithout.vatRate).toBe(1.0);
      expect(summaryWith.vatRate).toBe(0.8);
      expect(summaryWith.isVatReduced).toBe(true);
      expect(summaryWith.vatAmount).toBeLessThan(summaryWithout.vatAmount);
    });

    it('should support Declaration-based method with period-specific deductible expense reconciliation', async () => {
      // Quý 3 (3 tháng): Chi phí hợp lý = 233.000.000đ
      const summaryDeclarationQ3 = await taxSnapshotApi.getTaxSummary({
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 3,
        calculationMethod: TaxCalculationMethod.DeclarationBased,
        applyVatReduction2026: false,
      });

      expect(summaryDeclarationQ3.calculationMethod).toBe(TaxCalculationMethod.DeclarationBased);
      expect(summaryDeclarationQ3.deductibleExpensesInPeriod).toBe(237_000_000);
      expect(summaryDeclarationQ3.taxableIncomeDeclaration).toBe(
        Math.max(0, summaryDeclarationQ3.taxableRevenueInPeriod - summaryDeclarationQ3.deductibleExpensesInPeriod)
      );

      // Tháng 10 (1 tháng): Chi phí hợp lý = 79.000.000đ (P&L 81.324.700 - 2.324.700)
      const summaryDeclarationM10 = await taxSnapshotApi.getTaxSummary({
        year: 2026,
        periodType: TaxPeriodType.Month,
        periodNumber: 10,
        calculationMethod: TaxCalculationMethod.DeclarationBased,
        applyVatReduction2026: false,
      });
      expect(summaryDeclarationM10.deductibleExpensesInPeriod).toBe(79_000_000);
      expect(summaryDeclarationM10.grossRevenueInPeriod).toBe(560_860_000);
    });

    it('should support Year periodType = 3 for Finance Overview taxDueYtd', async () => {
      const summaryYear = await taxSnapshotApi.getTaxSummary({
        year: 2026,
        periodType: TaxPeriodType.Year,
        periodNumber: 2026,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
      });

      expect(summaryYear.periodType).toBe(TaxPeriodType.Year);
      expect(summaryYear.taxDueYtd).toBeGreaterThan(0);
      expect(summaryYear.annualAccumulatedRevenue).toBe(1_417_500_000);
    });
  });

  describe('2. Deadline Configuration via taxConfig', () => {
    it('should return legally accurate quarter filing deadlines', () => {
      const q3Deadline = getTaxFilingDeadline(2, 3, 2026);
      expect(q3Deadline.displayDeadline).toBe('02/11/2026');
      expect(q3Deadline.originalDeadline).toBe('31/10/2026');
      expect(q3Deadline.isRolledOver).toBe(true);
      expect(q3Deadline.daysRemaining).toBeGreaterThanOrEqual(0);

      const q1Deadline = getTaxFilingDeadline(2, 1, 2026);
      expect(q1Deadline.displayDeadline).toBe('30/04/2026');
    });
  });

  describe('3. Server-side PIN Security & Rate Limiting', () => {
    const validSnapshotRequest: CreateTaxSnapshotRequest = {
      year: 2026,
      periodType: TaxPeriodType.Quarter,
      periodNumber: 3,
      calculationMethod: TaxCalculationMethod.RevenuePercentage,
      applyVatReduction2026: true,
      pin: '1234',
      notes: 'Test finalization with secure PIN',
    };

    it('should successfully finalize snapshot with valid PIN and record audit log', async () => {
      const initialLogsCount = taxAuditLogs.length;
      const snapshot = await taxSnapshotApi.createSnapshot(validSnapshotRequest);

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toContain('snap-2026-p3');
      expect(snapshot.calculationMethod).toBe(TaxCalculationMethod.RevenuePercentage);
      expect(snapshot.applyVatReduction2026).toBe(true);
      expect(taxAuditLogs.length).toBeGreaterThan(initialLogsCount);

      const latestLog = taxAuditLogs[taxAuditLogs.length - 1];
      expect(latestLog.status).toBe('SUCCESS');
      expect(latestLog.applyVatReduction2026).toBe(true);
    });

    it('should reject invalid PIN and lock out after 5 consecutive failures', async () => {
      const invalidRequest: CreateTaxSnapshotRequest = {
        ...validSnapshotRequest,
        pin: '9999',
      };

      // 4 wrong attempts
      for (let i = 0; i < 4; i++) {
        await expect(taxSnapshotApi.createSnapshot(invalidRequest)).rejects.toThrow(
          /Mã PIN xác thực không chính xác/
        );
      }

      // 5th wrong attempt should trigger lockout
      await expect(taxSnapshotApi.createSnapshot(invalidRequest)).rejects.toThrow(
        /Nhập sai mã PIN quá 5 lần/
      );

      // Subsequent attempt with even correct PIN should be blocked while locked
      await expect(taxSnapshotApi.createSnapshot(validSnapshotRequest)).rejects.toThrow(
        /Tài khoản đã bị tạm khóa/
      );
    });
  });

  describe('4. Banned Strings & Code Conventions Lint Test', () => {
    const taxModules = import.meta.glob(
      '../components/*.tsx',
      { query: '?raw', import: 'default', eager: true }
    );

    const bannedPhrases = [
      'poka-yoke',
      'Poka-yoke',
      'POKA-YOKE',
      'GIẢM 20%', // Must be lowercase 'Giảm 20%'
      'Biểu thuế lũy tiến 15%–20%',
    ];

    it('should scan components to ensure no banned strings exist in user-facing JSX', () => {
      Object.entries(taxModules).forEach(([filePath, content]) => {
        const text = typeof content === 'string' ? content : '';
        for (const phrase of bannedPhrases) {
          expect(
            text.includes(phrase),
            `File ${filePath} contains banned string: "${phrase}". Please replace with approved terminology.`
          ).toBe(false);
        }
      });
    });

    it('should set isThresholdCrossedMidYear and provide neutral advisory note when revenue crosses 1B in period', async () => {
      const summaryQ3 = await taxSnapshotApi.getTaxSummary({
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 3,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
      });

      expect(summaryQ3.isThresholdCrossedMidYear).toBe(true);
      expect(summaryQ3.thresholdExceededNote).toBeDefined();
      expect(summaryQ3.thresholdExceededNote).toContain('tham vấn cơ quan thuế địa bàn');
      expect(summaryQ3.thresholdExceededNote).not.toContain('nộp bổ sung');
    });
  });
});

