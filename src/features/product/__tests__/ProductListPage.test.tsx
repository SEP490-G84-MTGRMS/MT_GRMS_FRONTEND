import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProductListPage } from '../pages/ProductListPage';
import { productApi } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { useAuthStore } from '../../../stores/useAuthStore';

vi.mock('../api/productApi', () => ({
  productApi: {
    getProductsPaged: vi.fn(),
    getProductUnits: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn(),
    createProductUnit: vi.fn(),
    updateProduct: vi.fn(),
    updateProductUnit: vi.fn(),
    deleteProduct: vi.fn(),
    deleteProductUnit: vi.fn(),
  },
}));

vi.mock('../api/categoryApi', () => ({
  categoryApi: {
    getCategories: vi.fn(),
  },
}));

const mockSampleProduct = {
  id: 'p-1',
  productCode: 'SP000001',
  barcode: '8930000000001',
  name: 'Nước suối Aquafina 500ml',
  categoryId: 'cat-1',
  categoryName: 'Nước uống',
  baseUnit: 'Chai',
  sellingPrice: 5000,
  costPrice: 3500,
  minStock: 10,
  maxStock: 100,
  vatRate: 0,
  status: 'Active',
  hasBatches: false,
  isFavorite: false,
  createdAt: '2026-10-30T00:00:00Z',
};

describe('ProductListPage - Task T3 Server-side Table & Pagination Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'usr-1',
        email: 'owner@mtgrms.vn',
        fullName: 'Chủ Cửa Hàng',
        role: 'STORE_OWNER',
        tenantId: 'tenant_mt_mart_01',
      },
      token: 'mock-token',
      isAuthenticated: true,
    });
  });

  it('render thành công tiêu đề và gọi API lấy danh sách trang đầu tiên', async () => {
    (categoryApi.getCategories as any).mockResolvedValueOnce([
      {
        id: 'cat-1',
        categoryCode: 'CAT-01',
        name: 'Nước uống',
        productCount: 1,
      },
    ]);

    (productApi.getProductsPaged as any).mockResolvedValueOnce({
      items: [mockSampleProduct],
      pageIndex: 1,
      pageSize: 20,
      totalCount: 45,
      totalPages: 3,
      hasPreviousPage: false,
      hasNextPage: true,
    });

    render(<ProductListPage />);

    // Kiểm tra header
    expect(screen.getByRole('heading', { level: 1, name: 'Hàng hóa' })).toBeDefined();

    // Chờ API hoàn thành và hiển thị trên bảng
    await waitFor(() => {
      expect(productApi.getProductsPaged).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 20,
        })
      );
    });

    // Kiểm tra TablePagination component được hiển thị
    expect(screen.getByText(/Hiển thị/)).toBeDefined();
    expect(screen.getAllByText(/hàng hóa/).length).toBeGreaterThan(0);
  });
});

describe('ProductListPage - Task T6 BR-SEC-01 Phân quyền Giá vốn theo Vai trò', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Hiển thị cột "Giá vốn" và giá trị khi vai trò người dùng là STORE_OWNER / StoreOwner', async () => {
    useAuthStore.setState({
      user: {
        id: 'usr-owner',
        email: 'owner@mtgrms.vn',
        fullName: 'Chủ Cửa Hàng',
        role: 'STORE_OWNER',
        tenantId: 'tenant_mt_mart_01',
      },
      token: 'mock-token',
      isAuthenticated: true,
    });

    (categoryApi.getCategories as any).mockResolvedValueOnce([]);
    (productApi.getProductsPaged as any).mockResolvedValueOnce({
      items: [mockSampleProduct],
      pageIndex: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    render(<ProductListPage />);

    await waitFor(() => {
      expect(screen.getByText('Nước suối Aquafina 500ml')).toBeDefined();
    });

    // Phải nhìn thấy header cột "Giá vốn"
    expect(screen.getByRole('columnheader', { name: 'Giá vốn' })).toBeDefined();
    // Phải nhìn thấy giá trị giá vốn formatted (3,500 đ hoặc 3.500 đ)
    const costPriceRegex = /3[.,]500\s*đ/;
    expect(screen.getByText(costPriceRegex)).toBeDefined();
  });

  it('Ẩn hoàn toàn cột "Giá vốn" (cả th và td) khi vai trò người dùng là STAFF / Cashier', async () => {
    useAuthStore.setState({
      user: {
        id: 'usr-cashier',
        email: 'cashier@mtgrms.vn',
        fullName: 'Thu Ngân Quầy',
        role: 'STAFF',
        tenantId: 'tenant_mt_mart_01',
      },
      token: 'mock-token',
      isAuthenticated: true,
    });

    (categoryApi.getCategories as any).mockResolvedValueOnce([]);
    (productApi.getProductsPaged as any).mockResolvedValueOnce({
      items: [mockSampleProduct],
      pageIndex: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    render(<ProductListPage />);

    await waitFor(() => {
      expect(screen.getByText('Nước suối Aquafina 500ml')).toBeDefined();
    });

    // KHÔNG được có header cột "Giá vốn" trong DOM
    expect(screen.queryByRole('columnheader', { name: 'Giá vốn' })).toBeNull();
    // KHÔNG được hiển thị giá trị giá vốn trong DOM
    const costPriceRegex = /3[.,]500\s*đ/;
    expect(screen.queryByText(costPriceRegex)).toBeNull();
    // Vẫn hiển thị giá bán bình thường
    const sellingPriceRegex = /5[.,]000\s*đ/;
    expect(screen.getByText(sellingPriceRegex)).toBeDefined();
  });

  it('hiển thị dropdown đơn vị tính và cập nhật giá bán khi chuyển sang đơn vị quy đổi (REQ-07)', async () => {
    useAuthStore.setState({
      user: {
        id: 'usr-owner',
        email: 'owner@mtgrms.vn',
        fullName: 'Chủ Cửa Hàng',
        role: 'STORE_OWNER',
        tenantId: 'tenant_mt_mart_01',
      },
      token: 'mock-token',
      isAuthenticated: true,
    });

    const mockProductWithUnits = {
      ...mockSampleProduct,
      id: 'p-units',
      name: 'Nước ngọt Coca Cola 320ml',
      baseUnit: 'chai',
      sellingPrice: 10000,
      uomConversions: [
        {
          id: 'uom-coca-thung',
          unitName: 'thung',
          conversionRate: 24,
          price: 220000,
        },
      ],
    };

    (categoryApi.getCategories as any).mockResolvedValueOnce([]);
    (productApi.getProductsPaged as any).mockResolvedValueOnce({
      items: [mockProductWithUnits],
      pageIndex: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    render(<ProductListPage />);

    await waitFor(() => {
      expect(screen.getByText('Nước ngọt Coca Cola 320ml')).toBeDefined();
    });

    // Ban đầu hiển thị đơn vị cơ bản: "chai" và giá bán 10,000 đ
    expect(screen.getByText('chai')).toBeDefined();
    expect(screen.getByText(/10[.,]000\s*đ/)).toBeDefined();

    // Click vào dropdown chọn đơn vị tính
    const unitDropdownBtn = screen.getByTitle(/đơn vị tính/i);
    fireEvent.click(unitDropdownBtn);

    // Menu mở ra hiển thị tùy chọn "thung"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'thung' })).toBeDefined();
    });

    // Click chọn đơn vị "thung"
    const thungOption = screen.getByRole('button', { name: 'thung' });
    fireEvent.click(thungOption);

    // Dropdown chuyển sang hiển thị "thung" và Giá bán cập nhật thành 220,000 đ
    await waitFor(() => {
      expect(screen.getByText('thung')).toBeDefined();
      expect(screen.getByText(/220[.,]000\s*đ/)).toBeDefined();
    });
  });

  it('cập nhật hàng hóa và đồng bộ đơn vị tính qua API khi lưu chỉnh sửa (REQ-09)', async () => {
    const mockProductWithUnits = {
      ...mockSampleProduct,
      id: 'prod-update-1',
      name: 'Nước tăng lực Sting Dâu 330ml',
      uomConversions: [
        {
          id: 'guid-unit-sting-1',
          unitName: 'Lốc 6 lon',
          conversionRate: 6,
          barcode: '8930000000006',
          price: 58000,
        },
      ],
    };

    (categoryApi.getCategories as any).mockResolvedValue([]);
    (productApi.getProductsPaged as any).mockResolvedValue({
      items: [mockProductWithUnits],
      pageIndex: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    (productApi.updateProduct as any).mockResolvedValue({
      ...mockProductWithUnits,
      name: 'Nước tăng lực Sting Dâu 330ml (Mới)',
    });
    (productApi.deleteProductUnit as any).mockResolvedValue(undefined);
    (productApi.updateProductUnit as any).mockResolvedValue({
      id: 'guid-unit-sting-1',
      unitName: 'Lốc 6 lon',
      conversionRate: 6,
      price: 60000,
    });

    render(<ProductListPage />);

    await waitFor(() => {
      expect(screen.getByText('Nước tăng lực Sting Dâu 330ml')).toBeDefined();
    });

    // Click vào dòng sản phẩm để mở ProductDetailModal
    const productRow = screen.getByText('Nước tăng lực Sting Dâu 330ml');
    fireEvent.click(productRow);

    // Trong modal chi tiết, click nút "Sửa hàng hóa"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sửa hàng hóa/i })).toBeDefined();
    });
    const editBtn = screen.getByRole('button', { name: /Sửa hàng hóa/i });
    fireEvent.click(editBtn);

    // Modal ProductFormModal mở ra, kiểm tra ô tên sản phẩm
    await waitFor(() => {
      expect(screen.getByDisplayValue('Nước tăng lực Sting Dâu 330ml')).toBeDefined();
    });

    // Sửa tên sản phẩm
    const nameInput = screen.getByDisplayValue('Nước tăng lực Sting Dâu 330ml');
    fireEvent.change(nameInput, { target: { value: 'Nước tăng lực Sting Dâu 330ml (Mới)' } });

    // Click nút "Cập nhật"
    const updateBtn = screen.getByText('Cập nhật');
    fireEvent.click(updateBtn);

    // Xác minh productApi.updateProduct và productApi.updateProductUnit được gọi
    await waitFor(() => {
      expect(productApi.updateProduct).toHaveBeenCalledWith(
        'prod-update-1',
        expect.objectContaining({
          name: 'Nước tăng lực Sting Dâu 330ml (Mới)',
        })
      );
      expect(productApi.updateProductUnit).toHaveBeenCalledWith(
        'guid-unit-sting-1',
        expect.objectContaining({
          unitName: 'Lốc 6 lon',
          price: 58000,
        })
      );
    });
  });

  it('xóa sản phẩm từ bảng hiển thị modal xác nhận và gọi API deleteProduct khi người dùng xác nhận', async () => {
    (categoryApi.getCategories as any).mockResolvedValue([
      { id: 'cat-1', name: 'Nước uống', productCount: 1 },
    ]);
    (productApi.getProductsPaged as any).mockResolvedValue({
      items: [mockSampleProduct],
      pageIndex: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    (productApi.deleteProduct as any).mockResolvedValue(undefined);

    render(<ProductListPage />);

    await waitFor(() => {
      expect(screen.getByText('Nước suối Aquafina 500ml')).toBeDefined();
    });

    // Click vào dòng sản phẩm để mở modal chi tiết
    const rowItem = screen.getByText('Nước suối Aquafina 500ml');
    fireEvent.click(rowItem);

    // Trong modal chi tiết, click nút "Xóa"
    await waitFor(() => {
      expect(screen.getByTitle('Xóa hàng hóa')).toBeDefined();
    });
    const deleteBtn = screen.getByTitle('Xóa hàng hóa');
    fireEvent.click(deleteBtn);

    // Modal xác nhận xuất hiện
    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa hàng hóa')).toBeDefined();
      expect(screen.getByText('"Nước suối Aquafina 500ml"')).toBeDefined();
    });

    // Bấm nút Xác nhận xóa
    const confirmBtn = screen.getByRole('button', { name: /Đồng ý xóa/i });
    fireEvent.click(confirmBtn);

    // Xác minh productApi.deleteProduct được gọi với ID sản phẩm
    await waitFor(() => {
      expect(productApi.deleteProduct).toHaveBeenCalledWith('p-1');
    });
  });

  it('xóa hàng loạt khi chọn checkbox sản phẩm và xác nhận trong modal', async () => {
    (categoryApi.getCategories as any).mockResolvedValue([
      { id: 'cat-1', name: 'Nước uống', productCount: 1 },
    ]);
    (productApi.getProductsPaged as any).mockResolvedValue({
      items: [mockSampleProduct],
      pageIndex: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    (productApi.deleteProduct as any).mockResolvedValue(undefined);

    render(<ProductListPage />);

    await waitFor(() => {
      expect(screen.getByText('Nước suối Aquafina 500ml')).toBeDefined();
    });

    // Chọn checkbox của sản phẩm p-1
    const checkboxes = screen.getAllByRole('checkbox');
    // checkbox[1] là checkbox của dòng p-1
    fireEvent.click(checkboxes[1]);

    // Thanh tác vụ hàng loạt xuất hiện
    await waitFor(() => {
      expect(screen.getByText('Đã chọn 1 hàng hóa')).toBeDefined();
    });

    // Click nút "Xóa đã chọn"
    const bulkDeleteBtn = screen.getByText('Xóa đã chọn');
    fireEvent.click(bulkDeleteBtn);

    // Modal xác nhận xóa hàng loạt xuất hiện
    await waitFor(() => {
      expect(screen.getByText('Xóa 1 hàng hóa đã chọn?')).toBeDefined();
    });

    // Bấm nút Xác nhận xóa trong modal
    const confirmBtn = screen.getByRole('button', { name: /Đồng ý xóa/i });
    fireEvent.click(confirmBtn);

    // Xác minh productApi.deleteProduct được gọi
    await waitFor(() => {
      expect(productApi.deleteProduct).toHaveBeenCalledWith('p-1');
    });
  });
});
