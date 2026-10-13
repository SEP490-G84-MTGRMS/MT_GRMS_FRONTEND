import { useState, useRef } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  mockKpiMetrics,
  mockUrgentAlertTenants,
  mockTenants,
  mockMonthlyAnalytics,
} from '../../features/admin/data/mockAdminData';
import {
  KpiCard,
  UrgentAlertTable,
  DashboardAnalyticsChart,
  TenantDetailModal,
  ExtendGraceModal,
  ApplyLockModal,
  AdminToast,
  type ToastState,
  RefreshIcon,
  ExportIcon,
} from '../../features/admin/components';
import type { Tenant, LockType } from '../../features/admin/types/admin.types';

export const AdminDashboardPage: FC = () => {
  const navigate = useNavigate();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGraceOpen, setIsGraceOpen] = useState(false);
  const [isLockOpen, setIsLockOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  const handleOpenDetailBySubdomain = (subdomain: string) => {
    const found = mockTenants.find((t) => t.subdomain === subdomain) || mockTenants[0];
    setSelectedTenant(found);
    setIsDetailOpen(true);
  };

  const handleOpenGraceBySubdomain = (subdomain: string) => {
    const found = mockTenants.find((t) => t.subdomain === subdomain) || mockTenants[0];
    setSelectedTenant(found);
    setIsGraceOpen(true);
  };

  const handleOpenLockBySubdomain = (subdomain: string) => {
    const found = mockTenants.find((t) => t.subdomain === subdomain) || mockTenants[0];
    setSelectedTenant(found);
    setIsLockOpen(true);
  };

  const handleExtendGraceSubmit = (tenant: Tenant, days: number) => {
    showToast(`Đã gia hạn thêm ${days} ngày ân hạn thành công cho chuỗi ${tenant.name}.`, 'success');
  };

  const handleApplyLockSubmit = (tenant: Tenant, lockType: LockType) => {
    showToast(
      `Đã thi hành lệnh ${lockType === 'hard' ? 'Đình chỉ (Hard-Lock)' : 'Khóa mềm (Soft-Lock)'} đối với ${tenant.name}.`,
      'warning'
    );
  };

  return (
    <div>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1>Tổng quan Nền tảng (Master Dashboard)</h1>
          <p>
            Theo dõi sức khỏe toàn hệ thống SaaS, quy mô chuỗi khách hàng và tốc độ tăng trưởng doanh thu định kỳ.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            style={{
              height: 34,
              padding: '0 28px 0 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontFamily: 'inherit',
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option>30 ngày gần nhất</option>
            <option>Tháng 10/2026</option>
            <option>Quý 4/2026</option>
            <option>Năm 2026</option>
          </select>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => showToast('Dữ liệu hệ thống đã được đồng bộ mới nhất!')}
          >
            <RefreshIcon size={14} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => showToast('Đang kết xuất báo cáo tổng quan ra tệp Excel (.xlsx)...')}
          >
            <ExportIcon size={14} />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* 4 KPI CARDS */}
      <div className="admin-kpi-grid">
        {mockKpiMetrics.map((metric) => (
          <KpiCard
            key={metric.id}
            metric={metric}
            onClick={() => {
              if (metric.id === 'kpi-tenants' || metric.id === 'kpi-active') {
                navigate('/admin/tenants');
              }
            }}
          />
        ))}
      </div>

      {/* BIỂU ĐỒ PHÂN TÍCH TĂNG TRƯỞNG NỀN TẢNG */}
      <DashboardAnalyticsChart data={mockMonthlyAnalytics} />

      {/* URGENT ALERTS TABLE */}
      <UrgentAlertTable
        tenants={mockUrgentAlertTenants}
        onViewAll={() => navigate('/admin/tenants')}
        onDetail={handleOpenDetailBySubdomain}
        onExtendGrace={handleOpenGraceBySubdomain}
        onLock={handleOpenLockBySubdomain}
      />

      {/* Modals */}
      <TenantDetailModal
        tenant={selectedTenant}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onExtendGrace={(t) => {
          setSelectedTenant(t);
          setIsGraceOpen(true);
        }}
        onLock={(t) => {
          setSelectedTenant(t);
          setIsLockOpen(true);
        }}
      />

      <ExtendGraceModal
        tenant={selectedTenant}
        isOpen={isGraceOpen}
        onClose={() => setIsGraceOpen(false)}
        onSubmit={handleExtendGraceSubmit}
      />

      <ApplyLockModal
        tenant={selectedTenant}
        isOpen={isLockOpen}
        onClose={() => setIsLockOpen(false)}
        onSubmit={handleApplyLockSubmit}
      />
    </div>
  );
};
