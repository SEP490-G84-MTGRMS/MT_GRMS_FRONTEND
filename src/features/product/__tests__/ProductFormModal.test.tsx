import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ProductFormModal } from '../components/ProductFormModal';
import { productApi } from '../api/productApi';

vi.mock('../api/productApi', () => ({
  productApi: {
    getProductUnits: vi.fn().mockResolvedValue([
      {
        id: 'guid-auto-unit-1',
        productId: 'prod-edit-auto-load',
        unitName: 'Thùng 24',
        conversionRate: 24,
        price: 240000,
        barcode: '89300000024',
        isBaseUnit: false,
        createdAt: '2026-10-31',
      },
    ]),
  },
}));

vi.mock('../components/PriceHistoryModal', () => ({
  PriceHistoryModal: ({ productId, productName }: { productId: string; productName: string }) => (
    <div data-testid="master-price-history-modal">{productId}:{productName}</div>
  ),
}));

it('FE-03: Chỉ hiển thị lịch sử giá khi chỉnh sửa và mở đúng sản phẩm', () => {
  const categories = [{ id: 'cat-1', code: 'CAT01', name: 'Đồ uống', productCount: 1 }];
  const productToEdit: any = {
    id: 'product-history-01',
    productCode: 'SP-HISTORY',
    productName: 'Sản phẩm kiểm tra lịch sử',
    categoryId: 'cat-1',
    categoryName: 'Đồ uống',
    baseUnit: 'Chai',
    sellingPrice: 10000,
    costPrice: 7000,
    status: 'Active',
    createdAt: '2026-11-16',
    uomConversions: [],
  };

  const { rerender } = render(
    <ProductFormModal
      isOpen={true}
      productToEdit={null}
      categories={categories}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onOpenCreateCategoryModal={vi.fn()}
    />
  );
  expect(screen.queryByRole('button', { name: /Lịch sử giá/i })).not.toBeInTheDocument();

  rerender(
    <ProductFormModal
      isOpen={true}
      productToEdit={productToEdit}
      categories={categories}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onOpenCreateCategoryModal={vi.fn()}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /Lịch sử giá/i }));
  expect(screen.getByTestId('master-price-history-modal')).toHaveTextContent(
    'product-history-01:Sản phẩm kiểm tra lịch sử'
  );
});

const mockCategories = [
  {
    id: 'cat-1',
    code: 'CAT01',
    name: 'Đồ uống',
    productCount: 5,
  },
];

describe('ProductFormModal - Quản lý đơn vị tính & Hàng cùng loại (REQ-05, REQ-06)', () => {
  it('REQ-05: thêm đơn vị vào bảng đơn vị và giá', () => {
    render(<ProductFormModal isOpen categories={mockCategories} onClose={vi.fn()} onSave={vi.fn()} onOpenCreateCategoryModal={vi.fn()} />);
    const baseUnit = screen.getByPlaceholderText('Hộp, Lốc, Thùng...');
    fireEvent.change(baseUnit, { target: { value: 'Chai' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm đơn vị' }));
    expect(screen.getAllByPlaceholderText('Hộp, Lốc, Thùng...')).toHaveLength(2);
    expect(screen.getAllByDisplayValue('Chai')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Quy đổi' })).toBeInTheDocument();
  });

  it('REQ-09: Ô Mã hàng bị disabled khi chỉnh sửa và enabled khi tạo mới', () => {
    const mockProductToEdit: any = {
      id: 'prod-edit-1',
      productCode: 'SP000099',
      productName: 'Trà xanh C2',
      categoryId: 'cat-1',
      categoryName: 'Đồ uống',
      baseUnit: 'Chai',
      sellingPrice: 10000,
      costPrice: 7000,
      onHand: 50,
      committed: 0,
      status: 'Active',
      createdAt: '2026-10-31',
      updatedAt: '2026-10-31',
      uomConversions: [],
    };

    const { rerender } = render(
      <ProductFormModal
        isOpen={true}
        productToEdit={mockProductToEdit}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    const productCodeInput = screen.getByDisplayValue('SP000099') as HTMLInputElement;
    expect(productCodeInput.disabled).toBe(true);

    // Khi tạo mới (productToEdit = null)
    rerender(
      <ProductFormModal
        isOpen={true}
        productToEdit={null}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    const newCodeInput = screen.getByPlaceholderText('Mã tự động sinh') as HTMLInputElement;
    expect(newCodeInput.disabled).toBe(false);
  });

  it('REQ-09: Ghi nhận deletedUnitIds khi xóa đơn vị quy đổi cũ có sẵn trong DB (GUID) và truyền ra onSave', async () => {
    const handleSave = vi.fn();
    const mockProductWithUnits: any = {
      id: 'prod-edit-1',
      productCode: 'SP000099',
      productName: 'Trà xanh C2',
      categoryId: 'cat-1',
      categoryName: 'Đồ uống',
      baseUnit: 'Chai',
      sellingPrice: 10000,
      costPrice: 7000,
      onHand: 50,
      committed: 0,
      status: 'Active',
      createdAt: '2026-10-31',
      updatedAt: '2026-10-31',
      uomConversions: [
        {
          id: 'guid-existing-unit-1',
          unitName: 'Lốc 6',
          conversionRate: 6,
          price: 55000,
          barcode: '89300000006',
        },
      ],
    };

    render(
      <ProductFormModal
        isOpen={true}
        productToEdit={mockProductWithUnits}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={handleSave}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    // Đơn vị quy đổi "Lốc 6" xuất hiện trong bảng
    expect(screen.getByDisplayValue('Lốc 6')).toBeDefined();

    // Click nút xóa đơn vị quy đổi (title="Xóa đơn vị" hoặc "Xóa đơn vị quy đổi")
    const removeButtons = screen.getAllByTitle(/Xóa đơn vị/);
    expect(removeButtons.length).toBeGreaterThan(0);
    fireEvent.click(within(screen.getByDisplayValue('Lốc 6').closest('tr')!).getByTitle('Xóa đơn vị'));

    // Nhấn nút "Cập nhật"
    const updateButton = screen.getByText('Cập nhật');
    fireEvent.click(updateButton);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        productName: 'Trà xanh C2',
      }),
      false,
      ['guid-existing-unit-1']
    );
  });

  it('REQ-09: Tự động nạp danh sách đơn vị tính qua getProductUnits khi productToEdit chưa có sẵn uomConversions', async () => {
    const mockProductWithoutUnits: any = {
      id: 'prod-edit-auto-load',
      productCode: 'SP000099',
      productName: 'Nước ép cam',
      categoryId: 'cat-1',
      categoryName: 'Đồ uống',
      baseUnit: 'Chai',
      sellingPrice: 15000,
      costPrice: 10000,
      onHand: 30,
      committed: 0,
      status: 'Active',
      createdAt: '2026-10-31',
      updatedAt: '2026-10-31',
      uomConversions: [],
    };

    render(
      <ProductFormModal
        isOpen={true}
        productToEdit={mockProductWithoutUnits}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    // getProductUnits được gọi tự động
    expect(productApi.getProductUnits).toHaveBeenCalledWith('prod-edit-auto-load');

    // Chờ đơn vị tính nạp lên và hiển thị trên giao diện
    await waitFor(() => {
      expect(screen.getByDisplayValue('Thùng 24')).toBeDefined();
    });
  });

  it('REQ-10: Tìm kiếm nhóm hàng hỗ trợ cả tiếng Việt không dấu (vd: "do uong")', async () => {
    render(
      <ProductFormModal
        isOpen={true}
        categories={[
          { id: 'cat-1', code: 'DU', name: 'Đồ uống & Nước giải khát', productCount: 10 },
          { id: 'cat-2', code: 'BK', name: 'Bánh kẹo ăn vặt', productCount: 5 },
        ]}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    // Mở dropdown nhóm hàng
    const dropdownTrigger = screen.getByText('Đồ uống & Nước giải khát');
    fireEvent.click(dropdownTrigger);

    // Ô tìm kiếm nhóm hàng
    const searchInput = screen.getByPlaceholderText(/Tìm kiếm nhóm hàng/i);
    // Nhập từ khóa không dấu "banh keo"
    fireEvent.change(searchInput, { target: { value: 'banh keo' } });

    // Kết quả danh sách dropdown lọc ra "Bánh kẹo ăn vặt" và ẩn "Đồ uống & Nước giải khát"
    expect(screen.getByTestId('category-option-cat-2')).toBeDefined();
    expect(screen.queryByTestId('category-option-cat-1')).toBeNull();
  });

  it('REQ-10: lưu tỷ lệ quy đổi và giá bán riêng của từng đơn vị', () => {
    const onSave = vi.fn();
    render(<ProductFormModal isOpen categories={mockCategories} onClose={vi.fn()} onSave={onSave} onOpenCreateCategoryModal={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Nhập tên sản phẩm (Bắt buộc)'), { target: { value: 'Nước uống' } });
    fireEvent.change(screen.getByPlaceholderText('Hộp, Lốc, Thùng...'), { target: { value: 'Chai' } });
    fireEvent.change(screen.getAllByPlaceholderText('0')[1], { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm đơn vị' }));
    const names = screen.getAllByPlaceholderText('Hộp, Lốc, Thùng...');
    fireEvent.change(names[1], { target: { value: 'Lốc' } });
    fireEvent.change(screen.getByPlaceholderText('4'), { target: { value: '6' } });
    const prices = screen.getAllByPlaceholderText('0');
    fireEvent.change(prices[3], { target: { value: '55000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      sellingPrice: 10000,
      uomConversions: [expect.objectContaining({ unitName: 'Lốc', conversionRate: 6, price: 55000 })],
    }), false, []);
  });

  it('REQ-10: Hiển thị Validation Popup khi submit thiếu thông tin bắt buộc thay vì banner trên form', () => {
    render(
      <ProductFormModal
        isOpen={true}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    // Nhấn nút "Lưu" mà chưa nhập tên sản phẩm
    const saveBtn = screen.getByText('Lưu');
    fireEvent.click(saveBtn);

    // Phải hiển thị modal popup "Thông tin chưa hợp lệ" với nút "Đã hiểu"
    expect(screen.getByText('Thông tin chưa hợp lệ')).toBeDefined();
    expect(screen.getAllByText('Vui lòng nhập tên sản phẩm (Bắt buộc).').length).toBeGreaterThan(0);
    const dismissBtn = screen.getByText('Đã hiểu');
    expect(dismissBtn).toBeDefined();

    // Nhấn nút "Đã hiểu" -> popup biến mất
    fireEvent.click(dismissBtn);
    expect(screen.queryByText('Thông tin chưa hợp lệ')).toBeNull();
  });

  it('REQ-10: Nhấn vào ảnh thumbnail hiển thị Popup xem ảnh to hơn (Lightbox)', () => {
    const mockProductWithImg: any = {
      id: 'prod-img-1',
      productCode: 'SP000088',
      productName: 'Bia Heineken',
      categoryId: 'cat-1',
      categoryName: 'Đồ uống',
      baseUnit: 'Lon',
      sellingPrice: 20000,
      costPrice: 15000,
      onHand: 100,
      committed: 0,
      status: 'Active',
      createdAt: '2026-10-31',
      updatedAt: '2026-10-31',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      uomConversions: [],
    };

    render(
      <ProductFormModal
        isOpen={true}
        productToEdit={mockProductWithImg}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    // Tìm nút "Xem to" hoặc click vào thumbnail
    const enlargeBtn = screen.getByTitle('Ảnh đại diện (Bấm để xem to)');
    fireEvent.click(enlargeBtn);

    // Lightbox modal mở ra với nút "Đóng xem ảnh"
    expect(screen.getByTitle('Đóng xem ảnh')).toBeDefined();
    expect(screen.getByAltText('Chi tiết ảnh hàng hóa')).toBeDefined();

    // Đóng popup
    fireEvent.click(screen.getByTitle('Đóng xem ảnh'));
    expect(screen.queryByTitle('Đóng xem ảnh')).toBeNull();
  });

  it('Kiểm tra nút tickbox Quản lý theo lô & HSD (FEFO) khi chỉnh sửa sản phẩm', async () => {
    const handleSave = vi.fn();
    const mockProduct: any = {
      id: 'prod-edit-1',
      productCode: 'SP000088',
      productName: 'Bia Heineken',
      categoryId: 'cat-1',
      categoryName: 'Đồ uống',
      baseUnit: 'Lon',
      sellingPrice: 20000,
      costPrice: 15000,
      onHand: 100,
      committed: 0,
      status: 'Active',
      createdAt: '2026-10-31',
      updatedAt: '2026-10-31',
      hasBatches: false,
      uomConversions: [],
    };

    render(
      <ProductFormModal
        isOpen={true}
        productToEdit={mockProduct}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={handleSave}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('switch', { name: /Quản lý theo lô & hạn sử dụng/i }) as HTMLInputElement;
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    // Click checkbox để bật quản lý lô
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    // Nhấn Cập nhật (trong chế độ chỉnh sửa)
    const saveBtn = screen.getByText('Cập nhật');
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({ hasBatches: true }),
      false,
      expect.any(Array)
    );
  });
});
