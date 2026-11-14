import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaxSnapshotDetailDrawer } from '../components/TaxSnapshotDetailDrawer';
import { HouseholdTaxGroup, TaxCalculationMethod, TaxPeriodType, type TaxSnapshot } from '../types/taxSnapshot';

const mockSnapshot: TaxSnapshot = {
  id: 'snap-2026-q1',
  periodType: TaxPeriodType.Quarter,
  periodNumber: 1,
  quarter: 1,
  year: 2026,
  status: 'Finalized',
  householdGroup: HouseholdTaxGroup.Group2_1BTo3B,
  calculationMethod: TaxCalculationMethod.RevenuePercentage,
  isTaxExempt: false,
  taxableRevenue: 1500000000,
  taxableRevenueInPeriod: 1500000000,
  taxableRevenueInExcess: 500000000,
  annualAccumulatedRevenue: 1500000000,
  vatRate: 1,
  pitRate: 0.5,
  vatAmount: 5000000,
  pitAmount: 2500000,
  totalTaxAmount: 7500000,
  ordersCount: 42,
  generatedAt: '2026-04-01T08:00:00Z',
  finalizedAtUtc: '2026-04-01T08:00:00Z',
  finalizedBy: 'StoreOwner',
};

describe('TaxSnapshotDetailDrawer - BF-03 & BF-04', () => {
  it('displays professional explanatory message when opening Invoices tab', () => {
    render(
      <TaxSnapshotDetailDrawer
        isOpen={true}
        onClose={vi.fn()}
        snapshot={mockSnapshot}
      />
    );

    // Click on tab "Bảng kê hóa đơn"
    const invoicesTab = screen.getByRole('button', { name: /Bảng kê hóa đơn/i });
    fireEvent.click(invoicesTab);

    // Expect the professional explanatory message
    expect(
      screen.getAllByText(
        /Dữ liệu bảng kê chi tiết từng hóa đơn được lưu trữ an toàn trong tệp sao lưu điện tử của kỳ chốt thuế\. Bạn có thể bấm nút 'Xuất tờ khai Form 01' ở dưới để trích xuất đầy đủ file XML\/Excel theo chuẩn Thông tư 152\./i
      ).length
    ).toBeGreaterThan(0);
  });

  it('triggers onExport callback when user clicks "Xuất tờ khai Form 01"', () => {
    const handleExport = vi.fn();

    render(
      <TaxSnapshotDetailDrawer
        isOpen={true}
        onClose={vi.fn()}
        snapshot={mockSnapshot}
        onExport={handleExport}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /Xuất tờ khai Form 01/i });
    fireEvent.click(exportBtn);

    expect(handleExport).toHaveBeenCalledTimes(1);
    expect(handleExport).toHaveBeenCalledWith(mockSnapshot);
  });
});
