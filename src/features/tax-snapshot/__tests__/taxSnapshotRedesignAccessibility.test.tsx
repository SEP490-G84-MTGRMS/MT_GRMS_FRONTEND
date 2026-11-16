// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaxOverviewCard } from '../components/TaxOverviewCard';
import { TaxDeclarationPreviewModal } from '../components/TaxDeclarationPreviewModal';
import { AccountingBooksView } from '../components/AccountingBooksView';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { generateMockSummary } from '../api/mockTaxData';
import { TaxCalculationMethod, TaxPeriodType, type HouseholdTaxDeclarationPreviewDto } from '../types/taxSnapshot';

const filter = {
  year: 2026,
  periodType: TaxPeriodType.Quarter,
  periodNumber: 3,
  calculationMethod: TaxCalculationMethod.DeclarationBased,
};

const preview: HouseholdTaxDeclarationPreviewDto = {
  formCode: '01/CNKD',
  formTitle: 'Tờ khai thuế đối với hộ kinh doanh, cá nhân kinh doanh',
  legalBasis: 'Mẫu 01/CNKD',
  isFinalized: false,
  revisionNumber: 0,
  generatedAtUtc: '2026-10-01T00:00:00Z',
  year: 2026,
  periodType: TaxPeriodType.Quarter,
  periodNumber: 3,
  periodLabel: 'Quý 3/2026',
  filingDeadlineLocal: '2026-11-02T00:00:00',
  isFirstDeclaration: true,
  isSupplementaryDeclaration: false,
  taxpayer: {
    taxpayerName: 'Hộ kinh doanh Minh Tâm',
    taxCode: '0312345678',
    businessLocation: 'Quận 1, TP.HCM',
    phoneNumber: '0909000000',
    taxAuthorityName: 'Thuế cơ sở 1 TP.HCM',
  },
  lines: [{
    sequence: 1,
    businessSector: 'Bán lẻ hàng hóa',
    taxCode: 'HKD-BAN-LE',
    totalRevenue: 400_000_000,
    vatNonTaxableRevenue: 0,
    vatTaxableRevenue: 400_000_000,
    vatZeroRateRevenue: 0,
    vatRate: 0.8,
    vatAmount: 3_200_000,
    pitTaxableRevenue: 160_000_000,
    pitRevenueDeduction: 0,
    pitRate: 15,
    pitAmount: 24_000_000,
  }],
  totalVatAmount: 3_200_000,
  totalPitAmount: 24_000_000,
  totalTaxAmount: 27_200_000,
  requiresBusinessActivityAppendix: true,
  appendixCode: '01-2/BK-HĐKD',
  appendixRevenue: 400_000_000,
  appendixCogs: 180_000_000,
  appendixOpex: 60_000_000,
  appendixTaxableIncome: 160_000_000,
  isProfileComplete: true,
  missingProfileFields: [],
  dataNotice: 'Bản xem trước tạm tính.',
};

afterEach(() => vi.restoreAllMocks());

describe('Tax snapshot redesign accessibility and XML gate', () => {
  it('overview keeps threshold detail collapsed and exposes progress/expanded state', () => {
    const summary = generateMockSummary(filter);
    render(<TaxOverviewCard summary={{ ...summary, filingDeadlineLocal: '2026-11-02T00:00:00' }} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow');
    const toggle = screen.getByRole('button', { name: /Xem chi tiết ngưỡng/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('preview displays indicators and appendix while XML stays disabled for draft', async () => {
    vi.spyOn(taxSnapshotApi, 'getDeclarationPreview').mockResolvedValue(preview);
    render(<TaxDeclarationPreviewModal isOpen filter={filter} onClose={vi.fn()} />);

    expect(await screen.findByText('PHỤ LỤC 01-2/BK-HĐKD')).toBeInTheDocument();
    expect(screen.getByText('[17] Thuế TNCN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xuất XML/i })).toBeDisabled();
  });

  it('preview closes with Escape, traps Tab and restores focus', async () => {
    vi.spyOn(taxSnapshotApi, 'getDeclarationPreview').mockResolvedValue(preview);
    const onClose = vi.fn();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<TaxDeclarationPreviewModal isOpen filter={filter} onClose={onClose} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /In bản xem trước/i })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('accounting view exposes all seven books and updates the selected book', async () => {
    vi.spyOn(taxSnapshotApi, 'getBookDetails').mockResolvedValue([]);
    const summary = generateMockSummary(filter);
    render(<AccountingBooksView summary={summary} year={2026} periodType={TaxPeriodType.Quarter} periodNumber={3} />);

    const sidebar = screen.getByRole('complementary', { name: /Chọn mẫu sổ kế toán/i });
    for (const code of ['S1a', 'S2a', 'S2b', 'S2c', 'S2d', 'S2e', 'S3a']) {
      expect(sidebar.querySelector(`button[aria-pressed]`)?.parentElement?.textContent).toContain(code);
    }
    const costBook = screen.getByRole('button', { name: /S2c.*Sổ chi phí sản xuất, kinh doanh/i });
    fireEvent.click(costBook);
    expect(costBook).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(taxSnapshotApi.getBookDetails).toHaveBeenLastCalledWith(expect.objectContaining({ bookType: 4 })));
  });
});
