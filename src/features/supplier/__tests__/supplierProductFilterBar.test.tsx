import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SupplierProductFilterBar } from '../components/products/SupplierProductFilterBar';

const initialValues = {
  supplierId: 'supplier-1',
  categoryFilter: 'ALL',
  statusFilter: 'ALL',
  skus: [], names: [], supplierCodes: [], supplierNames: [],
};

describe('SupplierProductFilterBar interactions', () => {
  it('submits free-typed SKU, product name, supplier code and supplier name', () => {
    const onSearch = vi.fn();
    render(
      <SupplierProductFilterBar
        initialValues={initialValues}
        suppliers={[]}
        products={[]}
        categories={['Đồ uống']}
        onSearch={onSearch}
        onReset={vi.fn()}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'SKU-01' } });
    fireEvent.change(inputs[1], { target: { value: 'Sữa tươi' } });
    fireEvent.change(inputs[2], { target: { value: 'NCC-01' } });
    fireEvent.change(inputs[3], { target: { value: 'Nhà cung cấp A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

    expect(onSearch).toHaveBeenLastCalledWith(expect.objectContaining({
      skus: ['SKU-01'],
      names: ['Sữa tươi'],
      supplierCodes: ['NCC-01'],
      supplierNames: ['Nhà cung cấp A'],
      supplierId: 'supplier-1',
    }));
  });

  it('applies category and status immediately and resets all filters', () => {
    const onSearch = vi.fn();
    const onReset = vi.fn();
    render(
      <SupplierProductFilterBar
        initialValues={initialValues}
        suppliers={[]}
        products={[]}
        categories={['Đồ uống']}
        onSearch={onSearch}
        onReset={onReset}
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Đồ uống' } });
    expect(onSearch).toHaveBeenLastCalledWith(expect.objectContaining({ categoryFilter: 'Đồ uống' }));

    fireEvent.change(selects[1], { target: { value: 'Inactive' } });
    expect(onSearch).toHaveBeenLastCalledWith(expect.objectContaining({ statusFilter: 'Inactive' }));

    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
