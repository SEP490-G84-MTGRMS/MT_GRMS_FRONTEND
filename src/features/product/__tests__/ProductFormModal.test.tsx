import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const mockCategories = [
  {
    id: 'cat-1',
    code: 'CAT01',
    name: 'Đồ uống',
    productCount: 5,
  },
];

describe('ProductFormModal - Quản lý đơn vị tính & Hàng cùng loại (REQ-05, REQ-06)', () => {
  it('REQ-05: Nút "+ Thêm đơn vị" bị disabled khi đơn vị cơ bản rỗng, và enabled khi đã nhập', () => {
    render(
      <ProductFormModal
        isOpen={true}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    // Lấy ô Tên đơn vị cơ bản
    const baseUnitInput = screen.getByPlaceholderText(/Chai/i) as HTMLInputElement;

    // Ban đầu chưa nhập đơn vị cơ bản -> Nút "+ Thêm đơn vị" bị disabled
    const addUnitBtn = screen.getByText('+ Thêm đơn vị') as HTMLButtonElement;
    expect(addUnitBtn.disabled).toBe(true);
    expect(screen.getByText('(Cần nhập tên đơn vị cơ bản trước)')).toBeDefined();

    // Nhập tên đơn vị cơ bản "chai"
    fireEvent.change(baseUnitInput, { target: { value: 'chai' } });

    // Nút "+ Thêm đơn vị" chuyển sang enabled
    expect(addUnitBtn.disabled).toBe(false);
    expect(screen.queryByText('(Cần nhập tên đơn vị cơ bản trước)')).toBeNull();
  });

  it('REQ-06: Bảng "Hàng cùng loại" tự động xuất hiện khi thêm đơn vị quy đổi', () => {
    render(
      <ProductFormModal
        isOpen={true}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    // Ban đầu chưa có đơn vị quy đổi, bảng "Hàng cùng loại" không hiển thị
    expect(screen.queryByText('Hàng cùng loại')).toBeNull();

    // Nhập đơn vị cơ bản "chai"
    const baseUnitInput = screen.getByPlaceholderText(/Chai/i);
    fireEvent.change(baseUnitInput, { target: { value: 'chai' } });

    // Click "+ Thêm đơn vị"
    const addUnitBtn = screen.getByText('+ Thêm đơn vị');
    fireEvent.click(addUnitBtn);

    // Bảng "Hàng cùng loại" xuất hiện với tiêu đề và các cột chuẩn
    expect(screen.getByText('Hàng cùng loại')).toBeDefined();
    expect(screen.getByText('Thiết lập giá')).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Đơn vị' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Quy đổi' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Mã hàng' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Mã vạch' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Giá vốn' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Giá bán' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Tồn kho' })).toBeDefined();

    // Dòng 1 hiển thị tên đơn vị cơ bản "chai" trong bảng
    expect(screen.getAllByText('chai').length).toBeGreaterThan(0);

    // Nhập tên đơn vị quy đổi "thung"
    const uomNameInput = screen.getByPlaceholderText('thùng, lốc...');
    fireEvent.change(uomNameInput, { target: { value: 'thung' } });

    // Trong bảng hàng cùng loại xuất hiện dòng "thung"
    expect(screen.getByText('thung')).toBeDefined();
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
    fireEvent.click(removeButtons[0]);

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

  it('REQ-10: Tự động tính tiền đơn vị quy đổi theo giá bán đơn vị cơ bản khi thay đổi tỷ lệ quy đổi', () => {
    render(
      <ProductFormModal
        isOpen={true}
        categories={mockCategories}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpenCreateCategoryModal={vi.fn()}
      />
    );

    // Nhập giá bán đơn vị cơ bản: 10,000 đ
    const sellingPriceInputs = screen.getAllByPlaceholderText('0');
    // Ô giá bán
    fireEvent.change(sellingPriceInputs[1], { target: { value: '10000' } });

    // Nhập đơn vị cơ bản "chai"
    const baseUnitInput = screen.getByPlaceholderText(/Chai/i);
    fireEvent.change(baseUnitInput, { target: { value: 'chai' } });

    // Thêm đơn vị quy đổi
    const addUnitBtn = screen.getByText('+ Thêm đơn vị');
    fireEvent.click(addUnitBtn);

    // Tìm ô conversionRate trong bảng "Hàng cùng loại" hoặc form
    const rateInputs = screen.getAllByPlaceholderText('1');
    // Thay đổi số lượng quy đổi thành 6 (Lốc 6)
    fireEvent.change(rateInputs[0], { target: { value: '6' } });

    // Giá bán của đơn vị quy đổi phải tự động thành 60,000 đ (6 * 10,000)
    expect(screen.getAllByDisplayValue('60000').length).toBeGreaterThan(0);
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
    expect(screen.getByText('Vui lòng nhập tên sản phẩm (Bắt buộc).')).toBeDefined();
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
    const enlargeBtn = screen.getByText('Xem to');
    fireEvent.click(enlargeBtn);

    // Lightbox modal mở ra với nút "Đóng xem ảnh"
    expect(screen.getByTitle('Đóng xem ảnh')).toBeDefined();
    expect(screen.getByAltText('Chi tiết ảnh hàng hóa')).toBeDefined();

    // Đóng popup
    fireEvent.click(screen.getByTitle('Đóng xem ảnh'));
    expect(screen.queryByTitle('Đóng xem ảnh')).toBeNull();
  });
});
