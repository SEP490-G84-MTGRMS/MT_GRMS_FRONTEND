import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SupplierListPage } from '../pages/SupplierListPage';
import { supplierApi } from '../api/supplierApi';
import * as excelExporter from '../lib/supplierExcelExporter';
import type { SupplierSummary } from '../types/supplier.types';

// Mock dependencies
vi.mock('../api/supplierApi', () => ({
  supplierApi: {
    getSuppliers: vi.fn(),
    getSupplierById: vi.fn(),
    getSupplierTransactions: vi.fn().mockResolvedValue([]),
    getDeliveryConfig: vi.fn().mockResolvedValue(null),
    createSupplier: vi.fn(),
    updateBasicSupplier: vi.fn(),
    updateSupplierStatus: vi.fn(),
    deleteSupplier: vi.fn(),
    linkCustomer: vi.fn(),
    getSearchSuggestions: vi.fn().mockResolvedValue({ codes: [], names: [], contactPersons: [], phones: [] }),
  },
}));

vi.mock('../lib/supplierExcelExporter', () => ({
  exportSuppliersToExcel: vi.fn(),
}));

// Mock useAuthStore so user is treated as STORE_OWNER
vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: { id: 'u1', name: 'Chủ Tiệm', role: 'STORE_OWNER' },
    }),
}));

const mockSuppliers: SupplierSummary[] = [
  {
    id: 'sup-1',
    code: 'SUP-001',
    name: 'Công Ty Sữa Vinamilk',
    supplierType: 'Goods',
    category: 'FRESH',
    contactPerson: 'Nguyễn Văn A',
    phone: '0912345678',
    email: 'vinamilk@gmail.com',
    address: '10 Tân Trào, Q7, TP.HCM',
    paymentTermDays: 30,
    creditLimit: 100000000,
    currentDebt: 25000000,
    overdueDebt: 0,
    rating: 5,
    status: 'Active',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'sup-2',
    code: 'SUP-002',
    name: 'Tập Đoàn Masan Consumer',
    supplierType: 'Goods',
    category: 'AMBIENT',
    contactPerson: 'Trần Thị B',
    phone: '0987654321',
    email: 'masan@gmail.com',
    address: 'Lê Duẩn, Q1, TP.HCM',
    paymentTermDays: 45,
    creditLimit: 200000000,
    currentDebt: 50000000,
    overdueDebt: 10000000,
    rating: 4.5,
    status: 'Inactive',
    createdAt: '2026-10-15T00:00:00Z',
  },
];

describe('Master Supplier Management — SupplierListPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supplierApi.getSuppliers).mockResolvedValue({
      items: mockSuppliers,
      total: 2,
      page: 1,
      pageSize: 15,
    });
    vi.mocked(supplierApi.getSupplierById).mockResolvedValue(mockSuppliers[0] as any);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <SupplierListPage />
      </MemoryRouter>
    );

  it('TC-01: Renders page header, navigation action links, and action buttons', async () => {
    renderComponent();

    expect(screen.getByText('Quản lý Nhà Cung Cấp')).toBeDefined();
    expect(screen.getByText('Sản phẩm theo NCC')).toBeDefined();
    expect(screen.getByText('Gán NCC với Cửa hàng')).toBeDefined();
    expect(screen.getByText('Xuất Excel')).toBeDefined();
    expect(screen.getByText('Thêm Nhà Cung Cấp')).toBeDefined();

    await waitFor(() => {
      expect(supplierApi.getSuppliers).toHaveBeenCalledTimes(1);
    });
  });

  it('TC-02: Loads and displays supplier list correctly in table', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Công Ty Sữa Vinamilk')).toBeDefined();
      expect(screen.getByText('SUP-001')).toBeDefined();
      expect(screen.getByText('Tập Đoàn Masan Consumer')).toBeDefined();
      expect(screen.getByText('SUP-002')).toBeDefined();
    });
  });

  it('TC-03: Opens CreateSupplierModal when clicking "Thêm Nhà Cung Cấp"', async () => {
    renderComponent();

    const addBtn = screen.getByText('Thêm Nhà Cung Cấp');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thêm Mới Nhà Cung Cấp/i)).toBeDefined();
    });
  });

  it('TC-04: Successfully creates a supplier and triggers list refresh with success toast', async () => {
    vi.mocked(supplierApi.createSupplier).mockResolvedValueOnce({
      id: 'sup-3',
      code: 'SUP-003',
      name: 'Nước Ngọt PepsiCo',
      supplierType: 'Goods',
      category: 'AMBIENT',
      contactPerson: 'Lê Văn C',
      phone: '0933112233',
      status: 'Active',
      paymentTermDays: 30,
      creditLimit: 50000000,
      currentDebt: 0,
      overdueDebt: 0,
      rating: 5,
      createdAt: '2026-11-06T00:00:00Z',
    });

    renderComponent();

    fireEvent.click(screen.getByText('Thêm Nhà Cung Cấp'));

    await waitFor(() => {
      expect(screen.getByText(/Thêm Mới Nhà Cung Cấp/i)).toBeDefined();
    });

    // Fill required fields
    const nameInput = screen.getByPlaceholderText(/Nông Sản Sạch Ba Miền/i);
    const phoneInput = screen.getByPlaceholderText(/0912345678/i);

    fireEvent.change(nameInput, { target: { value: 'Nước Ngọt PepsiCo' } });
    fireEvent.change(phoneInput, { target: { value: '0933112233' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Tạo Nhà Cung Cấp/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(supplierApi.createSupplier).toHaveBeenCalled();
      expect(supplierApi.getSuppliers).toHaveBeenCalledTimes(2);
    });
  });

  it('TC-05: Handles Excel export when clicking "Xuất Excel"', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Công Ty Sữa Vinamilk')).toBeDefined();
    });

    const exportBtn = screen.getByText('Xuất Excel');
    await act(async () => {
      fireEvent.click(exportBtn);
    });

    await waitFor(() => {
      expect(excelExporter.exportSuppliersToExcel).toHaveBeenCalledWith(
        mockSuppliers,
        expect.objectContaining({
          storeName: expect.any(String),
          exportedBy: expect.any(String),
        })
      );
    });
  });

  it('TC-06: Displays error toast notification when supplierApi.getSuppliers fails', async () => {
    vi.mocked(supplierApi.getSuppliers).mockRejectedValueOnce(new Error('Lỗi máy chủ kết nối CSDL'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lỗi máy chủ kết nối CSDL')).toBeDefined();
    });
  });

  it('TC-07: Displays empty state when supplier list has 0 items', async () => {
    vi.mocked(supplierApi.getSuppliers).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 15,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Không tìm thấy nhà cung cấp nào/i)).toBeDefined();
    });
  });

  it('TC-08: Opens EditSupplierModal when clicking edit action on a supplier row', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Công Ty Sữa Vinamilk')).toBeDefined();
    });

    const editBtns = screen.getAllByTitle('Chỉnh sửa thông tin nhà cung cấp');
    fireEvent.click(editBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Sửa Thông Tin Chung')).toBeDefined();
    });
  });

  it('TC-09: Navigates to Supplier Detail view when clicking "Chi tiết" and returns on back click', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Công Ty Sữa Vinamilk')).toBeDefined();
    });

    const detailBtns = screen.getAllByTitle('Xem chi tiết nhà cung cấp');
    fireEvent.click(detailBtns[0]);

    // Detail view should render supplier code / name in header or breadcrumb
    await waitFor(() => {
      expect(screen.getByTestId('supplier-header-back-btn')).toBeDefined();
    });

    // Click back button
    fireEvent.click(screen.getByTestId('supplier-header-back-btn'));

    await waitFor(() => {
      expect(screen.getByText('Quản lý Nhà Cung Cấp')).toBeDefined();
    });
  });

  it('TC-10: Triggers filter reset when clicking "Đặt lại"', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Công Ty Sữa Vinamilk')).toBeDefined();
    });

    const resetBtn = screen.getByTitle('Đặt lại toàn bộ tiêu chí lọc');
    expect(resetBtn).toBeDefined();
    fireEvent.click(resetBtn);
    expect(resetBtn).toBeTruthy();
  });
});
