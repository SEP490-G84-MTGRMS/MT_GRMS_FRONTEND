// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateUserModal } from '../components/employee-list/CreateUserModal';
import { employeeApi } from '../api/employeeApi';

vi.mock('../api/employeeApi', () => ({
  employeeApi: {
    createIdentityAccount: vi.fn(),
    updateIdentityAccount: vi.fn(),
  },
}));

const AUTH_PASSWORD_ERROR =
  'Mật khẩu phải có 8–64 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.';

describe('CreateUserModal — Password validation synced with Auth module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chặn tạo tài khoản mới khi mật khẩu không đạt chuẩn Auth (ngắn, thiếu chữ hoa/số/ký tự đặc biệt hoặc có khoảng trắng)', async () => {
    const onSuccess = vi.fn();

    render(
      <CreateUserModal
        isOpen
        onClose={vi.fn()}
        employeeId="emp-1"
        employeeName="Nguyễn Văn A"
        phone="0901234567"
        onSuccess={onSuccess}
      />
    );

    const passwordInput = screen.getByPlaceholderText(
      /8–64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt/i
    );
    const confirmInput = screen.getByPlaceholderText(/Nhập lại mật khẩu khởi tạo/i);

    const weakPasswords = ['123456', 'Ab1@xyz', 'staff@123', 'STAFF@123', 'Staff@abc', 'Staff1234', 'Staff @123'];

    for (const weak of weakPasswords) {
      fireEvent.change(passwordInput, { target: { value: weak } });
      fireEvent.change(confirmInput, { target: { value: weak } });
      fireEvent.click(screen.getByRole('button', { name: /Cấp tài khoản/i }));

      expect(screen.getAllByText(AUTH_PASSWORD_ERROR).length).toBeGreaterThan(0);
      expect(employeeApi.createIdentityAccount).not.toHaveBeenCalled();
    }
  });

  it('cho phép tạo tài khoản mới khi mật khẩu đạt chuẩn Auth', async () => {
    vi.mocked(employeeApi.createIdentityAccount).mockResolvedValue({
      userId: 'usr-1',
      username: '0901234567',
      role: 'STAFF',
    });
    const onSuccess = vi.fn();

    render(
      <CreateUserModal
        isOpen
        onClose={vi.fn()}
        employeeId="emp-1"
        employeeName="Nguyễn Văn A"
        phone="0901234567"
        onSuccess={onSuccess}
      />
    );

    const passwordInput = screen.getByPlaceholderText(
      /8–64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt/i
    );
    const confirmInput = screen.getByPlaceholderText(/Nhập lại mật khẩu khởi tạo/i);

    fireEvent.change(passwordInput, { target: { value: 'Staff@2026' } });
    fireEvent.change(confirmInput, { target: { value: 'Staff@2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Cấp tài khoản/i }));

    await waitFor(() => {
      expect(employeeApi.createIdentityAccount).toHaveBeenCalledWith('emp-1', {
        username: '0901234567',
        password: 'Staff@2026',
        role: 'STAFF',
        displayName: 'Nguyễn Văn A',
      });
    });
  });

  it('ở chế độ cập nhật: cho phép bỏ trống mật khẩu nếu không đổi, nhưng chặn nếu nhập mật khẩu mới yếu', async () => {
    vi.mocked(employeeApi.updateIdentityAccount).mockResolvedValue({
      userId: 'usr-1',
      username: 'nv001',
      role: 'STAFF',
    });

    render(
      <CreateUserModal
        isOpen
        onClose={vi.fn()}
        employeeId="emp-1"
        employeeName="Nguyễn Văn A"
        initialUsername="nv001"
        onSuccess={vi.fn()}
      />
    );

    const passwordInput = screen.getByPlaceholderText(/Nhập mật khẩu mới nếu muốn thay đổi/i);
    const confirmInput = screen.getByPlaceholderText(/Nhập lại mật khẩu mới nếu thay đổi/i);

    // Nhập mật khẩu yếu -> bị chặn
    fireEvent.change(passwordInput, { target: { value: 'weak123' } });
    fireEvent.change(confirmInput, { target: { value: 'weak123' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(screen.getAllByText(AUTH_PASSWORD_ERROR).length).toBeGreaterThan(0);
    expect(employeeApi.updateIdentityAccount).not.toHaveBeenCalled();

    // Xóa trống -> hợp lệ (không đổi mật khẩu)
    fireEvent.change(passwordInput, { target: { value: '' } });
    fireEvent.change(confirmInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(employeeApi.updateIdentityAccount).toHaveBeenCalledWith('emp-1', {
        username: 'nv001',
        password: '',
        role: 'STAFF',
        displayName: 'Nguyễn Văn A',
      });
    });
  });
});
