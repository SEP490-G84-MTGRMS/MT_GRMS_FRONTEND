import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboardPage } from '../AdminDashboardPage';
import { dashboardApi } from '../../../features/admin/api';

vi.mock('../../../features/admin/api', () => ({
  dashboardApi: {
    getKpis: vi.fn(),
    getMonthlyAnalytics: vi.fn(),
    getUrgentAlerts: vi.fn(),
  },
  tenantApi: {
    getById: vi.fn(),
    extendGrace: vi.fn(),
    lock: vi.fn(),
  },
  mapBackendTenantDetailToFrontend: vi.fn(),
}));

vi.mock('../../../features/admin/components', () => ({
  KpiCard: ({ metric }: { metric: { id: string; title: string; value: string } }) => (
    <article data-testid={`kpi-${metric.id}`}>
      <span>{metric.title}</span>
      <strong>{metric.value}</strong>
    </article>
  ),
  UrgentAlertTable: () => <div>Urgent alerts</div>,
  DashboardAnalyticsChart: () => <div>Analytics chart</div>,
  TenantDetailModal: () => null,
  ExtendGraceModal: () => null,
  ApplyLockModal: () => null,
  AdminToast: () => null,
  RefreshIcon: () => <span aria-hidden="true">refresh</span>,
}));

const mockedDashboardApi = vi.mocked(dashboardApi);

const renderPage = () => render(
  <MemoryRouter>
    <AdminDashboardPage />
  </MemoryRouter>,
);

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDashboardApi.getMonthlyAnalytics.mockResolvedValue({ success: true, data: [] });
    mockedDashboardApi.getUrgentAlerts.mockResolvedValue({ success: true, data: [] });
  });

  it('renders the three real SaaS KPI values including zero', async () => {
    mockedDashboardApi.getKpis.mockResolvedValue({
      success: true,
      data: [
        { id: 'mrr', title: 'Doanh thu tháng (MRR)', value: '348.000', subText: '', icon: '', iconBg: '', iconColor: '' },
        { id: 'total_tenants', title: 'Tổng số tenant', value: '4', subText: '', icon: '', iconBg: '', iconColor: '' },
        { id: 'successful_upgrades', title: 'Nâng cấp gói thành công', value: '0', subText: '', icon: '', iconBg: '', iconColor: '' },
      ],
    });

    renderPage();

    expect((await screen.findByTestId('kpi-mrr')).textContent).toContain('348.000');
    expect(screen.getByTestId('kpi-total_tenants').textContent).toContain('4');
    expect(screen.getByTestId('kpi-successful_upgrades').textContent).toContain('0');
  });

  it('shows an error without mock fallback and retries successfully', async () => {
    mockedDashboardApi.getKpis
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        success: true,
        data: [
          { id: 'mrr', title: 'MRR', value: '0', subText: '', icon: '', iconBg: '', iconColor: '' },
        ],
      });

    renderPage();

    expect((await screen.findByRole('alert')).textContent).toContain('Không thể tải số liệu vận hành SaaS');
    expect(screen.queryByTestId('kpi-mrr')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));

    await waitFor(() => expect(screen.getByTestId('kpi-mrr').textContent).toContain('0'));
    expect(mockedDashboardApi.getKpis).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state when the API returns no KPI rows', async () => {
    mockedDashboardApi.getKpis.mockResolvedValue({ success: true, data: [] });

    renderPage();

    expect(await screen.findByText('Chưa có dữ liệu thống kê.')).toBeDefined();
  });
});
