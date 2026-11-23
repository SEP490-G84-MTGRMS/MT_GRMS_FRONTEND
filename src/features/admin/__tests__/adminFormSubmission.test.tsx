/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MasterProductModal } from '../components/master-catalog/MasterProductModal';
import { CreateTenantModal } from '../components/tenants/CreateTenantModal';
import { tenantApi } from '../api';

vi.mock('../api', () => ({ tenantApi: { create: vi.fn() } }));
afterEach(cleanup);

it('giữ đơn vị sai trên form và chặn lưu hàng mẫu', () => {
  const save = vi.fn();
  render(<MasterProductModal isOpen onSave={save} onClose={vi.fn()} brands={[]} categories={[]} />);
  fireEvent.change(screen.getByPlaceholderText(/8934563138165/), { target: { value: 'SKU1' } });
  const name = screen.getByPlaceholderText(/Hảo Hảo/);
  fireEvent.change(name, { target: { value: 'Trà xanh' } });
  fireEvent.change(screen.getByPlaceholderText(/Tên ĐVT/), { target: { value: '   ' } });
  fireEvent.submit(name.closest('form')!);
  expect(screen.getByText(/cần tên từ 1 đến 50/)).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

it('kiểm tra tên chủ cửa hàng sau khi bỏ khoảng trắng trước khi tạo', async () => {
  render(<CreateTenantModal onClose={vi.fn()} onCreated={vi.fn()} />);
  const name = screen.getByPlaceholderText('Nhập tên cửa hàng hoặc chuỗi');
  fireEvent.change(name, { target: { value: '21' } });
  fireEvent.change(screen.getByLabelText(/Họ tên|Họ và tên/), { target: { value: ' An1 ' } });
  fireEvent.submit(name.closest('form')!);
  expect((await screen.findByRole('alert')).textContent).toContain('Họ tên chủ cửa hàng');
  expect(tenantApi.create).not.toHaveBeenCalled();
});
