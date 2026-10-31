import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductFormModal } from '../components/ProductFormModal';

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
    const baseUnitInput = screen.getByPlaceholderText('chai') as HTMLInputElement;

    // Xóa rỗng đơn vị cơ bản
    fireEvent.change(baseUnitInput, { target: { value: '' } });

    // Nút "+ Thêm đơn vị" phải bị disabled
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
    const baseUnitInput = screen.getByPlaceholderText('chai');
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
});
