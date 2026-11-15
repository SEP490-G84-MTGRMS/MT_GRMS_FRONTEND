import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReturnExchangeModal } from '../components/modals/ReturnExchangeModal';
import { InvoiceDTO } from '../types/inventory.types';
import type { Product } from '../types/pos.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const invoice = new InvoiceDTO({
  orderUuid: 'order-1',
  invoiceId: 'HD2611120001',
  customerName: 'Nguyễn Văn A',
  status: 'COMPLETED',
  items: [
    {
      itemId: 'detail-1',
      productId: 'prod-ret-1',
      productName: 'Mì Hảo Hảo Tôm Chua Cay',
      sku: 'HH001',
      unitName: 'Gói',
      quantity: 3,
      unitPrice: 5000,
      actualPrice: 5000,
      discountAmount: 0,
      totalAmount: 15000,
    },
  ],
});

const availableProducts: Product[] = [
  {
    id: 'prod-new-1',
    sku: 'CC330',
    barcode: '8934563138165',
    name: 'Coca-Cola Lon 330ml',
    category: 'Đồ uống',
    baseUnit: 'Lon',
    basePrice: 10000,
    costPrice: 7000,
    quantityOnHand: 48,
    unitPrices: [
      { unitId: 'u-lon', unitName: 'Lon', conversionRate: 1, price: 10000, isBaseUnit: true },
      { unitId: 'u-thung', unitName: 'Thùng (24 Lon)', conversionRate: 24, price: 230000, isBaseUnit: false },
    ],
  },
  {
    id: 'prod-new-2',
    sku: 'PEP330',
    barcode: '8934588012345',
    name: 'Pepsi Lon 330ml',
    category: 'Đồ uống',
    baseUnit: 'Lon',
    basePrice: 10000,
    costPrice: 7000,
    quantityOnHand: 30,
  },
];

describe('ReturnExchangeModal new item barcode scan & search', () => {
  it('adds exchange product immediately on exact barcode scan and increments on second scan', () => {
    render(
      <ReturnExchangeModal
        isOpen
        invoice={invoice}
        availableProducts={availableProducts}
        currentDrawerCash={500000}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const searchInput = screen.getByLabelText('Quét Barcode hoặc tìm sản phẩm đổi mới');
    fireEvent.change(searchInput, { target: { value: '8934563138165' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(screen.getByText('Coca-Cola Lon 330ml')).toBeTruthy();
    expect(screen.getAllByText('10.000 đ').length).toBeGreaterThanOrEqual(2);

    // Quét lần 2 cùng barcode -> tự tăng số lượng lên 2 và cập nhật tổng tiền đổi 20.000 đ
    fireEvent.change(searchInput, { target: { value: '8934563138165' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    const qtyInput = screen.getByDisplayValue('2') as HTMLInputElement;
    expect(qtyInput.value).toBe('2');
    expect(screen.getAllByText('20.000 đ').length).toBeGreaterThanOrEqual(1);
  });

  it('shows dropdown results when typing partial name and adds clicked product', async () => {
    render(
      <ReturnExchangeModal
        isOpen
        invoice={invoice}
        availableProducts={availableProducts}
        currentDrawerCash={500000}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const searchInput = screen.getByLabelText('Quét Barcode hoặc tìm sản phẩm đổi mới');
    fireEvent.change(searchInput, { target: { value: 'Pepsi' } });

    const option = await screen.findByText('Pepsi Lon 330ml');
    fireEvent.click(option);

    expect(screen.getByText('Pepsi Lon 330ml')).toBeTruthy();
  });

  it('requires non-empty note when OTHER reason is selected', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ReturnExchangeModal
        isOpen
        invoice={invoice}
        availableProducts={availableProducts}
        currentDrawerCash={500000}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const searchInput = screen.getByLabelText('Quét Barcode hoặc tìm sản phẩm đổi mới');
    fireEvent.change(searchInput, { target: { value: '8934563138165' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    const reasonSelect = screen.getByDisplayValue(/Lỗi do Nhà Sản Xuất/);
    fireEvent.change(reasonSelect, { target: { value: 'OTHER' } });

    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Đổi \/ Trả Hàng/ }));
    expect(alertSpy).toHaveBeenCalledWith('Vui lòng nhập chi tiết lý do đổi/trả hàng vào ô ghi chú!');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
