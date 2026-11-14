import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transferService, toIsoDate, mapTransfer, getTransferErrorMessage, type ApiTransfer } from '../services/transferService';
import { httpClient } from '../../../api/httpClient';
import type { TransferItem } from '../types';

vi.mock('../../../api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('transferService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('helper: toIsoDate', () => {
    it('chuyển đổi định dạng ngày Việt Nam dd/MM/yyyy sang chuẩn ISO UTC', () => {
      expect(toIsoDate('25/12/2026')).toBe('2026-12-25T00:00:00Z');
      expect(toIsoDate('01/01/2025')).toBe('2025-01-01T00:00:00Z');
    });

    it('chuyển đổi ngày chuẩn ISO hoặc hợp lệ sang ISO string', () => {
      const iso = toIsoDate('2026-05-20');
      expect(iso).toBeDefined();
      expect(iso).toContain('2026-05-20');
    });

    it('trả về undefined khi truyền chuỗi rỗng hoặc giá trị không hợp lệ', () => {
      expect(toIsoDate(undefined)).toBeUndefined();
      expect(toIsoDate('')).toBeUndefined();
      expect(toIsoDate('invalid-date-string')).toBeUndefined();
    });
  });

  describe('helper: getTransferErrorMessage', () => {
    it('ưu tiên message cụ thể trong response lỗi của API', () => {
      expect(getTransferErrorMessage({
        response: { data: { success: false, message: 'Tồn kho khả dụng không đủ.' } },
      })).toBe('Tồn kho khả dụng không đủ.');
    });

    it('đọc lỗi validation ASP.NET Core và giữ fallback cho lỗi thường', () => {
      expect(getTransferErrorMessage({
        response: { data: { errors: { Items: ['Lô hàng không còn tồn tại.'] } } },
      })).toBe('Lô hàng không còn tồn tại.');
      expect(getTransferErrorMessage(new Error('Network Error'))).toBe('Network Error');
    });
  });

  describe('helper: mapTransfer', () => {
    const rawDto: ApiTransfer = {
      id: 'trf-001',
      transferCode: 'TRF2026111301',
      fromBranchId: 'branch-1',
      fromBranchName: 'Chi nhánh Quận 1',
      toBranchId: 'branch-2',
      toBranchName: 'Chi nhánh Quận 3',
      createdBy: 'Admin',
      createdAt: '2026-11-13T10:00:00Z',
      receivedAt: '2026-11-13T14:30:00Z',
      expectedDeliveryDate: '2026-11-14T00:00:00Z',
      status: 'InTransit',
      totalAmount: 1500000,
      note: 'Giao hàng hỏa tốc',
      discrepancyNote: 'Không có chênh lệch',
      cancelReason: undefined,
      items: [
        {
          id: 'detail-01',
          productId: 'prod-01',
          productCode: 'SP001',
          productName: 'Sữa tươi Vinamilk',
          unit: 'Hộp',
          sentQuantity: 10,
          receivedQuantity: 10,
          damagedQuantity: 0,
          batchCode: 'LOT-2026-A',
          expiryDate: '2027-01-01',
          unitPrice: 150000,
          amount: 1500000,
          discrepancyReason: undefined,
        },
      ],
    };

    it('map chính xác trạng thái InTransit sang In-Transit', () => {
      const mapped = mapTransfer(rawDto);
      expect(mapped.status).toBe('In-Transit');
    });

    it('giữ nguyên các trạng thái Draft, Received, Cancelled', () => {
      expect(mapTransfer({ ...rawDto, status: 'Draft' }).status).toBe('Draft');
      expect(mapTransfer({ ...rawDto, status: 'Received' }).status).toBe('Received');
      expect(mapTransfer({ ...rawDto, status: 'Cancelled' }).status).toBe('Cancelled');
    });

    it('map đầy đủ thông tin header và line items', () => {
      const mapped = mapTransfer(rawDto);
      expect(mapped.id).toBe('trf-001');
      expect(mapped.transferCode).toBe('TRF2026111301');
      expect(mapped.fromBranchName).toBe('Chi nhánh Quận 1');
      expect(mapped.toBranchName).toBe('Chi nhánh Quận 3');
      expect(mapped.totalAmount).toBe(1500000);
      expect(mapped.receiveDate).toBeDefined();
      expect(mapped.items).toHaveLength(1);
      expect(mapped.items[0]).toEqual({
        id: 'detail-01',
        productId: 'prod-01',
        productCode: 'SP001',
        productName: 'Sữa tươi Vinamilk',
        unitName: 'Hộp',
        onHandSender: 0,
        onHandReceiver: 0,
        sentQty: 10,
        receivedQty: 10,
        unitPrice: 150000,
        amount: 1500000,
        batchNumber: 'LOT-2026-A',
        expiryDate: '2027-01-01',
        note: undefined,
      });
    });

    it('xử lý an toàn khi items rỗng hoặc undefined', () => {
      const dtoWithoutItems = { ...rawDto, items: undefined as unknown as any[] };
      const mapped = mapTransfer(dtoWithoutItems);
      expect(mapped.items).toEqual([]);
    });
  });

  describe('branches()', () => {
    it('gọi GET /branches với params đúng và map dữ liệu chi nhánh', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                id: 'b-1',
                branchCode: 'CN01',
                name: 'Chi nhánh Hà Nội',
                address: '123 Cầu Giấy',
                phone: '0901234567',
                status: 'Active',
              },
              {
                id: 'b-2',
                code: 'CN02',
                name: 'Chi nhánh Đà Nẵng',
                address: '456 Hải Châu',
                phone: '0907654321',
                status: 'Active',
              },
            ],
          },
        },
      });

      const branches = await transferService.branches();

      expect(httpClient.get).toHaveBeenCalledWith('/branches', {
        params: { pageIndex: 1, pageSize: 100, status: 'Active' },
      });
      expect(branches).toHaveLength(2);
      expect(branches[0]).toEqual({
        id: 'b-1',
        code: 'CN01',
        name: 'Chi nhánh Hà Nội',
        address: '123 Cầu Giấy',
        phone: '0901234567',
      });
      expect(branches[1].code).toBe('CN02');
    });

    it('xử lý an toàn trường hợp API trả về mảng trực tiếp hoặc envelope hoa (Data/Items)', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          Data: {
            Items: [{ id: 'b-3', name: 'Chi nhánh Cần Thơ' }],
          },
        },
      });

      const branches = await transferService.branches();
      expect(branches).toHaveLength(1);
      expect(branches[0].name).toBe('Chi nhánh Cần Thơ');
    });

    it('propagate lỗi khi httpClient ném lỗi', async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('Lỗi mạng khi tải chi nhánh'));
      await expect(transferService.branches()).rejects.toThrow('Lỗi mạng khi tải chi nhánh');
    });
  });

  describe('products()', () => {
    it('gọi GET /branches/:branchId/products với params chuẩn và map TransferItem', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                productId: 'prod-101',
                sku: 'SKU101',
                name: 'Bánh gạo Ichi',
                unit: 'Gói',
                currentStock: 45,
                retailPrice: 25000,
                hasBatches: true,
                batches: [
                  {
                    id: 'batch-01',
                    batchCode: 'BG-001',
                    expiryDate: '2027-06-01',
                    availableQuantity: 30,
                  },
                ],
              },
            ],
          },
        },
      });

      const products = await transferService.products('branch-1');

      expect(httpClient.get).toHaveBeenCalledWith('/branches/branch-1/products', {
        params: { PageIndex: 1, PageSize: 500, Status: 'Active' },
      });
      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        id: 'prod-101',
        productId: 'prod-101',
        productCode: 'SKU101',
        productName: 'Bánh gạo Ichi',
        unitName: 'Gói',
        onHandSender: 45,
        onHandReceiver: 0,
        sentQty: 1,
        unitPrice: 25000,
        amount: 25000,
        hasBatchManagement: true,
        batches: [
          {
            id: 'batch-01',
            batchNumber: 'BG-001',
            expiryDate: '2027-06-01',
            onHand: 30,
          },
        ],
      });
    });

    it('lọc bỏ các bản ghi không có productId', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          data: {
            items: [
              { productId: null, name: 'Sản phẩm lỗi' },
              { productId: 'prod-valid', sku: 'SKU01', name: 'Sản phẩm hợp lệ', currentStock: 10, retailPrice: 5000 },
            ],
          },
        },
      });

      const products = await transferService.products('branch-1');
      expect(products).toHaveLength(1);
      expect(products[0].productId).toBe('prod-valid');
    });

    it('propagate lỗi khi API products thất bại', async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('Network error'));
      await expect(transferService.products('branch-1')).rejects.toThrow('Network error');
    });
  });

  describe('batches() & stockBatches()', () => {
    const mockBatchesResponse = {
      data: {
        data: [
          {
            productId: 'prod-101',
            batchCode: 'L01-2026',
            expiryDate: '2026-12-31',
            availableQuantity: 50,
          },
          {
            productId: 'prod-102',
            batchCode: 'L02-2026',
            expiryDate: '2027-05-15',
            availableQuantity: 100,
          },
        ],
      },
    };

    it('gọi GET /transfers/stock-batches với branchId và map đúng danh sách lô tồn kho', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce(mockBatchesResponse);

      const batches = await transferService.batches('branch-1');

      expect(httpClient.get).toHaveBeenCalledWith('/transfers/stock-batches', {
        params: { branchId: 'branch-1' },
      });
      expect(batches).toHaveLength(2);
      expect(batches[0]).toEqual({
        id: 'prod-101-0',
        productId: 'prod-101',
        batchNumber: 'L01-2026',
        expiryDate: '2026-12-31',
        onHand: 50,
      });
      expect(batches[1]).toEqual({
        id: 'prod-102-1',
        productId: 'prod-102',
        batchNumber: 'L02-2026',
        expiryDate: '2027-05-15',
        onHand: 100,
      });
    });

    it('stockBatches() hoạt động như alias gọi batches()', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce(mockBatchesResponse);

      const batches = await transferService.stockBatches('branch-1');
      expect(httpClient.get).toHaveBeenCalledWith('/transfers/stock-batches', {
        params: { branchId: 'branch-1' },
      });
      expect(batches).toHaveLength(2);
    });

    it('propagate lỗi khi httpClient get batches lỗi', async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('Lỗi tải lô'));
      await expect(transferService.batches('branch-1')).rejects.toThrow('Lỗi tải lô');
    });
  });

  describe('list()', () => {
    it('chuyển đổi params.status từ "In-Transit" sang "InTransit" khi gửi request', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          data: {
            items: [],
            totalItems: 0,
          },
        },
      });

      await transferService.list({
        status: 'In-Transit',
        page: 1,
        pageSize: 15,
        search: 'TRF001',
      });

      expect(httpClient.get).toHaveBeenCalledWith('/transfers', {
        params: {
          status: 'InTransit',
          page: 1,
          pageSize: 15,
          search: 'TRF001',
        },
      });
    });

    it('giữ nguyên các giá trị status khác trong params', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          data: {
            items: [],
            totalItems: 0,
          },
        },
      });

      await transferService.list({ status: 'Draft' });

      expect(httpClient.get).toHaveBeenCalledWith('/transfers', {
        params: { status: 'Draft' },
      });
    });

    it('chuẩn hóa mảng trạng thái và ngày lọc theo contract API', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { data: { items: [], totalCount: 0 } } });
      await transferService.list({
        statuses: ['Draft', 'In-Transit'],
        fromDate: '2026-11-01',
        toDate: '2026-11-15',
        dateField: 'receive',
      });
      expect(httpClient.get).toHaveBeenCalledWith('/transfers', {
        params: {
          statuses: ['Draft', 'InTransit'],
          fromDate: '2026-11-01T00:00:00',
          toDate: '2026-11-15T00:00:00',
          dateField: 'receive',
        },
      });
    });

    it('map chính xác status InTransit từ backend sang In-Transit ở kết quả trả về', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                id: 'trf-1',
                transferCode: 'TRF001',
                fromBranchId: 'b1',
                fromBranchName: 'Kho Tổng',
                toBranchId: 'b2',
                toBranchName: 'Kho Nhánh',
                createdBy: 'UserA',
                createdAt: '2026-11-13T08:00:00Z',
                status: 'InTransit',
                totalAmount: 500000,
                items: [],
              },
              {
                id: 'trf-2',
                transferCode: 'TRF002',
                fromBranchId: 'b1',
                fromBranchName: 'Kho Tổng',
                toBranchId: 'b2',
                toBranchName: 'Kho Nhánh',
                createdBy: 'UserB',
                createdAt: '2026-11-13T09:00:00Z',
                status: 'Draft',
                totalAmount: 300000,
                items: [],
              },
            ],
            totalItems: 2,
          },
        },
      });

      const result = await transferService.list();

      expect(result.totalItems).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].status).toBe('In-Transit');
      expect(result.items[1].status).toBe('Draft');
    });

    it('xử lý an toàn khi backend trả về envelope Data/TotalItems viết hoa', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          Data: {
            Items: [
              {
                id: 'trf-3',
                transferCode: 'TRF003',
                fromBranchId: 'b1',
                fromBranchName: 'Kho A',
                toBranchId: 'b2',
                toBranchName: 'Kho B',
                createdBy: 'Admin',
                createdAt: '2026-11-13T08:00:00Z',
                status: 'Received',
                totalAmount: 200000,
                items: [],
              },
            ],
            TotalItems: 1,
          },
        },
      });

      const result = await transferService.list();
      expect(result.totalItems).toBe(1);
      expect(result.items[0].transferCode).toBe('TRF003');
      expect(result.items[0].status).toBe('Received');
    });

    it('đọc totalCount từ contract trang API', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { data: { items: [], totalCount: 17 } } });
      await expect(transferService.list()).resolves.toMatchObject({ items: [], totalItems: 17 });
    });

    it('propagate lỗi khi gọi API list thất bại', async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('Lỗi mạng khi tải danh sách'));
      await expect(transferService.list()).rejects.toThrow('Lỗi mạng khi tải danh sách');
    });
  });

  describe('get() & getById()', () => {
    const mockDetail: ApiTransfer = {
      id: 'trf-999',
      transferCode: 'TRF999',
      fromBranchId: 'b1',
      fromBranchName: 'Kho Gửi',
      toBranchId: 'b2',
      toBranchName: 'Kho Đích',
      createdBy: 'ThuKho',
      createdAt: '2026-11-13T07:00:00Z',
      status: 'InTransit',
      totalAmount: 900000,
      items: [
        {
          id: 'item-1',
          productId: 'p-1',
          productCode: 'SP01',
          productName: 'Bia Heineken',
          unit: 'Thùng',
          sentQuantity: 5,
          receivedQuantity: 5,
          damagedQuantity: 0,
          unitPrice: 180000,
          amount: 900000,
        },
      ],
    };

    it('get(id) gọi GET /transfers/:id và trả về TransferOrder đã map', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: { data: mockDetail },
      });

      const transfer = await transferService.get('trf-999');

      expect(httpClient.get).toHaveBeenCalledWith('/transfers/trf-999');
      expect(transfer.id).toBe('trf-999');
      expect(transfer.status).toBe('In-Transit');
      expect(transfer.items).toHaveLength(1);
      expect(transfer.items[0].productName).toBe('Bia Heineken');
    });

    it('getById(id) hoạt động chính xác tương tự get(id)', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: { data: mockDetail },
      });

      const transfer = await transferService.getById('trf-999');

      expect(httpClient.get).toHaveBeenCalledWith('/transfers/trf-999');
      expect(transfer.id).toBe('trf-999');
      expect(transfer.status).toBe('In-Transit');
    });

    it('propagate lỗi khi không tìm thấy phiếu hoặc lỗi server', async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('Phiếu chuyển không tồn tại'));
      await expect(transferService.getById('trf-nonexistent')).rejects.toThrow('Phiếu chuyển không tồn tại');
    });
  });

  describe('create()', () => {
    const inputItems: TransferItem[] = [
      {
        id: 'temp-1',
        productId: 'prod-01',
        productCode: 'SP01',
        productName: 'Mì Omachi',
        unitName: 'Thùng',
        onHandSender: 50,
        onHandReceiver: 10,
        sentQty: 5,
        unitPrice: 200000,
        amount: 1000000,
        batchNumber: 'LOT-OMACHI-01',
        expiryDate: '31/12/2026', // dd/MM/yyyy
      },
    ];

    it('gọi POST /transfers với body được format ngày chuẩn ISO và map response', async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: {
          data: {
            id: 'trf-created-1',
            transferCode: 'TRF123456',
            fromBranchId: 'branch-1',
            fromBranchName: 'Kho 1',
            toBranchId: 'branch-2',
            toBranchName: 'Kho 2',
            createdBy: 'Admin',
            createdAt: '2026-11-13T12:00:00Z',
            status: 'InTransit',
            totalAmount: 1000000,
            items: [
              {
                id: 'detail-1',
                productId: 'prod-01',
                productCode: 'SP01',
                productName: 'Mì Omachi',
                unit: 'Thùng',
                sentQuantity: 5,
                receivedQuantity: 0,
                damagedQuantity: 0,
                batchCode: 'LOT-OMACHI-01',
                expiryDate: '2026-12-31T00:00:00Z',
                unitPrice: 200000,
                amount: 1000000,
              },
            ],
          },
        },
      });

      const result = await transferService.create({
        fromBranchId: 'branch-1',
        toBranchId: 'branch-2',
        dispatchNow: true,
        note: 'Chuyển hàng gấp',
        items: inputItems,
      });

      expect(httpClient.post).toHaveBeenCalledWith('/transfers', {
        fromBranchId: 'branch-1',
        toBranchId: 'branch-2',
        dispatchNow: true,
        note: 'Chuyển hàng gấp',
        items: [
          {
            productId: 'prod-01',
            quantity: 5,
            unit: 'Thùng',
            batchCode: 'LOT-OMACHI-01',
            expiryDate: '2026-12-31T00:00:00Z',
            unitPrice: 200000,
          },
        ],
      });

      expect(result.id).toBe('trf-created-1');
      expect(result.status).toBe('In-Transit');
      expect(result.items[0].sentQty).toBe(5);
    });

    it('propagate lỗi khi tạo phiếu thất bại', async () => {
      vi.mocked(httpClient.post).mockRejectedValueOnce(new Error('Tồn kho không đủ để điều chuyển'));
      await expect(
        transferService.create({
          fromBranchId: 'b1',
          toBranchId: 'b2',
          dispatchNow: false,
          items: inputItems,
        })
      ).rejects.toThrow('Tồn kho không đủ để điều chuyển');
    });
  });

  describe('dispatch()', () => {
    it('gọi POST /transfers/:id/dispatch và map response', async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: {
          data: {
            id: 'trf-001',
            transferCode: 'TRF001',
            fromBranchId: 'b1',
            fromBranchName: 'Kho A',
            toBranchId: 'b2',
            toBranchName: 'Kho B',
            createdBy: 'Admin',
            createdAt: '2026-11-13T10:00:00Z',
            dispatchedAt: '2026-11-13T10:05:00Z',
            status: 'InTransit',
            totalAmount: 500000,
            items: [],
          },
        },
      });

      const result = await transferService.dispatch('trf-001');

      expect(httpClient.post).toHaveBeenCalledWith('/transfers/trf-001/dispatch');
      expect(result.id).toBe('trf-001');
      expect(result.status).toBe('In-Transit');
    });

    it('propagate lỗi khi xuất chuyển thất bại', async () => {
      vi.mocked(httpClient.post).mockRejectedValueOnce(new Error('Phiếu không ở trạng thái Draft'));
      await expect(transferService.dispatch('trf-001')).rejects.toThrow('Phiếu không ở trạng thái Draft');
    });
  });

  describe('receive()', () => {
    const receiveItems: TransferItem[] = [
      {
        id: 'detail-line-1',
        productId: 'prod-01',
        productCode: 'SP01',
        productName: 'Nước mắm Nam Ngư',
        unitName: 'Chai',
        onHandSender: 20,
        onHandReceiver: 10,
        sentQty: 10,
        receivedQty: 9,
        unitPrice: 35000,
        amount: 315000,
        note: 'Thiếu 1 chai do vỡ khi vận chuyển',
      },
    ];

    it('gọi PUT /transfers/:id/receive với chi tiết nhận hàng và lý do chênh lệch', async () => {
      vi.mocked(httpClient.put).mockResolvedValueOnce({
        data: {
          data: {
            id: 'trf-001',
            transferCode: 'TRF001',
            fromBranchId: 'b1',
            fromBranchName: 'Kho A',
            toBranchId: 'b2',
            toBranchName: 'Kho B',
            createdBy: 'Admin',
            createdAt: '2026-11-13T08:00:00Z',
            receivedAt: '2026-11-13T15:00:00Z',
            status: 'Received',
            totalAmount: 315000,
            discrepancyNote: 'Vỡ 1 chai',
            items: [
              {
                id: 'detail-line-1',
                productId: 'prod-01',
                productCode: 'SP01',
                productName: 'Nước mắm Nam Ngư',
                unit: 'Chai',
                sentQuantity: 10,
                receivedQuantity: 9,
                damagedQuantity: 1,
                unitPrice: 35000,
                amount: 315000,
                discrepancyReason: 'Thiếu 1 chai do vỡ khi vận chuyển',
              },
            ],
          },
        },
      });

      const result = await transferService.receive('trf-001', receiveItems, 'Vỡ 1 chai');

      expect(httpClient.put).toHaveBeenCalledWith('/transfers/trf-001/receive', {
        note: 'Vỡ 1 chai',
        items: [
          {
            detailId: 'detail-line-1',
            receivedQuantity: 9,
            damagedQuantity: 0,
            discrepancyReason: 'Thiếu 1 chai do vỡ khi vận chuyển',
          },
        ],
      });

      expect(result.status).toBe('Received');
      expect(result.items[0].receivedQty).toBe(9);
      expect(result.items[0].note).toBe('Thiếu 1 chai do vỡ khi vận chuyển');
    });

    it('sử dụng sentQty làm fallback nếu receivedQty là undefined', async () => {
      const itemsWithoutReceivedQty: TransferItem[] = [
        {
          id: 'detail-line-2',
          productId: 'prod-02',
          productCode: 'SP02',
          productName: 'Đường Biên Hòa',
          unitName: 'Gói',
          onHandSender: 10,
          onHandReceiver: 5,
          sentQty: 4,
          receivedQty: undefined,
          unitPrice: 20000,
          amount: 80000,
        },
      ];

      vi.mocked(httpClient.put).mockResolvedValueOnce({
        data: {
          data: {
            id: 'trf-002',
            transferCode: 'TRF002',
            fromBranchId: 'b1',
            fromBranchName: 'Kho A',
            toBranchId: 'b2',
            toBranchName: 'Kho B',
            createdBy: 'Admin',
            createdAt: '2026-11-13T08:00:00Z',
            status: 'Received',
            totalAmount: 80000,
            items: [],
          },
        },
      });

      await transferService.receive('trf-002', itemsWithoutReceivedQty);

      expect(httpClient.put).toHaveBeenCalledWith('/transfers/trf-002/receive', {
        note: undefined,
        items: [
          {
            detailId: 'detail-line-2',
            receivedQuantity: 4,
            damagedQuantity: 0,
            discrepancyReason: undefined,
          },
        ],
      });
    });

    it('propagate lỗi khi nhận hàng thất bại', async () => {
      vi.mocked(httpClient.put).mockRejectedValueOnce(new Error('Phiếu chưa ở trạng thái Đang chuyển'));
      await expect(transferService.receive('trf-001', receiveItems)).rejects.toThrow(
        'Phiếu chưa ở trạng thái Đang chuyển'
      );
    });
  });

  describe('cancel()', () => {
    it('gọi POST /transfers/:id/cancel với lý do hủy và map response thành công', async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: {
          data: {
            id: 'trf-001',
            transferCode: 'TRF001',
            fromBranchId: 'b1',
            fromBranchName: 'Kho A',
            toBranchId: 'b2',
            toBranchName: 'Kho B',
            createdBy: 'Admin',
            createdAt: '2026-11-13T08:00:00Z',
            status: 'Cancelled',
            cancelReason: 'Xe gặp sự cố không thể giao hàng',
            totalAmount: 500000,
            items: [],
          },
        },
      });

      const result = await transferService.cancel('trf-001', 'Xe gặp sự cố không thể giao hàng');

      expect(httpClient.post).toHaveBeenCalledWith('/transfers/trf-001/cancel', {
        reason: 'Xe gặp sự cố không thể giao hàng',
      });
      expect(result.id).toBe('trf-001');
      expect(result.status).toBe('Cancelled');
      expect(result.cancelReason).toBe('Xe gặp sự cố không thể giao hàng');
    });

    it('propagate lỗi khi hủy phiếu không thành công', async () => {
      vi.mocked(httpClient.post).mockRejectedValueOnce(new Error('Không thể hủy phiếu đã nhận hàng'));
      await expect(
        transferService.cancel('trf-001', 'Hủy phiếu')
      ).rejects.toThrow('Không thể hủy phiếu đã nhận hàng');
    });
  });
});
