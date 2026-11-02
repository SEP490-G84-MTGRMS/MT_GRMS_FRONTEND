import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductDeleteConfirmModal } from '../components/ProductDeleteConfirmModal';

describe('ProductDeleteConfirmModal', () => {
  it('không render khi isOpen = false', () => {
    const { container } = render(
      <ProductDeleteConfirmModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('render modal xác nhận xóa đơn lẻ với tên và mã hàng hóa', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ProductDeleteConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        productName="Nước tăng lực Sting Dâu 330ml"
        productCode="SP000001"
      />
    );

    expect(screen.getByText('Xác nhận xóa hàng hóa')).toBeDefined();
    expect(screen.getByText('"Nước tăng lực Sting Dâu 330ml"')).toBeDefined();
    expect(screen.getByText('SP000001')).toBeDefined();

    // Click nút Đồng ý xóa
    const confirmBtn = screen.getByRole('button', { name: /Đồng ý xóa/i });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    // Click nút Hủy bỏ
    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('render modal xác nhận xóa hàng loạt khi itemCount > 1', () => {
    const handleConfirm = vi.fn();

    render(
      <ProductDeleteConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        itemCount={5}
      />
    );

    expect(screen.getByText('Xóa 5 hàng hóa đã chọn?')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByRole('button', { name: /Đồng ý xóa/i })).toBeDefined();
  });

  it('vô hiệu hóa các nút bấm khi isDeleting = true', () => {
    render(
      <ProductDeleteConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isDeleting={true}
      />
    );

    expect(screen.getByText('Đang xóa...')).toBeDefined();
    const confirmBtn = screen.getByRole('button', { name: /Đang xóa.../i });
    expect(confirmBtn).toHaveProperty('disabled', true);
  });
});
