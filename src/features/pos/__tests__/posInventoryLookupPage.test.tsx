import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventoryLookupPage } from '../pages/InventoryLookupPage';
import { employeeApi } from '../../employee/api/employeeApi';
import { posOrderApi } from '../api/posOrderApi';
import { posInventoryApi } from '../api/posInventoryApi';

const BRANCH_A = '11111111-1111-1111-1111-111111111111';
const BRANCH_B = '22222222-2222-2222-2222-222222222222';
const PRODUCT_ID = '33333333-3333-3333-3333-333333333333';

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: {
      role: 'STORE_OWNER',
      fullName: 'Trần Quốc An',
      branchId: BRANCH_A,
    },
  }),
}));

vi.mock('../../employee/api/employeeApi', () => ({
  employeeApi: {
    getBranches: vi.fn(),
  },
}));

vi.mock('../api/posOrderApi', () => ({
  posOrderApi: {
    getAllProducts: vi.fn(),
  },
}));

vi.mock('../api/posInventoryApi', () => ({
  posInventoryApi: {
    getProductBatches: vi.fn(),
    getInventorySummary: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const setupDefaultMocks = () => {
  vi.mocked(employeeApi.getBranches).mockResolvedValue([
    { id: BRANCH_A, name: 'An Nhiên Mart - Chi nhánh Ba Đình' },
    { id: BRANCH_B, name: 'An Nhiên Mart - Chi nhánh Cầu Giấy' },
  ]);

  vi.mocked(posOrderApi.getAllProducts).mockResolvedValue([
    {
      id: PRODUCT_ID,
      sku: 'SP-SUA',
      barcode: '8934673001234',
      name: 'Sữa tươi tiệt trùng',
      category: 'Sữa & Chế phẩm',
      baseUnit: 'Hộp',
      basePrice: 32000,
      costPrice: 24000,
      quantityOnHand: 76,
    },
  ]);

  vi.mocked(posInventoryApi.getInventorySummary).mockResolvedValue({
    items: [
      {
        productId: PRODUCT_ID,
        sku: 'SP-SUA',
        barcode: '8934673001234',
        productName: 'Sữa tươi tiệt trùng',
        categoryName: 'Sữa & Chế phẩm',
        branchId: BRANCH_A,
        branchName: 'An Nhiên Mart - Chi nhánh Ba Đình',
        unit: 'Hộp',
        physicalQty: 80,
        availableQty: 76,
        pendingReturnQty: 0,
        expiredQty: 0,
        damagedQty: 0,
        minStock: 10,
        avgCost: 24000,
        totalValue: 1920000,
        status: 'OK',
        batches: [
          {
            batchId: 'lot-early-id',
            batchCode: 'LOT-EARLY',
            mfgDate: '2026-09-01',
            expiryDate: '2026-12-01',
            daysLeft: 20,
            quantityOnHand: 30,
            reservedQty: 4,
            availableQty: 26,
            status: 'Warning',
          },
          {
            batchId: 'lot-late-id',
            batchCode: 'LOT-LATE',
            mfgDate: '2026-10-01',
            expiryDate: '2027-06-01',
            daysLeft: 180,
            quantityOnHand: 50,
            reservedQty: 0,
            availableQty: 50,
            status: 'Normal',
          },
        ],
      },
      {
        productId: PRODUCT_ID,
        sku: 'SP-SUA',
        barcode: '8934673001234',
        productName: 'Sữa tươi tiệt trùng',
        categoryName: 'Sữa & Chế phẩm',
        branchId: BRANCH_B,
        branchName: 'An Nhiên Mart - Chi nhánh Cầu Giấy',
        unit: 'Hộp',
        physicalQty: 40,
        availableQty: 40,
        pendingReturnQty: 0,
        expiredQty: 0,
        damagedQty: 0,
        minStock: 10,
        avgCost: 24000,
        totalValue: 960000,
        status: 'OK',
        batches: [],
      },
    ],
    totalCount: 2,
    pageIndex: 1,
    pageSize: 100,
    kpiSummary: {
      totalSkus: 1,
      totalValue: 2880000,
      lowStockCount: 0,
      outOfStockCount: 0,
      expiryWarningCount: 1,
    },
  });
};

describe('InventoryLookupPage FEFO multi-lot lookup', () => {
  it('hides default suggestions until user searches by name/SKU or scans barcode, then renders multiple FEFO lots', async () => {
    setupDefaultMocks();
    vi.mocked(posInventoryApi.getProductBatches).mockResolvedValue([
      {
        batchId: 'lot-late-id',
        batchCode: 'LOT-LATE',
        mfgDate: '2026-10-01',
        expiryDate: '2027-06-01',
        daysLeft: 180,
        quantityOnHand: 50,
        reservedQty: 0,
        availableQty: 50,
        status: 'Normal',
      },
      {
        batchId: 'lot-early-id',
        batchCode: 'LOT-EARLY',
        mfgDate: '2026-09-01',
        expiryDate: '2026-12-01',
        daysLeft: 20,
        quantityOnHand: 30,
        reservedQty: 4,
        availableQty: 26,
        status: 'Warning',
      },
    ]);

    render(
      <MemoryRouter>
        <InventoryLookupPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(posOrderApi.getAllProducts).toHaveBeenCalledWith(BRANCH_A, expect.any(AbortSignal)));

    // Before searching or scanning: no suggestion list or auto-selected product batches
    expect(screen.queryByText(/Danh sách gợi ý/i)).toBeNull();
    expect(screen.queryByText(/SP-SUA - Sữa tươi tiệt trùng/)).toBeNull();
    expect(posInventoryApi.getProductBatches).not.toHaveBeenCalled();

    // User types product name to search and picks it
    const searchInput = screen.getByPlaceholderText(/Quét mã Barcode hoặc nhập tên sản phẩm/i);
    fireEvent.change(searchInput, { target: { value: 'Sữa tươi' } });

    const selectBtn = await screen.findByRole('button', { name: 'Chọn xem' });
    fireEvent.click(selectBtn);

    await screen.findByText('LOT-EARLY');
    await screen.findByText('LOT-LATE');

    expect(posInventoryApi.getProductBatches).toHaveBeenCalledWith(
      PRODUCT_ID,
      BRANCH_A,
      expect.any(AbortSignal)
    );

    // FEFO sorting puts earliest expiry lot first and shows per-lot stock breakdown inside Table 2
    const tables = screen.getAllByRole('table');
    const branchTable = tables[1];
    const fefoTable = tables[2];
    expect(fefoTable.textContent?.indexOf('LOT-EARLY')).toBeLessThan(
      fefoTable.textContent?.indexOf('LOT-LATE') ?? 0
    );

    expect(within(fefoTable).getByText('30 Hộp')).toBeTruthy();
    expect(within(fefoTable).getByText('4 Hộp')).toBeTruthy();
    expect(within(fefoTable).getByText('26 Hộp')).toBeTruthy();
    expect(within(fefoTable).getAllByText('50 Hộp').length).toBeGreaterThanOrEqual(2);

    // Multi-branch table shows real DB Branch B stock (40) instead of 0.7 multiplier (53)
    expect(within(branchTable).getAllByText('40 Hộp').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('LOT-SP-SUA-01')).toBeNull();
    expect(screen.queryByText('53 Hộp')).toBeNull();
  });

  it('automatically selects product and loads FEFO batches when scanning exact barcode', async () => {
    setupDefaultMocks();
    vi.mocked(posInventoryApi.getProductBatches).mockResolvedValue([
      {
        batchId: 'lot-scan-id',
        batchCode: 'LOT-SCAN-01',
        mfgDate: '2026-09-01',
        expiryDate: '2026-12-01',
        daysLeft: 20,
        quantityOnHand: 12,
        reservedQty: 0,
        availableQty: 12,
        status: 'Warning',
      },
    ]);

    render(
      <MemoryRouter>
        <InventoryLookupPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(posOrderApi.getAllProducts).toHaveBeenCalled());

    const searchInput = screen.getByPlaceholderText(/Quét mã Barcode hoặc nhập tên sản phẩm/i);
    fireEvent.change(searchInput, { target: { value: '8934673001234' } });

    await screen.findByText('LOT-SCAN-01');
    expect(screen.getAllByText('12 Hộp').length).toBeGreaterThanOrEqual(2);
  });

  it('shows a load error alert instead of generating sample lots when batch API fails', async () => {
    setupDefaultMocks();
    vi.mocked(posInventoryApi.getProductBatches).mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <InventoryLookupPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(posOrderApi.getAllProducts).toHaveBeenCalled());

    const searchInput = screen.getByPlaceholderText(/Quét mã Barcode hoặc nhập tên sản phẩm/i);
    fireEvent.change(searchInput, { target: { value: '8934673001234' } });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Không thể tải danh sách lô FEFO từ máy chủ.');
    expect(screen.queryByText('LOT-SP-SUA-01')).toBeNull();
  });
});
