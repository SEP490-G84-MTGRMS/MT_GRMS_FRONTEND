import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminBillingPage } from '../AdminBillingPage';
import { billingApi } from '../../../features/admin/api/billingApi';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminBillingPage />
    </MemoryRouter>
  );

describe('AdminBillingPage', () => {
  beforeEach(() => {
    billingApi.resetMockData();
  });

  it('renders page header, title and description', async () => {
    renderPage();

    expect(screen.getByText('QUẢN TRỊ TÀI CHÍNH NỀN TẢNG')).toBeTruthy();
    expect(screen.getByText('Giao dịch & Hóa đơn SaaS')).toBeTruthy();
    expect(
      screen.getByText(
        /Theo dõi dòng tiền thuê bao gói, nạp quỹ ví VietQR Napas247, mở rộng chi nhánh/i
      )
    ).toBeTruthy();
  });

  it('renders all 4 KPI cards with metrics', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('kpi-total-revenue')).toBeTruthy();
      expect(screen.getByTestId('kpi-month-revenue')).toBeTruthy();
      expect(screen.getByTestId('kpi-success-rate')).toBeTruthy();
      expect(screen.getByTestId('kpi-pending-reconcile')).toBeTruthy();
    });
  });

  it('renders transaction table and filters by search keyword', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('SUB-20261115-9921')).toBeTruthy();
      expect(screen.getAllByText('Chuỗi Siêu Thị An Lạc').length).toBeGreaterThan(0);
    });

    // Search for Lan Anh
    const searchInput = screen.getByPlaceholderText(
      /Tìm theo mã GD, mã hóa đơn, tên chuỗi, subdomain/i
    );
    fireEvent.change(searchInput, { target: { value: 'Lan Anh' } });

    await waitFor(() => {
      expect(screen.getAllByText('Siêu Thị Mini Lan Anh').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('Chuỗi Siêu Thị An Lạc')).toHaveLength(0);
    });
  });

  it('opens electronic invoice modal when clicking Hóa đơn', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('SUB-20261115-9921')).toBeTruthy();
    });

    const invoiceButtons = screen.getAllByRole('button', { name: /Hóa đơn/i });
    fireEvent.click(invoiceButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('HÓA ĐƠN DỊCH VỤ SAAS')).toBeTruthy();
      expect(screen.getByText(/THÔNG TIN ĐƠN VỊ THUÊ DỊCH VỤ/i)).toBeTruthy();
      expect(screen.getByText('In hóa đơn')).toBeTruthy();
    });
  });

  it('allows reconciling a pending transaction', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('WAL-20261115-8120')).toBeTruthy();
    });

    // Find the reconcile "Duyệt" button for pending transaction
    const reconcileButtons = screen.getAllByRole('button', { name: /Duyệt/i });
    expect(reconcileButtons.length).toBeGreaterThan(0);
    fireEvent.click(reconcileButtons[0]);

    // Reconcile modal should appear
    await waitFor(() => {
      expect(screen.getByText('Duyệt đối soát giao dịch thủ công')).toBeTruthy();
    });

    const noteInput = screen.getByPlaceholderText(/Ví dụ: Đã kiểm tra sao kê/i);
    fireEvent.change(noteInput, { target: { value: 'Đã khớp ngân hàng Techcombank' } });

    const confirmButton = screen.getByRole('button', { name: /Xác nhận khớp tiền/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText('Duyệt đối soát giao dịch thủ công')).toBeNull();
    });
  });
});
