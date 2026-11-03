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
    <div>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1>Quản lý Khách hàng thuê (Tenants)</h1>
          <p>
            Theo dõi danh sách khách hàng doanh nghiệp, quản lý subdomain, tài nguyên và thời hạn hợp đồng dịch vụ.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <span>Cấp phát Tenant mới</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="admin-toolbar-card" style={{ border: '1px solid #cbd5e1', borderRadius: 10 }}>
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

      {/* Modal Cấp phát Tenant mới */}
      {isCreateOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateOpen(false)} role="dialog" aria-modal="true">
          <div className="admin-modal-box" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="admin-modal-title">Cấp phát Khách hàng thuê mới (Create Tenant)</div>
              <button type="button" className="admin-modal-close-btn" onClick={() => setIsCreateOpen(false)}>
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsCreateOpen(false);
                showToast('Đã cấp phát Tenant mới thành công! Hệ thống đã gửi email cấp mật khẩu tạm.', 'success');
              }}
            >
              <div className="admin-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Tên Doanh nghiệp / Chuỗi <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="VD: Siêu thị Hapro Mart"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Subdomain định danh <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="hapro"
                        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        required
                      />
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderLeft: 'none',
                          padding: '8px 12px',
                          fontSize: 13,
                          color: '#64748b',
                          borderTopRightRadius: 6,
                          borderBottomRightRadius: 6,
                        }}
                      >
                        .mtgrms.vn
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Họ tên Chủ chuỗi (Store Owner) <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="VD: Trần Văn Bình"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Email quản trị <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="admin-input"
                      placeholder="binh.tran@hapro.vn"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Số điện thoại hotline <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className="admin-input"
                      placeholder="0912 345 678"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Gói dịch vụ ban đầu <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <select className="admin-input" defaultValue="STARTER">
                      <option value="STARTER">Gói Starter (1 CN, 3 NV)</option>
                      <option value="GROWTH">Gói Growth (5 CN, 15 NV)</option>
                      <option value="ENTERPRISE">Gói Enterprise (20 CN, 50 NV)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Xác nhận cấp phát
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
