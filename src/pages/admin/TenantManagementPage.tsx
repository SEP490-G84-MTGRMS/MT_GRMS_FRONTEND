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

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function fetchAllTenantPages(params: { keyword?: string; status?: string }) {
  const pageSize = 100;
  const firstRes = await tenantApi.getTenants({
    ...params,
    page: 1,
    pageSize,
  });

  if (!firstRes.success || !firstRes.data) {
    return firstRes;
  }

  const firstItems = firstRes.data.items ?? [];
  if (firstItems.length === 0) {
    return firstRes;
  }

  const effectivePageSize = firstRes.data.pageSize || pageSize;
  const totalItems = Math.max(firstRes.data.totalItems ?? firstItems.length, firstItems.length);
  const totalPages = Math.ceil(totalItems / effectivePageSize);

  if (totalPages <= 1) {
    return {
      ...firstRes,
      data: {
        ...firstRes.data,
        items: firstItems,
        totalItems,
      },
    };
  }

  const seenIds = new Set<string>(firstItems.map((item) => item.id));
  const mergedItems = [...firstItems];
  const batchSize = 20;

  for (let startPage = 2; startPage <= totalPages; startPage += batchSize) {
    const endPage = Math.min(startPage + batchSize - 1, totalPages);
    const pageRequests = [];
    for (let page = startPage; page <= endPage; page += 1) {
      pageRequests.push(
        tenantApi.getTenants({
          ...params,
          page,
          pageSize: effectivePageSize,
        }),
      );
    }

    const batchResponses = await Promise.all(pageRequests);
    let addedInBatch = 0;
    for (const pageRes of batchResponses) {
      if (pageRes.success && pageRes.data?.items) {
        for (const item of pageRes.data.items) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            mergedItems.push(item);
            addedInBatch += 1;
          }
        }
      }
    }

    if (addedInBatch === 0) {
      break;
    }
  }

  return {
    ...firstRes,
    data: {
      ...firstRes.data,
      items: mergedItems,
      totalItems: Math.max(totalItems, mergedItems.length),
    },
  };
}

export const TenantManagementPage: FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [allMatchedTenants, setAllMatchedTenants] = useState<Tenant[]>([]);
  const [totalMatchedCount, setTotalMatchedCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'all' | PlanType>('all');

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isGraceOpen, setIsGraceOpen] = useState(false);
  const [isLockOpen, setIsLockOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTenants = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    try {
      setIsLoading(true);
      const keywordParam = debouncedQuery || undefined;
      const [listRes, summaryRes] = await Promise.all([
        fetchAllTenantPages({
          keyword: keywordParam,
          status: activeTab !== 'all' ? activeTab.toUpperCase() : undefined,
        }),
        activeTab === 'all'
          ? Promise.resolve(null)
          : fetchAllTenantPages({
              keyword: keywordParam,
            }),
      ]);

      if (reqId !== requestIdRef.current) return;

      if (listRes.success && listRes.data) {
        const mappedList = listRes.data.items.map(mapBackendTenantToFrontend);
        setTenants(mappedList);
        if (activeTab === 'all') {
          setAllMatchedTenants(mappedList);
          setTotalMatchedCount(Math.max(listRes.data.totalItems ?? mappedList.length, mappedList.length));
        } else if (summaryRes?.success && summaryRes.data) {
          const mappedSummary = summaryRes.data.items.map(mapBackendTenantToFrontend);
          setAllMatchedTenants(mappedSummary);
          setTotalMatchedCount(Math.max(summaryRes.data.totalItems ?? mappedSummary.length, mappedSummary.length));
        }
      } else {
        showToast(listRes.message || 'Không thể tải danh sách khách thuê', 'warning');
      }
    } catch (err: unknown) {
      if (reqId !== requestIdRef.current) return;
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || 'Lỗi khi kết nối với máy chủ Backend', 'warning');
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedQuery, activeTab]);

  useEffect(() => {
    void fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tenants.filter((t) => {
      const matchTab = activeTab === 'all' || t.status === activeTab;
      const matchPlan = selectedPlan === 'all' || t.plan === selectedPlan;
      const matchQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.subdomain.toLowerCase().includes(q) ||
        t.taxCode.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q) ||
        t.ownerPhone.toLowerCase().includes(q);

      return matchTab && matchPlan && matchQuery;
    });
  }, [tenants, activeTab, selectedPlan, searchQuery]);

  const tabCounts = useMemo(() => {
    const source = allMatchedTenants.length > 0 || activeTab === 'all' ? allMatchedTenants : tenants;
    return {
      all: Math.max(source.length, totalMatchedCount),
      active: source.filter((t) => t.status === 'active').length,
      expiring: source.filter((t) => t.status === 'expiring').length,
      grace: source.filter((t) => t.status === 'grace').length,
      pending: source.filter((t) => t.status === 'pending').length,
      locked: source.filter((t) => t.status === 'locked').length,
    };
  }, [allMatchedTenants, tenants, activeTab, totalMatchedCount]);

  const handleExportExcel = () => {
    const headers = [
      'Mã Subdomain',
      'Tên Cửa Hàng',
      'Mã Số Thuế',
      'Tỉnh/Thành Phố',
      'Chủ Cửa Hàng',
      'Email Chủ Cửa Hàng',
      'Số Điện Thoại',
      'Gói Dịch Vụ',
      'Số Chi Nhánh',
      'Số Nhân Sự',
      'Hạn Hợp Đồng',
      'Trạng Thái',
    ];
    const rows = filteredTenants.map((t) => [
      escapeCsvCell(t.subdomain),
      escapeCsvCell(t.name),
      escapeCsvCell(t.taxCode),
      escapeCsvCell(t.city),
      escapeCsvCell(t.ownerName),
      escapeCsvCell(t.ownerEmail),
      escapeCsvCell(t.ownerPhone),
      escapeCsvCell(t.planName || t.plan),
      escapeCsvCell(`${t.branchCount}/${t.maxBranches === 'unlimited' ? 'Unlimited' : t.maxBranches}`),
      escapeCsvCell(`${t.staffCount}/${t.maxStaff === 'unlimited' ? 'Unlimited' : t.maxStaff}`),
      escapeCsvCell(t.expiryDate || 'Chưa kích hoạt'),
      escapeCsvCell(t.status.toUpperCase()),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `MT_GRMS_Tenants_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      `Đã xuất danh sách ${filteredTenants.length} khách hàng ra tệp CSV/Excel thành công!`,
      'success',
    );
  };

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
          prev.map((t) => (t.id === tenant.id ? { ...t, status: 'active', lockType: undefined } : t)),
        );
        setAllMatchedTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? { ...t, status: 'active', lockType: undefined } : t)),
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
        showToast(`Đã gia hạn thành công ${days} ngày cho chuỗi ${tenant.name}.`, 'success');
        void fetchTenants();
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
        showToast(
          `Đã áp dụng lệnh khóa (${lockType === 'hard' ? 'Hard-Lock' : 'Soft-Lock'}) cho ${tenant.name}.`,
          'warning',
        );
        void fetchTenants();
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
      <AdminToast toast={toast} onClose={() => setToast(null)} />

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
            onClick={handleExportExcel}
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
          totalCount={tabCounts.all}
        />
      </div>

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
