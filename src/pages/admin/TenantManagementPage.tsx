import { useState, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { mockTenants } from '../../features/admin/data/mockAdminData';
import {
  type FilterTabType,
  TenantSearchToolbar,
  TenantDataTable,
  TenantDetailModal,
  ExtendGraceModal,
  ApplyLockModal,
  AdminToast,
  type ToastState,
  ExportIcon,
  PlusIcon,
} from '../../features/admin/components';
import type { Tenant, PlanType, LockType } from '../../features/admin/types/admin.types';

export const TenantManagementPage: FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [activeTab, setActiveTab] = useState<FilterTabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'all' | PlanType>('all');

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
    setSelectedTenant(tenant);
    setIsDetailOpen(true);
  };

  const handleLock = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsLockOpen(true);
  };

  const handleUnlock = (tenant: Tenant) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenant.id ? { ...t, status: 'active', lockType: undefined } : t))
    );
    showToast(`Đã dỡ bỏ lệnh khóa và phục hồi dịch vụ cho chuỗi ${tenant.name}.`, 'success');
  };

  const handleExtendGrace = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsGraceOpen(true);
  };

  const handleExtendGraceSubmit = (tenant: Tenant, days: number) => {
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenant.id
          ? {
              ...t,
              status: 'active',
              graceDaysRemaining: (t.graceDaysRemaining || 0) + days,
              expiryDate: `Đã gia hạn +${days}d`,
            }
          : t
      )
    );
    showToast(`Đã gia hạn thành công ${days} ngày cho chuỗi ${tenant.name}.`, 'success');
  };

  const handleApplyLockSubmit = (tenant: Tenant, lockType: LockType) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenant.id ? { ...t, status: 'locked', lockType } : t))
    );
    showToast(
      `Đã áp dụng lệnh khóa (${lockType === 'hard' ? 'Hard-Lock' : 'Soft-Lock'}) cho ${tenant.name}.`,
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

      {/* Tenant Data Table */}
      <TenantDataTable
        tenants={filteredTenants}
        onDetail={handleDetail}
        onLock={handleLock}
        onUnlock={handleUnlock}
        onExtendGrace={handleExtendGrace}
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
                      className="admin-search-input"
                      style={{ paddingLeft: 14 }}
                      placeholder="VD: Chuỗi Tạp Hóa Kim Ngân"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Tên miền phụ (Subdomain) <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="text"
                        className="admin-search-input"
                        style={{ paddingLeft: 14, fontFamily: 'var(--font-mono)' }}
                        placeholder="kimngan-mart"
                        required
                      />
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>.mtgrms.vn</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Mã số thuế (MST) <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-search-input"
                      style={{ paddingLeft: 14 }}
                      placeholder="0108999888"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Gói Dịch Vụ Khởi Tạo <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <select
                      style={{
                        height: 40,
                        padding: '0 12px',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: '#ffffff',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    >
                      <option value="advanced">Gói Nâng Cao (Advanced) - 599k/th</option>
                      <option value="basic">Gói Cơ Bản (Basic) - 299k/th</option>
                      <option value="enterprise">Gói Doanh Nghiệp (Enterprise) - 1.499k/th</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Họ và Tên Chủ Sở Hữu <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-search-input"
                      style={{ paddingLeft: 14 }}
                      placeholder="Trần Kim Ngân"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Email Đăng Nhập Quản Trị <span style={{ color: 'var(--red-accent)' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="admin-search-input"
                      style={{ paddingLeft: 14 }}
                      placeholder="kimngan@gmail.com"
                      required
                    />
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
                  Xác nhận Cấp phát Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
