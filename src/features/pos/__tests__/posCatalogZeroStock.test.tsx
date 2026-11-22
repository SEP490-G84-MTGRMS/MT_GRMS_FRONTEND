import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PosCatalogGrid } from '../components/PosCatalogGrid';
import type { Product } from '../types/pos.types';

describe('POS catalog stock guard', () => {
  it('does not add an out of stock product by card, keyboard, or plus button', () => {
    const onAddToCart = vi.fn();
    const product = {
      id: 'out-of-stock', name: 'Cá hồi', category: 'Thịt cá', baseUnit: 'Khay',
      basePrice: 186000, quantityOnHand: 0,
    } as Product;
    render(<PosCatalogGrid products={[product]} categories={[{ id: 'all', name: 'Tất cả', count: 1 }]} onAddToCart={onAddToCart} />);

    const card = screen.getByText('Cá hồi').closest('.pos-product-card')!;
    const addButton = screen.getByRole('button', { name: 'Thêm Cá hồi vào hóa đơn' }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.click(addButton);
    expect(onAddToCart).not.toHaveBeenCalled();
  });
});
