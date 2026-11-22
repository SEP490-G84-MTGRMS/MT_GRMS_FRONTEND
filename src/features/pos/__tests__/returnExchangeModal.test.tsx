import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('reduces debt without checking drawer cash for a credit sale return', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const debtInvoice = new InvoiceDTO({ ...invoice, paymentMethod: 'CREDIT', items: [{ ...invoice.items[0], batchId: 'lot-a' }] });
    render(<ReturnExchangeModal isOpen invoice={debtInvoice} availableProducts={availableProducts}
      currentDrawerCash={0} onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
    expect(screen.getByText(/Trừ công nợ khách hàng/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Đổi \/ Trả Hàng/ }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      settlementMethod: 'REDUCE_DEBT',
      returnedItems: [expect.objectContaining({ quantity: 1, batchId: 'lot-a' })],
    })));
  });

  it('allows choosing return condition before entering quantity', () => {
    render(<ReturnExchangeModal isOpen invoice={invoice} availableProducts={availableProducts}
      currentDrawerCash={500000} onClose={vi.fn()} onConfirm={vi.fn()} />);
    const condition = screen.getByLabelText('Tình trạng hàng trả Mì Hảo Hảo Tôm Chua Cay') as HTMLSelectElement;
    expect(condition.disabled).toBe(false);
    fireEvent.change(condition, { target: { value: 'Damaged' } });
    expect(condition.value).toBe('Damaged');
  });

  it('shows the backend reason when a return is rejected with 422', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onConfirm = vi.fn().mockRejectedValue({ response: { status: 422, data: { code: 'RETURN_BATCH_EXPIRED', message: 'Lô đã hết hạn sử dụng.' } } });
    const tracedInvoice = new InvoiceDTO({ ...invoice, items: [{ ...invoice.items[0], batchId: 'lot-a' }] });
    render(<ReturnExchangeModal isOpen invoice={tracedInvoice} availableProducts={availableProducts}
      currentDrawerCash={500000} onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Đổi \/ Trả Hàng/ }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Lỗi khi xử lý đổi/trả hàng: Lô đã hết hạn sử dụng.'));
  });

  it('requires damaged condition before returning an expired lot', async () => {
    const { httpClient } = await import('../../../api/httpClient');
    vi.spyOn(httpClient, 'get').mockResolvedValue({ data: { data: [{ batchId: 'lot-expired', expiryDate: '2020-01-01T00:00:00' }] } });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const tracedInvoice = new InvoiceDTO({ ...invoice, branchId: 'BR-01', items: [{ ...invoice.items[0], stockAllocations: [
      { branchStockId: 'lot-expired', batchCode: 'EXP', quantityBase: 3, returnedBase: 0 },
    ] }] });
    render(<ReturnExchangeModal isOpen invoice={tracedInvoice} availableProducts={availableProducts}
      currentDrawerCash={500000} onClose={vi.fn()} onConfirm={onConfirm} />);
    await screen.findByText(/HSD: 01\/01\/2020/);
    fireEvent.change(screen.getByLabelText('Số lượng hoàn lô EXP'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Đổi \/ Trả Hàng/ }));

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('không thể nhập lại kho bán'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('sends the selected sold lot and damaged condition for a returned item', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const tracedInvoice = new InvoiceDTO({
      ...invoice,
      items: [{ ...invoice.items[0], stockAllocations: [
        { branchStockId: 'lot-a', batchCode: 'A', quantityBase: 1, returnedBase: 0 },
        { branchStockId: 'lot-b', batchCode: 'B', quantityBase: 2, returnedBase: 0 },
      ] }],
    });
    render(<ReturnExchangeModal isOpen invoice={tracedInvoice} availableProducts={availableProducts}
      currentDrawerCash={500000} onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByLabelText('Số lượng hoàn lô B'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Tình trạng hàng trả Mì Hảo Hảo Tôm Chua Cay'), { target: { value: 'Damaged' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Đổi \/ Trả Hàng/ }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      returnedItems: [expect.objectContaining({ batchId: 'lot-b', condition: 'Damaged', quantity: 1 })],
    })));
  });

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

  it('splits a return across sold lots and hides unrelated branch lots', async () => {
    const { httpClient } = await import('../../../api/httpClient');
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: {
        data: [
          { batchId: 'lot-a', batchCode: 'BATCH-A', expiryDate: '2026-12-15T00:00:00', daysLeft: 2, availableQty: 2, status: 'Active' },
          { batchId: 'lot-c', batchCode: 'BATCH-C', daysLeft: 11, availableQty: 25, status: 'Active' },
          { batchId: 'lot-exp', batchCode: 'BATCH-EXP', daysLeft: -3, availableQty: 5, status: 'Active' },
        ],
      },
    });

    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const fefoInvoice = new InvoiceDTO({
      ...invoice,
      branchId: 'BR-01',
      items: [{
        ...invoice.items[0],
        stockAllocations: [
          { branchStockId: 'lot-a', batchCode: 'BATCH-A', quantityBase: 1, returnedBase: 0 },
          { branchStockId: 'lot-b', batchCode: 'BATCH-B', quantityBase: 2, returnedBase: 0 },
        ],
      }],
    });

    render(
      <ReturnExchangeModal
        isOpen
        invoice={fefoInvoice}
        availableProducts={availableProducts}
        currentDrawerCash={500000}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => expect(screen.getByText(/HSD: 15\/12\/2026/)).toBeTruthy());
    expect(screen.queryByText(/BATCH-C/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Số lượng hoàn lô BATCH-A'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Số lượng hoàn lô BATCH-B'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Đổi \/ Trả Hàng/ }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      returnedItems: [
        expect.objectContaining({ batchId: 'lot-a', condition: 'Restock', quantity: 1 }),
        expect.objectContaining({ batchId: 'lot-b', condition: 'Restock', quantity: 2 }),
      ],
    })));
  });
});
