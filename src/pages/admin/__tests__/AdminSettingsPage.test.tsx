/** @vitest-environment jsdom */
import '@testing-library/jest-dom';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { AdminSettingsPage } from '../AdminSettingsPage';
import { settingsApi } from '../../../features/admin/api';

vi.mock('../../../features/admin/api', () => ({
  settingsApi: { getSettings: vi.fn(), updateSettings: vi.fn() },
}));

const setting = {
  id: 1, trialDays: 3, gracePeriodDays: 7, branchAddonPriceMonthly: 80000,
  storageAddonPricePerGbMonthly: 15000, masterBankCode: 'TEST', masterBankName: 'Test Bank',
  masterAccountNumber: '123456', masterAccountName: 'TEST ACCOUNT',
  supportHotline: '19001234', supportEmail: 'support@example.com', supportZalo: '0901234567',
  isMaintenanceMode: false, maintenanceMessage: '', maintenanceExpectedEndTime: null,
  updatedAt: '2026-11-15T10:00:00Z', updatedBy: 'ADMIN',
};

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.mocked(settingsApi.getSettings).mockReset().mockResolvedValue({ success: true, data: setting });
    vi.mocked(settingsApi.updateSettings).mockReset().mockResolvedValue({ success: true, data: setting });
  });
  afterEach(cleanup);

  it('loads settings, renders all four sections and uses the canonical saved response', async () => {
    render(<AdminSettingsPage />);
    expect(await screen.findByRole('heading', { name: 'Chính sách SaaS' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tài khoản Master VietQR' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Liên hệ CSKH' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bảo trì hệ thống' })).toBeInTheDocument();
    const email = screen.getByLabelText('Email hỗ trợ');
    expect(email).toHaveValue(setting.supportEmail);
    fireEvent.change(email, { target: { value: 'new@example.com' } });
    vi.mocked(settingsApi.updateSettings).mockResolvedValue({
      success: true, data: { ...setting, supportEmail: 'canonical@example.com' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Lưu thay đổi' })[0]);
    await waitFor(() => expect(email).toHaveValue('canonical@example.com'));
    expect(screen.getAllByRole('button', { name: 'Lưu thay đổi' })[0]).toBeDisabled();
  });

  it('keeps invalid hotline and sub-cent prices out of the update request', async () => {
    render(<AdminSettingsPage />);
    const phone = await screen.findByLabelText('Hotline hỗ trợ');
    const form = phone.closest('form')!;
    fireEvent.change(phone, { target: { value: '123' } });
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('8 đến 15');
    fireEvent.change(phone, { target: { value: '1900 6522' } });
    fireEvent.change(screen.getByLabelText(/Mua thêm chi nhánh/), { target: { value: '0.001' } });
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('2 chữ số thập phân');
    expect(settingsApi.updateSettings).not.toHaveBeenCalled();
  });

  it('shows a retry state instead of editable defaults when loading fails', async () => {
    vi.mocked(settingsApi.getSettings).mockRejectedValue(new Error('Unavailable'));
    render(<AdminSettingsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được cấu hình');
    expect(screen.queryByLabelText('Số tài khoản')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    vi.mocked(settingsApi.getSettings).mockResolvedValue({ success: true, data: setting });
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByLabelText('Số tài khoản')).toHaveValue('123456');
  });

  it('converts maintenance time from Vietnam local time to UTC and retains input on save failure', async () => {
    vi.mocked(settingsApi.updateSettings).mockRejectedValue(new Error('Save failed'));
    render(<AdminSettingsPage />);
    const date = await screen.findByLabelText('Dự kiến hoàn tất (giờ Việt Nam)');
    fireEvent.change(date, { target: { value: '2026-12-02T13:30' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Lưu thay đổi' })[0]);
    await waitFor(() => expect(settingsApi.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ maintenanceExpectedEndTime: '2026-12-02T06:30:00.000Z' }),
    ));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(date).toHaveValue('2026-12-02T13:30');
  });
});
