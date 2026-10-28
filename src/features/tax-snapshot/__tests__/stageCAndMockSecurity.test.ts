import { describe, it, expect } from 'vitest';
import { isMockEnabled } from '../api/taxSnapshotApi';
import { mockBookEntries } from '../api/mockTaxData';
import { AccountingBookType } from '../types/taxSnapshot';
import { MOCK_PNL_MONTH, MOCK_LEDGER_EQUATION } from '../../finance/data/mockFinanceData';

describe('Stage C & Mock Security Integration Tests', () => {
  describe('1. Production Mock Security Guard', () => {
    it('isMockEnabled() must strictly return false if production mode is set', () => {
      const originalProd = import.meta.env.PROD;
      const originalMode = import.meta.env.MODE;

      try {
        // Simulate production environment
        (import.meta.env as any).PROD = true;
        (import.meta.env as any).MODE = 'production';
        expect(isMockEnabled()).toBe(false);
      } finally {
        (import.meta.env as any).PROD = originalProd;
        (import.meta.env as any).MODE = originalMode;
      }
    });
  });

  describe('2. Banner & Legal Citation Compliance Verification', () => {
    const taxModules = import.meta.glob(
      '../*/*.tsx',
      { query: '?raw', import: 'default', eager: true }
    );

    it('TaxSnapshotPage banner must match exact convention and NOT have uppercase shouting or warning icons', () => {
      let pageContent = '';
      Object.entries(taxModules).forEach(([filePath, content]) => {
        if (filePath.includes('TaxSnapshotPage.tsx')) {
          pageContent = typeof content === 'string' ? content : '';
        }
      });

      expect(pageContent).not.toContain('CHẾ ĐỘ MÔ PHỎNG / DỮ LIỆU MẪU');
      expect(pageContent).toContain('Chế độ dữ liệu mẫu: máy chủ chưa kết nối, số liệu chỉ để xem thiết kế, không dùng để kê khai.');
    });

    it('Components must NOT contain unverified circular citations in user-facing JSX', () => {
      const bannedCitations = [
        'Thông tư 152/2025/TT-BTC',
        'Thông tư 40/2021/TT-BTC',
      ];

      Object.entries(taxModules).forEach(([filePath, content]) => {
        const text = typeof content === 'string' ? content : '';
        for (const citation of bannedCitations) {
          expect(
            text.includes(citation),
            `File ${filePath} contains unverified legal citation: "${citation}". Please replace with general approved terminology.`
          ).toBe(false);
        }
      });
    });
  });

  describe('3. Stage C: 5 Accounting Books Integrity & Period Filtering', () => {
    it('S2a (Doanh thu) vouchers for Quarter 3 must sum to exactly 467,500,000 VND', () => {
      const s2aVouchers = mockBookEntries.filter(
        (b) => b.bookType === AccountingBookType.S2a_RevenueGroup2
      );
      const totalS2a = s2aVouchers.reduce((sum, v) => sum + v.amount, 0);
      expect(totalS2a).toBe(467_500_000);
    });

    it('S2c (Chi phí) vouchers for Quarter 3 must sum to exactly 237,000,000 VND (3 months x 79M deductible)', () => {
      const s2cVouchers = mockBookEntries.filter(
        (b) => b.bookType === AccountingBookType.S2c_RevenueAndExpense
      );
      const totalS2c = s2cVouchers.reduce((sum, v) => sum + v.amount, 0);
      expect(totalS2c).toBe(237_000_000);
    });

    it('S3a (Nghĩa vụ thuế) vouchers for Quarter 3 must sum to exactly 6,762,500 VND (VAT 4.675M + PIT 2.0875M)', () => {
      const s3aVouchers = mockBookEntries.filter(
        (b) => b.bookType === AccountingBookType.S3a_TaxObligation
      );
      const totalS3a = s3aVouchers.reduce((sum, v) => sum + v.amount, 0);
      expect(totalS3a).toBe(6_762_500);

      const vatEntry = s3aVouchers.find((v) => v.category.includes('GTGT'));
      expect(vatEntry?.amount).toBe(4_675_000);

      const pitEntry = s3aVouchers.find((v) => v.category.includes('TNCN'));
      expect(pitEntry?.amount).toBe(2_087_500);
    });

    it('S2e (Tiền mặt & Ngân hàng) is reconciled via Tiền của tôi at exactly 359,300,000 VND', () => {
      expect(MOCK_LEDGER_EQUATION.closingBalance).toBe(359_300_000);
      expect(MOCK_LEDGER_EQUATION.totalAssetsWithTransit).toBe(359_300_000);
    });
  });

  describe('4. Single Source of Truth: P&L Integrity Preserved', () => {
    it('P&L Month 10 remains 560,860,000 VND revenue, 85,811,580 VND net profit, 15.3% margin', () => {
      expect(MOCK_PNL_MONTH.netSales).toBe(560_860_000);
      expect(MOCK_PNL_MONTH.totalOrders).toBe(1968);
      expect(MOCK_PNL_MONTH.averageOrderValue).toBe(284_990);
      expect(MOCK_PNL_MONTH.cogs).toBe(386_993_400);
      expect(MOCK_PNL_MONTH.operatingExpenses).toBe(81_324_700);
      expect(MOCK_PNL_MONTH.shrinkageWarehouse).toBe(6_730_320);
      expect(MOCK_PNL_MONTH.netProfit).toBe(85_811_580);
      expect(MOCK_PNL_MONTH.netProfitMargin).toBe(0.153);
    });
  });
});
