// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../../features/auth/authService';
import { ApiError } from '../../../features/auth/authTypes';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChangePasswordModal', () => {
  it('chặn mật khẩu mới yếu hoặc trùng mật khẩu hiện tại trước khi gọi API', () => {
    const spy = vi.spyOn(authService, 'changePassword');
    render(<ChangePasswordModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại *'), {
      target: { value: 'OldPass@123' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới *'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới *'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/8–64 ký tự/i);
    expect(spy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Mật khẩu mới *'), {
      target: { value: 'OldPass@123' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới *'), {
      target: { value: 'OldPass@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/không được trùng với mật khẩu hiện tại/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi từ Backend khi mật khẩu hiện tại không chính xác và không đóng modal', async () => {
    vi.spyOn(authService, 'changePassword').mockRejectedValue(
      new ApiError(400, 'Mật khẩu hiện tại không chính xác.', 'INVALID_CURRENT_PASSWORD'),
    );
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(<ChangePasswordModal onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại *'), {
      target: { value: 'WrongPass@123' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới *'), {
      target: { value: 'NewStrong@456' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới *'), {
      target: { value: 'NewStrong@456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu hiện tại không chính xác.');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('gọi API đổi mật khẩu thật và hiển thị trạng thái thành công khi hợp lệ', async () => {
    const spy = vi.spyOn(authService, 'changePassword').mockResolvedValue({
      message: 'Đổi mật khẩu thành công.',
    });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(<ChangePasswordModal onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại *'), {
      target: { value: 'OldPass@123' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới *'), {
      target: { value: 'NewStrong@456' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới *'), {
      target: { value: 'NewStrong@456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(await screen.findByText('Đổi mật khẩu thành công!')).toBeVisible();
    expect(spy).toHaveBeenCalledWith({
      currentPassword: 'OldPass@123',
      newPassword: 'NewStrong@456',
    });

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      },
      { timeout: 2500 },
    );
  });
});
