import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type FilterTabType,
  TenantSearchToolbar,
  TenantDataTable,
  ExtendGraceModal,
  ApplyLockModal,
  AdminToast,
  type ToastState,
  ExportIcon,
  PlusIcon,
} from '../../features/admin/components';
import type { Tenant, PlanType, LockType } from '../../features/admin/types/admin.types';
import {
  tenantApi,
  mapBackendTenantToFrontend,
} from '../../features/admin/api';
import { Loader2 } from 'lucide-react';
import { CreateTenantModal } from '../../features/admin/components/tenants/CreateTenantModal';
import './adminPlans.css';

export const TenantManagementPage: FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'all' | PlanType>('all');

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isGraceOpen, setIsGraceOpen] = useState(false);
  const [isLockOpen, setIsLockOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  // Fetch tenants from backend
  const fetchTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await tenantApi.getTenants({
        keyword: searchQuery.trim() || undefined,
        status: activeTab !== 'all' ? activeTab.toUpperCase() : undefined,
        pageSize: 100,
      });

      if (res.success && res.data) {
        setTenants(res.data.items.map(mapBackendTenantToFrontend));
      } else {
        showToast(res.message || 'Không thể tải danh sách khách thuê', 'warning');
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || 'Lỗi khi kết nối với máy chủ Backend', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Filtered List
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      // Tab filter
      const matchTab = activeTab === 'all' || t.status === activeTab;
      // Plan filter
      const matchPlan = selectedPlan === 'all' || t.plan === selectedPlan;
      // Search query
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.subdomain.toLowerCase().includes(q) ||
        t.taxCode.includes(q) ||
        t.ownerEmail.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q);

      return matchTab && matchPlan && matchQuery;
    });
  }, [tenants, activeTab, selectedPlan, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: tenants.length,
      active: tenants.filter((t) => t.status === 'active').length,
      expiring: tenants.filter((t) => t.status === 'expiring').length,
      grace: tenants.filter((t) => t.status === 'grace').length,
      pending: tenants.filter((t) => t.status === 'pending').length,
      locked: tenants.filter((t) => t.status === 'locked').length,
    };
  }, [tenants]);

  // Handlers
  const handleDetail = (tenant: Tenant) => {
    navigate(`/admin/tenants/${tenant.id}`);
  };

  const handleLock = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsLockOpen(true);
  };

  const handleUnlock = async (tenant: Tenant) => {
    try {
      const res = await tenantApi.unlock(tenant.id);
      if (res.success) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? { ...t, status: 'active', lockType: undefined } : t))
        );
        showToast(`Đã dỡ bỏ lệnh khóa và phục hồi dịch vụ cho chuỗi ${tenant.name}.`, 'success');
      } else {
        showToast(res.message || 'Không thể mở khóa gian hàng', 'warning');
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || 'Lỗi khi mở khóa gian hàng', 'warning');
    }
  };

  const handleExtendGrace = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsGraceOpen(true);
  };

  const handleExtendGraceSubmit = async (tenant: Tenant, days: number, reason: string) => {
    try {
      const res = await tenantApi.extendGrace(tenant.id, {
        additionalDays: days,
        reason: reason.trim() || 'Gia hạn từ Admin Portal',
      });

      if (res.success) {
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenant.id
              ? {
                  ...t,
                  status: 'grace',
                  graceDaysRemaining: (t.graceDaysRemaining || 0) + days,
                }
              : t
          )
        );
        showToast(`Đã gia hạn thành công ${days} ngày cho chuỗi ${tenant.name}.`, 'success');
        fetchTenants();
      } else {
        showToast(res.message || 'Không thể gia hạn ân hạn', 'warning');
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || 'Lỗi khi gia hạn thời gian ân hạn', 'warning');
    }
  };

  const handleApplyLockSubmit = async (tenant: Tenant, lockType: LockType, reason: string) => {
    try {
      const res = await tenantApi.lock(tenant.id, {
        lockType: lockType.toUpperCase() as 'SOFT' | 'HARD',
        reason: reason.trim() || 'Khóa từ Admin Portal',
      });

      if (res.success) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? { ...t, status: 'locked', lockType } : t))
        );
        showToast(
          `Đã áp dụng lệnh khóa (${lockType === 'hard' ? 'Hard-Lock' : 'Soft-Lock'}) cho ${tenant.name}.`,
          'warning'
        );
        fetchTenants();
      } else {
        showToast(res.message || 'Không thể áp dụng khóa gian hàng', 'warning');
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || 'Lỗi khi áp dụng khóa gian hàng', 'warning');
    }
  };

  return (
    <div className="admin-plans admin-tenant-list" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="plans-hero">
        <div>
          <p className="plans-eyebrow">KHÁCH HÀNG THUÊ</p>
          <h1>Quản lý khách hàng thuê</h1>
          <p>
            Cửa hàng, gói dịch vụ và thời hạn hợp đồng
          </p>
        </div>
        <div className="plans-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => showToast('Đang kết xuất danh sách khách hàng ra tệp Excel (.xlsx)...')}
          >
            <ExportIcon size={14} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <PlusIcon size={14} />
            <span>Tạo cửa hàng mới</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div style={{ flexShrink: 0 }}>
        <TenantSearchToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={activeTab}
          onStatusChange={setActiveTab}
          statusCounts={tabCounts}
          selectedPlan={selectedPlan}
          onPlanChange={setSelectedPlan}
          visibleCount={filteredTenants.length}
          totalCount={tenants.length}
        />
      </div>

      {/* Tenant Data Table / Loading */}
      {isLoading ? (
        <div
          style={{
            background: '#ffffff',
            padding: '48px',
            borderRadius: '12px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color, #e2e8f0)',
            marginTop: '16px',
          }}
        >
          <Loader2 className="animate-spin" size={32} color="var(--blue-primary, #0066ff)" />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Đang nạp danh sách khách hàng từ máy chủ...</span>
        </div>
      ) : (
        <TenantDataTable
          tenants={filteredTenants}
          onDetail={handleDetail}
          onLock={handleLock}
          onUnlock={handleUnlock}
          onExtendGrace={handleExtendGrace}
        />
      )}

      {/* Modals */}
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

      {isCreateOpen && (
        <CreateTenantModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={(id) => {
            setIsCreateOpen(false);
            navigate(`/admin/tenants/${id}`);
          }}
        />
      )}
    </div>
  );
};
