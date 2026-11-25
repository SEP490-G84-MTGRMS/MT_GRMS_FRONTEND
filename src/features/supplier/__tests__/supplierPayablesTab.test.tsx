import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupplierPayablesTab } from '../components/detail/SupplierPayablesTab';
import { supplierApi } from '../api/supplierApi';
import type { SupplierSummary, SupplierApSummary, APLedgerEntry } from '../types/supplier.types';

vi.mock('../api/supplierApi', () => ({
  supplierApi: {
    getAPSummary: vi.fn(),
    getAPLedger: vi.fn(),
    recordAPTransaction: vi.fn(),
  },
}));

vi.mock('../lib/apStatementExcel', () => ({
  exportSupplierApStatementExcel: vi.fn().mockResolvedValue(undefined),
}));

const sampleSupplier: SupplierSummary = {
  id: 'sup-ap-001',
  code: 'SUP-AP-001',
  name: 'Công ty Thực phẩm Xanh',
  supplierType: 'Goods',
  contactPerson: 'Trần Văn Nam',
  phone: '0901234567',
  email: 'xanh@mtgrms.vn',
  address: '12 Nguyễn Huệ, Q1',
  taxCode: '0311223344',
  bankName: 'Vietcombank',
  bankAccount: '007100123456',
  accountHolder: 'CONG TY THUC PHAM XANH',
  paymentTermDays: 30,
  creditLimit: 100_000_000,
  currentDebt: 15_000_000,
  overdueDebt: 10_000_000,
  rating: 4.5,
  status: 'Active',
  createdAt: '2026-10-01T08:00:00Z',
};

const sampleSummary: SupplierApSummary = {
  supplierId: sampleSupplier.id,
  currentDebt: 15_000_000,
  overdueDebt: 10_000_000,
  creditLimit: 100_000_000,
  paymentTermDays: 30,
  openPurchaseOrderCount: 2,
  aging: {
    current: 5_000_000,
    days1To30: 4_000_000,
    days31To60: 3_000_000,
    days61To90: 2_000_000,
    over90Days: 1_000_000,
    totalOverdue: 10_000_000,
    totalDebt: 15_000_000,
  },
};

const sampleLedger: APLedgerEntry = {
  id: 'led-001',
  supplierId: sampleSupplier.id,
  transactionDate: '2026-11-10T09:00:00Z',
  docType: 'PurchaseInvoice',
  docNo: 'GRN-20261110-001',
  description: 'Ghi nhận công nợ từ Phiếu nhập kho GRN-20261110-001',
  amount: 5_000_000,
  direction: 1,
  balanceAfter: 15_000_000,
  createdByName: 'Chủ cửa hàng',
};

describe('SupplierPayablesTab (Phase 1 + Phase 2 live AP flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads real AP summary + ledger and renders all 6 aging buckets without hardcoded zeros', async () => {
    vi.mocked(supplierApi.getAPSummary).mockResolvedValueOnce(sampleSummary);
    vi.mocked(supplierApi.getAPLedger).mockResolvedValueOnce({
      items: [sampleLedger],
      page: 1,
      pageSize: 15,
      totalItems: 1,
    });

    render(<SupplierPayablesTab supplier={sampleSupplier} />);

    await waitFor(() => {
      expect(screen.getByText('GRN-20261110-001')).toBeDefined();
    });

    expect(supplierApi.getAPSummary).toHaveBeenCalledWith(sampleSupplier.id);
    expect(supplierApi.getAPLedger).toHaveBeenCalledWith(
      sampleSupplier.id,
      expect.objectContaining({ pageIndex: 1, pageSize: 15 })
    );

    const agingRow = screen.getByTestId('ap-aging-row');
    expect(agingRow.textContent).toContain('5.000.000');
    expect(agingRow.textContent).toContain('4.000.000');
    expect(agingRow.textContent).toContain('3.000.000');
    expect(agingRow.textContent).toContain('2.000.000');
    expect(agingRow.textContent).toContain('1.000.000');
    expect(screen.getByTestId('ap-total-debt').textContent).toContain('15.000.000');
    expect(screen.getByTestId('btn-open-ap-payment')).toBeDefined();
  });

  it('shows helpful empty guidance copy and hides payment button when currentDebt is 0', async () => {
    const zeroSupplier = { ...sampleSupplier, currentDebt: 0, overdueDebt: 0 };
    vi.mocked(supplierApi.getAPSummary).mockResolvedValueOnce({
      ...sampleSummary,
      currentDebt: 0,
      overdueDebt: 0,
      aging: {
        current: 0,
        days1To30: 0,
        days31To60: 0,
        days61To90: 0,
        over90Days: 0,
        totalOverdue: 0,
        totalDebt: 0,
      },
    });
    vi.mocked(supplierApi.getAPLedger).mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 15,
      totalItems: 0,
    });

    render(<SupplierPayablesTab supplier={zeroSupplier} />);

    await waitFor(() => {
      expect(screen.getByText(/Chưa có giao dịch phát sinh công nợ nào/i)).toBeDefined();
    });
    expect(screen.getByText(/xác nhận phiếu nhập kho \(GRN\) theo hình thức Ghi nợ \(AP\)/i)).toBeDefined();
    expect(screen.queryByTestId('btn-open-ap-payment')).toBeNull();
  });

  it('displays error banner and allows retrying when API fails', async () => {
    vi.mocked(supplierApi.getAPSummary).mockRejectedValueOnce(new Error('Lỗi kết nối máy chủ'));
    vi.mocked(supplierApi.getAPLedger).mockRejectedValueOnce(new Error('Lỗi kết nối máy chủ'));

    render(<SupplierPayablesTab supplier={sampleSupplier} />);

    await waitFor(() => {
      expect(screen.getByText(/Lỗi kết nối máy chủ/i)).toBeDefined();
    });

    vi.mocked(supplierApi.getAPSummary).mockResolvedValueOnce(sampleSummary);
    vi.mocked(supplierApi.getAPLedger).mockResolvedValueOnce({
      items: [sampleLedger],
      page: 1,
      pageSize: 15,
      totalItems: 1,
    });

    fireEvent.click(screen.getByText('Thử lại'));

    await waitFor(() => {
      expect(screen.getByText('GRN-20261110-001')).toBeDefined();
    });
  });

  it('opens payment modal, blocks overpay, posts PaymentVoucher (-1), and refreshes summary + ledger + parent debt', async () => {
    const updatedSummary: SupplierApSummary = {
      ...sampleSummary,
      currentDebt: 10_000_000,
      overdueDebt: 5_000_000,
      aging: {
        ...sampleSummary.aging,
        over90Days: 0,
        days61To90: 0,
        days31To60: 1_000_000,
        totalOverdue: 5_000_000,
        totalDebt: 10_000_000,
      },
    };
    const paymentEntry: APLedgerEntry = {
      id: 'led-pay-001',
      supplierId: sampleSupplier.id,
      transactionDate: '2026-11-24T10:00:00Z',
      docType: 'PaymentVoucher',
      docNo: 'PAY-20261124-0001',
      description: 'Thanh toán đợt 1',
      amount: 5_000_000,
      direction: -1,
      balanceAfter: 10_000_000,
      paymentMethod: 'CASH',
      referenceNo: 'PC-100',
      createdByName: 'Chủ cửa hàng',
    };

    vi.mocked(supplierApi.getAPSummary)
      .mockResolvedValueOnce(sampleSummary)
      .mockResolvedValueOnce(updatedSummary);
    vi.mocked(supplierApi.getAPLedger)
      .mockResolvedValueOnce({
        items: [sampleLedger],
        page: 1,
        pageSize: 15,
        totalItems: 1,
      })
      .mockResolvedValueOnce({
        items: [paymentEntry, sampleLedger],
        page: 1,
        pageSize: 15,
        totalItems: 2,
      });
    vi.mocked(supplierApi.recordAPTransaction).mockResolvedValueOnce(paymentEntry);

    const onDebtChanged = vi.fn();
    const onNotify = vi.fn();

    render(
      <SupplierPayablesTab
        supplier={sampleSupplier}
        actorName="Nguyễn Chủ Quán"
        onDebtChanged={onDebtChanged}
        onNotify={onNotify}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-open-ap-payment')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('btn-open-ap-payment'));
    expect(screen.getByTestId('supplier-ap-payment-modal')).toBeDefined();

    // Try overpaying -> submit button disabled and warning shown
    const amountWrap = screen.getByTestId('ap-payment-amount-wrap');
    const amountInput = amountWrap.querySelector('input') as HTMLInputElement;
    expect(amountInput).toBeTruthy();
    fireEvent.change(amountInput, { target: { value: '20000000' } });
    expect(screen.getByText(/không được vượt quá dư nợ hiện tại/i)).toBeDefined();
    expect((screen.getByTestId('btn-ap-payment-submit') as HTMLButtonElement).disabled).toBe(true);

    // Enter valid partial payment 5,000,000 via CASH
    fireEvent.change(amountInput, { target: { value: '5000000' } });
    fireEvent.click(screen.getByTestId('btn-ap-method-cash'));
    fireEvent.change(screen.getByTestId('input-ap-payment-ref'), { target: { value: 'PC-100' } });
    fireEvent.change(screen.getByTestId('input-ap-payment-desc'), { target: { value: 'Thanh toán đợt 1' } });
    fireEvent.click(screen.getByTestId('btn-ap-payment-submit'));

    await waitFor(() => {
      expect(supplierApi.recordAPTransaction).toHaveBeenCalledWith(
        sampleSupplier.id,
        expect.objectContaining({
          supplierId: sampleSupplier.id,
          docType: 'PaymentVoucher',
          direction: -1,
          amount: 5_000_000,
          paymentMethod: 'CASH',
          referenceNo: 'PC-100',
          description: 'Thanh toán đợt 1',
          createdByName: 'Nguyễn Chủ Quán',
          idempotencyKey: expect.any(String),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('PAY-20261124-0001')).toBeDefined();
      expect(screen.getByTestId('ap-total-debt').textContent).toContain('10.000.000');
    });

    expect(onDebtChanged).toHaveBeenCalledWith(updatedSummary);
    expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('PAY-20261124-0001'), 'success');
  });
});

