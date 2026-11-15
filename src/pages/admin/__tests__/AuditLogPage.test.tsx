/** @vitest-environment jsdom */
import '@testing-library/jest-dom';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { AuditLogPage } from '../AuditLogPage';
import { auditApi } from '../../../features/admin/api/auditApi';

vi.mock('../../../features/admin/api/auditApi', () => ({
  auditApi: { getAuditLogs: vi.fn() },
}));

const result = {
  items: [{
    id: 'log-1', timestamp: '2026-11-15T02:30:00Z', actorName: 'Quản trị viên',
    actorRole: 'ADMIN', actorEmail: '', actionType: 'TENANT_CREATED',
    actionTitle: 'TENANT_CREATED', targetType: 'Tenant', targetName: 'Tenant',
    targetId: 'tenant-1', tenantId: 'tenant-1', ipAddress: '127.0.0.1',
    userAgent: '', location: '', reason: '', riskLevel: 'INFO' as const,
  }],
  total: 21, page: 1, pageSize: 20, actionTypes: ['TENANT_CREATED'],
};

describe('AuditLogPage', () => {
  beforeEach(() => { vi.mocked(auditApi.getAuditLogs).mockReset().mockResolvedValue(result); });
  afterEach(cleanup);

  it('renders records and total returned by the API', async () => {
    render(<AuditLogPage />);
    expect(screen.getByRole('heading', { name: 'Nhật ký kiểm toán' })).toBeInTheDocument();
    expect(await screen.findByText('Quản trị viên')).toBeInTheDocument();
    expect(screen.getAllByText('21')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Xuất CSV trang này' })).toBeEnabled();
  });

  it('passes the selected action and date filters to the API', async () => {
    render(<AuditLogPage />);
    await screen.findByText('Quản trị viên');
    fireEvent.change(screen.getByRole('combobox', { name: 'Loại hành động' }), { target: { value: 'TENANT_CREATED' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Thời gian' }), { target: { value: 'today' } });
    await waitFor(() => expect(auditApi.getAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ actionType: 'TENANT_CREATED', dateRange: 'today', page: 1 }),
      expect.any(AbortSignal),
    ));
  });

  it('shows a retry action and disables export when the API fails', async () => {
    vi.mocked(auditApi.getAuditLogs).mockRejectedValue(new Error('Unavailable'));
    render(<AuditLogPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được nhật ký');
    expect(screen.getByRole('button', { name: 'Xuất CSV trang này' })).toBeDisabled();
    vi.mocked(auditApi.getAuditLogs).mockResolvedValue(result);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Quản trị viên')).toBeInTheDocument();
  });
});
