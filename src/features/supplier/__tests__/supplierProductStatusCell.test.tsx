import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SupplierProductTableRow } from '../components/products/SupplierProductTableRow';
import type { SupplierProductItem } from '../types/supplier.types';

const product = (status: SupplierProductItem['status']): SupplierProductItem => ({
  id: `supplier-product-${status}`,
  supplierId: 'supplier-1',
  productId: 'product-1',
  barcode: '8938505974197',
  sku: 'SKU-001',
  name: 'Sản phẩm kiểm thử',
  deliveryUoM: 'Thùng',
  baseUoM: 'Cái',
  agreedPrice: 100_000,
  effectivePrice: 100_000,
  moq: 1,
  allowedShortageQty: 0,
  isPrimary: true,
  effectiveDate: '2026-11-19',
  status,
});

describe('SupplierProductTableRow status UX', () => {
  it.each([
    ['Active', 'Hoạt động'],
    ['Inactive', 'Tạm ngưng'],
  ] as const)('shows the full %s status without ellipsis', (status, label) => {
    render(
      <table>
        <tbody>
          <SupplierProductTableRow
            index={1}
            item={product(status)}
            supplierCode="NCC-001"
            supplierName="Nhà cung cấp kiểm thử"
            onEdit={vi.fn()}
          />
        </tbody>
      </table>
    );

    const statusText = screen.getByText(label);
    const statusCell = statusText.closest('td');

    expect(statusCell).not.toBeNull();
    expect(statusCell?.classList.contains('so-list-td--status')).toBe(true);
    expect(statusCell?.getAttribute('title')).toBe(label);
    expect((statusCell as HTMLTableCellElement).style.minWidth).toBe('96px');
  });
});
