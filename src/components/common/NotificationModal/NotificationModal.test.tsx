import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationModal } from './NotificationModal';

describe('NotificationModal', () => {
  it('không render khi isOpen = false', () => {
    const { container } = render(
      <NotificationModal
        isOpen={false}
        onClose={vi.fn()}
        title="Thông báo"
        message="Nội dung"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('render đúng tiêu đề, nội dung và mã khi isOpen = true', () => {
    const handleClose = vi.fn();
    render(
      <NotificationModal
        isOpen={true}
        onClose={handleClose}
        type="success"
        title="Cập nhật nhân viên thành công"
        message="Thông tin nhân viên Nguyễn Văn A đã được lưu."
        itemCode="NV0001"
      />
    );

    expect(screen.getByText('Cập nhật nhân viên thành công')).toBeDefined();
    expect(screen.getByText('Thông tin nhân viên Nguyễn Văn A đã được lưu.')).toBeDefined();
    expect(screen.getByText('NV0001')).toBeDefined();

    // Click nút Đã hiểu
    const btn = screen.getByRole('button', { name: /Đã hiểu/i });
    fireEvent.click(btn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('đóng modal khi bấm nút X', () => {
    const handleClose = vi.fn();
    render(
      <NotificationModal
        isOpen={true}
        onClose={handleClose}
        title="Xóa thành công"
        message="Đã xóa mục thành công"
      />
    );

    const closeBtn = screen.getByTitle('Đóng');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

