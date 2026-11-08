// src/pages/store/components/BranchManagementTab.tsx
import { useState, useEffect, type FC } from 'react';
import {
  Search,
  Building2,
  Edit2,
  Power,
  RefreshCw,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import {
  branchManagementApi,
  type BranchItemResponse,
  type BranchQuotaResponse,
} from '../api/branchManagementApi';
import { BranchQuotaBar } from './BranchQuotaBar';
import { BranchFormModal } from './BranchFormModal';
import { BranchUpgradeModal } from './BranchUpgradeModal';

interface BranchManagementTabProps {
  onGoToSubscriptions: () => void;
}

export const BranchManagementTab: FC<BranchManagementTabProps> = ({
  onGoToSubscriptions,
}) => {
  const [branches, setBranches] = useState<BranchItemResponse[]>([]);
  const [quota, setQuota] = useState<BranchQuotaResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'upgrade' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchItemResponse | null>(null);

  // 1. Tải hạn mức chi nhánh (Quota) - chỉ cần gọi 1 lần khi mount hoặc khi thêm/sửa chi nhánh
  const fetchQuota = async () => {
    try {
      const quotaRes = await branchManagementApi.getQuota();
      if (quotaRes.success && quotaRes.data) {
        setQuota(quotaRes.data);
      }
    } catch (err) {
      console.error('Failed to load branch quota:', err);
    }
  };

  // 2. Tải danh sách chi nhánh (có hỗ trợ tìm kiếm & lọc)
  const fetchBranches = async (searchKw: string, status: string) => {
    setIsLoading(true);
    try {
      const branchRes = await branchManagementApi.getBranches({
        keyword: searchKw.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        pageSize: 50,
      });

      if (branchRes.success && branchRes.data?.items) {
        setBranches(branchRes.data.items);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Tải quota ban đầu khi vào màn hình
  useEffect(() => {
    fetchQuota();
  }, []);

  // Tải danh sách chi nhánh với Debounce 350ms khi gõ tìm kiếm hoặc đổi bộ lọc
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBranches(keyword, statusFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword, statusFilter]);

  const loadData = async () => {
    await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter)]);
  };

  const handleToggleStatus = async (branch: BranchItemResponse) => {
    const isCurrentlyActive = branch.status.toLowerCase() === 'active';
    const nextActive = !isCurrentlyActive;
    try {
      const res = await branchManagementApi.toggleStatus(branch.id, nextActive);
      if (res.success) {
        await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter)]);
      } else {
        alert(res.message || 'Không thể thay đổi trạng thái chi nhánh.');
      }
    } catch (err: unknown) {
      console.error('Toggle status error:', err);
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = anyErr?.response?.data?.message || anyErr?.message || 'Lỗi khi thay đổi trạng thái chi nhánh.';
      alert(msg);
    }
  };

  const handleDeleteBranch = async (branch: BranchItemResponse) => {
    if (branch.isHeadquarter) {
      alert('Không thể xóa chi nhánh chính (Trụ sở chính) của chuỗi cửa hàng.');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa chi nhánh "${branch.name}" (${branch.code})?\n\nHành động này sẽ xóa chi nhánh và giải phóng hạn mức chi nhánh đang sử dụng của chuỗi cửa hàng.`
    );
    if (!confirmed) return;

    try {
      const res = await branchManagementApi.deleteBranch(branch.id);
      if (res.success) {
        await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter)]);
      } else {
        alert(res.message || 'Không thể xóa chi nhánh.');
      }
    } catch (err: unknown) {
      console.error('Delete branch error:', err);
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = anyErr?.response?.data?.message || anyErr?.message || 'Lỗi khi xóa chi nhánh.';
      alert(msg);
    }
  };

  return (
    <div>
      {/* 1. Quota Bar */}
      <BranchQuotaBar
        quota={quota}
        isLoading={isLoading}
        onOpenCreateModal={() => {
          setSelectedBranch(null);
          setActiveModal('create');
        }}
        onOpenUpgradeModal={() => setActiveModal('upgrade')}
        onGoToSubscriptions={onGoToSubscriptions}
      />

      {/* 2. Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search
              size={17}
              color="#94A3B8"
              style={{ position: 'absolute', left: 12, top: 11 }}
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm theo mã, tên, địa chỉ, người quản lý..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #CBD5E1',
                fontSize: 13.5,
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid #CBD5E1',
              fontSize: 13.5,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Tạm ngưng</option>
          </select>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#475569',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Tải lại danh sách"
        >
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 3. Bảng danh sách chi nhánh */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #EDF2F9',
          boxShadow: '0 4px 16px rgba(0, 30, 90, 0.04)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #EDF2F9', color: '#64748B', fontWeight: 700 }}>
              <th style={{ padding: '14px 20px' }}>Mã chi nhánh</th>
              <th style={{ padding: '14px 20px' }}>Tên & Địa chỉ chi nhánh</th>
              <th style={{ padding: '14px 20px' }}>Hotline</th>
              <th style={{ padding: '14px 20px' }}>Quản lý phụ trách</th>
              <th style={{ padding: '14px 20px' }}>Trạng thái</th>
              <th style={{ padding: '14px 20px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
                  Đang tải danh sách chi nhánh...
                </td>
              </tr>
            ) : branches.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                  <Building2 size={36} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#334155' }}>Chưa có chi nhánh nào</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
                    Hãy bấm nút "Thêm chi nhánh mới" để mở rộng chuỗi cửa hàng của bạn.
                  </div>
                </td>
              </tr>
            ) : (
              branches.map((b) => {
                const isActive = b.status.toLowerCase() === 'active';
                return (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Mã */}
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: 12.5,
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: '#EBF5FF',
                          color: '#0066FF',
                        }}
                      >
                        {b.code}
                      </span>
                    </td>

                    {/* Tên & Địa chỉ */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                        {b.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12.5,
                          color: '#64748B',
                          marginTop: 3,
                        }}
                      >
                        <MapPin size={13} color="#94A3B8" />
                        <span>{b.address || 'Chưa cập nhật địa chỉ'}</span>
                      </div>
                    </td>

                    {/* Hotline */}
                    <td style={{ padding: '14px 20px', color: '#334155' }}>
                      {b.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={13} color="#94A3B8" />
                          <span>{b.phone}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    {/* Quản lý */}
                    <td style={{ padding: '14px 20px', color: '#334155' }}>
                      {b.managerName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={14} color="#94A3B8" />
                          <span>{b.managerName}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Chưa phân công</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: 12.5,
                          fontWeight: 700,
                          background: isActive ? '#ECFDF5' : '#F1F5F9',
                          color: isActive ? '#059669' : '#64748B',
                        }}
                      >
                        {isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{isActive ? 'Đang hoạt động' : 'Tạm ngưng'}</span>
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {/* Sửa */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBranch(b);
                            setActiveModal('edit');
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Sửa thông tin chi nhánh"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Toggle Status */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(b)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: isActive ? '#FFF7ED' : '#F0FDF4',
                            color: isActive ? '#EA580C' : '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title={isActive ? 'Tạm ngưng hoạt động' : 'Kích hoạt hoạt động'}
                        >
                          <Power size={15} />
                        </button>

                        {/* Xóa chi nhánh */}
                        <button
                          type="button"
                          onClick={() => handleDeleteBranch(b)}
                          disabled={b.isHeadquarter}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: `1px solid ${b.isHeadquarter ? '#E2E8F0' : '#FECACA'}`,
                            background: b.isHeadquarter ? '#F8FAFC' : '#FEF2F2',
                            color: b.isHeadquarter ? '#CBD5E1' : '#EF4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: b.isHeadquarter ? 'not-allowed' : 'pointer',
                            opacity: b.isHeadquarter ? 0.6 : 1,
                          }}
                          title={b.isHeadquarter ? 'Không thể xóa chi nhánh chính (Trụ sở chính)' : 'Xóa chi nhánh'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <BranchFormModal
          branch={selectedBranch}
          quota={quota}
          existingBranches={branches}
          onUpgrade={() => setActiveModal('upgrade')}
          onClose={() => {
            setActiveModal(null);
            setSelectedBranch(null);
          }}
          onSuccess={() => {
            setActiveModal(null);
            setSelectedBranch(null);
            loadData();
          }}
        />
      )}

      {activeModal === 'upgrade' && (
        <BranchUpgradeModal
          quota={quota}
          onClose={() => setActiveModal(null)}
          onGoToUpgrade={() => {
            setActiveModal(null);
            onGoToSubscriptions();
          }}
        />
      )}
    </div>
  );
};

