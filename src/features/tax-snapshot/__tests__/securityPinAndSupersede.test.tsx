import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { SecurityPinModal } from '../components/SecurityPinModal';
import { CreateTaxSnapshotModal } from '../components/CreateTaxSnapshotModal';
import {
  TaxCalculationMethod,
  TaxPeriodType,
  HouseholdTaxGroup,
  type HouseholdTaxSummaryDto,
  type HouseholdTaxSnapshotDto,
} from '../types/taxSnapshot';
import { financeHttpClient } from '../../../api/financeHttpClient';

vi.mock('../../../api/financeHttpClient', () => ({
  financeHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Security PIN Lifecycle & Supersede UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. taxSnapshotApi PIN & Supersede Payload', () => {
    it('changeSecurityPin calls /tax/household/pin/change with correct payload', async () => {
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: { success: true },
      });

      await taxSnapshotApi.changeSecurityPin({
        currentPin: '1234',
        newPin: '5678',
        confirmNewPin: '5678',
      });

      expect(financeHttpClient.post).toHaveBeenCalledWith('/tax/household/pin/change', {
        currentPin: '1234',
        currentPassword: null,
        newPin: '5678',
        confirmNewPin: '5678',
      });
    });

    it('resetSecurityPin calls /tax/household/pin/reset with password', async () => {
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: { success: true },
      });

      await taxSnapshotApi.resetSecurityPin({
        password: 'owner_password_123',
        newPin: '9988',
        confirmNewPin: '9988',
      });

      expect(financeHttpClient.post).toHaveBeenCalledWith('/tax/household/pin/reset', {
        password: 'owner_password_123',
        newPin: '9988',
        confirmNewPin: '9988',
      });
    });

    it('createSnapshot includes allowSupersedeExisting and rectificationReason in payload', async () => {
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'SNAP-2026-Q3-REV2',
            revisionNumber: 2,
            year: 2026,
            periodType: TaxPeriodType.Quarter,
            periodNumber: 3,
            totalTaxAmount: 10000000,
          },
        },
      });

      const res = await taxSnapshotApi.createSnapshot({
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 3,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
        applyVatReduction2026: true,
        pin: '1234',
        allowSupersedeExisting: true,
        rectificationReason: 'Dieu chinh theo bien ban kiem tra so 45',
      });

      expect(res.id).toBe('SNAP-2026-Q3-REV2');
      expect(financeHttpClient.post).toHaveBeenCalledWith(
        '/tax/household/snapshots',
        expect.objectContaining({
          allowSupersedeExisting: true,
          rectificationReason: 'Dieu chinh theo bien ban kiem tra so 45',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        })
      );
    });
  });

  describe('2. SecurityPinModal Component', () => {
    it('renders Change PIN tab by default and validates mismatched PINs', async () => {
      const handleClose = vi.fn();
      render(<SecurityPinModal isOpen={true} onClose={handleClose} initialTab="change" />);

      expect(screen.getByText('Quản lý mã PIN bảo mật chốt sổ thuế')).toBeInTheDocument();
      expect(screen.getByText('Đổi mã PIN')).toBeInTheDocument();
      expect(screen.getByText('Quên / Khôi phục mã PIN')).toBeInTheDocument();

      // Enter current PIN, new PIN and mismatched confirm PIN
      const currentPinInput = screen.getByPlaceholderText('Nhập mã PIN hiện tại (4-6 số)');
      const newPinInput = screen.getByPlaceholderText('Nhập mã PIN mới (ví dụ: 8899)');
      const confirmPinInput = screen.getByPlaceholderText('Nhập lại mã PIN mới');

      fireEvent.change(currentPinInput, { target: { value: '1234' } });
      fireEvent.change(newPinInput, { target: { value: '8899' } });
      fireEvent.change(confirmPinInput, { target: { value: '9988' } });

      const submitBtn = screen.getByText('Lưu mã PIN mới');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Mã PIN mới và xác nhận mã PIN không khớp nhau.')).toBeInTheDocument();
      });
    });

    it('switches to Reset PIN tab and accepts account password for recovery', async () => {
      render(<SecurityPinModal isOpen={true} onClose={vi.fn()} initialTab="change" />);

      const resetTabBtn = screen.getByText('Quên / Khôi phục mã PIN');
      fireEvent.click(resetTabBtn);

      expect(screen.getByPlaceholderText('Nhập mật khẩu tài khoản')).toBeInTheDocument();
      expect(screen.getByText('Khôi phục mã PIN')).toBeInTheDocument();
    });
  });

  describe('3. CreateTaxSnapshotModal Native Keyboard & Supersede', () => {
    const mockSummary: HouseholdTaxSummaryDto = {
      year: 2026,
      periodType: TaxPeriodType.Quarter,
      periodNumber: 3,
      branchName: 'Toàn hệ thống',
      annualAccumulatedRevenue: 500000000,
      priorPeriodsAccumulatedRevenue: 300000000,
      householdGroup: HouseholdTaxGroup.Group2_1BTo3B,
      householdGroupName: 'Nhóm 2 (1 tỷ - 3 tỷ)',
      calculationMethod: TaxCalculationMethod.RevenuePercentage,
      isTaxExempt: false,
      taxExemptionThreshold: 1000000000,
      grossRevenueInPeriod: 200000000,
      discountAmountInPeriod: 0,
      returnAmountInPeriod: 0,
      taxableRevenueInPeriod: 200000000,
      vatRate: 1.0,
      isVatReduced: false,
      vatTaxableRevenue: 200000000,
      vatAmount: 2000000,
      pitRate: 0.5,
      pitTaxableRevenue: 200000000,
      pitAmount: 1000000,
      deductibleExpensesInPeriod: 0,
      ytdRevenue: 500000000,
      ytdExpenses: 0,
      taxableIncomeYtd: 0,
      taxDueYtd: 0,
      priorDeclaredPitTax: 0,
      overpaidTaxCarry: 0,
      taxableIncomeDeclaration: 0,
      declarationPitAmount: 0,
      totalTaxAmount: 3000000,
      booksSummary: {
        primaryBookCode: 'S2a-HKD',
        totalRecordedRevenue: 200000000,
        totalRecordedExpenses: 0,
        totalCashAndBankReceipts: 200000000,
        totalCashAndBankDisbursements: 0,
        totalTaxObligationsAccrued: 3000000,
        totalTaxPaidToState: 0,
      },
      isFinalized: false,
    };

    it('does NOT have the legacy on-screen keypad buttons (0-9, Xóa)', () => {
      render(
        <CreateTaxSnapshotModal
          isOpen={true}
          onClose={vi.fn()}
          summary={mockSummary}
          calculationMethod={TaxCalculationMethod.RevenuePercentage}
          applyVatReduction={false}
          onSubmit={vi.fn()}
        />
      );

      // Move to Step 2
      const step2Btn = screen.getByRole('button', { name: /^Tiếp tục/i });
      fireEvent.click(step2Btn);

      // The on-screen numeric keypad 'Xóa' button should NOT exist
      expect(screen.queryByText('Xóa')).not.toBeInTheDocument();

      // Native computer keyboard input box should be present
      const pinInput = screen.getByLabelText('Mã PIN bảo mật');
      expect(pinInput).toBeInTheDocument();
      expect(pinInput).toHaveAttribute('inputMode', 'numeric');
    });

    it('displays supersede warning when period is already finalized', () => {
      const existingSnapshot: HouseholdTaxSnapshotDto = {
        id: 'SNAP-2026-Q3-001',
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 3,
        taxableRevenueInPeriod: 200000000,
        totalTaxAmount: 3000000,
        vatAmount: 2000000,
        pitAmount: 1000000,
        vatRate: 1.0,
        pitRate: 0.5,
        isTaxExempt: false,
        householdGroup: HouseholdTaxGroup.Group2_1BTo3B,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
        finalizedBy: 'StoreOwner',
        finalizedAtUtc: '2026-10-15T10:00:00Z',
        annualAccumulatedRevenue: 500000000,
        revisionNumber: 1,
      };

      render(
        <CreateTaxSnapshotModal
          isOpen={true}
          onClose={vi.fn()}
          summary={mockSummary}
          calculationMethod={TaxCalculationMethod.RevenuePercentage}
          applyVatReduction={false}
          existingFinalizedSnapshot={existingSnapshot}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText(/Kỳ này đã được chốt\. Bản mới sẽ thay thế/i)).toBeInTheDocument();
      expect(
        screen.getByText('Tôi hiểu và đồng ý tạo bản chốt thay thế')
      ).toBeInTheDocument();
    });

    it('successfully completes 3-step supersede flow when checkbox is checked and reason is provided', async () => {
      const existingSnapshot: HouseholdTaxSnapshotDto = {
        id: 'SNAP-2026-Q1-001',
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 1,
        taxableRevenueInPeriod: 470000000,
        totalTaxAmount: 0,
        vatAmount: 0,
        pitAmount: 0,
        vatRate: 0,
        pitRate: 0,
        isTaxExempt: true,
        householdGroup: HouseholdTaxGroup.Group1_Under1B,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
        finalizedBy: 'Cô Ba',
        finalizedAtUtc: '2026-04-12T14:15:00Z',
        annualAccumulatedRevenue: 470000000,
        revisionNumber: 0,
      };

      const handleSubmit = vi.fn().mockResolvedValue({
        id: 'SNAP-2026-Q1-002',
        revisionNumber: 1,
        year: 2026,
        periodType: TaxPeriodType.Quarter,
        periodNumber: 1,
        totalTaxAmount: 0,
        finalizedAtUtc: new Date().toISOString(),
      });

      render(
        <CreateTaxSnapshotModal
          isOpen={true}
          onClose={vi.fn()}
          summary={{ ...mockSummary, year: 2026, periodNumber: 1 }}
          calculationMethod={TaxCalculationMethod.RevenuePercentage}
          applyVatReduction={false}
          existingFinalizedSnapshot={existingSnapshot}
          onSubmit={handleSubmit}
        />
      );

      // Step 1: Step 2 button is disabled until checkbox and reason are provided
      const nextStepBtn = screen.getByRole('button', { name: /^Tiếp tục/i });
      expect(nextStepBtn).toBeDisabled();

      // Check "Tôi xác nhận chốt lại và thay thế bản chốt cũ của kỳ này"
      const checkbox = screen.getByRole('checkbox', { name: /Tôi hiểu và đồng ý tạo bản chốt thay thế/i });
      fireEvent.click(checkbox);
      expect(nextStepBtn).toBeDisabled(); // Still disabled because reason is empty

      // Enter rectification reason
      const reasonInput = screen.getByPlaceholderText(/Nhập lý do điều chỉnh/i);
      fireEvent.change(reasonInput, { target: { value: 'BBĐC-01/2026: Điều chỉnh theo quyết định thanh tra' } });
      expect(nextStepBtn).not.toBeDisabled();

      // Proceed to Step 2
      fireEvent.click(nextStepBtn);

      // Step 2: Enter PIN
      const pinInput = screen.getByLabelText('Mã PIN bảo mật');
      fireEvent.change(pinInput, { target: { value: '1234' } });

      const toStep3Btn = screen.getByRole('button', { name: /^Tiếp tục/i });
      fireEvent.click(toStep3Btn);

      // Step 3: Seal with HMAC
      const sealBtn = screen.getByRole('button', { name: /Chốt kỳ sổ/i });
      fireEvent.click(sealBtn);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            year: 2026,
            periodType: TaxPeriodType.Quarter,
            periodNumber: 1,
            allowSupersedeExisting: true,
            rectificationReason: 'BBĐC-01/2026: Điều chỉnh theo quyết định thanh tra',
            pin: '1234',
          })
        );
      });
    });

    it('surfaces a locked-period rejection from the server without creating a local snapshot', async () => {
      vi.mocked(financeHttpClient.post).mockRejectedValue({ response: { data: { message: 'Kỳ tính thuế đã được chốt và khóa sổ.' } } });
      await expect(taxSnapshotApi.createSnapshot({ year: 2026, periodType: TaxPeriodType.Quarter, periodNumber: 4,
        calculationMethod: TaxCalculationMethod.RevenuePercentage, applyVatReduction2026: false, pin: '1234' })).rejects.toThrow('đã được chốt và khóa sổ');
    });
  });
});
