/** @vitest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuditLogPage } from '../AuditLogPage';

// Mock useAuthStore
vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { id: 'admin1', fullName: 'Lê Văn Quản', role: 'ADMIN', isAdmin: true },
    isAuthenticated: true,
  }),
}));

describe('AuditLogPage - FE-22 & FE-26 Platform Governance', () => {
  it('renders hero title, KPI cards, and default Audit Logs tab', async () => {
    render(
      <MemoryRouter>
        <AuditLogPage />
      </MemoryRouter>
    );

    // Hero title
    expect(screen.getByText('Nhật ký Vận hành & Giám sát Tác vụ')).toBeInTheDocument();
    expect(screen.getByText(/Đối soát kiểm toán hành vi quản trị/)).toBeInTheDocument();

    // KPI Cards
    expect(screen.getByText('Tổng hành vi ghi nhận')).toBeInTheDocument();
    expect(screen.getByText('Tác vụ ngầm định kỳ')).toBeInTheDocument();

    // Tab buttons
    expect(screen.getByText('Nhật ký kiểm toán (Audit Logs)')).toBeInTheDocument();
    expect(screen.getByText('Giám sát Cronjob & Tác vụ ngầm (Cronjobs Health)')).toBeInTheDocument();

    // Audit logs table header after loading
    await waitFor(() => {
      expect(screen.getByText('HÀNH VI & ĐỐI TƯỢNG TÁC ĐỘNG')).toBeInTheDocument();
    });
  });

  it('switches to Cronjobs tab and displays all 4 background jobs', async () => {
    render(
      <MemoryRouter>
        <AuditLogPage />
      </MemoryRouter>
    );

    // Switch to Cronjobs tab
    const cronTabBtn = screen.getByText('Giám sát Cronjob & Tác vụ ngầm (Cronjobs Health)');
    fireEvent.click(cronTabBtn);

    // 4 Cron jobs should be rendered
    await waitFor(() => {
      expect(screen.getByText('CRON-TENANT-EXPIRY')).toBeInTheDocument();
      expect(screen.getByText('CRON-CUSTOMER-DEBT')).toBeInTheDocument();
      expect(screen.getByText('CRON-FEFO-BATCH')).toBeInTheDocument();
      expect(screen.getByText('CRON-DB-BACKUP')).toBeInTheDocument();
    });

    // Cron schedule badges
    expect(screen.getByText('0 0 * * *')).toBeInTheDocument();
    expect(screen.getByText('0 6 * * *')).toBeInTheDocument();
    expect(screen.getByText('0 1 * * *')).toBeInTheDocument();
    expect(screen.getByText('0 2 * * *')).toBeInTheDocument();
  });

  it('opens log modal when clicking on an audit log row', async () => {
    render(
      <MemoryRouter>
        <AuditLogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Khóa chuỗi gian hàng (Soft-Lock)')).toBeInTheDocument();
    });

    // Click on the first row
    fireEvent.click(screen.getByText('Khóa chuỗi gian hàng (Soft-Lock)'));

    // Modal with diff should be displayed
    await waitFor(() => {
      expect(screen.getByText('So sánh dữ liệu biến động (Audit State Diff)')).toBeInTheDocument();
      expect(screen.getByText('Dữ liệu trước thay đổi (Old Value)')).toBeInTheDocument();
      expect(screen.getByText('Dữ liệu sau thay đổi (New Value)')).toBeInTheDocument();
    });
  });
});
