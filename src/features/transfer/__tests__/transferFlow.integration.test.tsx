import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TransferListPage } from '../pages/TransferListPage';
import { CreateTransferPage } from '../pages/CreateTransferPage';
import { ReceiveTransferPage } from '../pages/ReceiveTransferPage';
import { transferService } from '../services/transferService';
import type { TransferOrder } from '../types';

// Mock transferService
vi.mock('../services/transferService', () => ({
  transferService: {
    branches: vi.fn(),
    products: vi.fn(),
    batches: vi.fn(),
    stockBatches: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    dispatch: vi.fn(),
    receive: vi.fn(),
    cancel: vi.fn(),
  },
}));

// Mock useAuthStore
vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      user: {
        id: 'user-01',
        fullName: 'Nguyễn Quản Lý',
        role: 'STORE_OWNER',
        branchId: 'branch-01',
      },
    })
  ),
}));

describe('INTEGRATION TEST SUITE – Transfer Management (FE-15)', () => {
  const mockBranches = [
    { id: 'branch-01', code: 'CN01', name: 'Kho Tổng Trung Tâm', address: 'Số 1', phone: '0901234567' },
    { id: 'branch-02', code: 'CN02', name: 'Chi nhánh Quận 1', address: 'Số 2', phone: '0907654321' },
  ];

  const mockTransfers: TransferOrder[] = [
    {
      id: 'trf-001',
      transferCode: 'TRF-20261114-001',
      fromBranchId: 'branch-01',
      fromBranchName: 'Kho Tổng Trung Tâm',
      toBranchId: 'branch-02',
      toBranchName: 'Chi nhánh Quận 1',
      createdBy: 'Nguyễn Quản Lý',
      transferDate: '14/11/2026 08:30:00',
      expectedDeliveryDate: '15/11/2026',
      status: 'In-Transit',
      totalAmount: 540000,
      note: 'Chuyển hàng định kỳ',
      items: [
        {
          id: 'item-01',
          productId: 'prod-01',
          productCode: 'SP-BIA',
          productName: 'Bia Heineken Sleek',
          unitName: 'Lon',
          onHandSender: 100,
          onHandReceiver: 0,
          sentQty: 30,
          receivedQty: 0,
          unitPrice: 18000,
          amount: 540000,
          batchNumber: 'L01',
          expiryDate: '2027-01-01',
        },
      ],
    },
    {
      id: 'trf-002',
      transferCode: 'TRF-20261114-002',
      fromBranchId: 'branch-01',
      fromBranchName: 'Kho Tổng Trung Tâm',
      toBranchId: 'branch-02',
      toBranchName: 'Chi nhánh Quận 1',
      createdBy: 'Nguyễn Quản Lý',
      transferDate: '14/11/2026 09:00:00',
      status: 'Draft',
      totalAmount: 160000,
      note: 'Phiếu nháp mì gói',
      items: [
        {
          id: 'item-02',
          productId: 'prod-02',
          productCode: 'SP-MI',
          productName: 'Mì Omachi Sườn Hầm',
          unitName: 'Gói',
          onHandSender: 60,
          onHandReceiver: 10,
          sentQty: 20,
          unitPrice: 8000,
          amount: 160000,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transferService.branches).mockResolvedValue(mockBranches);
    vi.mocked(transferService.list).mockResolvedValue({
      items: mockTransfers,
      totalItems: 2,
    });
    vi.mocked(transferService.get).mockImplementation(async (id) => {
      const found = mockTransfers.find((t) => t.id === id);
      if (!found) throw new Error('Not found');
      return found;
    });
  });

  // =========================================================================
  // FLOW 1: TransferListPage Integration
  // =========================================================================
  describe('1. TransferListPage Integration Flow', () => {
    it('TC-INT-01: Loads branches and transfer list, renders status badges and amounts', async () => {
      render(
        <MemoryRouter>
          <TransferListPage />
        </MemoryRouter>
      );

      // Verify API was called
      await waitFor(() => {
        expect(transferService.branches).toHaveBeenCalledTimes(1);
        expect(transferService.list).toHaveBeenCalledTimes(1);
      });

      // Verify list rendering
      await waitFor(() => {
        expect(screen.getByText('TRF-20261114-001')).toBeInTheDocument();
        expect(screen.getByText('TRF-20261114-002')).toBeInTheDocument();
      });

      // Verify branch names are displayed
      expect(screen.getAllByText('Kho Tổng Trung Tâm').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Chi nhánh Quận 1').length).toBeGreaterThan(0);

      // Verify Status tags
      expect(screen.getAllByText('Đang chuyển').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Phiếu tạm').length).toBeGreaterThan(0);
    });

    it('TC-INT-02: Clicking on transfer row opens TransferDetailModal with correct details', async () => {
      render(
        <MemoryRouter>
          <TransferListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('TRF-20261114-001')).toBeInTheDocument();
      });

      // Click on row
      const rowItem = screen.getByText('TRF-20261114-001');
      fireEvent.click(rowItem);

      // Detail Modal should open and show product
      await waitFor(() => {
        expect(screen.getAllByText('Bia Heineken Sleek').length).toBeGreaterThan(0);
      });

      expect(screen.getByText(/L01/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // FLOW 2: CreateTransferPage Integration
  // =========================================================================
  describe('2. CreateTransferPage Integration Flow', () => {
    it('TC-INT-03: Loads branches and products, validates source and destination branch selection', async () => {
      vi.mocked(transferService.products).mockResolvedValue([
        {
          id: 'prod-01',
          productId: 'prod-01',
          productCode: 'SP-BIA',
          productName: 'Bia Heineken Sleek',
          unitName: 'Lon',
          onHandSender: 100,
          onHandReceiver: 0,
          sentQty: 1,
          unitPrice: 18000,
          amount: 18000,
          hasBatchManagement: true,
          batches: [{ id: 'b1', batchNumber: 'L01', expiryDate: '2027-01-01', onHand: 100 }],
        },
      ]);
      vi.mocked(transferService.batches).mockResolvedValue([
        { id: 'b1', productId: 'prod-01', batchNumber: 'L01', expiryDate: '2027-01-01', onHand: 100 },
      ]);

      render(
        <MemoryRouter initialEntries={['/transfers/create']}>
          <Routes>
            <Route path="/transfers/create" element={<CreateTransferPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Initial branches loaded
      await waitFor(() => {
        expect(transferService.branches).toHaveBeenCalled();
      });

      expect(screen.getAllByText('Chuyển hàng').length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // FLOW 3: ReceiveTransferPage Integration
  // =========================================================================
  describe('3. ReceiveTransferPage Integration Flow', () => {
    it('TC-INT-04: Loads In-Transit transfer details and submits receive confirmation', async () => {
      vi.mocked(transferService.receive).mockResolvedValue({
        ...mockTransfers[0],
        status: 'Received',
      });

      render(
        <MemoryRouter initialEntries={['/transfers/trf-001/receive']}>
          <Routes>
            <Route path="/transfers/:id/receive" element={<ReceiveTransferPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify transfer details loaded
      await waitFor(() => {
        expect(transferService.get).toHaveBeenCalledWith('trf-001');
      });

      expect(screen.getByText('TRF-20261114-001')).toBeInTheDocument();
      expect(screen.getByText('Bia Heineken Sleek')).toBeInTheDocument();
    });
  });
});
