// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StoreInfoTab } from '../components/StoreInfoTab';
import { INITIAL_STORE_INFO } from '../storeData';

describe('StoreInfoTab & EditStoreInfoModal', () => {
  it('renders store info fields and action buttons', () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StoreInfoTab
        storeInfo={INITIAL_STORE_INFO}
        onUpdateStoreInfo={mockUpdate}
      />
    );

    expect(screen.getByText('Thông tin gian hàng')).toBeInTheDocument();
    expect(screen.getByText('Hồ sơ định danh chuỗi')).toBeInTheDocument();
    expect(screen.getByText('Cập nhật thông tin')).toBeInTheDocument();
    expect(screen.getByText('Lưu thay đổi')).toBeInTheDocument();
  });

  it('opens EditStoreInfoModal when clicking "Cập nhật thông tin"', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StoreInfoTab
        storeInfo={INITIAL_STORE_INFO}
        onUpdateStoreInfo={mockUpdate}
      />
    );

    const updateBtn = screen.getByText('Cập nhật thông tin');
    fireEvent.click(updateBtn);

    expect(screen.getByRole('heading', { level: 2, name: /Thông tin gian hàng/i })).toBeInTheDocument();
    expect(screen.getByText('Cập nhật tên chuỗi cửa hàng, mã số thuế, hotline và địa chỉ trụ sở chính.')).toBeInTheDocument();
  });

  it('submits update successfully and calls onUpdateStoreInfo', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StoreInfoTab
        storeInfo={INITIAL_STORE_INFO}
        onUpdateStoreInfo={mockUpdate}
      />
    );

    const saveBtn = screen.getByText('Lưu thay đổi');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(screen.getByText(/Cập nhật thông tin gian hàng thành công!/i)).toBeInTheDocument();
    });
  });
});
