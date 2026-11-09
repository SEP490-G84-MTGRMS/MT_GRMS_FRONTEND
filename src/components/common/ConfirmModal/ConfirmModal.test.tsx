import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  it('không render khi isOpen = false', () => {
    const { container } = render(
      <ConfirmModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Xác nhận xóa"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('render modal xác nhận xóa đơn lẻ với tên và mã', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Xác nhận xóa nhân viên"
        itemName="Trần Thị B"
        itemCode="NV0002"
      />
    );

    expect(screen.getByText('Xác nhận xóa nhân viên')).toBeDefined();
    expect(screen.getByText('"Trần Thị B"')).toBeDefined();
    expect(screen.getByText('NV0002')).toBeDefined();

    // Click nút Đồng ý xóa
    const confirmBtn = screen.getByRole('button', { name: /Đồng ý xóa/i });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    // Click nút Hủy bỏ
    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('vô hiệu hóa các nút khi isLoading = true', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Xác nhận xóa"
        isLoading={true}
      />
    );

    expect(screen.getByText('Đang xử lý...')).toBeDefined();
    const confirmBtn = screen.getByRole('button', { name: /Đang xử lý.../i });
    expect(confirmBtn).toHaveProperty('disabled', true);
  });
});

