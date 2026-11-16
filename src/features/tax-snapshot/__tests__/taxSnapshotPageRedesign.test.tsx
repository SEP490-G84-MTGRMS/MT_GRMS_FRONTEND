// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaxSnapshotPage } from '../pages/TaxSnapshotPage';
import { useTaxSnapshots } from '../hooks/useTaxSnapshots';
import { TaxCalculationMethod, TaxPeriodType } from '../types/taxSnapshot';

vi.mock('../hooks/useTaxSnapshots', () => ({ useTaxSnapshots: vi.fn() }));
vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { role: 'STORE_OWNER' } }),
}));
vi.mock('../components/AccountingBooksView', () => ({
  AccountingBooksView: () => <div data-testid="accounting-books-panel">Danh sách 7 sổ</div>,
}));

const summary = {
  year: 2026,
  periodType: TaxPeriodType.Quarter,
  periodNumber: 1,
  branchName: 'Điểm kinh doanh chính',
  annualAccumulatedRevenue: 1_200_000_000,
  priorPeriodsAccumulatedRevenue: 800_000_000,
  householdGroup: 2,
  householdGroupName: 'Nhóm 2',
  calculationMethod: TaxCalculationMethod.RevenuePercentage,
  tier2Method: 'REVENUE_EXCESS',
  isTaxExempt: false,
  taxExemptionThreshold: 1_000_000_000,
  grossRevenueInPeriod: 400_000_000,
  discountAmountInPeriod: 0,
  returnAmountInPeriod: 0,
  taxableRevenueInPeriod: 400_000_000,
  originalVatRate: 1,
  vatReductionPercentage: 0,
  vatRate: 1,
  isVatReduced: false,
  vatTaxableRevenue: 400_000_000,
  vatAmount: 4_000_000,
  pitRate: 0.5,
  pitTaxableRevenue: 200_000_000,
  pitAmount: 1_000_000,
  totalTaxAmount: 5_000_000,
  filingDeadlineLocal: '2026-04-30T00:00:00',
  filingDeadlineNote: 'Theo dữ liệu máy chủ',
  booksSummary: { primaryBookCode: 'S2a-HKD' },
};

beforeEach(() => {
  vi.mocked(useTaxSnapshots).mockReturnValue({
    summary,
    isSummaryLoading: false,
    summaryError: null,
    refetchSummary: vi.fn(),
    snapshots: [],
    isSnapshotsLoading: false,
    filterParams: {
      year: 2026,
      periodType: TaxPeriodType.Quarter,
      periodNumber: 1,
      calculationMethod: TaxCalculationMethod.RevenuePercentage,
      applyVatReduction2026: false,
    },
    setCalculationMethod: vi.fn(),
    setPeriod: vi.fn(),
    setYear: vi.fn(),
    setApplyVatReduction: vi.fn(),
    updateTaxRates: vi.fn(),
    resetTaxRatesToDefault: vi.fn(),
    createSnapshot: vi.fn(),
  } as any);
});

describe('TaxSnapshotPage redesign navigation', () => {
  it('keeps exactly two main tabs and moves secondary views into the action menu', () => {
    render(<TaxSnapshotPage />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('Tờ khai thuế');
    expect(tabs[1]).toHaveTextContent('Sổ kế toán');

    fireEvent.click(screen.getByRole('button', { name: 'Thao tác khác' }));
    expect(screen.getByRole('menuitem', { name: /Lịch sử chốt kỳ/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Phân tích doanh thu/i })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('switches to the accounting books panel', () => {
    render(<TaxSnapshotPage />);
    fireEvent.click(screen.getByRole('tab', { name: /Sổ kế toán/i }));
    expect(screen.getByTestId('accounting-books-panel')).toBeInTheDocument();
  });
});
