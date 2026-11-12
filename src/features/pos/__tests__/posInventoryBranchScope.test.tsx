import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PosInventoryLookupModal } from '../components/modals/PosInventoryLookupModal';
import { httpClient } from '../../../api/httpClient';
import type { Product } from '../types/pos.types';

vi.mock('../../../api/httpClient', () => ({ httpClient: { get: vi.fn() } }));
const product: Product = { id: 'product-1', sku: 'SKU-1', barcode: '123', name: 'Hàng tại chi nhánh', category: 'Food', baseUnit: 'Chai', basePrice: 10000, costPrice: 5000, quantityOnHand: 999 };
const otherProduct: Product = { id: 'product-2', sku: 'SKU-2', barcode: '456', name: 'Sản phẩm khác', category: 'Food', baseUnit: 'Hộp', basePrice: 20000, costPrice: 10000, quantityOnHand: 12 };
const response = (code: string) => ({ data: { data: [{ batchId: code, batchCode: code, mfgDate: '2029-01-01', expiryDate: '2030-01-01', daysLeft: 100, quantityOnHand: 20, reservedQty: 3, availableQty: 17, status: 'Normal' }] } });
const props = { isOpen: true, onClose: vi.fn(), currentBranchId: 'branch-a', currentBranchName: 'Chi nhánh A', products: [product, otherProduct] };
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const scanProductBarcode = (value = '123') => {
  const input = screen.getByLabelText('Tìm sản phẩm tại chi nhánh');
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('POS inventory branch scope', () => {
  it('does not show product suggestion pills or auto-load batches before scanning/searching', () => {
    render(<PosInventoryLookupModal {...props} />);
    expect(screen.queryByRole('button', { name: product.name })).toBeNull();
    expect(screen.queryByRole('button', { name: otherProduct.name })).toBeNull();
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it('shows POS search dropdown when typing name and selects clicked product', async () => {
    vi.mocked(httpClient.get).mockResolvedValue(response('LOT-DROPDOWN'));
    render(<PosInventoryLookupModal {...props} />);
    const input = screen.getByLabelText('Tìm sản phẩm tại chi nhánh');
    fireEvent.change(input, { target: { value: 'chi nhánh' } });
    const item = await screen.findByText('Hàng tại chi nhánh');
    fireEvent.click(item);
    await screen.findByText('LOT-DROPDOWN');
  });

  it('loads actual batches for the selected product and branch', async () => {
    vi.mocked(httpClient.get).mockResolvedValue(response('LOT-A'));
    render(<PosInventoryLookupModal {...props} />);
    scanProductBarcode('123');
    await screen.findByText('LOT-A');
    expect(httpClient.get).toHaveBeenCalledWith('/inventory/product-1/batches', expect.objectContaining({ params: { branchId: 'branch-a' } }));
    expect(screen.queryByText(/An Nhiên Mart/)).toBeNull();
    expect(screen.getByText('20 Chai')).toBeTruthy();
    expect(screen.getByText('3 Chai')).toBeTruthy();
    expect(screen.getByText('17 Chai')).toBeTruthy();
    expect(screen.queryByText('999 Chai')).toBeNull();
  });

  it('renders multiple lots as separate FEFO rows', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: { data: [
      { ...response('LOT-LATE').data.data[0], batchId: 'late', batchCode: 'LOT-LATE', expiryDate: '2030-06-01', availableQty: 8 },
      { ...response('LOT-EARLY').data.data[0], batchId: 'early', batchCode: 'LOT-EARLY', expiryDate: '2030-01-01', availableQty: 17 },
    ] } });
    render(<PosInventoryLookupModal {...props} />);
    scanProductBarcode('SKU-1');
    const table = await screen.findByRole('table');
    expect(table.textContent).toContain('LOT-EARLY');
    expect(table.textContent).toContain('LOT-LATE');
    expect(screen.getByText('17 Chai')).toBeTruthy();
    expect(screen.getByText('8 Chai')).toBeTruthy();
    expect(table.textContent?.indexOf('LOT-EARLY')).toBeLessThan(table.textContent?.indexOf('LOT-LATE') ?? 0);
  });

  it('ignores the previous branch response after switching branches', async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void;
    vi.mocked(httpClient.get).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    vi.mocked(httpClient.get).mockResolvedValueOnce(response('LOT-B'));
    const view = render(<PosInventoryLookupModal {...props} />);
    scanProductBarcode('123');
    await waitFor(() => expect(httpClient.get).toHaveBeenCalledTimes(1));
    view.rerender(<PosInventoryLookupModal {...props} currentBranchId="branch-b" currentBranchName="Chi nhánh B" />);
    await screen.findByText('LOT-B');
    await act(async () => { resolveOld(response('STALE-LOT-A')); });
    expect(screen.queryByText('STALE-LOT-A')).toBeNull();
    expect(screen.getByText('LOT-B')).toBeTruthy();
  });

  it('shows a load error instead of creating sample batches', async () => {
    vi.mocked(httpClient.get).mockRejectedValue(new Error('offline'));
    render(<PosInventoryLookupModal {...props} />);
    scanProductBarcode('123');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/BATCH-AN|LÔ-FEFO/)).toBeNull();
  });
});
